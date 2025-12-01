# 🔐 Skill Bank v2.0 - Credentials Vault Design

**Target Release:** Q2 2025  
**Layer:** Layer 3 - Credentials & Security  
**Status:** 📋 Design Phase  
**Estimated Effort:** 40-50 hours

---

## 🎯 Objectives

Implement a **secure credentials management system** that enables:

1. **Safe storage** of API keys, OAuth tokens, DB credentials
2. **Scoped access** - skills only access credentials they need
3. **Audit trail** - complete log of credential usage
4. **Encryption at rest** - secure storage in SQLite
5. **Rotation support** - update credentials without downtime
6. **Multi-environment** - dev, staging, production credentials

### What v2.0 is NOT

- ❌ Not a full secrets manager (like HashiCorp Vault)
- ❌ Not distributed/multi-server
- ❌ Not for user passwords (only service credentials)
- ❌ Not replacing existing auth systems

### What v2.0 IS

- ✅ Credential storage for tool execution
- ✅ Scoped access per skill
- ✅ Audit logging for compliance
- ✅ Simple key rotation
- ✅ Foundation for enterprise use

---

## 🏗️ Architecture

### Layer 3 Position in Stack

```
Layer 6: Memory & Learning ⭐     [v1.5 - Implemented]
Layer 5: Documents 📚            [v1.5 - Implemented]
Layer 4: Sub-Agents 🤖           [v3.0 - Planned]
Layer 3: Credentials 🔐          [v2.0 - THIS DESIGN]
Layer 2: Skills                  [v1.5 - Implemented]
Layer 1: Tools                   [v1.5 - Implemented]
```

### Component Overview

```
┌─────────────────────────────────────────────────────┐
│                 Skill Executor                      │
│  (needs credentials to call external APIs)          │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│            Credential Resolver                      │
│  - Check if skill has access                        │
│  - Retrieve credential                              │
│  - Decrypt                                          │
│  - Log access                                       │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│            Credential Store (SQLite)                │
│  - Encrypted credentials                            │
│  - Access policies                                  │
│  - Audit trail                                      │
└─────────────────────────────────────────────────────┘
```

---

## 📊 Data Models

### 1. Credentials Table

```sql
CREATE TABLE credentials (
  id TEXT PRIMARY KEY,                    -- cred_<timestamp>_<hash>
  name TEXT NOT NULL,                     -- User-friendly name
  type TEXT NOT NULL,                     -- 'api_key', 'oauth', 'basic_auth', 'db_connection'
  service TEXT NOT NULL,                  -- 'stripe', 'openai', 'postgres', etc.
  encrypted_value TEXT NOT NULL,          -- AES-256 encrypted JSON
  encryption_key_id TEXT NOT NULL,        -- Which key was used (for rotation)
  metadata TEXT,                          -- JSON: expires_at, scopes, etc.
  environment TEXT DEFAULT 'production',  -- 'dev', 'staging', 'production'
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_rotated_at TEXT,
  status TEXT DEFAULT 'active',           -- 'active', 'rotated', 'revoked'
  UNIQUE(name, environment)
);

CREATE INDEX idx_cred_service ON credentials(service);
CREATE INDEX idx_cred_type ON credentials(type);
CREATE INDEX idx_cred_status ON credentials(status);
CREATE INDEX idx_cred_env ON credentials(environment);
```

### 2. Access Policies Table

```sql
CREATE TABLE credential_access_policies (
  id TEXT PRIMARY KEY,
  credential_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,                -- skill_id or tool_id
  entity_type TEXT NOT NULL,              -- 'skill' or 'tool'
  access_level TEXT DEFAULT 'read',       -- 'read', 'write', 'admin'
  granted_by TEXT,                        -- Who granted access
  granted_at TEXT NOT NULL,
  expires_at TEXT,                        -- Optional expiration
  reason TEXT,                            -- Why this access was granted
  FOREIGN KEY (credential_id) REFERENCES credentials(id) ON DELETE CASCADE,
  UNIQUE(credential_id, entity_id, entity_type)
);

CREATE INDEX idx_policy_credential ON credential_access_policies(credential_id);
CREATE INDEX idx_policy_entity ON credential_access_policies(entity_id, entity_type);
CREATE INDEX idx_policy_expires ON credential_access_policies(expires_at);
```

