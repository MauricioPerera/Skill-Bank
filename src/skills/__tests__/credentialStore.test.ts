/**
 * Tests for credential store
 * 
 * @group unit
 * @group credentials
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import {
  initCredentialStore,
  storeCredential,
  getCredentialMetadata,
  retrieveCredential,
  listCredentials,
  rotateCredential,
  revokeCredential,
  deleteCredential,
  isCredentialValid,
  getCredentialByName,
  countCredentials
} from '../store/credentialStore.js';
import { setDbPath, closeDb } from '../store/unifiedStore.js';
import {
  ApiKeyCredential,
  OAuthCredential,
  DbConnectionCredential,
  CredentialNotFoundError
} from '../types/credentials.js';

describe('Credential Store', () => {
  const TEST_DB = 'test-credential-store.db';
  const TEST_MASTER_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  
  // Save original environment
  const originalEnv = process.env.MASTER_ENCRYPTION_KEY;
  
  beforeEach(() => {
    // Set test environment
    process.env.MASTER_ENCRYPTION_KEY = TEST_MASTER_KEY;
    
    // Remove test database if exists
    if (fs.existsSync(TEST_DB)) {
      fs.unlinkSync(TEST_DB);
    }
    
    // Initialize test database
    setDbPath(TEST_DB);
    initCredentialStore();
  }, 30000); // 30s timeout for slow encryption initialization
  
  afterEach(() => {
    // Clean up
    closeDb();
    if (fs.existsSync(TEST_DB)) {
      fs.unlinkSync(TEST_DB);
    }
    
    // Restore environment
    process.env.MASTER_ENCRYPTION_KEY = originalEnv;
  });
  
  // ============================================
  // Store & Retrieve
  // ============================================
  
  describe('storeCredential / retrieveCredential', () => {
    it('should store and retrieve API key credential', () => {
      const credential: ApiKeyCredential = {
        apiKey: 'sk_test_12345678901234567890',
        apiSecret: 'secret_abc123'
      };
      
      const id = storeCredential('stripe_test', 'api_key', 'stripe', credential);
      
      expect(id).toMatch(/^cred_\d+_[a-f0-9]{16}$/);
      
      // Retrieve and verify
      const retrieved = retrieveCredential(id);
      expect(retrieved.id).toBe(id);
      expect(retrieved.name).toBe('stripe_test');
      expect(retrieved.type).toBe('api_key');
      expect(retrieved.service).toBe('stripe');
      expect(retrieved.value).toEqual(credential);
      expect(retrieved.environment).toBe('production'); // default
    });
    
    it('should store credential in specific environment', () => {
      const credential: ApiKeyCredential = {
        apiKey: 'sk_test_dev'
      };
      
      const id = storeCredential('stripe_dev', 'api_key', 'stripe', credential, {
        environment: 'dev'
      });
      
      const retrieved = retrieveCredential(id);
      expect(retrieved.environment).toBe('dev');
    });
    
    it('should store credential with metadata', () => {
      const credential: ApiKeyCredential = {
        apiKey: 'sk_test_12345'
      };
      
      const id = storeCredential('stripe_prod', 'api_key', 'stripe', credential, {
        metadata: {
          expiresAt: '2025-12-31T23:59:59Z',
          description: 'Production Stripe key',
          owner: 'team@company.com'
        }
      });
      
      const metadata = getCredentialMetadata(id);
      expect(metadata.metadata).toBeDefined();
      expect(metadata.metadata?.expiresAt).toBe('2025-12-31T23:59:59Z');
      expect(metadata.metadata?.description).toBe('Production Stripe key');
    });
    
    it('should enforce unique name per environment', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test_1' };
      
      // Store in production
      storeCredential('stripe', 'api_key', 'stripe', credential, {
        environment: 'production'
      });
      
      // Store same name in dev - should succeed
      const devId = storeCredential('stripe', 'api_key', 'stripe', credential, {
        environment: 'dev'
      });
      expect(devId).toBeDefined();
      
      // Try to store same name in production again - should fail
      expect(() => {
        storeCredential('stripe', 'api_key', 'stripe', credential, {
          environment: 'production'
        });
      }).toThrow();
    });
  });
  
  // ============================================
  // Metadata Access
  // ============================================
  
  describe('getCredentialMetadata', () => {
    it('should return metadata without decrypting value', () => {
      const credential: ApiKeyCredential = {
        apiKey: 'sk_test_secret_value'
      };
      
      const id = storeCredential('test', 'api_key', 'service', credential);
      
      const metadata = getCredentialMetadata(id);
      
      expect(metadata.id).toBe(id);
      expect(metadata.name).toBe('test');
      expect(metadata.type).toBe('api_key');
      expect(metadata.service).toBe('service');
      expect(metadata.status).toBe('active');
      expect(metadata.createdAt).toBeDefined();
      expect(metadata.updatedAt).toBeDefined();
      
      // Should NOT have the actual value
      expect(metadata).not.toHaveProperty('value');
      expect(metadata).not.toHaveProperty('encryptedValue');
    });
    
    it('should throw if credential not found', () => {
      expect(() => {
        getCredentialMetadata('cred_nonexistent');
      }).toThrow(CredentialNotFoundError);
    });
  });
  
  // ============================================
  // List & Count
  // ============================================
  
  describe('listCredentials / countCredentials', () => {
    beforeEach(() => {
      // Create test credentials
      storeCredential('stripe_prod', 'api_key', 'stripe', { apiKey: 'sk_live_1' }, {
        environment: 'production'
      });
      storeCredential('stripe_dev', 'api_key', 'stripe', { apiKey: 'sk_test_1' }, {
        environment: 'dev'
      });
      storeCredential('openai_prod', 'api_key', 'openai', { apiKey: 'sk_openai_1' }, {
        environment: 'production'
      });
      storeCredential('postgres_prod', 'db_connection', 'postgres', {
        host: 'db.example.com',
        port: 5432,
        database: 'prod',
        username: 'user',
        password: 'pass'
      }, {
        environment: 'production'
      });
    });
    
    it('should list all credentials', () => {
      const credentials = listCredentials();
      
      expect(credentials).toHaveLength(4);
      expect(credentials.every(c => !('value' in c))).toBe(true);
      expect(credentials.every(c => !('encryptedValue' in c))).toBe(true);
    });
    
    it('should filter by service', () => {
      const stripeOnly = listCredentials({ service: 'stripe' });
      
      expect(stripeOnly).toHaveLength(2);
      expect(stripeOnly.every(c => c.service === 'stripe')).toBe(true);
    });
    
    it('should filter by type', () => {
      const apiKeys = listCredentials({ type: 'api_key' });
      
      expect(apiKeys).toHaveLength(3);
      expect(apiKeys.every(c => c.type === 'api_key')).toBe(true);
    });
    
    it('should filter by environment', () => {
      const prodOnly = listCredentials({ environment: 'production' });
      
      expect(prodOnly).toHaveLength(3);
      expect(prodOnly.every(c => c.environment === 'production')).toBe(true);
    });
    
    it('should count credentials with filters', () => {
      expect(countCredentials()).toBe(4);
      expect(countCredentials({ service: 'stripe' })).toBe(2);
      expect(countCredentials({ type: 'db_connection' })).toBe(1);
      expect(countCredentials({ environment: 'production' })).toBe(3);
    });
  });
  
  // ============================================
  // Rotation
  // ============================================
  
  describe('rotateCredential', () => {
    it('should rotate credential value', () => {
      const oldValue: ApiKeyCredential = { apiKey: 'sk_old_value' };
      const newValue: ApiKeyCredential = { apiKey: 'sk_new_value' };
      
      const id = storeCredential('test', 'api_key', 'service', oldValue);
      
      // Verify old value
      let retrieved = retrieveCredential(id);
      expect(retrieved.value).toEqual(oldValue);
      
      // Rotate
      const rotated = rotateCredential(id, newValue);
      expect(rotated).toBe(true);
      
      // Verify new value
      retrieved = retrieveCredential(id);
      expect(retrieved.value).toEqual(newValue);
      
      // Verify metadata updated
      const metadata = getCredentialMetadata(id);
      expect(metadata.lastRotatedAt).toBeDefined();
    });
    
    it('should fail to rotate non-existent credential', () => {
      expect(() => {
        rotateCredential('cred_nonexistent', { apiKey: 'new' });
      }).toThrow(CredentialNotFoundError);
    });
  });
  
  // ============================================
  // Revocation
  // ============================================
  
  describe('revokeCredential', () => {
    it('should revoke credential', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const id = storeCredential('test', 'api_key', 'service', credential);
      
      // Revoke
      const revoked = revokeCredential(id, 'Security breach');
      expect(revoked).toBe(true);
      
      // Should not be retrievable anymore
      expect(() => {
        retrieveCredential(id);
      }).toThrow(CredentialNotFoundError);
      
      // But metadata should still exist
      const metadata = getCredentialMetadata(id);
      expect(metadata.status).toBe('revoked');
    });
    
    it('should return false if credential already revoked', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const id = storeCredential('test', 'api_key', 'service', credential);
      
      revokeCredential(id);
      
      // Try to revoke again
      const result = revokeCredential(id);
      expect(result).toBe(false);
    });
  });
  
  // ============================================
  // Deletion
  // ============================================
  
  describe('deleteCredential', () => {
    it('should permanently delete credential', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const id = storeCredential('test', 'api_key', 'service', credential);
      
      // Delete
      const deleted = deleteCredential(id);
      expect(deleted).toBe(true);
      
      // Should not exist at all
      expect(() => {
        getCredentialMetadata(id);
      }).toThrow(CredentialNotFoundError);
    });
    
    it('should return false if credential does not exist', () => {
      const result = deleteCredential('cred_nonexistent');
      expect(result).toBe(false);
    });
  });
  
  // ============================================
  // Validation & Lookup
  // ============================================
  
  describe('isCredentialValid / getCredentialByName', () => {
    it('should check if credential is valid', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const id = storeCredential('test', 'api_key', 'service', credential);
      
      expect(isCredentialValid(id)).toBe(true);
      expect(isCredentialValid('cred_nonexistent')).toBe(false);
      
      // Revoke and check again
      revokeCredential(id);
      expect(isCredentialValid(id)).toBe(false);
    });
    
    it('should get credential by name and environment', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_prod' };
      storeCredential('stripe', 'api_key', 'stripe', credential, {
        environment: 'production'
      });
      
      const found = getCredentialByName('stripe', 'production');
      expect(found.name).toBe('stripe');
      expect(found.environment).toBe('production');
    });
    
    it('should throw if credential name not found', () => {
      expect(() => {
        getCredentialByName('nonexistent', 'production');
      }).toThrow(CredentialNotFoundError);
    });
  });
  
  // ============================================
  // Complex Credentials
  // ============================================
  
  describe('Complex Credential Types', () => {
    it('should handle OAuth credentials', () => {
      const credential: OAuthCredential = {
        accessToken: 'ya29.a0AfH6SMBx...',
        refreshToken: 'rt_1234567890',
        expiresAt: '2025-12-01T12:00:00Z',
        tokenType: 'Bearer',
        scopes: ['drive.readonly', 'gmail.send']
      };
      
      const id = storeCredential('google_oauth', 'oauth_token', 'google', credential);
      
      const retrieved = retrieveCredential(id);
      expect(retrieved.value).toEqual(credential);
      expect((retrieved.value as OAuthCredential).scopes).toEqual(['drive.readonly', 'gmail.send']);
    });
    
    it('should handle database connection credentials', () => {
      const credential: DbConnectionCredential = {
        host: 'db.example.com',
        port: 5432,
        database: 'prod_db',
        username: 'app_user',
        password: 'super_secret_password',
        ssl: true,
        options: {
          connectionTimeout: 30000,
          poolSize: 10
        }
      };
      
      const id = storeCredential('postgres_prod', 'db_connection', 'postgres', credential);
      
      const retrieved = retrieveCredential(id);
      expect(retrieved.value).toEqual(credential);
      expect((retrieved.value as DbConnectionCredential).password).toBe('super_secret_password');
      expect((retrieved.value as DbConnectionCredential).options?.poolSize).toBe(10);
    });
  });
});

