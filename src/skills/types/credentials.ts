/**
 * Credential types and interfaces for Skill Bank v2.5
 * 
 * Provides secure credential storage with:
 * - AES-256-GCM encryption at rest
 * - Multi-KDF support (PBKDF2, Argon2id)
 * - Scoped access control per skill/tool
 * - Complete audit trail
 * - Key rotation support
 * 
 * @module skills/types/credentials
 */

/**
 * Supported credential types
 */
export type CredentialType = 
  | 'api_key'           // Simple API key (e.g., Stripe, OpenAI)
  | 'oauth_token'       // OAuth 2.0 access/refresh tokens
  | 'basic_auth'        // Username + password
  | 'db_connection'     // Database connection string
  | 'ssh_key'           // SSH private key
  | 'custom';           // Custom JSON structure

/**
 * Environment types for credential isolation
 */
export type Environment = 'dev' | 'staging' | 'production';

/**
 * Access levels for credential policies
 */
export type AccessLevel = 'read' | 'write' | 'admin';

/**
 * Entity types that can access credentials
 */
export type EntityType = 'skill' | 'tool';

/**
 * Credential status
 */
export type CredentialStatus = 'active' | 'rotated' | 'revoked';

// ============================================
// KDF (Key Derivation Function) Types - v2.5
// ============================================

/**
 * Supported Key Derivation Functions
 * 
 * - pbkdf2: Legacy KDF (v2.0), good compatibility
 * - argon2id: Modern KDF (v2.5+), GPU-resistant
 */
export type KDFType = 'pbkdf2' | 'argon2id';

/**
 * KDF parameters for different algorithms
 */
export interface KDFParameters {
  // PBKDF2 parameters
  iterations?: number;          // Number of iterations (default: 100000)
  hash?: 'sha256' | 'sha512';   // Hash algorithm (default: sha256)
  
  // Argon2 parameters
  memoryCost?: number;          // Memory in KiB (default: 65536 = 64MB)
  timeCost?: number;            // Number of iterations (default: 3)
  parallelism?: number;         // Degree of parallelism (default: 4)
}

/**
 * KDF configuration
 */
export interface KDFConfig {
  type: KDFType;
  parameters: KDFParameters;
  version: string;
}

/**
 * Default KDF configurations
 */
export const DEFAULT_KDF_CONFIGS: Record<KDFType, KDFConfig> = {
  pbkdf2: {
    type: 'pbkdf2',
    parameters: {
      iterations: 100000,
      hash: 'sha256'
    },
    version: '1.0'
  },
  argon2id: {
    type: 'argon2id',
    parameters: {
      memoryCost: 65536,    // 64 MB
      timeCost: 3,          // 3 iterations
      parallelism: 4        // 4 threads
    },
    version: '1.3'
  }
};

/**
 * Audit actions
 */
export type AuditAction = 
  | 'retrieve'          // Credential was retrieved for use
  | 'rotate'            // Credential value was rotated
  | 'revoke'            // Credential was revoked
  | 'grant_access'      // Access policy was granted
  | 'revoke_access'     // Access policy was revoked
  | 'create'            // Credential was created
  | 'update'            // Credential metadata was updated
  | 'delete';           // Credential was deleted

// ============================================
// Credential Value Types
// ============================================

/**
 * Union type of all credential value structures
 */
export type CredentialValue = 
  | ApiKeyCredential
  | OAuthCredential
  | BasicAuthCredential
  | DbConnectionCredential
  | SshKeyCredential
  | CustomCredential;

/**
 * Simple API key credential
 */
export interface ApiKeyCredential {
  apiKey: string;
  apiSecret?: string;
}

/**
 * OAuth 2.0 token credential
 */
export interface OAuthCredential {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;       // ISO 8601 timestamp
  tokenType?: string;       // e.g., 'Bearer'
  scopes?: string[];        // OAuth scopes
}

/**
 * Basic authentication credential
 */
export interface BasicAuthCredential {
  username: string;
  password: string;
}

/**
 * Database connection credential
 */
export interface DbConnectionCredential {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  options?: Record<string, any>;
}

/**
 * SSH key credential
 */
export interface SshKeyCredential {
  privateKey: string;
  publicKey?: string;
  passphrase?: string;
}

/**
 * Custom credential (flexible JSON)
 */
export interface CustomCredential {
  [key: string]: any;
}

// ============================================
// Stored Credential (Encrypted)
// ============================================

/**
 * Credential as stored in database (encrypted)
 */
