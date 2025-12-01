/**
 * Tests for access control module
 * 
 * @group unit
 * @group credentials
 * @group access-control
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import {
  grantAccess,
  revokeAccess,
  hasAccess,
  assertAccess,
  getAccessPolicies,
  getAccessibleCredentials,
  getPolicy,
  updateAccessLevel,
  revokeAllAccess,
  countPolicies,
  cleanupExpiredPolicies,
  getPoliciesExpiringSoon
} from '../security/accessControl.js';
import { initCredentialStore, storeCredential, revokeCredential } from '../store/credentialStore.js';
import { setDbPath, closeDb, getDb } from '../store/unifiedStore.js';
import {
  ApiKeyCredential,
  AccessDeniedError,
  CredentialNotFoundError
} from '../types/credentials.js';

describe('Access Control', () => {
  const TEST_DB = 'test-access-control.db';
  const TEST_MASTER_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  
  const originalEnv = process.env.MASTER_ENCRYPTION_KEY;
  
  beforeEach(() => {
    process.env.MASTER_ENCRYPTION_KEY = TEST_MASTER_KEY;
    
    if (fs.existsSync(TEST_DB)) {
      fs.unlinkSync(TEST_DB);
    }
    
    setDbPath(TEST_DB);
    initCredentialStore();
  }, 30000);
  
  afterEach(() => {
    closeDb();
    if (fs.existsSync(TEST_DB)) {
      fs.unlinkSync(TEST_DB);
    }
    
    process.env.MASTER_ENCRYPTION_KEY = originalEnv;
  });
  
  // ============================================
  // Grant & Revoke Access
  // ============================================
  
  describe('grantAccess / revokeAccess', () => {
    it('should grant access to a skill', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const credId = storeCredential('test', 'api_key', 'service', credential);
      
      const policyId = grantAccess(credId, 'payment_skill', 'skill');
      
      expect(policyId).toMatch(/^policy_\d+_[a-f0-9]{16}$/);
      expect(hasAccess(credId, 'payment_skill', 'skill')).toBe(true);
    });
    
    it('should grant access to a tool', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const credId = storeCredential('test', 'api_key', 'service', credential);
      
      grantAccess(credId, 'http_request', 'tool');
      
      expect(hasAccess(credId, 'http_request', 'tool')).toBe(true);
    });
    
    it('should grant access with specific access level', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const credId = storeCredential('test', 'api_key', 'service', credential);
      
      grantAccess(credId, 'admin_skill', 'skill', { accessLevel: 'admin' });
      
      expect(hasAccess(credId, 'admin_skill', 'skill', 'admin')).toBe(true);
    });
    
    it('should grant access with expiration', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const credId = storeCredential('test', 'api_key', 'service', credential);
      
      const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      grantAccess(credId, 'temp_skill', 'skill', { expiresAt: future });
      
      expect(hasAccess(credId, 'temp_skill', 'skill')).toBe(true);
    });
    
    it('should revoke access', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const credId = storeCredential('test', 'api_key', 'service', credential);
      
      grantAccess(credId, 'skill_1', 'skill');
      expect(hasAccess(credId, 'skill_1', 'skill')).toBe(true);
      
      const revoked = revokeAccess(credId, 'skill_1', 'skill');
      expect(revoked).toBe(true);
      expect(hasAccess(credId, 'skill_1', 'skill')).toBe(false);
    });
    
    it('should return false when revoking non-existent access', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const credId = storeCredential('test', 'api_key', 'service', credential);
      
      const revoked = revokeAccess(credId, 'never_had_access', 'skill');
      expect(revoked).toBe(false);
    });
    
    it('should throw when granting access to non-existent credential', () => {
      expect(() => {
        grantAccess('cred_nonexistent', 'skill_1', 'skill');
      }).toThrow(CredentialNotFoundError);
    });
  });
  
  // ============================================
  // Permission Checking
  // ============================================
  
  describe('hasAccess / assertAccess', () => {
    it('should return false for no access', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const credId = storeCredential('test', 'api_key', 'service', credential);
      
      expect(hasAccess(credId, 'skill_1', 'skill')).toBe(false);
    });
    
    it('should respect access level hierarchy', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const credId = storeCredential('test', 'api_key', 'service', credential);
      
      // Grant 'write' access
      grantAccess(credId, 'skill_1', 'skill', { accessLevel: 'write' });
      
      // Should have 'read' and 'write', but not 'admin'
      expect(hasAccess(credId, 'skill_1', 'skill', 'read')).toBe(true);
      expect(hasAccess(credId, 'skill_1', 'skill', 'write')).toBe(true);
      expect(hasAccess(credId, 'skill_1', 'skill', 'admin')).toBe(false);
    });
    
    it('should deny access to expired policies', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const credId = storeCredential('test', 'api_key', 'service', credential);
      
      // Grant access with past expiration
      const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      grantAccess(credId, 'skill_1', 'skill', { expiresAt: past });
      
      expect(hasAccess(credId, 'skill_1', 'skill')).toBe(false);
    });
    
    it('should deny access to revoked credentials', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const credId = storeCredential('test', 'api_key', 'service', credential);
      
      grantAccess(credId, 'skill_1', 'skill');
      expect(hasAccess(credId, 'skill_1', 'skill')).toBe(true);
      
      // Revoke the credential
      revokeCredential(credId);
      
      expect(hasAccess(credId, 'skill_1', 'skill')).toBe(false);
    });
    
    it('should throw AccessDeniedError when using assertAccess', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const credId = storeCredential('test', 'api_key', 'service', credential);
      
      expect(() => {
        assertAccess(credId, 'unauthorized_skill', 'skill');
      }).toThrow(AccessDeniedError);
    });
    
    it('should not throw when assertAccess succeeds', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const credId = storeCredential('test', 'api_key', 'service', credential);
      
      grantAccess(credId, 'authorized_skill', 'skill');
      
      expect(() => {
        assertAccess(credId, 'authorized_skill', 'skill');
      }).not.toThrow();
    });
  });
  
  // ============================================
  // Policy Queries
  // ============================================
  
  describe('Policy Queries', () => {
    it('should get all policies for a credential', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const credId = storeCredential('test', 'api_key', 'service', credential);
      
      grantAccess(credId, 'skill_1', 'skill');
      grantAccess(credId, 'skill_2', 'skill');
      grantAccess(credId, 'tool_1', 'tool');
      
      const policies = getAccessPolicies(credId);
      
      expect(policies).toHaveLength(3);
      expect(policies.every(p => p.credentialId === credId)).toBe(true);
    });
    
    it('should get accessible credentials for an entity', () => {
      const cred1: ApiKeyCredential = { apiKey: 'sk_1' };
      const cred2: ApiKeyCredential = { apiKey: 'sk_2' };
      
      const id1 = storeCredential('stripe', 'api_key', 'stripe', cred1);
      const id2 = storeCredential('openai', 'api_key', 'openai', cred2);
      
      grantAccess(id1, 'payment_skill', 'skill');
      grantAccess(id2, 'payment_skill', 'skill');
      
      const accessible = getAccessibleCredentials('payment_skill', 'skill');
      
      expect(accessible).toHaveLength(2);
      expect(accessible.map(c => c.service)).toContain('stripe');
      expect(accessible.map(c => c.service)).toContain('openai');
    });
    
    it('should get specific policy', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const credId = storeCredential('test', 'api_key', 'service', credential);
      
      grantAccess(credId, 'skill_1', 'skill', { reason: 'Testing purposes' });
      
      const policy = getPolicy(credId, 'skill_1', 'skill');
      
      expect(policy).not.toBeNull();
      expect(policy?.credentialId).toBe(credId);
      expect(policy?.entityId).toBe('skill_1');
      expect(policy?.reason).toBe('Testing purposes');
    });
    
    it('should return null for non-existent policy', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const credId = storeCredential('test', 'api_key', 'service', credential);
      
      const policy = getPolicy(credId, 'nonexistent_skill', 'skill');
      
      expect(policy).toBeNull();
    });
  });
  
  // ============================================
  // Policy Management
  // ============================================
  
  describe('Policy Management', () => {
    it('should update access level', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const credId = storeCredential('test', 'api_key', 'service', credential);
      
      grantAccess(credId, 'skill_1', 'skill', { accessLevel: 'read' });
      expect(hasAccess(credId, 'skill_1', 'skill', 'write')).toBe(false);
      
      updateAccessLevel(credId, 'skill_1', 'skill', 'admin');
      
      expect(hasAccess(credId, 'skill_1', 'skill', 'admin')).toBe(true);
    });
    
    it('should revoke all access for a credential', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const credId = storeCredential('test', 'api_key', 'service', credential);
      
      grantAccess(credId, 'skill_1', 'skill');
      grantAccess(credId, 'skill_2', 'skill');
      grantAccess(credId, 'tool_1', 'tool');
      
      const revoked = revokeAllAccess(credId);
      expect(revoked).toBe(3);
      
      expect(hasAccess(credId, 'skill_1', 'skill')).toBe(false);
      expect(hasAccess(credId, 'skill_2', 'skill')).toBe(false);
      expect(hasAccess(credId, 'tool_1', 'tool')).toBe(false);
    });
    
    it('should count policies', () => {
      const cred1: ApiKeyCredential = { apiKey: 'sk_1' };
      const cred2: ApiKeyCredential = { apiKey: 'sk_2' };
      
      const id1 = storeCredential('stripe', 'api_key', 'stripe', cred1);
      const id2 = storeCredential('openai', 'api_key', 'openai', cred2);
      
      grantAccess(id1, 'skill_1', 'skill');
      grantAccess(id1, 'skill_2', 'skill');
      grantAccess(id2, 'skill_1', 'skill');
      
      expect(countPolicies()).toBe(3);
      expect(countPolicies({ credentialId: id1 })).toBe(2);
      expect(countPolicies({ entityId: 'skill_1' })).toBe(2);
    });
    
    it('should cleanup expired policies', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const credId = storeCredential('test', 'api_key', 'service', credential);
      
      // Grant access with past expiration
      const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      grantAccess(credId, 'skill_1', 'skill', { expiresAt: past });
      
      // Grant access with future expiration
      const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      grantAccess(credId, 'skill_2', 'skill', { expiresAt: future });
      
      const cleaned = cleanupExpiredPolicies();
      
      expect(cleaned).toBe(1);
      expect(hasAccess(credId, 'skill_1', 'skill')).toBe(false);
      expect(hasAccess(credId, 'skill_2', 'skill')).toBe(true);
    });
    
    it('should get policies expiring soon', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const credId = storeCredential('test', 'api_key', 'service', credential);
      
      // Expires in 3 days
      const soon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      grantAccess(credId, 'skill_1', 'skill', { expiresAt: soon });
      
      // Expires in 30 days
      const later = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      grantAccess(credId, 'skill_2', 'skill', { expiresAt: later });
      
      const expiringSoon = getPoliciesExpiringSoon(7); // Within 7 days
      
      expect(expiringSoon).toHaveLength(1);
      expect(expiringSoon[0].entityId).toBe('skill_1');
    });
  });
});

