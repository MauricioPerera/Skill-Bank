/**
 * Encryption module for Skill Bank v2.0
 * 
 * Implements AES-256-GCM encryption for credential storage:
 * - NIST approved algorithm
 * - Authenticated encryption (prevents tampering)
 * - PBKDF2 key derivation (100,000 iterations)
 * - Per-credential salt and IV
 * 
 * @module skills/security/encryption
 */

import crypto from 'crypto';
import {
  EncryptedData,
  CredentialValue,
  EncryptionError,
  DecryptionError
} from '../types/credentials.js';

// ============================================
// Constants
// ============================================

/**
 * Encryption algorithm
 */
const ALGORITHM = 'aes-256-gcm' as const;

/**
 * Key derivation iterations (PBKDF2)
 * Higher = more secure, but slower
 * 100,000 is NIST recommended minimum
 */
const PBKDF2_ITERATIONS = 100000;

/**
 * Key length in bytes (256 bits = 32 bytes)
 */
const KEY_LENGTH = 32;

/**
 * Salt length in bytes
 */
const SALT_LENGTH = 16;

/**
 * Initialization Vector length in bytes
 */
const IV_LENGTH = 16;

/**
 * Auth tag length in bytes (GCM mode)
 */
const AUTH_TAG_LENGTH = 16;

// ============================================
// Master Key Management
// ============================================

/**
 * Get master encryption key from environment
 * 
 * Must be set in MASTER_ENCRYPTION_KEY environment variable
 * Should be 32 bytes (64 hex characters)
 * 
 * Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
function getMasterKey(): Buffer {
  const keyHex = process.env.MASTER_ENCRYPTION_KEY;
  
  if (!keyHex) {
    throw new EncryptionError(
      'MASTER_ENCRYPTION_KEY environment variable not set',
      {
        hint: 'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
      }
    );
  }
  
  const key = Buffer.from(keyHex, 'hex');
  
  if (key.length !== KEY_LENGTH) {
    throw new EncryptionError(
      `MASTER_ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex characters), got ${key.length} bytes`,
      { expected: KEY_LENGTH, actual: key.length }
    );
  }
  
  return key;
}

/**
 * Derive encryption key from master key + salt
 * 
 * Uses PBKDF2 with SHA-256 hash function
 * 
 * @param salt - Random salt for this credential
 * @returns Derived 256-bit key
 */
function deriveKey(salt: Buffer): Buffer {
  const masterKey = getMasterKey();
  
  return crypto.pbkdf2Sync(
    masterKey,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha256'
  );
}

// ============================================
// Encryption Functions
// ============================================

/**
 * Encrypt credential value with AES-256-GCM
 * 
 * Process:
 * 1. Generate random salt (16 bytes)
 * 2. Derive encryption key from master + salt (PBKDF2)
 * 3. Generate random IV (16 bytes)
 * 4. Create cipher with AES-256-GCM
 * 5. Encrypt the JSON value
 * 6. Get authentication tag (prevents tampering)
 * 7. Return encrypted data + salt + IV + tag
 * 
 * @param value - Credential value to encrypt
 * @returns Encrypted data structure
 */
export function encryptCredential(value: CredentialValue): EncryptedData {
  try {
    // 1. Generate random salt
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    // 2. Derive key from master + salt
    const key = deriveKey(salt);
    
    // 3. Generate random IV
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // 4. Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // 5. Encrypt
    const plaintext = JSON.stringify(value);
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // 6. Get auth tag (GCM mode provides authenticated encryption)
    const authTag = cipher.getAuthTag();
    
    // 7. Return encrypted data
    return {
      encryptedValue: encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      salt: salt.toString('base64')
    };
  } catch (error) {
    throw new EncryptionError(
      'Failed to encrypt credential',
      {
        originalError: error instanceof Error ? error.message : String(error)
      }
    );
  }
}

/**
 * Decrypt credential value with AES-256-GCM
 * 
 * Process:
 * 1. Derive encryption key from master + salt (same as encryption)
 * 2. Create decipher with AES-256-GCM
 * 3. Set authentication tag (verifies integrity)
 * 4. Decrypt the value
 * 5. Parse JSON
 * 
 * @param encryptedData - Encrypted data structure
 * @returns Decrypted credential value
 * @throws DecryptionError if decryption fails or data has been tampered
 */