### 3. Credential Audit Log Table

```sql
CREATE TABLE credential_audit_log (
  id TEXT PRIMARY KEY,
  credential_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,                -- Which skill/tool accessed it
  entity_type TEXT NOT NULL,
  user_id TEXT,                           -- Which user triggered the execution
  action TEXT NOT NULL,                   -- 'retrieve', 'rotate', 'revoke', 'grant_access'
  success INTEGER NOT NULL,
  timestamp TEXT NOT NULL,
  ip_address TEXT,
  error_message TEXT,
  metadata TEXT,                          -- JSON: additional context
  FOREIGN KEY (credential_id) REFERENCES credentials(id) ON DELETE CASCADE
);

CREATE INDEX idx_audit_credential ON credential_audit_log(credential_id);
CREATE INDEX idx_audit_entity ON credential_audit_log(entity_id);
CREATE INDEX idx_audit_timestamp ON credential_audit_log(timestamp DESC);
CREATE INDEX idx_audit_action ON credential_audit_log(action);
```

### 4. Encryption Keys Table

```sql
CREATE TABLE encryption_keys (
  id TEXT PRIMARY KEY,                    -- key_<timestamp>
  key_hash TEXT NOT NULL UNIQUE,          -- SHA-256 of the key (for verification)
  algorithm TEXT NOT NULL DEFAULT 'aes-256-gcm',
  created_at TEXT NOT NULL,
  status TEXT DEFAULT 'active',           -- 'active', 'rotated', 'revoked'
  rotated_to TEXT,                        -- ID of the new key (if rotated)
  FOREIGN KEY (rotated_to) REFERENCES encryption_keys(id)
);

CREATE INDEX idx_key_status ON encryption_keys(status);
```

---

## 🔒 Security Design

### Encryption Strategy

**Algorithm:** AES-256-GCM (Galois/Counter Mode)

**Key Management:**
1. **Master key** stored in environment variable (`MASTER_ENCRYPTION_KEY`)
2. **Derived keys** per credential using PBKDF2
3. **Key rotation** supported without re-encrypting all data
4. **IV (Initialization Vector)** stored with each encrypted value

**Why AES-256-GCM:**
- ✅ NIST approved
- ✅ Authenticated encryption (prevents tampering)
- ✅ Fast (hardware acceleration)
- ✅ Node.js native support

### Encryption Flow

```typescript
// Storing a credential
1. Generate random salt
2. Derive encryption key from master + salt (PBKDF2)
3. Encrypt credential JSON with AES-256-GCM
4. Store: { encrypted_value, salt, iv, auth_tag }

// Retrieving a credential
1. Get encrypted_value, salt, iv, auth_tag
2. Derive encryption key from master + salt
3. Decrypt with AES-256-GCM (auth_tag verifies integrity)
4. Return credential JSON
```

### Master Key Management

**Development:**
```bash
# .env
MASTER_ENCRYPTION_KEY=your-32-byte-hex-key
```

**Production:**
- Use environment variables (never commit)
- Rotate quarterly
- Store in secure vault (AWS Secrets Manager, etc.)

### Threat Model

**What we protect against:**
- ✅ Database theft (credentials encrypted at rest)
- ✅ Unauthorized access (scoped policies)
- ✅ Tampering (authenticated encryption)
- ✅ Audit requirements (complete trail)

**What we DON'T protect against:**
- ❌ Compromised master key (game over)
- ❌ Memory dumps (credentials in memory during use)
- ❌ Malicious code execution (can access anything)

