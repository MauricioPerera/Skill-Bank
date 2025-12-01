/**
 * Access Control module for Skill Bank v2.0
 * 
 * Implements policy-based access control for credentials:
 * - Grant/revoke access to credentials
 * - Check permissions before credential retrieval
 * - Expiration support
 * - Access levels (read, write, admin)
 * 
 * @module skills/security/accessControl
 */

import { getDb } from '../store/unifiedStore.js';
import { generatePolicyId } from './encryption.js';
import { logCredentialAccess } from './auditLogger.js';
import {
  CredentialAccessPolicy,
  EntityType,
  AccessLevel,
  GrantAccessOptions,
  AccessDeniedError,
  CredentialNotFoundError
} from '../types/credentials.js';

// ============================================
// Policy CRUD Operations
// ============================================

/**
 * Grant access to a credential for a skill or tool
 * 
 * @param credentialId - Credential ID
 * @param entityId - Skill ID or tool ID
 * @param entityType - 'skill' or 'tool'
 * @param options - Optional access configuration
 * @returns Policy ID
 */
export function grantAccess(
  credentialId: string,
  entityId: string,
  entityType: EntityType,
  options: GrantAccessOptions = {}
): string {
  const db = getDb();
  
  // Verify credential exists
  const credExists = db.prepare(`
    SELECT COUNT(*) as count FROM credentials WHERE id = ?
  `).get(credentialId) as any;
  
  if (credExists.count === 0) {
    throw new CredentialNotFoundError(
      `Cannot grant access to non-existent credential: ${credentialId}`,
      { credentialId }
    );
  }
  
  const id = generatePolicyId();
  const now = new Date().toISOString();
  
  // Insert or replace policy (upsert)
  db.prepare(`
    INSERT OR REPLACE INTO credential_access_policies (
      id, credential_id, entity_id, entity_type, access_level,
      granted_by, granted_at, expires_at, reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    credentialId,
    entityId,
    entityType,
    options.accessLevel || 'read',
    options.grantedBy || null,
    now,
    options.expiresAt || null,
    options.reason || null
  );
  
  // Log access grant
  logCredentialAccess(
    credentialId,
    entityId,
    entityType,
    'grant_access',
    true,
    {
      metadata: {
        accessLevel: options.accessLevel || 'read',
        grantedBy: options.grantedBy,
        reason: options.reason
      }
    }
  );
  
  return id;
}

/**
 * Revoke access to a credential for a skill or tool
 * 
 * @param credentialId - Credential ID
 * @param entityId - Skill ID or tool ID
 * @param entityType - 'skill' or 'tool'
 * @returns True if access was revoked
 */
export function revokeAccess(
  credentialId: string,
  entityId: string,
  entityType: EntityType
): boolean {
  const db = getDb();
  
  const result = db.prepare(`
    DELETE FROM credential_access_policies
    WHERE credential_id = ? AND entity_id = ? AND entity_type = ?
  `).run(credentialId, entityId, entityType);
  
  const success = result.changes > 0;
  
  // Log access revocation
  if (success) {
    logCredentialAccess(
      credentialId,
      entityId,
      entityType,
      'revoke_access',
      true
    );
  }
  
  return success;
}

/**
 * Check if an entity has access to a credential
 * 
 * Considers:
 * - Policy exists
 * - Policy not expired
 * - Credential is active
 * 
 * @param credentialId - Credential ID
 * @param entityId - Skill ID or tool ID
 * @param entityType - 'skill' or 'tool'
 * @param requiredLevel - Minimum required access level (default: 'read')
 * @returns True if entity has access
 */
export function hasAccess(
  credentialId: string,
  entityId: string,
  entityType: EntityType,
  requiredLevel: AccessLevel = 'read'
): boolean {
  const db = getDb();
  
  const now = new Date().toISOString();
  
  const row = db.prepare(`
    SELECT p.access_level, c.status
    FROM credential_access_policies p
    JOIN credentials c ON p.credential_id = c.id
    WHERE p.credential_id = ?
      AND p.entity_id = ?
      AND p.entity_type = ?
      AND (p.expires_at IS NULL OR p.expires_at > ?)
      AND c.status = 'active'
  `).get(credentialId, entityId, entityType, now) as any;
  
  if (!row) {
    return false;
  }
  
  // Check access level hierarchy: admin > write > read
  const levelHierarchy: Record<AccessLevel, number> = {
    'read': 1,
    'write': 2,
    'admin': 3
  };
  
  const grantedLevel = levelHierarchy[row.access_level as AccessLevel];
  const required = levelHierarchy[requiredLevel];
  
  return grantedLevel >= required;
}

/**
 * Assert that an entity has access to a credential
 * 
 * Throws AccessDeniedError if access is denied
 * 
 * @param credentialId - Credential ID
 * @param entityId - Skill ID or tool ID
 * @param entityType - 'skill' or 'tool'
 * @param requiredLevel - Minimum required access level
 * @throws AccessDeniedError if access is denied
 */
export function assertAccess(
  credentialId: string,
  entityId: string,
  entityType: EntityType,
  requiredLevel: AccessLevel = 'read'
): void {
  if (!hasAccess(credentialId, entityId, entityType, requiredLevel)) {
    throw new AccessDeniedError(
      `Access denied: ${entityType} '${entityId}' does not have '${requiredLevel}' access to credential '${credentialId}'`,
      {
        credentialId,
        entityId,
        entityType,
        requiredLevel
      }
    );
  }
}

/**
 * Get all access policies for a credential
 * 
 * @param credentialId - Credential ID
 * @returns Array of policies
 */
export function getAccessPolicies(credentialId: string): CredentialAccessPolicy[] {
  const db = getDb();
  
  const rows = db.prepare(`
    SELECT id, credential_id, entity_id, entity_type, access_level,
           granted_by, granted_at, expires_at, reason
    FROM credential_access_policies
    WHERE credential_id = ?
    ORDER BY granted_at DESC
  `).all(credentialId) as any[];
  
  return rows.map(row => ({
    id: row.id,
    credentialId: row.credential_id,
    entityId: row.entity_id,
    entityType: row.entity_type as EntityType,
    accessLevel: row.access_level as AccessLevel,
    grantedBy: row.granted_by,
    grantedAt: row.granted_at,
    expiresAt: row.expires_at,
    reason: row.reason
  }));
}

/**
 * Get all credentials accessible by an entity
 * 
 * Returns metadata only (no encrypted values)
 * 
 * @param entityId - Skill ID or tool ID
 * @param entityType - 'skill' or 'tool'
 * @returns Array of credential metadata
 */
export function getAccessibleCredentials(
  entityId: string,
  entityType: EntityType
): Array<{
  credentialId: string;
  credentialName: string;
  service: string;
  accessLevel: AccessLevel;
  expiresAt?: string;
}> {
  const db = getDb();
  
  const now = new Date().toISOString();
  
  const rows = db.prepare(`
    SELECT c.id, c.name, c.service, p.access_level, p.expires_at
    FROM credential_access_policies p
    JOIN credentials c ON p.credential_id = c.id
    WHERE p.entity_id = ?
      AND p.entity_type = ?
      AND (p.expires_at IS NULL OR p.expires_at > ?)
      AND c.status = 'active'
    ORDER BY c.name
  `).all(entityId, entityType, now) as any[];
  
  return rows.map(row => ({
    credentialId: row.id,
    credentialName: row.name,
    service: row.service,
    accessLevel: row.access_level as AccessLevel,
    expiresAt: row.expires_at
  }));
}

/**
 * Get policy by credential and entity
 * 
 * @param credentialId - Credential ID
 * @param entityId - Skill ID or tool ID
 * @param entityType - 'skill' or 'tool'
 * @returns Policy or null if not found
 */
export function getPolicy(
  credentialId: string,
  entityId: string,
  entityType: EntityType
): CredentialAccessPolicy | null {
  const db = getDb();
  
  const row = db.prepare(`
    SELECT id, credential_id, entity_id, entity_type, access_level,
           granted_by, granted_at, expires_at, reason
    FROM credential_access_policies
    WHERE credential_id = ? AND entity_id = ? AND entity_type = ?
  `).get(credentialId, entityId, entityType) as any;
  
  if (!row) {
    return null;
  }
  
  return {
    id: row.id,
    credentialId: row.credential_id,
    entityId: row.entity_id,
    entityType: row.entity_type as EntityType,
    accessLevel: row.access_level as AccessLevel,
    grantedBy: row.granted_by,
    grantedAt: row.granted_at,
    expiresAt: row.expires_at,
    reason: row.reason
  };
}

/**
 * Update access level for an existing policy
 * 
 * @param credentialId - Credential ID
 * @param entityId - Skill ID or tool ID
 * @param entityType - 'skill' or 'tool'
 * @param newLevel - New access level
 * @returns True if update succeeded
 */
export function updateAccessLevel(
  credentialId: string,
  entityId: string,
  entityType: EntityType,
  newLevel: AccessLevel
): boolean {
  const db = getDb();
  
  const result = db.prepare(`
    UPDATE credential_access_policies
    SET access_level = ?
    WHERE credential_id = ? AND entity_id = ? AND entity_type = ?
  `).run(newLevel, credentialId, entityId, entityType);
  
  return result.changes > 0;
}

/**
 * Revoke all access policies for a credential
 * 
 * Useful when revoking/deleting a credential
 * 
 * @param credentialId - Credential ID
 * @returns Number of policies revoked
 */
export function revokeAllAccess(credentialId: string): number {
  const db = getDb();
  
  const result = db.prepare(`
    DELETE FROM credential_access_policies
    WHERE credential_id = ?
  `).run(credentialId);
  
  return result.changes;
}

/**
 * Count access policies
 * 
 * @param filters - Optional filters
 * @returns Count of policies
 */
export function countPolicies(filters: {
  credentialId?: string;
  entityId?: string;
  entityType?: EntityType;
} = {}): number {
  const db = getDb();
  
  let query = `SELECT COUNT(*) as count FROM credential_access_policies WHERE 1=1`;
  const params: any[] = [];
  
  if (filters.credentialId) {
    query += ` AND credential_id = ?`;
    params.push(filters.credentialId);
  }
  
  if (filters.entityId) {
    query += ` AND entity_id = ?`;
    params.push(filters.entityId);
  }
  
  if (filters.entityType) {
    query += ` AND entity_type = ?`;
    params.push(filters.entityType);
  }
  
  const row = db.prepare(query).get(...params) as any;
  return row.count;
}

/**
 * Clean up expired policies
 * 
 * Removes policies that have expired
 * 
 * @returns Number of policies removed
 */
export function cleanupExpiredPolicies(): number {
  const db = getDb();
  
  const now = new Date().toISOString();
  
  const result = db.prepare(`
    DELETE FROM credential_access_policies
    WHERE expires_at IS NOT NULL AND expires_at <= ?
  `).run(now);
  
  return result.changes;
}

/**
 * Get policies expiring soon
 * 
 * @param withinDays - Number of days to look ahead
 * @returns Array of policies expiring soon
 */
export function getPoliciesExpiringSoon(withinDays: number = 7): CredentialAccessPolicy[] {
  const db = getDb();
  
  const now = new Date();
  const future = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);
  
  const rows = db.prepare(`
    SELECT id, credential_id, entity_id, entity_type, access_level,
           granted_by, granted_at, expires_at, reason
    FROM credential_access_policies
    WHERE expires_at IS NOT NULL
      AND expires_at > ?
      AND expires_at <= ?
    ORDER BY expires_at ASC
  `).all(now.toISOString(), future.toISOString()) as any[];
  
  return rows.map(row => ({
    id: row.id,
    credentialId: row.credential_id,
    entityId: row.entity_id,
    entityType: row.entity_type as EntityType,
    accessLevel: row.access_level as AccessLevel,
    grantedBy: row.granted_by,
    grantedAt: row.granted_at,
    expiresAt: row.expires_at,
    reason: row.reason
  }));
}

