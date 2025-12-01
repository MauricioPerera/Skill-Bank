/**
 * E2E Integration tests for Credentials Vault
 * 
 * Tests complete workflows from storage to execution
 * 
 * @group e2e
 * @group credentials
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import {
  initCredentialStore,
  storeCredential,
  retrieveCredential,
  rotateCredential,
  revokeCredential,
  listCredentials,
  getCredentialByName
} from '../store/credentialStore.js';
import {
  grantAccess,
  revokeAccess,
  hasAccess,
  getAccessibleCredentials
} from '../security/accessControl.js';
import {
  getAuditTrail,
  getAuditSummary,
  getFailedAccessAttempts
} from '../security/auditLogger.js';
import { setDbPath, closeDb } from '../store/unifiedStore.js';
import {
  ApiKeyCredential,
  AccessDeniedError
} from '../types/credentials.js';

describe('Credential Vault - E2E Integration', () => {
  const TEST_DB = 'test-credential-e2e.db';
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
  // E2E Test 1: Complete Lifecycle
  // ============================================
  
  it('E2E: Store → Grant → Retrieve → Audit', () => {
    // 1. Store credential
    const credential: ApiKeyCredential = {
      apiKey: 'sk_test_12345',
      apiSecret: 'secret_abc'
    };
    
    const credId = storeCredential('stripe_prod', 'api_key', 'stripe', credential, {
      environment: 'production',
      metadata: {
        owner: 'team@company.com',
        description: 'Production Stripe key'
      }
    });
    
    expect(credId).toBeDefined();
    
    // 2. Grant access to skill
    const policyId = grantAccess(credId, 'payment_skill', 'skill', {
      accessLevel: 'read',
      reason: 'Required for payment processing',
      grantedBy: 'admin@company.com'
    });
    
    expect(policyId).toBeDefined();
    
    // 3. Retrieve credential (with access)
    const retrieved = retrieveCredential(credId, 'payment_skill', 'skill', {
      userId: 'alice@company.com',
      ipAddress: '192.168.1.100'
    });
    
    expect(retrieved.value).toEqual(credential);
    expect(retrieved.name).toBe('stripe_prod');
    expect(retrieved.environment).toBe('production');
    
    // 4. Verify audit trail
    const trail = getAuditTrail(credId);
    
    // Should have: create, grant_access, retrieve
    expect(trail.length).toBeGreaterThanOrEqual(3);
    expect(trail.some(e => e.action === 'create')).toBe(true);
    expect(trail.some(e => e.action === 'grant_access')).toBe(true);
    expect(trail.some(e => e.action === 'retrieve' && e.success)).toBe(true);
    
    const retrieveEntry = trail.find(e => e.action === 'retrieve' && e.success);
    expect(retrieveEntry?.userId).toBe('alice@company.com');
    expect(retrieveEntry?.ipAddress).toBe('192.168.1.100');
  });
  
  // ============================================
  // E2E Test 2: Credential Rotation
  // ============================================
  
  it('E2E: Rotation → Old fails → New succeeds', () => {
    // Store initial credential
    const oldValue: ApiKeyCredential = { apiKey: 'sk_old_12345' };
    const credId = storeCredential('stripe', 'api_key', 'stripe', oldValue);
    
    grantAccess(credId, 'payment_skill', 'skill');
    
    // Verify old value
    let retrieved = retrieveCredential(credId, 'payment_skill', 'skill');
    expect((retrieved.value as ApiKeyCredential).apiKey).toBe('sk_old_12345');
    
    // Rotate to new value
    const newValue: ApiKeyCredential = { apiKey: 'sk_new_67890' };
    rotateCredential(credId, newValue);
    
    // Verify new value
    retrieved = retrieveCredential(credId, 'payment_skill', 'skill');
    expect((retrieved.value as ApiKeyCredential).apiKey).toBe('sk_new_67890');
    
    // Verify audit trail shows rotation
    const trail = getAuditTrail(credId);
    const rotateEntry = trail.find(e => e.action === 'rotate');
    expect(rotateEntry).toBeDefined();
    expect(rotateEntry?.success).toBe(true);
  });
  
  // ============================================
  // E2E Test 3: Multi-Environment
  // ============================================
  
  it('E2E: Dev vs Prod credentials isolated', () => {
    // Store dev credential
    const devValue: ApiKeyCredential = { apiKey: 'sk_test_dev' };
    const devId = storeCredential('stripe', 'api_key', 'stripe', devValue, {
      environment: 'dev'
    });
    
    // Store prod credential
    const prodValue: ApiKeyCredential = { apiKey: 'sk_live_prod' };
    const prodId = storeCredential('stripe', 'api_key', 'stripe', prodValue, {
      environment: 'production'
    });
    
    // Grant access to both
    grantAccess(devId, 'test_skill', 'skill');
    grantAccess(prodId, 'test_skill', 'skill');
    
    // Retrieve by name and environment
    const devCred = getCredentialByName('stripe', 'dev');
    const prodCred = getCredentialByName('stripe', 'production');
    
    expect(devCred.id).toBe(devId);
    expect(prodCred.id).toBe(prodId);
    expect(devCred.environment).toBe('dev');
    expect(prodCred.environment).toBe('production');
    
    // List should show both
    const allStripe = listCredentials({ service: 'stripe' });
    expect(allStripe).toHaveLength(2);
  });
  
  // ============================================
  // E2E Test 4: Security Breach Scenario
  // ============================================
  
  it('E2E: Security breach → Revoke → Audit trail', () => {
    // Store credential
    const credential: ApiKeyCredential = { apiKey: 'sk_compromised' };
    const credId = storeCredential('leaked_key', 'api_key', 'service', credential);
    
    // Grant access to multiple skills
    grantAccess(credId, 'skill_1', 'skill');
    grantAccess(credId, 'skill_2', 'skill');
    grantAccess(credId, 'tool_1', 'tool');
    
    // Skills use it successfully
    retrieveCredential(credId, 'skill_1', 'skill', { userId: 'alice' });
    retrieveCredential(credId, 'skill_2', 'skill', { userId: 'bob' });
    
    // Security breach detected!
    revokeCredential(credId, 'Credential leaked in logs - immediate revocation');
    
    // All further access denied
    expect(() => {
      retrieveCredential(credId, 'skill_1', 'skill');
    }).toThrow(AccessDeniedError);
    
    expect(() => {
      retrieveCredential(credId, 'skill_2', 'skill');
    }).toThrow(AccessDeniedError);
    
    // Audit trail shows complete history
    const trail = getAuditTrail(credId);
    
    expect(trail.some(e => e.action === 'create')).toBe(true);
    expect(trail.some(e => e.action === 'retrieve' && e.success)).toBe(true);
    expect(trail.some(e => e.action === 'revoke')).toBe(true);
    
    // Can track who accessed before revocation
    const successfulAccesses = trail.filter(e => 
      e.action === 'retrieve' && e.success
    );
    expect(successfulAccesses.length).toBe(2);
    expect(successfulAccesses.map(e => e.userId)).toContain('alice');
    expect(successfulAccesses.map(e => e.userId)).toContain('bob');
  });
  
  // ============================================
  // E2E Test 5: Multi-Credential Workflow
  // ============================================
  
  it('E2E: Skill accessing multiple credentials', () => {
    // Store multiple credentials
    const stripeCred: ApiKeyCredential = { apiKey: 'sk_stripe' };
    const openaiCred: ApiKeyCredential = { apiKey: 'sk_openai' };
    const dbCred = {
      host: 'db.example.com',
      port: 5432,
      database: 'prod',
      username: 'user',
      password: 'pass'
    };
    
    const stripeId = storeCredential('stripe', 'api_key', 'stripe', stripeCred);
    const openaiId = storeCredential('openai', 'api_key', 'openai', openaiCred);
    const dbId = storeCredential('postgres', 'db_connection', 'postgres', dbCred);
    
    // Grant all to a complex skill
    grantAccess(stripeId, 'complex_workflow', 'skill');
    grantAccess(openaiId, 'complex_workflow', 'skill');
    grantAccess(dbId, 'complex_workflow', 'skill');
    
    // Skill can list all its credentials
    const accessible = getAccessibleCredentials('complex_workflow', 'skill');
    
    expect(accessible).toHaveLength(3);
    expect(accessible.map(c => c.service)).toContain('stripe');
    expect(accessible.map(c => c.service)).toContain('openai');
    expect(accessible.map(c => c.service)).toContain('postgres');
    
    // Skill can retrieve all of them
    const stripe = retrieveCredential(stripeId, 'complex_workflow', 'skill');
    const openai = retrieveCredential(openaiId, 'complex_workflow', 'skill');
    const db = retrieveCredential(dbId, 'complex_workflow', 'skill');
    
    expect(stripe.value).toEqual(stripeCred);
    expect(openai.value).toEqual(openaiCred);
    expect(db.value).toEqual(dbCred);
    
    // Audit shows 3 successful retrievals
    const summary = getAuditSummary();
    expect(summary.byEntity['complex_workflow']).toBeGreaterThanOrEqual(3);
  });
  
  // ============================================
  // E2E Test 6: Failed Access Monitoring
  // ============================================
  
  it('E2E: Failed access attempts tracked for security', () => {
    // Store credential
    const credential: ApiKeyCredential = { apiKey: 'sk_protected' };
    const credId = storeCredential('protected', 'api_key', 'service', credential);
    
    // Only grant to one skill
    grantAccess(credId, 'authorized_skill', 'skill');
    
    // Authorized access succeeds
    retrieveCredential(credId, 'authorized_skill', 'skill', {
      userId: 'alice',
      ipAddress: '192.168.1.1'
    });
    
    // Multiple unauthorized attempts
    const unauthorizedEntities = [
      'hacker_skill_1',
      'hacker_skill_2',
      'suspicious_tool'
    ];
    
    for (const entityId of unauthorizedEntities) {
      try {
        retrieveCredential(credId, entityId, 'skill', {
          userId: 'attacker',
          ipAddress: '10.0.0.666'
        });
      } catch (error) {
        // Expected to fail
      }
    }
    
    // Get failed attempts
    const failed = getFailedAccessAttempts();
    
    expect(failed.length).toBeGreaterThanOrEqual(3);
    expect(failed.every(e => !e.success)).toBe(true);
    expect(failed.some(e => e.entityId === 'hacker_skill_1')).toBe(true);
    expect(failed.some(e => e.ipAddress === '10.0.0.666')).toBe(true);
    
    // Summary shows failed accesses
    const summary = getAuditSummary();
    expect(summary.failedAccesses).toBeGreaterThanOrEqual(3);
  });
});

