/**
 * Credential Store - Secure storage for credentials
 * 
 * Implements CRUD operations for credentials with:
 * - AES-256-GCM encryption at rest
 * - Scoped access control
 * - Complete audit trail
 * - Key rotation support
 * 
 * @module skills/store/credentialStore
 */

import { getDb } from './unifiedStore.js';
import {
  encryptCredential,
  decryptCredential,
  generateCredentialId,
  generateKeyId,
  hashKey
} from '../security/encryption.js';
import { assertAccess } from '../security/accessControl.js';
import { logCredentialAccess } from '../security/auditLogger.js';
import {
  Credential,
  DecryptedCredential,
  CredentialType,
  CredentialValue,
  Environment,
  CredentialStatus,
  EntityType,
  AccessLevel,
  StoreCredentialOptions,
  RetrieveCredentialOptions,
  CredentialFilters,
  CredentialNotFoundError,
  EncryptionError,
  AccessDeniedError
} from '../types/credentials.js';

// ============================================
// Database Initialization
// ============================================

/**
 * Initialize credential tables
 * 
 * Creates:
 * - credentials table
 * - credential_access_policies table (to be used in Week 2)
 * - credential_audit_log table (to be used in Week 3)
 * - encryption_keys table
 */
export function initCredentialStore() {
  const db = getDb();
  
  // Create credentials table
  db.exec(`
    CREATE TABLE IF NOT EXISTS credentials (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      service TEXT NOT NULL,
      encrypted_value TEXT NOT NULL,
      encryption_key_id TEXT NOT NULL,
      metadata TEXT,
      environment TEXT NOT NULL DEFAULT 'production',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_rotated_at TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      UNIQUE(name, environment),
      CHECK(type IN ('api_key', 'oauth_token', 'basic_auth', 'db_connection', 'ssh_key', 'custom')),
      CHECK(status IN ('active', 'rotated', 'revoked')),
      CHECK(environment IN ('dev', 'staging', 'production'))
    );
    
    CREATE INDEX IF NOT EXISTS idx_cred_service ON credentials(service);
    CREATE INDEX IF NOT EXISTS idx_cred_type ON credentials(type);
    CREATE INDEX IF NOT EXISTS idx_cred_status ON credentials(status);
    CREATE INDEX IF NOT EXISTS idx_cred_env ON credentials(environment);
    CREATE INDEX IF NOT EXISTS idx_cred_name ON credentials(name);
  `);
  
  // Create encryption_keys table
  db.exec(`
    CREATE TABLE IF NOT EXISTS encryption_keys (
      id TEXT PRIMARY KEY,
      key_hash TEXT NOT NULL UNIQUE,
      algorithm TEXT NOT NULL DEFAULT 'aes-256-gcm',
      created_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      rotated_to TEXT,
      FOREIGN KEY (rotated_to) REFERENCES encryption_keys(id),
      CHECK(status IN ('active', 'rotated', 'revoked')),
      CHECK(algorithm IN ('aes-256-gcm'))
    );
    
    CREATE INDEX IF NOT EXISTS idx_key_status ON encryption_keys(status);
  `);
  
  // Placeholder for access policies (Week 2)
  db.exec(`
    CREATE TABLE IF NOT EXISTS credential_access_policies (
      id TEXT PRIMARY KEY,
      credential_id TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      access_level TEXT NOT NULL DEFAULT 'read',
      granted_by TEXT,
      granted_at TEXT NOT NULL,
      expires_at TEXT,
      reason TEXT,
      FOREIGN KEY (credential_id) REFERENCES credentials(id) ON DELETE CASCADE,
      UNIQUE(credential_id, entity_id, entity_type),
      CHECK(entity_type IN ('skill', 'tool')),
      CHECK(access_level IN ('read', 'write', 'admin'))
    );
    
    CREATE INDEX IF NOT EXISTS idx_policy_credential ON credential_access_policies(credential_id);
    CREATE INDEX IF NOT EXISTS idx_policy_entity ON credential_access_policies(entity_id, entity_type);
    CREATE INDEX IF NOT EXISTS idx_policy_expires ON credential_access_policies(expires_at);
    CREATE INDEX IF NOT EXISTS idx_policy_lookup ON credential_access_policies(credential_id, entity_id, entity_type);
  `);
  
  // Placeholder for audit log (Week 3)
  db.exec(`
    CREATE TABLE IF NOT EXISTS credential_audit_log (
      id TEXT PRIMARY KEY,
      credential_id TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      user_id TEXT,
      action TEXT NOT NULL,
      success INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      ip_address TEXT,
      error_message TEXT,
      metadata TEXT,
      FOREIGN KEY (credential_id) REFERENCES credentials(id) ON DELETE CASCADE,
      CHECK(entity_type IN ('skill', 'tool')),
      CHECK(action IN ('retrieve', 'rotate', 'revoke', 'grant_access', 'revoke_access', 'create', 'update', 'delete')),
      CHECK(success IN (0, 1))
    );
    
    CREATE INDEX IF NOT EXISTS idx_audit_credential ON credential_audit_log(credential_id);
    CREATE INDEX IF NOT EXISTS idx_audit_entity ON credential_audit_log(entity_id, entity_type);
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON credential_audit_log(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_action ON credential_audit_log(action);
    CREATE INDEX IF NOT EXISTS idx_audit_user ON credential_audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_success ON credential_audit_log(success);
  `);
}

