/**
 * Demo: Credential Vault v2.0
 * 
 * Demonstrates the complete credential management system:
 * - Storing encrypted credentials
 * - Granting scoped access
 * - Retrieving with permission checks
 * - Complete audit trail
 */

import 'dotenv/config';
import {
  initCredentialStore,
  storeCredential,
  getCredentialMetadata,
  retrieveCredential,
  listCredentials,
  rotateCredential,
  revokeCredential,
  isCredentialValid
} from '../src/skills/store/credentialStore.js';
import {
  grantAccess,
  revokeAccess,
  hasAccess,
  getAccessPolicies,
  getAccessibleCredentials
} from '../src/skills/security/accessControl.js';
import {
  getAuditTrail,
  getAuditSummary,
  getFailedAccessAttempts
} from '../src/skills/security/auditLogger.js';
import { setDbPath } from '../src/skills/store/unifiedStore.js';
import type { ApiKeyCredential, OAuthCredential, DbConnectionCredential } from '../src/skills/types/credentials.js';

// ============================================
// Setup
// ============================================

console.log('🔐 Skill Bank v2.0 - Credential Vault Demo\n');
console.log('═══════════════════════════════════════════\n');

// Use demo database
setDbPath('credentials-demo.db');

// Ensure master key is set
if (!process.env.MASTER_ENCRYPTION_KEY) {
  console.error('❌ ERROR: MASTER_ENCRYPTION_KEY not set');
  console.log('\nGenerate one with:');
  console.log('  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  console.log('\nThen add to .env:');
  console.log('  MASTER_ENCRYPTION_KEY=<your-key>');
  process.exit(1);
}

// Initialize store
initCredentialStore();

console.log('✅ Database initialized\n');

// ============================================
// STEP 1: Store Credentials
// ============================================

console.log('📝 STEP 1: Storing Encrypted Credentials');
console.log('─────────────────────────────────────────\n');

// Store Stripe API key
const stripeCredential: ApiKeyCredential = {
  apiKey: 'sk_live_51HxY6...',
  apiSecret: 'whsec_abc123...'
};

const stripeId = storeCredential(
  'stripe_production',
  'api_key',
  'stripe',
  stripeCredential,
  {
    environment: 'production',
    metadata: {
      owner: 'payments-team@company.com',
      expiresAt: '2026-12-31T23:59:59Z',
      description: 'Production Stripe API credentials'
    }
  }
);

console.log(`✅ Stored Stripe credential: ${stripeId}`);

// Store OpenAI API key
const openaiCredential: ApiKeyCredential = {
  apiKey: 'sk-proj-abc123def456...'
};

const openaiId = storeCredential(
  'openai_production',
  'api_key',
  'openai',
  openaiCredential,
  {
    environment: 'production',
    metadata: {
      owner: 'ai-team@company.com',
      description: 'Production OpenAI API key'
    }
  }
);

console.log(`✅ Stored OpenAI credential: ${openaiId}`);

// Store Google OAuth tokens
const googleOAuthCredential: OAuthCredential = {
  accessToken: 'ya29.a0AfH6SMBx...',
  refreshToken: 'rt_1234567890abcdef',
  expiresAt: '2025-12-01T12:00:00Z',
  tokenType: 'Bearer',
  scopes: ['drive.readonly', 'gmail.send']
};

const googleId = storeCredential(
  'google_oauth',
  'oauth_token',
  'google',
  googleOAuthCredential,
  {
    environment: 'production'
  }
);

console.log(`✅ Stored Google OAuth: ${googleId}`);

// Store Database credentials
const postgresCredential: DbConnectionCredential = {
  host: 'db.company.com',
  port: 5432,
  database: 'production_db',
  username: 'app_user',
  password: 'very_secure_password_123!',
  ssl: true,
  options: {
    connectionTimeout: 30000,
    poolSize: 10
  }
};

const postgresId = storeCredential(
  'postgres_production',
  'db_connection',
  'postgres',
  postgresCredential,
  {
    environment: 'production',
    metadata: {
      owner: 'backend-team@company.com'
    }
  }
);

console.log(`✅ Stored Postgres credential: ${postgresId}\n`);

// ============================================
// STEP 2: Grant Access (Scoped Permissions)
// ============================================

console.log('🔒 STEP 2: Granting Scoped Access');
console.log('─────────────────────────────────────────\n');

// Grant payment skill access to Stripe
grantAccess(stripeId, 'payment_handler_skill', 'skill', {
  accessLevel: 'read',
  reason: 'Required for processing payments',
  grantedBy: 'admin@company.com'
});
console.log('✅ Granted: payment_handler_skill → Stripe (read)');

// Grant AI skill access to OpenAI
grantAccess(openaiId, 'ai_assistant_skill', 'skill', {
  accessLevel: 'read',
  reason: 'Required for LLM completions',
  grantedBy: 'admin@company.com'
});
console.log('✅ Granted: ai_assistant_skill → OpenAI (read)');

// Grant email skill access to Google OAuth
grantAccess(googleId, 'email_sender_skill', 'skill', {
  accessLevel: 'read',
  reason: 'Required for sending emails',
  grantedBy: 'admin@company.com'
});
console.log('✅ Granted: email_sender_skill → Google OAuth (read)');

// Grant database skill access to Postgres
grantAccess(postgresId, 'data_analyzer_skill', 'skill', {
  accessLevel: 'read',
  reason: 'Required for data analysis',
  grantedBy: 'admin@company.com'
});
console.log('✅ Granted: data_analyzer_skill → Postgres (read)');

// Grant admin skill full access to Stripe
grantAccess(stripeId, 'admin_tool', 'tool', {
  accessLevel: 'admin',
  reason: 'Administrative operations',
  grantedBy: 'admin@company.com'
});
console.log('✅ Granted: admin_tool → Stripe (admin)\n');

// ============================================
// STEP 3: Retrieve Credentials (With Access Check)
// ============================================

console.log('🔓 STEP 3: Retrieving Credentials');
console.log('─────────────────────────────────────────\n');

// Authorized retrieval
console.log('Authorized Retrieval:');
const stripeForPayment = retrieveCredential(
  stripeId,
  'payment_handler_skill',
  'skill',
  {
    userId: 'alice@company.com',
    ipAddress: '192.168.1.100'
  }
);
console.log(`✅ payment_handler_skill retrieved Stripe`);
console.log(`   Service: ${stripeForPayment.service}`);
console.log(`   Type: ${stripeForPayment.type}`);
console.log(`   API Key: ${(stripeForPayment.value as ApiKeyCredential).apiKey.substring(0, 15)}...`);

// Try unauthorized retrieval
console.log('\nUnauthorized Retrieval:');
try {
  retrieveCredential(
    openaiId,
    'payment_handler_skill',  // Wrong skill
    'skill',
    {
      userId: 'bob@company.com',
      ipAddress: '10.0.0.1'
    }
  );
  console.log('❌ Should have been denied!');
} catch (error: any) {
  console.log(`✅ Access denied (as expected): ${error.message}`);
}

console.log();

// ============================================
// STEP 4: List Credentials & Check Access
// ============================================

console.log('📋 STEP 4: Listing & Access Checks');
console.log('─────────────────────────────────────────\n');

// List all credentials (metadata only)
const allCredentials = listCredentials();
console.log(`Total credentials: ${allCredentials.length}`);
for (const cred of allCredentials) {
  console.log(`  • ${cred.name} (${cred.service}) - ${cred.environment}`);
}

// List credentials accessible by a skill
console.log('\nCredentials accessible by payment_handler_skill:');
const paymentSkillCreds = getAccessibleCredentials('payment_handler_skill', 'skill');
for (const cred of paymentSkillCreds) {
  console.log(`  • ${cred.credentialName} (${cred.service}) - ${cred.accessLevel} access`);
}

// Check specific access
console.log('\nAccess checks:');
console.log(`  payment_handler_skill → Stripe: ${hasAccess(stripeId, 'payment_handler_skill', 'skill') ? '✅ Yes' : '❌ No'}`);
console.log(`  payment_handler_skill → OpenAI: ${hasAccess(openaiId, 'payment_handler_skill', 'skill') ? '✅ Yes' : '❌ No'}`);
console.log(`  ai_assistant_skill → OpenAI: ${hasAccess(openaiId, 'ai_assistant_skill', 'skill') ? '✅ Yes' : '❌ No'}`);

console.log();

// ============================================
// STEP 5: Credential Rotation
// ============================================

console.log('🔄 STEP 5: Credential Rotation');
console.log('─────────────────────────────────────────\n');

// Rotate Stripe key
const newStripeCredential: ApiKeyCredential = {
  apiKey: 'sk_live_NEW_KEY_789xyz...',
  apiSecret: 'whsec_NEW_SECRET...'
};

rotateCredential(stripeId, newStripeCredential);
console.log('✅ Rotated Stripe credential to new key');

// Verify rotation
const rotatedMeta = getCredentialMetadata(stripeId);
console.log(`   Last rotated: ${rotatedMeta.lastRotatedAt}`);

console.log();

// ============================================
// STEP 6: Audit Trail
// ============================================

console.log('📊 STEP 6: Audit Trail & Analytics');
console.log('─────────────────────────────────────────\n');

// Get audit trail for Stripe credential
const stripeAudit = getAuditTrail(stripeId, { limit: 5 });
console.log(`Stripe credential audit trail (last ${stripeAudit.length} entries):`);
for (const entry of stripeAudit) {
  const status = entry.success ? '✅' : '❌';
  console.log(`  ${status} ${entry.action} by ${entry.entityId} at ${entry.timestamp}`);
  if (entry.userId) {
    console.log(`     User: ${entry.userId}`);
  }
  if (entry.errorMessage) {
    console.log(`     Error: ${entry.errorMessage}`);
  }
}

// Get failed access attempts (security monitoring)
console.log('\nFailed access attempts (security monitoring):');
const failedAttempts = getFailedAccessAttempts({ limit: 5 });
for (const attempt of failedAttempts) {
  console.log(`  ❌ ${attempt.action} on ${attempt.credentialId}`);
  console.log(`     Entity: ${attempt.entityId} (${attempt.entityType})`);
  console.log(`     User: ${attempt.userId || 'N/A'}`);
  console.log(`     IP: ${attempt.ipAddress || 'N/A'}`);
  console.log(`     Error: ${attempt.errorMessage}`);
}

// Get audit summary
console.log('\nAudit Summary:');
const summary = getAuditSummary();
console.log(`  Total accesses: ${summary.totalAccesses}`);
console.log(`  Failed accesses: ${summary.failedAccesses}`);
console.log(`  Last access: ${summary.lastAccessAt}`);
console.log('\n  By Action:');
for (const [action, count] of Object.entries(summary.byAction)) {
  console.log(`    • ${action}: ${count}`);
}

console.log();

// ============================================
// STEP 7: Revoke Access & Credential
// ============================================

console.log('🚫 STEP 7: Revoking Access');
console.log('─────────────────────────────────────────\n');

// Revoke access
revokeAccess(googleId, 'email_sender_skill', 'skill');
console.log('✅ Revoked: email_sender_skill → Google OAuth');

// Verify revocation
console.log(`   Can still access? ${hasAccess(googleId, 'email_sender_skill', 'skill') ? '✅ Yes' : '❌ No'}`);

// Revoke entire credential (security breach scenario)
console.log('\nSecurity Breach Scenario:');
revokeCredential(postgresId, 'Suspected credential leak - rotating immediately');
console.log('🚨 Revoked Postgres credential (security breach)');
console.log(`   Is valid? ${isCredentialValid(postgresId) ? '✅ Yes' : '❌ No'}`);

console.log();

// ============================================
// Summary
// ============================================

console.log('✨ DEMO COMPLETE!');
console.log('═══════════════════════════════════════════\n');

console.log('What we demonstrated:');
console.log('  1. ✅ Encrypted credential storage (4 types)');
console.log('  2. ✅ Scoped access control (5 grants)');
console.log('  3. ✅ Permission-checked retrieval');
console.log('  4. ✅ Access denied for unauthorized entities');
console.log('  5. ✅ Credential rotation');
console.log('  6. ✅ Complete audit trail');
console.log('  7. ✅ Failed access monitoring');
console.log('  8. ✅ Access revocation');
console.log('  9. ✅ Credential revocation\n');

console.log('Security Features:');
console.log('  • AES-256-GCM encryption at rest');
console.log('  • Policy-based access control');
console.log('  • Complete audit trail (100% coverage)');
console.log('  • User and IP tracking');
console.log('  • Multi-environment support');
console.log('  • Key rotation without downtime\n');

console.log('Check the database: credentials-demo.db');
console.log('All credentials are encrypted!');
console.log('\nView audit trail with:');
console.log('  npm run demo:credentials\n');

