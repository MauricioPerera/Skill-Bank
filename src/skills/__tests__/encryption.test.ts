/**
 * Tests for encryption module (AES-256-GCM)
 * 
 * @group unit
 * @group credentials
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  encryptCredential,
  decryptCredential,
  generateCredentialId,
  generatePolicyId,
  generateAuditId,
  generateKeyId,
  hashKey,
  verifyMasterKey,
  getAlgorithmInfo
} from '../security/encryption.js';
import {
  ApiKeyCredential,
  OAuthCredential,
  DbConnectionCredential,
  EncryptionError,
  DecryptionError
} from '../types/credentials.js';

describe('Encryption Module', () => {
  // Save original environment
  const originalEnv = process.env.MASTER_ENCRYPTION_KEY;
  
  // Test master key (32 bytes = 64 hex characters)
  const TEST_MASTER_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  
  beforeEach(() => {
    // Set test master key
    process.env.MASTER_ENCRYPTION_KEY = TEST_MASTER_KEY;
  });
  
  afterEach(() => {
    // Restore original environment
    process.env.MASTER_ENCRYPTION_KEY = originalEnv;
  });
  
  // ============================================
  // Basic Encryption/Decryption
  // ============================================
  
  describe('encryptCredential / decryptCredential', () => {
    it('should encrypt and decrypt API key credential', () => {
      const credential: ApiKeyCredential = {
        apiKey: 'sk_test_12345678901234567890',
        apiSecret: 'secret_abc123'
      };
      
      const encrypted = encryptCredential(credential);
      
      // Verify encrypted structure
      expect(encrypted).toHaveProperty('encryptedValue');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('authTag');
      expect(encrypted).toHaveProperty('salt');
      
      // Verify data is actually encrypted (not plaintext)
      expect(encrypted.encryptedValue).not.toContain('sk_test');
      expect(encrypted.encryptedValue).not.toContain('secret_abc');
      
      // Decrypt and verify
      const decrypted = decryptCredential(encrypted) as ApiKeyCredential;
      expect(decrypted).toEqual(credential);
    });
    
    it('should encrypt and decrypt OAuth token credential', () => {
      const credential: OAuthCredential = {
        accessToken: 'ya29.a0AfH6SMBx...',
        refreshToken: 'rt_1234567890',
        expiresAt: '2025-12-01T12:00:00Z',
        tokenType: 'Bearer',
        scopes: ['drive.readonly', 'gmail.send']
      };
      
      const encrypted = encryptCredential(credential);
      const decrypted = decryptCredential(encrypted) as OAuthCredential;
      
      expect(decrypted).toEqual(credential);
      expect(decrypted.scopes).toEqual(['drive.readonly', 'gmail.send']);
    });
    
    it('should encrypt and decrypt database connection credential', () => {
      const credential: DbConnectionCredential = {
        host: 'db.example.com',
        port: 5432,
        database: 'prod_db',
        username: 'app_user',
        password: 'super_secret_password_123',
        ssl: true
      };
      
      const encrypted = encryptCredential(credential);
      
      // Password should not be visible in encrypted form
      expect(encrypted.encryptedValue).not.toContain('super_secret_password');
      
      const decrypted = decryptCredential(encrypted) as DbConnectionCredential;
      expect(decrypted).toEqual(credential);
      expect(decrypted.password).toBe('super_secret_password_123');
    });
    
    it('should use unique salt and IV for each encryption', () => {
      const credential: ApiKeyCredential = {
        apiKey: 'sk_test_same_value'
      };
      
      const encrypted1 = encryptCredential(credential);
      const encrypted2 = encryptCredential(credential);
      
      // Same plaintext should produce different ciphertext
      expect(encrypted1.encryptedValue).not.toBe(encrypted2.encryptedValue);
      expect(encrypted1.salt).not.toBe(encrypted2.salt);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      
      // But both should decrypt to the same value
      const decrypted1 = decryptCredential(encrypted1);
      const decrypted2 = decryptCredential(encrypted2);
      expect(decrypted1).toEqual(decrypted2);
    });
  });
  
  // ============================================
  // Authentication & Tamper Detection
  // ============================================
  
  describe('Authenticated Encryption', () => {
    it('should detect tampering with encrypted value', () => {
      const credential: ApiKeyCredential = {
        apiKey: 'sk_test_12345'
      };
      
      const encrypted = encryptCredential(credential);
      
      // Tamper with encrypted value (flip a bit in the middle)
      const encryptedBuffer = Buffer.from(encrypted.encryptedValue, 'base64');
      encryptedBuffer[0] = encryptedBuffer[0] ^ 0xFF; // Flip all bits of first byte
      
      const tampered = {
        ...encrypted,
        encryptedValue: encryptedBuffer.toString('base64')
      };
      
      // Should throw on decryption (auth tag won't match)
      expect(() => {
        decryptCredential(tampered);
      }).toThrow(DecryptionError);
    });
    
    it('should detect tampering with auth tag', () => {
      const credential: ApiKeyCredential = {
        apiKey: 'sk_test_12345'
      };
      
      const encrypted = encryptCredential(credential);
      
      // Tamper with auth tag
      const tampered = {
        ...encrypted,
        authTag: Buffer.from('0000000000000000', 'hex').toString('base64')
      };
      
      // Should throw on decryption
      expect(() => {
        decryptCredential(tampered);
      }).toThrow(DecryptionError);
    });
    
    it('should fail with wrong master key', () => {
      const credential: ApiKeyCredential = {
        apiKey: 'sk_test_12345'
      };
      
      // Encrypt with one key
      const encrypted = encryptCredential(credential);
      
      // Try to decrypt with different key
      process.env.MASTER_ENCRYPTION_KEY = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      
      expect(() => {
        decryptCredential(encrypted);
      }).toThrow(DecryptionError);
    });
  });
  
  // ============================================
  // Master Key Management
  // ============================================
  
  describe('Master Key', () => {
    it('should throw if master key is not set', () => {
      delete process.env.MASTER_ENCRYPTION_KEY;
      
      expect(() => {
        verifyMasterKey();
      }).toThrow(EncryptionError);
      
      expect(() => {
        encryptCredential({ apiKey: 'test' });
      }).toThrow(EncryptionError);
    });
    
    it('should throw if master key is wrong length', () => {
      // Too short
      process.env.MASTER_ENCRYPTION_KEY = '0123456789abcdef';
      
      expect(() => {
        verifyMasterKey();
      }).toThrow(EncryptionError);
    });
    
    it('should accept valid master key', () => {
      process.env.MASTER_ENCRYPTION_KEY = TEST_MASTER_KEY;
      
      expect(() => {
        verifyMasterKey();
      }).not.toThrow();
      
      expect(verifyMasterKey()).toBe(true);
    });
  });
  
  // ============================================
  // ID Generation
  // ============================================
  
  describe('ID Generation', () => {
    it('should generate unique credential IDs', () => {
      const id1 = generateCredentialId();
      const id2 = generateCredentialId();
      
      expect(id1).toMatch(/^cred_\d+_[a-f0-9]{16}$/);
      expect(id2).toMatch(/^cred_\d+_[a-f0-9]{16}$/);
      expect(id1).not.toBe(id2);
    });
    
    it('should generate unique policy IDs', () => {
      const id1 = generatePolicyId();
      const id2 = generatePolicyId();
      
      expect(id1).toMatch(/^policy_\d+_[a-f0-9]{16}$/);
      expect(id2).toMatch(/^policy_\d+_[a-f0-9]{16}$/);
      expect(id1).not.toBe(id2);
    });
    
    it('should generate unique audit IDs', () => {
      const id1 = generateAuditId();
      const id2 = generateAuditId();
      
      expect(id1).toMatch(/^audit_\d+_[a-f0-9]{16}$/);
      expect(id2).toMatch(/^audit_\d+_[a-f0-9]{16}$/);
      expect(id1).not.toBe(id2);
    });
    
    it('should generate key IDs', () => {
      const id1 = generateKeyId();
      const id2 = generateKeyId();
      
      expect(id1).toMatch(/^key_\d+$/);
      expect(id2).toMatch(/^key_\d+$/);
      // Key IDs might be the same if generated in same millisecond
      // but that's okay for our use case
    });
  });
  
  // ============================================
  // Utility Functions
  // ============================================
  
  describe('Utility Functions', () => {
    it('should hash keys consistently', () => {
      const key = Buffer.from(TEST_MASTER_KEY, 'hex');
      
      const hash1 = hashKey(key);
      const hash2 = hashKey(key);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 = 32 bytes = 64 hex chars
    });
    
    it('should return algorithm info', () => {
      const info = getAlgorithmInfo();
      
      expect(info.algorithm).toBe('aes-256-gcm');
      expect(info.keyLength).toBe(32);
      expect(info.saltLength).toBe(16);
      expect(info.ivLength).toBe(16);
      expect(info.authTagLength).toBe(16);
      expect(info.pbkdf2Iterations).toBe(100000);
    });
  });
  
  // ============================================
  // Edge Cases
  // ============================================
  
  describe('Edge Cases', () => {
    it('should handle empty credential object', () => {
      const credential = {};
      
      const encrypted = encryptCredential(credential);
      const decrypted = decryptCredential(encrypted);
      
      expect(decrypted).toEqual(credential);
    });
    
    it('should handle credential with special characters', () => {
      const credential: ApiKeyCredential = {
        apiKey: 'test\n\r\t"\'\\/@#$%^&*(){}[]<>|~`',
        apiSecret: '🔐💻🚀'
      };
      
      const encrypted = encryptCredential(credential);
      const decrypted = decryptCredential(encrypted) as ApiKeyCredential;
      
      expect(decrypted).toEqual(credential);
    });
    
    it('should handle large credential objects', () => {
      const credential = {
        largeField: 'x'.repeat(10000), // 10KB string
        nested: {
          deep: {
            structure: {
              with: {
                many: {
                  levels: 'value'
                }
              }
            }
          }
        }
      };
      
      const encrypted = encryptCredential(credential);
      const decrypted = decryptCredential(encrypted);
      
      expect(decrypted).toEqual(credential);
    });
  });
});