---

## 💻 TypeScript Interfaces

### Core Types

```typescript
/**
 * Credential types supported
 */
export type CredentialType = 
  | 'api_key'           // Simple API key
  | 'oauth_token'       // OAuth 2.0 access/refresh tokens
  | 'basic_auth'        // Username + password
  | 'db_connection'     // Database connection string
  | 'ssh_key'           // SSH private key
  | 'custom';           // Custom JSON structure

/**
 * Environment types
 */
export type Environment = 'dev' | 'staging' | 'production';

/**
 * Access levels
 */
export type AccessLevel = 'read' | 'write' | 'admin';

/**
 * Credential value structures
 */
export type CredentialValue = 
  | ApiKeyCredential
  | OAuthCredential
  | BasicAuthCredential
  | DbConnectionCredential
  | CustomCredential;

export interface ApiKeyCredential {
  apiKey: string;
  apiSecret?: string;
}

export interface OAuthCredential {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  tokenType?: string;
  scopes?: string[];
}

export interface BasicAuthCredential {
  username: string;
  password: string;
}

export interface DbConnectionCredential {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

export interface CustomCredential {
  [key: string]: any;
}

/**
 * Stored credential (encrypted)
 */
export interface Credential {
  id: string;
  name: string;
  type: CredentialType;
  service: string;
  encryptedValue: string;       // Encrypted JSON
  encryptionKeyId: string;
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
  status: 'active' | 'rotated' | 'revoked';
}

/**
 * Access policy
 */
export interface CredentialAccessPolicy {
  id: string;
  credentialId: string;
  entityId: string;             // skill_id or tool_id
  entityType: 'skill' | 'tool';
  accessLevel: AccessLevel;
  grantedBy?: string;
  grantedAt: string;
  expiresAt?: string;
  reason?: string;
}

/**
 * Audit log entry
 */
export interface CredentialAuditEntry {
  id: string;
  credentialId: string;
  entityId: string;
  entityType: 'skill' | 'tool';
  userId?: string;
  action: 'retrieve' | 'rotate' | 'revoke' | 'grant_access' | 'revoke_access';
  success: boolean;
  timestamp: string;
  ipAddress?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * Decrypted credential (in-memory only)
 */
export interface DecryptedCredential {
  id: string;
  name: string;
  type: CredentialType;
  service: string;
  value: CredentialValue;       // Decrypted!
  metadata?: Record<string, any>;
  environment: Environment;
}
```

---

## 🔧 Core APIs

### Credential Store API

```typescript
/**
 * Store a new credential (encrypted)
 */
function storeCredential(
  name: string,
  type: CredentialType,
  service: string,
  value: CredentialValue,
  options: {
    environment?: Environment;
    metadata?: Record<string, any>;
  }
): string;

/**
 * Retrieve and decrypt a credential
 * 
 * Requires:
 * - Valid entity (skill/tool) with access policy
 * - Master key available
 * 
 * Logs access in audit trail
 */
function retrieveCredential(
  credentialId: string,
  requestingEntityId: string,
  requestingEntityType: 'skill' | 'tool',
  userId?: string
): DecryptedCredential;

/**
 * Update credential value (triggers rotation)
 */
function rotateCredential(
  credentialId: string,
  newValue: CredentialValue,
  rotatedBy: string
): void;

/**
 * Revoke a credential (soft delete)
 */
function revokeCredential(
  credentialId: string,
  revokedBy: string,
  reason: string
): void;

/**
 * List credentials (metadata only, no values)
 */
function listCredentials(
  filters?: {
    service?: string;
    type?: CredentialType;
    environment?: Environment;
    status?: string;
  }
): Array<Omit<Credential, 'encryptedValue'>>;

/**
 * Check if credential exists and is active
 */
function isCredentialValid(credentialId: string): boolean;
```

### Access Policy API