// ============================================
// CRUD Operations
// ============================================

/**
 * Store a new credential (encrypted)
 * 
 * @param name - User-friendly name (e.g., 'stripe_production')
 * @param type - Credential type
 * @param service - Service name (e.g., 'stripe', 'openai')
 * @param value - Credential value (will be encrypted)
 * @param options - Storage options
 * @returns Credential ID
 */
export function storeCredential(
  name: string,
  type: CredentialType,
  service: string,
  value: CredentialValue,
  options: StoreCredentialOptions = {}
): string {
  const db = getDb();
  
  // Encrypt the credential value
  const encrypted = encryptCredential(value);
  
  // Generate IDs
  const id = generateCredentialId();
  const keyId = options.encryptionKeyId || generateKeyId();
  
  // Store encryption key metadata (if not already stored)
  try {
    const masterKeyHash = hashKey(Buffer.from(process.env.MASTER_ENCRYPTION_KEY || '', 'hex'));
    db.prepare(`
      INSERT OR IGNORE INTO encryption_keys (id, key_hash, algorithm, created_at, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(keyId, masterKeyHash, 'aes-256-gcm', new Date().toISOString(), 'active');
  } catch (error) {
    throw new EncryptionError(
      'Failed to store encryption key metadata',
      'KEY_STORAGE_FAILED',
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
  
  // Prepare encrypted data for storage
  const encryptedValue = JSON.stringify({
    encryptedValue: encrypted.encryptedValue,
    iv: encrypted.iv,
    authTag: encrypted.authTag,
    salt: encrypted.salt
  });
  
  const now = new Date().toISOString();
  
  // Insert credential
  db.prepare(`
    INSERT INTO credentials (
      id, name, type, service, encrypted_value, encryption_key_id,
      metadata, environment, created_at, updated_at, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    name,
    type,
    service,
    encryptedValue,
    keyId,
    options.metadata ? JSON.stringify(options.metadata) : null,
    options.environment || 'production',
    now,
    now,
    'active'
  );
  
  // Log credential creation
  logCredentialAccess(
    id,
    'system',
    'tool',
    'create',
    true
  );
  
  return id;
}

/**
 * Retrieve credential metadata (without decrypting value)
 * 
 * Useful for listing credentials without exposing sensitive data
 * 
 * @param credentialId - Credential ID
 * @returns Credential metadata (no value)
 */
export function getCredentialMetadata(credentialId: string): Omit<Credential, 'encryptedValue'> {
  const db = getDb();
  
  const row = db.prepare(`
    SELECT id, name, type, service, encryption_key_id,
           metadata, environment, created_at, updated_at,
           last_rotated_at, status
    FROM credentials
    WHERE id = ?
  `).get(credentialId) as any;
  
  if (!row) {
    throw new CredentialNotFoundError(
      `Credential not found: ${credentialId}`,
      { credentialId }
    );
  }
  
  return {
    id: row.id,
    name: row.name,
    type: row.type as CredentialType,
    service: row.service,
    encryptionKeyId: row.encryption_key_id,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    environment: row.environment as Environment,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastRotatedAt: row.last_rotated_at,
    status: row.status as CredentialStatus
  };
}

/**
 * Retrieve and decrypt a credential
 * 
 * Checks access policies before returning the decrypted value.
 * Logs all access attempts (success and failure) to audit trail.
 * 
 * @param credentialId - Credential ID
 * @param requestingEntityId - ID of the skill/tool requesting access
 * @param requestingEntityType - Type of entity ('skill' or 'tool')
 * @param options - Optional retrieval options
 * @returns Decrypted credential
 * @throws AccessDeniedError if entity lacks access
 * @throws CredentialNotFoundError if credential doesn't exist
 */
export function retrieveCredential(
  credentialId: string,
  requestingEntityId: string,
  requestingEntityType: EntityType,
  options: RetrieveCredentialOptions = {}
): DecryptedCredential {
  const db = getDb();
  
  try {
    // Check access policy (throws if denied)
    assertAccess(credentialId, requestingEntityId, requestingEntityType, 'read');
    
    const row = db.prepare(`
      SELECT id, name, type, service, encrypted_value,
             metadata, environment
      FROM credentials
      WHERE id = ? AND status = 'active'
    `).get(credentialId) as any;
    
    if (!row) {
      // Log failed retrieval (credential not found)
      logCredentialAccess(
        credentialId,
        requestingEntityId,
        requestingEntityType,
        'retrieve',
        false,
        {
          userId: options.userId,
          ipAddress: options.ipAddress,
          errorMessage: 'Credential not found or not active'
        }
      );
      
      throw new CredentialNotFoundError(
        `Credential not found or not active: ${credentialId}`,
        { credentialId }
      );
    }
    
    // Decrypt the value
    const encryptedData = JSON.parse(row.encrypted_value);
    const value = decryptCredential(encryptedData);
    
    // Log successful retrieval
    logCredentialAccess(
      credentialId,
      requestingEntityId,
      requestingEntityType,
      'retrieve',
      true,
      {
        userId: options.userId,
        ipAddress: options.ipAddress
      }
    );
    
    return {
      id: row.id,
      name: row.name,
      type: row.type as CredentialType,
      service: row.service,
      value,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      environment: row.environment as Environment
    };
  } catch (error) {
    // Log access denied
    if (error instanceof AccessDeniedError) {
      logCredentialAccess(
        credentialId,
        requestingEntityId,
        requestingEntityType,
        'retrieve',
        false,
        {
          userId: options.userId,
          ipAddress: options.ipAddress,
          errorMessage: error.message
        }
      );
    }
    
    throw error;
  }
}

/**
 * Retrieve and decrypt a credential without access checks
 * 
 * WARNING: Use only for internal operations or admin access.
 * Bypasses all access policies!
 * 
 * @param credentialId - Credential ID
 * @returns Decrypted credential
 * @internal
 */
export function retrieveCredentialUnchecked(credentialId: string): DecryptedCredential {
  const db = getDb();
  
  const row = db.prepare(`
    SELECT id, name, type, service, encrypted_value,
           metadata, environment
    FROM credentials
    WHERE id = ? AND status = 'active'
  `).get(credentialId) as any;
  
  if (!row) {
    throw new CredentialNotFoundError(
      `Credential not found or not active: ${credentialId}`,
      { credentialId }
    );
  }
  
  // Decrypt the value
  const encryptedData = JSON.parse(row.encrypted_value);
  const value = decryptCredential(encryptedData);
  
  return {
    id: row.id,
    name: row.name,
    type: row.type as CredentialType,
    service: row.service,
    value,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    environment: row.environment as Environment
  };
}

/**
 * List credentials (metadata only, no sensitive data)
 * 
 * @param filters - Optional filters
 * @returns Array of credential metadata
 */
export function listCredentials(
  filters: CredentialFilters = {}
): Array<Omit<Credential, 'encryptedValue'>> {
  const db = getDb();
  
  let query = `
    SELECT id, name, type, service, encryption_key_id,
           metadata, environment, created_at, updated_at,
           last_rotated_at, status
    FROM credentials
    WHERE 1=1
  `;
  
  const params: any[] = [];
  
  if (filters.service) {
    query += ` AND service = ?`;
    params.push(filters.service);
  }
  
  if (filters.type) {
    query += ` AND type = ?`;
    params.push(filters.type);
  }
  
  if (filters.environment) {
    query += ` AND environment = ?`;
    params.push(filters.environment);
  }
  
  if (filters.status) {
    query += ` AND status = ?`;
    params.push(filters.status);
  }
  
  query += ` ORDER BY created_at DESC`;
  
  const rows = db.prepare(query).all(...params) as any[];
  
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    type: row.type as CredentialType,
    service: row.service,
    encryptionKeyId: row.encryption_key_id,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    environment: row.environment as Environment,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastRotatedAt: row.last_rotated_at,
    status: row.status as CredentialStatus
  }));
}

