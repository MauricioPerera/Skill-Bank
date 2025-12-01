/**
 * Tests for audit trail
 * 
 * @group unit
 * @group credentials
 * @group audit
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import {
  logCredentialAccess,
  getAuditTrail,
  getAuditTrailForEntity,
  getAuditTrailForUser,
  getRecentAuditEntries,
  getAuditSummary,
  getFailedAccessAttempts,
  countAuditEntries,
  cleanupOldAuditEntries
} from '../security/auditLogger.js';
import {
  initCredentialStore,
  storeCredential,
  retrieveCredential,
  rotateCredential,
  revokeCredential
} from '../store/credentialStore.js';
import { grantAccess, revokeAccess } from '../security/accessControl.js';
import { setDbPath, closeDb } from '../store/unifiedStore.js';
import { ApiKeyCredential } from '../types/credentials.js';

describe('Audit Trail', () => {
  const TEST_DB = 'test-audit-trail.db';
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
  // Manual Logging
  // ============================================
  
  describe('Manual Logging', () => {
    it('should log credential access manually', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const credId = storeCredential('test', 'api_key', 'service', credential);
      
      // Manually log an access
      logCredentialAccess(credId, 'test_skill', 'skill', 'retrieve', true, {
        userId: 'user123',
        ipAddress: '192.168.1.1'
      });
      
      const trail = getAuditTrail(credId);
      
      // Creation + manual log = 2 entries
      expect(trail.length).toBeGreaterThanOrEqual(1);
      const retrieveEntry = trail.find(e => e.action === 'retrieve');
      expect(retrieveEntry).toBeDefined();
      expect(retrieveEntry?.success).toBe(true);
      expect(retrieveEntry?.userId).toBe('user123');
      expect(retrieveEntry?.ipAddress).toBe('192.168.1.1');
    });
    
    it('should log failed access attempts', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const credId = storeCredential('test', 'api_key', 'service', credential);
      
      // Log failed access
      logCredentialAccess(credId, 'unauthorized_skill', 'skill', 'retrieve', false, {
        errorMessage: 'Access denied'
      });
      
      const trail = getAuditTrail(credId);
      const failedEntry = trail.find(e => e.success === false);
      
      expect(failedEntry).toBeDefined();
      expect(failedEntry?.errorMessage).toBe('Access denied');
    });
  });
  
  // ============================================
  // Automatic Logging (Integration)
  // ============================================
  
  describe('Automatic Logging', () => {
    it('should log successful credential retrieval', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const credId = storeCredential('test', 'api_key', 'service', credential);
      
      grantAccess(credId, 'test_skill', 'skill');
      retrieveCredential(credId, 'test_skill', 'skill', { userId: 'alice' });
      
      const trail = getAuditTrail(credId);
      const retrieveEntry = trail.find(e => e.action === 'retrieve' && e.success);
      
      expect(retrieveEntry).toBeDefined();
      expect(retrieveEntry?.entityId).toBe('test_skill');
      expect(retrieveEntry?.userId).toBe('alice');
      expect(retrieveEntry?.success).toBe(true);
    });
    
    it('should log failed credential retrieval (no access)', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const credId = storeCredential('test', 'api_key', 'service', credential);
      
      // Try to retrieve without granting access
      try {
        retrieveCredential(credId, 'unauthorized_skill', 'skill', {
          userId: 'bob',
          ipAddress: '10.0.0.1'
        });
      } catch (error) {
        // Expected to fail
      }
      
      const trail = getAuditTrail(credId);
      const failedEntry = trail.find(e => e.action === 'retrieve' && !e.success);
      
      expect(failedEntry).toBeDefined();
      expect(failedEntry?.entityId).toBe('unauthorized_skill');
      expect(failedEntry?.userId).toBe('bob');
      expect(failedEntry?.ipAddress).toBe('10.0.0.1');
      expect(failedEntry?.success).toBe(false);
    });
    
    it('should log credential rotation', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_old' };
      const credId = storeCredential('test', 'api_key', 'service', credential);
      
      rotateCredential(credId, { apiKey: 'sk_new' });
      
      const trail = getAuditTrail(credId);
      const rotateEntry = trail.find(e => e.action === 'rotate');
      
      expect(rotateEntry).toBeDefined();
      expect(rotateEntry?.success).toBe(true);
    });
    
    it('should log credential revocation', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const credId = storeCredential('test', 'api_key', 'service', credential);
      
      revokeCredential(credId, 'Security breach');
      
      const trail = getAuditTrail(credId);
      const revokeEntry = trail.find(e => e.action === 'revoke');
      
      expect(revokeEntry).toBeDefined();
      expect(revokeEntry?.success).toBe(true);
      expect(revokeEntry?.metadata?.reason).toBe('Security breach');
    });
    
    it('should log access grant', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const credId = storeCredential('test', 'api_key', 'service', credential);
      
      grantAccess(credId, 'test_skill', 'skill', { reason: 'Required for testing' });
      
      const trail = getAuditTrail(credId);
      const grantEntry = trail.find(e => e.action === 'grant_access');
      
      expect(grantEntry).toBeDefined();
      expect(grantEntry?.success).toBe(true);
      expect(grantEntry?.metadata?.reason).toBe('Required for testing');
    });
    
    it('should log access revocation', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const credId = storeCredential('test', 'api_key', 'service', credential);
      
      grantAccess(credId, 'test_skill', 'skill');
      revokeAccess(credId, 'test_skill', 'skill');
      
      const trail = getAuditTrail(credId);
      const revokeEntry = trail.find(e => e.action === 'revoke_access');
      
      expect(revokeEntry).toBeDefined();
      expect(revokeEntry?.success).toBe(true);
    });
  });
  
  // ============================================
  // Audit Queries
  // ============================================
  
  describe('Audit Queries', () => {
    it('should get audit trail with filters', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const credId = storeCredential('test', 'api_key', 'service', credential);
      
      grantAccess(credId, 'skill_1', 'skill');
      grantAccess(credId, 'skill_2', 'skill');
      retrieveCredential(credId, 'skill_1', 'skill');
      
      // Filter by action
      const retrieveOnly = getAuditTrail(credId, { action: 'retrieve' });
      expect(retrieveOnly.every(e => e.action === 'retrieve')).toBe(true);
      
      // Filter by entity
      const skill1Only = getAuditTrail(credId, { entityId: 'skill_1' });
      expect(skill1Only.every(e => e.entityId === 'skill_1')).toBe(true);
      
      // Filter success only
      const successOnly = getAuditTrail(credId, { successOnly: true });
      expect(successOnly.every(e => e.success)).toBe(true);
    });
    
    it('should get audit trail for entity', () => {
      const cred1: ApiKeyCredential = { apiKey: 'sk_1' };
      const cred2: ApiKeyCredential = { apiKey: 'sk_2' };
      
      const id1 = storeCredential('stripe', 'api_key', 'stripe', cred1);
      const id2 = storeCredential('openai', 'api_key', 'openai', cred2);
      
      grantAccess(id1, 'payment_skill', 'skill');
      grantAccess(id2, 'payment_skill', 'skill');
      retrieveCredential(id1, 'payment_skill', 'skill');
      
      const trail = getAuditTrailForEntity('payment_skill', 'skill');
      
      expect(trail.length).toBeGreaterThan(0);
      expect(trail.every(e => e.entityId === 'payment_skill')).toBe(true);
    });
    
    it('should get audit trail for user', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const credId = storeCredential('test', 'api_key', 'service', credential);
      
      grantAccess(credId, 'skill_1', 'skill');
      retrieveCredential(credId, 'skill_1', 'skill', { userId: 'alice' });
      retrieveCredential(credId, 'skill_1', 'skill', { userId: 'alice' });
      
      const trail = getAuditTrailForUser('alice');
      
      expect(trail.length).toBe(2);
      expect(trail.every(e => e.userId === 'alice')).toBe(true);
    });
    
    it('should get recent audit entries', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const credId = storeCredential('test', 'api_key', 'service', credential);
      
      grantAccess(credId, 'skill_1', 'skill');
      
      const recent = getRecentAuditEntries({ limit: 10 });
      
      expect(recent.length).toBeGreaterThan(0);
      expect(recent.length).toBeLessThanOrEqual(10);
    });
  });
  
  // ============================================
  // Analytics & Summary
  // ============================================
  
  describe('Analytics', () => {
    it('should generate audit summary', () => {
      const cred1: ApiKeyCredential = { apiKey: 'sk_1' };
      const cred2: ApiKeyCredential = { apiKey: 'sk_2' };
      
      const id1 = storeCredential('stripe', 'api_key', 'stripe', cred1);
      const id2 = storeCredential('openai', 'api_key', 'openai', cred2);
      
      grantAccess(id1, 'skill_1', 'skill');
      grantAccess(id2, 'skill_1', 'skill');
      retrieveCredential(id1, 'skill_1', 'skill');
      
      // Try failed access
      try {
        retrieveCredential(id2, 'unauthorized', 'skill');
      } catch (error) {
        // Expected
      }
      
      const summary = getAuditSummary();
      
      expect(summary.totalAccesses).toBeGreaterThan(0);
      expect(summary.byCredential[id1]).toBeGreaterThan(0);
      expect(summary.byEntity['skill_1']).toBeGreaterThan(0);
      expect(summary.byAction['create']).toBeGreaterThan(0);
      expect(summary.failedAccesses).toBeGreaterThan(0);
      expect(summary.lastAccessAt).toBeDefined();
    });
    
    it('should get failed access attempts', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const credId = storeCredential('test', 'api_key', 'service', credential);
      
      // Try failed access
      try {
        retrieveCredential(credId, 'unauthorized', 'skill');
      } catch (error) {
        // Expected
      }
      
      const failed = getFailedAccessAttempts();
      
      expect(failed.length).toBeGreaterThan(0);
      expect(failed.every(e => !e.success)).toBe(true);
    });
    
    it('should count audit entries', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const credId = storeCredential('test', 'api_key', 'service', credential);
      
      grantAccess(credId, 'skill_1', 'skill');
      retrieveCredential(credId, 'skill_1', 'skill');
      
      const totalCount = countAuditEntries();
      expect(totalCount).toBeGreaterThan(0);
      
      const retrieveCount = countAuditEntries({ action: 'retrieve' });
      expect(retrieveCount).toBeGreaterThan(0);
      
      const successCount = countAuditEntries({ success: true });
      expect(successCount).toBeGreaterThan(0);
    });
  });
  
  // ============================================
  // Cleanup
  // ============================================
  
  describe('Cleanup', () => {
    it('should cleanup old audit entries', () => {
      const credential: ApiKeyCredential = { apiKey: 'sk_test' };
      const credId = storeCredential('test', 'api_key', 'service', credential);
      
      grantAccess(credId, 'skill_1', 'skill');
      
      const beforeCount = countAuditEntries();
      
      // Clean up entries older than 0 days (should remove all)
      const removed = cleanupOldAuditEntries(0);
      
      expect(removed).toBe(beforeCount);
      expect(countAuditEntries()).toBe(0);
    });
  });
});

