# 🔐 v2.0 Credentials Vault - Implementation Plan

**Design Doc:** See `V2_CREDENTIALS_DESIGN.md`  
**Status:** 📋 Ready to implement  
**Timeline:** 4 weeks

---

## 📅 Week-by-Week Breakdown

### Week 1: Foundation (Core Store)

**Files to create:**
- `src/skills/types/credentials.ts` - All type definitions
- `src/skills/security/encryption.ts` - AES-256-GCM implementation
- `src/skills/store/credentialStore.ts` - CRUD operations
- `src/skills/__tests__/encryption.test.ts` - 8 tests
- `src/skills/__tests__/credentialStore.test.ts` - 10 tests

**Deliverables:**
- ✅ Encryption/decryption working
- ✅ Credential storage (encrypted)
- ✅ Basic CRUD operations
- ✅ 18 tests passing

**Acceptance Criteria:**
```typescript
// Can store and retrieve encrypted credential
const id = storeCredential('stripe', 'api_key', 'stripe', { apiKey: 'sk_...' });
const cred = retrieveCredential(id, 'test_skill', 'skill');
expect(cred.value.apiKey).toBe('sk_...');

// Encryption is secure
expect(getDatabaseRow(id).encrypted_value).not.toContain('sk_');
```

---

### Week 2: Access Control

**Files to create:**
- `src/skills/security/accessControl.ts` - Policy engine
- `src/skills/__tests__/accessControl.test.ts` - 10 tests

**Files to modify:**
- `src/skills/store/credentialStore.ts` - Add policy checks

**Deliverables:**
- ✅ Access policy CRUD
- ✅ Permission checking
- ✅ Scoped access enforcement
- ✅ 10 new tests

**Acceptance Criteria:**
```typescript
// Grant access
grantAccess('stripe_prod', 'payment_skill', 'skill');

// Has access
expect(hasAccess('stripe_prod', 'payment_skill', 'skill')).toBe(true);
expect(hasAccess('stripe_prod', 'other_skill', 'skill')).toBe(false);

// Denied access throws
expect(() => {
  retrieveCredential('stripe_prod', 'unauthorized_skill', 'skill');
}).toThrow('ACCESS_DENIED');
```

---

### Week 3: Audit Trail

**Files to create:**
- `src/skills/security/auditLogger.ts` - Audit logging
- `src/skills/__tests__/auditTrail.test.ts` - 5 tests

**Files to modify:**
- `src/skills/store/credentialStore.ts` - Add audit logging to all ops

**Deliverables:**
- ✅ Audit logging on all credential access
- ✅ Audit queries and analytics
- ✅ Failed access tracking
- ✅ 5 new tests

**Acceptance Criteria:**
```typescript
// Retrieve logs access
retrieveCredential('stripe_prod', 'payment_skill', 'skill', 'user123');

// Audit trail exists
const trail = getAuditTrail('stripe_prod');
expect(trail[0].action).toBe('retrieve');
expect(trail[0].entityId).toBe('payment_skill');
expect(trail[0].userId).toBe('user123');

// Summary accurate
const summary = getAuditSummary();
expect(summary.totalAccesses).toBe(1);
```

---

### Week 4: Integration & Polish

**Files to create:**
- `examples/demo-credentials.ts` - Complete demo
- `docs/CREDENTIALS_GUIDE.md` - User documentation
- `docs/SECURITY.md` - Security best practices

**Files to modify:**
- `src/skills/executor/toolExecutor.ts` - Inject credentials
- `src/skills/executor/skillExecutor.ts` - Resolve credentials
- `src/skills/types.ts` - Add requiresCredentials field
- `README.md` - Add v2.0 features
- `package.json` - Add demo:credentials script

**Tests to create:**
- `src/skills/__tests__/credentialIntegration.test.ts` - 5 E2E tests

**Deliverables:**
- ✅ Full executor integration
- ✅ Demo showing end-to-end flow
- ✅ Complete documentation
- ✅ 5 E2E tests
- ✅ Zero breaking changes

**Acceptance Criteria:**
```typescript
// E2E: Store credential → Grant access → Execute skill → Audit
const credId = storeCredential('stripe', 'api_key', 'stripe', { apiKey: 'sk_...' });
grantAccess(credId, 'payment_skill', 'skill');

const result = await skillBank.execute({
  targetId: 'payment_skill',
  targetType: 'skill',
  input: { action: 'create_customer' },
  context: { userId: 'user123' }
});

expect(result.success).toBe(true);

// Audit trail exists
const trail = getAuditTrail(credId);
expect(trail.length).toBeGreaterThan(0);
```

---

## 🎯 Daily Tasks Breakdown

### Week 1, Day 1-2: Encryption
- [ ] Create `security/encryption.ts`
- [ ] Implement AES-256-GCM functions
- [ ] Handle IV, salt, auth tag
- [ ] Master key loading
- [ ] 8 tests

