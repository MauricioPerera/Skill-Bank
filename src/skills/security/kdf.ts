/**
 * Key Derivation Functions (KDF) module for Skill Bank v2.5
 * 
 * Supports multiple KDF algorithms:
 * - PBKDF2-HMAC-SHA256 (legacy, v2.0 compatible)
 * - Argon2id (modern, GPU-resistant, v2.5+)
 * 
 * @module skills/security/kdf
 */

import crypto from 'crypto';
import argon2 from 'argon2';
import {
  KDFType,
  KDFConfig,
  KDFParameters,
  DEFAULT_KDF_CONFIGS
} from '../types/credentials.js';

// ============================================
// Constants
// ============================================

/**
 * Key length in bytes (256 bits = 32 bytes)
 */
const KEY_LENGTH = 32;

// ============================================
// KDF Configuration
// ============================================

/**
 * Get default KDF type from environment or system default
 * 
 * Environment variable: DEFAULT_KDF_TYPE
 * - 'pbkdf2' - Legacy, v2.0 compatible
 * - 'argon2id' - Modern, v2.5+ (default)
 */
export function getDefaultKDF(): KDFType {
  const env = process.env.DEFAULT_KDF_TYPE;
  
  if (env === 'pbkdf2' || env === 'argon2id') {
    return env;
  }
  
  // Default to argon2id in v2.5+
  // Can be overridden to 'pbkdf2' for backward compatibility
  return 'argon2id';
}

/**
 * Get KDF configuration
 * 
 * @param kdfType - KDF algorithm type
 * @returns Complete KDF configuration
 */
export function getKDFConfig(kdfType?: KDFType): KDFConfig {
  const type = kdfType || getDefaultKDF();
  return DEFAULT_KDF_CONFIGS[type];
}

// ============================================
// Key Derivation
// ============================================

/**
 * Derive encryption key from master key using specified KDF
 * 
 * @param masterKey - Master encryption key (32 bytes)
 * @param salt - Random salt (16 bytes minimum)
 * @param config - KDF configuration
 * @returns Derived encryption key (32 bytes)
 * 
 * @throws {Error} If KDF type is unsupported
 * @throws {Error} If key derivation fails
 */
export async function deriveKey(
  masterKey: Buffer,
  salt: Buffer,
  config: KDFConfig
): Promise<Buffer> {
  switch (config.type) {
    case 'pbkdf2':
      return deriveKeyPBKDF2(masterKey, salt, config.parameters);
    
    case 'argon2id':
      return deriveKeyArgon2id(masterKey, salt, config.parameters);
    
    default:
      throw new Error(`Unsupported KDF type: ${(config as any).type}`);
  }
}

/**
 * Derive key using PBKDF2-HMAC-SHA256
 * 
 * Legacy KDF from v2.0, maintained for backward compatibility.
 * Good for most use cases, but vulnerable to GPU/ASIC attacks.
 * 
 * @param masterKey - Master encryption key
 * @param salt - Random salt
 * @param params - PBKDF2 parameters
 * @returns Derived key
 */
function deriveKeyPBKDF2(
  masterKey: Buffer,
  salt: Buffer,
  params: KDFParameters
): Buffer {
  const iterations = params.iterations || 100000;
  const hash = params.hash || 'sha256';
  
  return crypto.pbkdf2Sync(
    masterKey,
    salt,
    iterations,
    KEY_LENGTH,
    hash
  );
}

/**
 * Derive key using Argon2id
 * 
 * Modern KDF (v2.5+), winner of Password Hashing Competition 2015.
 * 
 * Properties:
 * - Memory-hard (resists GPU/ASIC attacks)
 * - Time-hard (configurable iterations)
 * - Side-channel resistant
 * 
 * Default parameters:
 * - Memory: 64 MB
 * - Time: 3 iterations
 * - Parallelism: 4 threads
 * 
 * @param masterKey - Master encryption key
 * @param salt - Random salt
 * @param params - Argon2 parameters
 * @returns Derived key
 */
async function deriveKeyArgon2id(
  masterKey: Buffer,
  salt: Buffer,
  params: KDFParameters
): Promise<Buffer> {
  const memoryCost = params.memoryCost || 65536;    // 64 MB
  const timeCost = params.timeCost || 3;            // 3 iterations
  const parallelism = params.parallelism || 4;       // 4 threads
  
  const hash = await argon2.hash(masterKey, {
    type: argon2.argon2id,
    salt,
    memoryCost,
    timeCost,
    parallelism,
    hashLength: KEY_LENGTH,
    raw: true  // Return raw buffer, not encoded string
  });
  
  return Buffer.from(hash);
}

// ============================================
// KDF Selection & Migration
// ============================================

/**
 * Select appropriate KDF for new credentials
 * 
 * Uses environment variable DEFAULT_KDF_TYPE if set,
 * otherwise defaults to argon2id (v2.5+)
 * 
 * @returns KDF configuration for new credentials
 */
export function selectKDFForNewCredential(): KDFConfig {
  const kdfType = getDefaultKDF();
  return getKDFConfig(kdfType);
}

/**
 * Determine if KDF should be upgraded during rotation
 * 
 * @param currentKDF - Current KDF type
 * @param targetKDF - Desired KDF type (default: from env)
 * @returns True if upgrade is recommended
 */
export function shouldUpgradeKDF(
  currentKDF: KDFType,
  targetKDF?: KDFType
): boolean {
  const target = targetKDF || getDefaultKDF();
  
  // Upgrade from PBKDF2 to Argon2id is recommended
  if (currentKDF === 'pbkdf2' && target === 'argon2id') {
    return true;
  }
  
  return false;
}

/**
 * Get KDF algorithm information
 * 
 * Useful for logging, monitoring, and debugging.
 * 
 * @param kdfType - KDF algorithm type
 * @returns Algorithm information
 */
export function getKDFInfo(kdfType: KDFType): {
  name: string;
  version: string;
  description: string;
  securityLevel: 'legacy' | 'modern' | 'future-proof';
  gpuResistance: 'low' | 'medium' | 'high';
  performance: 'fast' | 'moderate' | 'slow';
} {
  switch (kdfType) {
    case 'pbkdf2':
      return {
        name: 'PBKDF2-HMAC-SHA256',
        version: '1.0',
        description: 'Legacy KDF, good for most use cases',
        securityLevel: 'legacy',
        gpuResistance: 'low',
        performance: 'fast'
      };
    
    case 'argon2id':
      return {
        name: 'Argon2id',
        version: '1.3',
        description: 'Modern memory-hard KDF, GPU-resistant',
        securityLevel: 'future-proof',
        gpuResistance: 'high',
        performance: 'moderate'
      };
  }
}

// ============================================
// Exports
// ============================================

export {
  KEY_LENGTH
};