```typescript
/**
 * Grant access to a credential
 */
function grantAccess(
  credentialId: string,
  entityId: string,
  entityType: 'skill' | 'tool',
  options: {
    accessLevel?: AccessLevel;
    expiresAt?: string;
    grantedBy?: string;
    reason?: string;
  }
): string;

/**
 * Revoke access
 */
function revokeAccess(
  credentialId: string,
  entityId: string,
  entityType: 'skill' | 'tool'
): boolean;

/**
 * Check if entity has access to credential
 */
function hasAccess(
  credentialId: string,
  entityId: string,
  entityType: 'skill' | 'tool'
): boolean;

/**
 * Get all policies for a credential
 */
function getAccessPolicies(
  credentialId: string
): CredentialAccessPolicy[];

/**
 * Get all credentials accessible by an entity
 */
function getAccessibleCredentials(
  entityId: string,
  entityType: 'skill' | 'tool'
): Array<Omit<Credential, 'encryptedValue'>>;
```

### Audit Trail API

```typescript
/**
 * Log credential access
 */
function logCredentialAccess(
  credentialId: string,
  entityId: string,
  entityType: 'skill' | 'tool',
  action: string,
  success: boolean,
  userId?: string,
  errorMessage?: string
): void;

/**
 * Get audit trail for a credential
 */
function getAuditTrail(
  credentialId: string,
  options?: {
    limit?: number;
    since?: string;
    action?: string;
  }
): CredentialAuditEntry[];

/**
 * Get audit summary
 */
function getAuditSummary(): {
  totalAccesses: number;
  byCredential: Record<string, number>;
  byEntity: Record<string, number>;
  failedAccesses: number;
  lastAccessAt: string;
};
```

---

## 🔐 Encryption Implementation

### Master Key Setup

```typescript
// In .env file
MASTER_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef  // 32 bytes hex

// Load at runtime
import crypto from 'crypto';

const MASTER_KEY = Buffer.from(
  process.env.MASTER_ENCRYPTION_KEY || '',
  'hex'
);

if (MASTER_KEY.length !== 32) {
  throw new Error('MASTER_ENCRYPTION_KEY must be 32 bytes (64 hex chars)');
}
```

### Encryption Functions

```typescript
/**
 * Encrypt credential value
 */
function encryptCredential(
  value: CredentialValue,
  keyId: string
): {
  encryptedValue: string;  // Base64
  iv: string;              // Base64
  authTag: string;         // Base64
  salt: string;            // Base64
} {
  // 1. Generate random salt
  const salt = crypto.randomBytes(16);
  
  // 2. Derive key from master + salt
  const key = crypto.pbkdf2Sync(MASTER_KEY, salt, 100000, 32, 'sha256');
  
  // 3. Generate random IV
  const iv = crypto.randomBytes(16);
  
  // 4. Create cipher
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  // 5. Encrypt
  const plaintext = JSON.stringify(value);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  // 6. Get auth tag
  const authTag = cipher.getAuthTag();
  
  return {
    encryptedValue: encrypted,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    salt: salt.toString('base64')
  };
}

/**
 * Decrypt credential value
 */
function decryptCredential(
  encryptedValue: string,
  iv: string,
  authTag: string,
  salt: string
): CredentialValue {
  // 1. Derive key from master + salt
  const saltBuffer = Buffer.from(salt, 'base64');
  const key = crypto.pbkdf2Sync(MASTER_KEY, saltBuffer, 100000, 32, 'sha256');
  
  // 2. Create decipher
  const ivBuffer = Buffer.from(iv, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuffer);
  
  // 3. Set auth tag
  const authTagBuffer = Buffer.from(authTag, 'base64');
  decipher.setAuthTag(authTagBuffer);
  
  // 4. Decrypt
  let decrypted = decipher.update(encryptedValue, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  // 5. Parse JSON
  return JSON.parse(decrypted);
}
```