### Week 1, Day 3-5: Credential Store
- [ ] Create database schema
- [ ] Implement store/retrieve (with encryption)
- [ ] Implement list/rotate/revoke
- [ ] 10 tests

### Week 2, Day 1-3: Access Policies
- [ ] Create policy schema
- [ ] Implement grant/revoke/check
- [ ] Policy expiration handling
- [ ] 7 tests

### Week 2, Day 4-5: Integration
- [ ] Integrate with credential retrieval
- [ ] Add policy checks to all operations
- [ ] 3 integration tests

### Week 3, Day 1-2: Audit Trail
- [ ] Create audit schema
- [ ] Implement audit logging
- [ ] Audit queries and analytics
- [ ] 5 tests

### Week 3, Day 3: Hardening
- [ ] Error handling
- [ ] Edge cases
- [ ] Security review

### Week 4, Day 1-2: Executor Integration
- [ ] Modify toolExecutor
- [ ] Modify skillExecutor
- [ ] Credential resolution logic

### Week 4, Day 3: E2E Tests
- [ ] 5 E2E scenarios
- [ ] Verify audit trail end-to-end

### Week 4, Day 4: Demo & Docs
- [ ] `demo-credentials.ts`
- [ ] `CREDENTIALS_GUIDE.md`
- [ ] `SECURITY.md`
- [ ] Update README

### Week 4, Day 5: Polish & Release
- [ ] Code review
- [ ] Documentation review
- [ ] Performance testing
- [ ] Prepare release notes

---

## 🧪 Test Scenarios

### Encryption Tests
```typescript
it('should encrypt and decrypt API key', () => {
  const value = { apiKey: 'sk_test_12345' };
  const encrypted = encryptCredential(value, 'key1');
  
  expect(encrypted.encryptedValue).not.toContain('sk_test');
  
  const decrypted = decryptCredential(
    encrypted.encryptedValue,
    encrypted.iv,
    encrypted.authTag,
    encrypted.salt
  );
  
  expect(decrypted).toEqual(value);
});

it('should prevent tampering with auth tag', () => {
  const value = { apiKey: 'sk_test_12345' };
  const encrypted = encryptCredential(value, 'key1');
  
  // Tamper with encrypted value
  const tampered = encrypted.encryptedValue + 'X';
  
  expect(() => {
    decryptCredential(tampered, encrypted.iv, encrypted.authTag, encrypted.salt);
  }).toThrow();
});
```

### Access Control Tests
```typescript
it('should enforce access policies', () => {
  const credId = storeCredential('stripe', 'api_key', 'stripe', { apiKey: 'sk_...' });
  
  // No access by default
  expect(() => {
    retrieveCredential(credId, 'unauthorized_skill', 'skill');
  }).toThrow('ACCESS_DENIED');
  
  // Grant access
  grantAccess(credId, 'payment_skill', 'skill');
  
  // Now has access
  const cred = retrieveCredential(credId, 'payment_skill', 'skill');
  expect(cred.value.apiKey).toBe('sk_...');
});
```

### E2E Tests
```typescript
it('E2E: Credential lifecycle', async () => {
  // 1. Store
  const credId = storeCredential('stripe', 'api_key', 'stripe', { apiKey: 'sk_test' });
  
  // 2. Grant access to skill
  grantAccess(credId, 'payment_skill', 'skill');
  
  // 3. Execute skill (credentials injected automatically)
  const result = await skillBank.execute({
    targetId: 'payment_skill',
    targetType: 'skill',
    input: { action: 'list_customers' },
    context: { userId: 'user123' }
  });
  
  expect(result.success).toBe(true);
  
  // 4. Verify audit trail
  const trail = getAuditTrail(credId);
  expect(trail).toHaveLength(1);
  expect(trail[0].action).toBe('retrieve');
  expect(trail[0].userId).toBe('user123');
  
  // 5. Rotate credential
  rotateCredential(credId, { apiKey: 'sk_live' }, 'admin');
  
  // 6. Verify rotation in audit
  const trail2 = getAuditTrail(credId);
  expect(trail2.some(e => e.action === 'rotate')).toBe(true);
});
```

---

## 🚀 Quick Start After Implementation

```bash
# Generate master key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env
echo "MASTER_ENCRYPTION_KEY=<generated-key>" >> .env

# Store a credential
npx tsx scripts/add-credential.ts \
  --name stripe_production \
  --type api_key \
  --service stripe \
  --key sk_live_...

# Grant access to a skill
npx tsx scripts/grant-access.ts \
  --credential stripe_production \
  --skill payment_handler

# Execute (credentials auto-injected)
npm run demo:credentials
```

---

**Design complete! Ready to implement when you give the signal** 🚀