/**
 * Rotate a credential (update its value)
 * 
 * @param credentialId - Credential ID
 * @param newValue - New credential value
 * @returns True if rotation succeeded
 */
export function rotateCredential(
  credentialId: string,
  newValue: CredentialValue
): boolean {
  const db = getDb();
  
  // Verify credential exists
  const existing = getCredentialMetadata(credentialId);
  
  // Encrypt new value
  const encrypted = encryptCredential(newValue);
  
  const encryptedValue = JSON.stringify({
    encryptedValue: encrypted.encryptedValue,
    iv: encrypted.iv,
    authTag: encrypted.authTag,
    salt: encrypted.salt
  });
  
  const now = new Date().toISOString();
  
  // Update credential
  const result = db.prepare(`
    UPDATE credentials
    SET encrypted_value = ?,
        updated_at = ?,
        last_rotated_at = ?
    WHERE id = ? AND status = 'active'
  `).run(encryptedValue, now, now, credentialId);
  
  const success = result.changes > 0;
  
  // Log rotation
  logCredentialAccess(
    credentialId,
    'system',
    'tool',
    'rotate',
    success
  );
  
  return success;
}

/**
 * Revoke a credential (soft delete)
 * 
 * @param credentialId - Credential ID
 * @param reason - Reason for revocation
 * @returns True if revocation succeeded
 */