### Key Rotation

```typescript
/**
 * Rotate master key (advanced)
 * 
 * Steps:
 * 1. Generate new master key
 * 2. For each credential:
 *    - Decrypt with old key
 *    - Re-encrypt with new key
 *    - Update encryption_key_id
 * 3. Mark old key as rotated
 */
function rotateMasterKey(
  newMasterKey: Buffer
): {
  credentialsRotated: number;
  errors: string[];
} {
  // Implementation for key rotation
  // This is a critical operation requiring downtime/maintenance window
}
```

---

## 🎯 Use Cases

### Use Case 1: Stripe Payment Processing

```typescript
// 1. Store Stripe API key
const credId = storeCredential(
  'stripe_production',
  'api_key',
  'stripe',
  { apiKey: 'sk_live_...' },
  { environment: 'production' }
);

// 2. Grant access to payment skills
grantAccess(credId, 'stripe_api_handler', 'skill', {
  reason: 'Required for payment processing'
});

// 3. Execute skill (credentials auto-injected)
const result = await skillBank.execute({
  targetId: 'stripe_api_handler',
  targetType: 'skill',
  input: { action: 'create_customer', email: 'user@example.com' }
});

// Behind the scenes:
// - Skill executor checks access policy ✅
// - Retrieves and decrypts Stripe key
// - Injects into tool execution
// - Logs access in audit trail
```

### Use Case 2: Multi-Environment Credentials

```typescript
// Development
storeCredential('stripe_dev', 'api_key', 'stripe', 
  { apiKey: 'sk_test_...' }, 
  { environment: 'dev' }
);

// Production
storeCredential('stripe_prod', 'api_key', 'stripe',
  { apiKey: 'sk_live_...' },
  { environment: 'production' }
);

// Executor automatically selects based on NODE_ENV
const cred = resolveCredential('stripe', process.env.NODE_ENV);
```

### Use Case 3: OAuth Flow

```typescript
// Store OAuth token
storeCredential(
  'google_oauth',
  'oauth_token',
  'google',
  {
    accessToken: 'ya29.a0...',
    refreshToken: 'rt_...',
    expiresAt: '2025-12-01T12:00:00Z',
    scopes: ['drive.readonly', 'gmail.send']
  }
);

// Auto-refresh if expired (future enhancement)
const cred = await retrieveCredentialWithRefresh('google_oauth', ...);
```

### Use Case 4: Database Connection

```typescript
// Store DB credentials
storeCredential(
  'postgres_prod',
  'db_connection',
  'postgres',
  {
    host: 'db.company.com',
    port: 5432,
    database: 'prod_db',
    username: 'app_user',
    password: 'secure_password',
    ssl: true
  }
);

// Skill uses it automatically
grantAccess('postgres_prod', 'data_analyzer_skill', 'skill');
```

---

## 🔗 Integration Points

### Integration with Tool Executor

**Current (v1.5):**
```typescript
// Tools have no credential access
await toolExecutor.execute('http_request', {
  url: 'https://api.stripe.com/...',
  headers: { 'Authorization': 'Bearer sk_live_...' }  // ❌ Hardcoded!
});
```

**With v2.0:**
```typescript
// Tools reference credentials by ID
await toolExecutor.execute('http_request', {
  url: 'https://api.stripe.com/...',
  credentialId: 'stripe_production'  // ✅ Secure reference
});

// Executor:
// 1. Checks if tool/skill has access
// 2. Retrieves and decrypts credential
// 3. Injects into execution context
// 4. Logs access
```

### Integration with Skill Executor

**Skill definition with credentials:**
```yaml
# data/skills/stripe_api_handler.yaml
id: stripe_api_handler
name: Stripe API Handler
requiresCredentials:
  - stripe_production  # References credential by name
usesTools:
  - http_request
```