export interface Credential {
  id: string;                       // cred_<timestamp>_<hash>
  name: string;                     // User-friendly name
  type: CredentialType;
  service: string;                  // e.g., 'stripe', 'openai', 'postgres'
  encryptedValue: string;           // AES-256-GCM encrypted JSON
  encryptionKeyId: string;          // Which key was used (for rotation)
  metadata?: {
    expiresAt?: string;
    scopes?: string[];
    description?: string;
    [key: string]: any;
  };
  environment: Environment;
  createdAt: string;
  updatedAt: string;
  lastRotatedAt?: string;
  status: CredentialStatus;
}

/**
 * Decrypted credential (in-memory only, never persisted)
 */
export interface DecryptedCredential {
  id: string;
  name: string;
  type: CredentialType;
  service: string;
  value: CredentialValue;           // Decrypted!
  metadata?: Record<string, any>;
  environment: Environment;
}

// ============================================
// Access Control
// ============================================

/**
 * Access policy for credential
 */
export interface CredentialAccessPolicy {
  id: string;                       // policy_<timestamp>_<hash>
  credentialId: string;
  entityId: string;                 // skill_id or tool_id
  entityType: EntityType;
  accessLevel: AccessLevel;
  grantedBy?: string;               // User/system that granted access
  grantedAt: string;
  expiresAt?: string;               // Optional expiration
  reason?: string;                  // Why this access was granted
}

// ============================================
// Audit Trail
// ============================================

/**
 * Audit log entry for credential access
 */
export interface CredentialAuditEntry {
  id: string;                       // audit_<timestamp>_<hash>
  credentialId: string;
  entityId: string;                 // Which skill/tool accessed it
  entityType: EntityType;
  userId?: string;                  // Which user triggered the execution
  action: AuditAction;
  success: boolean;
  timestamp: string;
  ipAddress?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * Audit summary statistics
 */
export interface AuditSummary {
  totalAccesses: number;
  byCredential: Record<string, number>;
  byEntity: Record<string, number>;
  byAction: Record<string, number>;
  failedAccesses: number;
  lastAccessAt?: string;
}

// ============================================
// Encryption
// ============================================

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  encryptedValue: string;           // Base64 encrypted content
  iv: string;                       // Base64 initialization vector
  authTag: string;                  // Base64 authentication tag
  salt: string;                     // Base64 salt for key derivation
  
  // v2.5: KDF metadata
  kdfType?: KDFType;                // KDF algorithm used (default: pbkdf2 for legacy)
  kdfParameters?: KDFParameters;    // KDF-specific parameters
  kdfVersion?: string;              // KDF implementation version
}

/**
 * Encryption key metadata
 */
export interface EncryptionKey {
  id: string;                       // key_<timestamp>
  keyHash: string;                  // SHA-256 hash of the key
  algorithm: string;                // 'aes-256-gcm'
  createdAt: string;
  status: 'active' | 'rotated' | 'revoked';
  rotatedTo?: string;               // ID of the new key (if rotated)
}

// ============================================
// Store Options
// ============================================

/**
 * Options for storing a credential
 */
export interface StoreCredentialOptions {
  environment?: Environment;
  metadata?: Record<string, any>;
  encryptionKeyId?: string;         // Optional: specify which key to use
}

/**
 * Options for retrieving a credential
 */
export interface RetrieveCredentialOptions {
  userId?: string;                  // For audit trail
  ipAddress?: string;               // For audit trail
}

/**
 * Options for granting access
 */
export interface GrantAccessOptions {
  accessLevel?: AccessLevel;
  expiresAt?: string;
  grantedBy?: string;
  reason?: string;
}

/**
 * Options for querying audit trail
 */
export interface AuditQueryOptions {
  limit?: number;
  since?: string;
  until?: string;
  action?: AuditAction;
  entityId?: string;
  userId?: string;
  successOnly?: boolean;
}

/**
 * Filters for listing credentials
 */
export interface CredentialFilters {
  service?: string;
  type?: CredentialType;
  environment?: Environment;
  status?: CredentialStatus;
}

// ============================================
// Errors
// ============================================

/**
 * Base error for credential operations
 */
export class CredentialError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'CredentialError';
  }
}

/**
 * Access denied error
 */
export class AccessDeniedError extends CredentialError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'ACCESS_DENIED', details);
    this.name = 'AccessDeniedError';
  }
}

/**
 * Credential not found error
 */
export class CredentialNotFoundError extends CredentialError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'CREDENTIAL_NOT_FOUND', details);
    this.name = 'CredentialNotFoundError';
  }
}

/**
 * Encryption error
 */
export class EncryptionError extends CredentialError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'ENCRYPTION_ERROR', details);
    this.name = 'EncryptionError';
  }
}

/**
 * Decryption error
 */
export class DecryptionError extends CredentialError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'DECRYPTION_ERROR', details);
    this.name = 'DecryptionError';
  }
}