export function decryptCredential(encryptedData: EncryptedData): CredentialValue {
  try {
    // 1. Derive key from master + salt
    const saltBuffer = Buffer.from(encryptedData.salt, 'base64');
    const key = deriveKey(saltBuffer);
    
    // 2. Create decipher
    const ivBuffer = Buffer.from(encryptedData.iv, 'base64');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer);
    
    // 3. Set auth tag (must be done before decryption)
    const authTagBuffer = Buffer.from(encryptedData.authTag, 'base64');
    decipher.setAuthTag(authTagBuffer);
    
    // 4. Decrypt
    let decrypted = decipher.update(encryptedData.encryptedValue, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    // 5. Parse JSON
    return JSON.parse(decrypted) as CredentialValue;
  } catch (error) {
    // Auth tag verification failure or corrupted data
    if (error instanceof Error && error.message.includes('auth')) {
      throw new DecryptionError(
        'Failed to decrypt credential: data has been tampered with or corrupted',
        {
          hint: 'The credential data may have been tampered with or the master key is incorrect'
        }
      );
    }
    
    throw new DecryptionError(
      'Failed to decrypt credential',
      {
        originalError: error instanceof Error ? error.message : String(error)
      }
    );
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Generate a secure random credential ID
 * 
 * Format: cred_<timestamp>_<random>
 * 
 * @returns Unique credential ID
 */
export function generateCredentialId(): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `cred_${timestamp}_${random}`;
}

/**
 * Generate a secure random policy ID
 * 
 * Format: policy_<timestamp>_<random>
 * 
 * @returns Unique policy ID
 */
export function generatePolicyId(): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `policy_${timestamp}_${random}`;
}

/**
 * Generate a secure random audit entry ID
 * 
 * Format: audit_<timestamp>_<random>
 * 
 * @returns Unique audit entry ID
 */
export function generateAuditId(): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `audit_${timestamp}_${random}`;
}

/**
 * Generate a secure random encryption key ID
 * 
 * Format: key_<timestamp>
 * 
 * @returns Unique key ID
 */
export function generateKeyId(): string {
  const timestamp = Date.now();
  return `key_${timestamp}`;
}

/**
 * Hash a master key for storage/verification
 * 
 * Uses SHA-256. We don't store the actual key, only its hash
 * for verification purposes.
 * 
 * @param key - Master key buffer
 * @returns SHA-256 hash (hex)
 */
export function hashKey(key: Buffer): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Verify master key is available and valid
 * 
 * @returns True if master key is configured correctly
 * @throws EncryptionError if master key is missing or invalid
 */
export function verifyMasterKey(): boolean {
  try {
    const key = getMasterKey();
    return key.length === KEY_LENGTH;
  } catch (error) {
    throw error;
  }
}

/**
 * Get encryption algorithm info
 * 
 * @returns Algorithm metadata
 */
export function getAlgorithmInfo() {
  return {
    algorithm: ALGORITHM,
    keyLength: KEY_LENGTH,
    saltLength: SALT_LENGTH,
    ivLength: IV_LENGTH,
    authTagLength: AUTH_TAG_LENGTH,
    pbkdf2Iterations: PBKDF2_ITERATIONS
  };
}

// ============================================
// Key Rotation (Future Enhancement)
// ============================================

/**
 * Re-encrypt data with a new master key
 * 
 * This is for master key rotation. The process is:
 * 1. Decrypt with old key
 * 2. Re-encrypt with new key
 * 
 * Note: This function is not yet integrated with the store.
 * Master key rotation requires a maintenance window.
 * 
 * @param encryptedData - Data encrypted with old key
 * @param oldMasterKey - Old master key (for decryption)
 * @param newMasterKey - New master key (for encryption)
 * @returns Re-encrypted data
 */
export function reEncryptWithNewKey(
  encryptedData: EncryptedData,
  oldMasterKey: Buffer,
  newMasterKey: Buffer
): EncryptedData {
  // Save current master key
  const currentMasterKey = process.env.MASTER_ENCRYPTION_KEY;
  
  try {
    // Decrypt with old key
    process.env.MASTER_ENCRYPTION_KEY = oldMasterKey.toString('hex');
    const decrypted = decryptCredential(encryptedData);
    
    // Encrypt with new key
    process.env.MASTER_ENCRYPTION_KEY = newMasterKey.toString('hex');
    const reEncrypted = encryptCredential(decrypted);
    
    return reEncrypted;
  } finally {
    // Restore original master key
    process.env.MASTER_ENCRYPTION_KEY = currentMasterKey;
  }
}