**Execution flow:**
```typescript
// Executor automatically resolves credentials
async function execute(skillId, input, options) {
  const skill = getSkill(skillId);
  
  // Resolve required credentials
  const credentials = {};
  for (const credName of skill.requiresCredentials || []) {
    // Check access policy
    if (!hasAccess(credName, skillId, 'skill')) {
      throw new Error(`Skill ${skillId} lacks access to ${credName}`);
    }
    
    // Retrieve and decrypt
    credentials[credName] = retrieveCredential(credName, skillId, 'skill', options.context?.userId);
  }
  
  // Pass to tool executor
  return executeWithCredentials(skill, input, credentials);
}
```

---

## 🧪 Testing Strategy

### Unit Tests (15 tests)

**Encryption/Decryption:**
- ✅ Encrypt and decrypt API key
- ✅ Encrypt and decrypt OAuth token
- ✅ Encrypt and decrypt DB connection
- ✅ Auth tag prevents tampering
- ✅ Wrong key fails decryption

**Credential CRUD:**
- ✅ Store credential
- ✅ Retrieve credential metadata
- ✅ List credentials with filters
- ✅ Rotate credential
- ✅ Revoke credential

**Access Policies:**
- ✅ Grant access to skill
- ✅ Check access (has/no access)
- ✅ Revoke access
- ✅ Expired policies are invalid
- ✅ Get accessible credentials by entity

### Integration Tests (10 tests)

**Access Control:**
- ✅ Skill with access can retrieve credential
- ✅ Skill without access cannot retrieve
- ✅ Revoked credential throws error
- ✅ Expired policy denies access

**Execution Flow:**
- ✅ Execute skill with credential injection
- ✅ Multiple credentials in single execution
- ✅ Credential rotation doesn't break execution

**Audit Trail:**
- ✅ All accesses are logged
- ✅ Failed access attempts logged
- ✅ Audit summary accurate

### E2E Tests (5 tests)

**Real-World Scenarios:**
- ✅ E2E: Store Stripe key → Grant to skill → Execute payment
- ✅ E2E: Rotate credential → Old executions fail → New ones succeed
- ✅ E2E: Multi-environment (dev vs prod credentials)
- ✅ E2E: Audit trail tracks full lifecycle
- ✅ E2E: Anonymous user cannot access credentials

**Total:** ~30 tests

---

## 🚦 Quality Gates for v2.0

### Must Pass (100%)

- ✅ All credential operations encrypted
- ✅ No plaintext credentials in logs
- ✅ Access control enforced 100%
- ✅ Audit trail complete
- ✅ 30 tests passing
- ✅ Existing 128 tests still pass
- ✅ TypeScript strict mode
- ✅ Zero breaking changes to v1.5 APIs

### Performance Requirements

- ✅ Credential retrieval: < 10ms
- ✅ Encryption/decryption: < 5ms
- ✅ Access check: < 1ms
- ✅ No impact on test runtime (< 10% increase)

---

## 🛡️ Security Considerations

### What to Implement

1. **Rate Limiting** (future)
   - Max N credential accesses per minute per entity
   - Prevents brute force / abuse

2. **Credential Expiration**
   - Automatic revocation after expiry
   - Warning notifications before expiry

3. **Audit Alerts** (future)
   - Alert on suspicious access patterns
   - Alert on failed access attempts (> threshold)

4. **Backup & Recovery**
   - Encrypted backups of credential store
   - Master key recovery process documented

### Best Practices for Users

```markdown
# Security Best Practices

1. **Master Key Management**
   - Use strong random key (32 bytes)
   - Store in secure vault (AWS Secrets Manager, 1Password, etc.)
   - Never commit to git
   - Rotate quarterly

2. **Credential Scoping**
   - Grant minimum necessary access
   - Use read-only where possible
   - Set expiration dates

3. **Audit Monitoring**
   - Review audit logs weekly
   - Alert on failed access
   - Investigate unusual patterns

4. **Rotation Policy**
   - Rotate credentials quarterly
   - Rotate immediately if compromise suspected
   - Test rotation in staging first
```