export function revokeCredential(
  credentialId: string,
  reason?: string
): boolean {
  const db = getDb();
  
  const now = new Date().toISOString();
  
  // Mark as revoked
  const result = db.prepare(`
    UPDATE credentials
    SET status = 'revoked',
        updated_at = ?,
        metadata = json_set(COALESCE(metadata, '{}'), '$.revokedReason', ?)
    WHERE id = ? AND status = 'active'
  `).run(now, reason || 'No reason provided', credentialId);
  
  const success = result.changes > 0;
  
  // Log revocation
  logCredentialAccess(
    credentialId,
    'system',
    'tool',
    'revoke',
    success,
    {
      metadata: { reason: reason || 'No reason provided' }
    }
  );
  
  return success;
}

/**
 * Delete a credential permanently
 * 
 * Warning: This is irreversible!
 * 
 * @param credentialId - Credential ID
 * @returns True if deletion succeeded
 */
export function deleteCredential(credentialId: string): boolean {
  const db = getDb();
  
  const result = db.prepare(`
    DELETE FROM credentials
    WHERE id = ?
  `).run(credentialId);
  
  return result.changes > 0;
}

/**
 * Check if a credential exists and is active
 * 
 * @param credentialId - Credential ID
 * @returns True if credential exists and is active
 */
export function isCredentialValid(credentialId: string): boolean {
  const db = getDb();
  
  const row = db.prepare(`
    SELECT COUNT(*) as count
    FROM credentials
    WHERE id = ? AND status = 'active'
  `).get(credentialId) as any;
  
  return row.count > 0;
}

/**
 * Get credential by name and environment
 * 
 * @param name - Credential name
 * @param environment - Environment
 * @returns Credential metadata
 */
export function getCredentialByName(
  name: string,
  environment: Environment = 'production'
): Omit<Credential, 'encryptedValue'> {
  const db = getDb();
  
  const row = db.prepare(`
    SELECT id, name, type, service, encryption_key_id,
           metadata, environment, created_at, updated_at,
           last_rotated_at, status
    FROM credentials
    WHERE name = ? AND environment = ?
  `).get(name, environment) as any;
  
  if (!row) {
    throw new CredentialNotFoundError(
      `Credential not found: ${name} (${environment})`,
      { name, environment }
    );
  }
  
  return {
    id: row.id,
    name: row.name,
    type: row.type as CredentialType,
    service: row.service,
    encryptionKeyId: row.encryption_key_id,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    environment: row.environment as Environment,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastRotatedAt: row.last_rotated_at,
    status: row.status as CredentialStatus
  };
}

/**
 * Count credentials by filters
 * 
 * @param filters - Optional filters
 * @returns Count of matching credentials
 */
export function countCredentials(filters: CredentialFilters = {}): number {
  const db = getDb();
  
  let query = `SELECT COUNT(*) as count FROM credentials WHERE 1=1`;
  const params: any[] = [];
  
  if (filters.service) {
    query += ` AND service = ?`;
    params.push(filters.service);
  }
  
  if (filters.type) {
    query += ` AND type = ?`;
    params.push(filters.type);
  }
  
  if (filters.environment) {
    query += ` AND environment = ?`;
    params.push(filters.environment);
  }
  
  if (filters.status) {
    query += ` AND status = ?`;
    params.push(filters.status);
  }
  
  const row = db.prepare(query).get(...params) as any;
  return row.count;
}