---

## 📝 Migration Guide (v1.5 → v2.0)

### Breaking Changes: NONE

v2.0 is **fully backward compatible**:

- ✅ Skills without credentials work as before
- ✅ Tools without credentials work as before
- ✅ Credentials are opt-in

### Adopting Credentials (Optional)

**Step 1: Initialize credential store**
```typescript
import { initCredentialStore } from './skills/store/credentialStore.js';
initCredentialStore();
```

**Step 2: Store credentials**
```typescript
const credId = storeCredential('my_api', 'api_key', 'service', { apiKey: '...' });
```

**Step 3: Grant access**
```typescript
grantAccess(credId, 'my_skill', 'skill');
```

**Step 4: Update skill definition**
```yaml
# Add requiresCredentials field
requiresCredentials:
  - my_api
```

**Done!** Executor handles the rest automatically.

---

## 🗺️ Implementation Phases

### Phase 1: Core Store (1 week)
- Encryption functions
- Credential CRUD
- Database schema
- 10 unit tests

### Phase 2: Access Control (1 week)
- Policy CRUD
- Access checking
- Integration with executors
- 10 tests

### Phase 3: Audit Trail (3 days)
- Audit logging
- Audit queries
- Summary/analytics
- 5 tests

### Phase 4: Integration & Polish (1 week)
- Executor integration
- Error handling
- Documentation
- 5 E2E tests
- Demo script

**Total:** ~4 weeks of focused work

---

## 📚 Documentation to Create

1. **`CREDENTIALS_GUIDE.md`** - User guide for storing/using credentials
2. **`SECURITY.md`** - Security model and best practices
3. **`V2_MIGRATION.md`** - Migration guide from v1.5
4. **`examples/demo-credentials.ts`** - Demo showing credential usage
5. Update `README.md` with v2.0 features
6. Update `ARCHITECTURE.md` with Layer 3 details

---

## 🎯 Success Criteria

v2.0 is "done" when:

- ✅ All 30 credential tests passing
- ✅ 128 v1.5 tests still passing
- ✅ Demo shows end-to-end credential usage
- ✅ Security review completed
- ✅ Documentation complete
- ✅ Zero plaintext credentials in logs/errors
- ✅ Audit trail captures all accesses
- ✅ Performance requirements met

---

## 💡 Future Enhancements (v2.1+)

**Not for v2.0, but good ideas for later:**

- OAuth refresh automation
- Credential sharing between users
- Credential templating (for onboarding)
- External secret managers (HashiCorp Vault, AWS Secrets)
- Credential health monitoring
- Automated rotation schedules
- Multi-tenancy support

---

## 🎉 Expected Impact

### For Users

**Before v2.0:**
```typescript
// Credentials in code ❌
const apiKey = 'sk_live_hardcoded';
```

**After v2.0:**
```typescript
// Credentials managed securely ✅
// Executor handles automatically
```

### For Platform

- ✅ **Enterprise-ready** - secure credential management
- ✅ **Compliant** - full audit trail for SOC2/GDPR
- ✅ **Scalable** - scoped access per skill
- ✅ **Maintainable** - rotation without code changes

### Metrics

- **Security:** 0 plaintext credentials in code/logs
- **Auditability:** 100% of accesses logged
- **Performance:** < 10ms overhead per execution
- **Tests:** 30 new tests (100% passing)

---

**This design is ready for implementation when you are!** 🔐

**Next Steps:**
1. Review this design document
2. Gather feedback if needed
3. Start Phase 1 implementation
4. Or refine based on specific requirements

---

**Estimated Implementation Time:** 4 weeks focused work  
**Estimated Tests:** 30 new tests  
**Estimated Code:** ~1,500 lines  
**Breaking Changes:** 0 (fully backward compatible)

