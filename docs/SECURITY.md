# 🛡️ Security Model - Credentials Vault v2.0

**Skill Bank** | Security architecture and best practices

---

## Overview

The Credentials Vault implements defense-in-depth security with multiple layers:

1. **Encryption at rest** (AES-256-GCM)
2. **Access control** (policy-based)
3. **Audit trail** (100% coverage)
4. **Secure key management**

---

## Encryption

### Algorithm: AES-256-GCM

**Why AES-256-GCM?**
- ✅ NIST approved for classified information
- ✅ Authenticated encryption (prevents tampering)
- ✅ Fast (hardware acceleration)
- ✅ Native Node.js support

### Key Derivation

```
Master Key (32 bytes)
    ↓ PBKDF2 (100,000 iterations)
    ↓ + Random Salt (16 bytes)
    ↓
Derived Key (32 bytes)
    ↓ AES-256-GCM
    ↓ + Random IV (16 bytes)
    ↓
Encrypted Value + Auth Tag
```

**Properties:**
- Each credential has unique salt and IV
- Same plaintext produces different ciphertext
- Tampering detected via auth tag
- Master key never stored in database

---

## Master Key Management

### Generation

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Output: `0123456789abcdef...` (64 hex characters = 32 bytes)

### Storage

**Development:**
```bash
# .env file (gitignored)
MASTER_ENCRYPTION_KEY=0123456789abcdef...
```

**Production:**
- AWS Secrets Manager
- Azure Key Vault
- HashiCorp Vault
- 1Password / LastPass

**Never:**
- ❌ Commit to git
- ❌ Store in database
- ❌ Log to console
- ❌ Send over unencrypted channels

---

## Access Control

### Policy-Based Model

Every credential retrieval requires:
1. Valid policy exists
2. Policy not expired
3. Credential is active
4. Access level sufficient

### Access Levels

| Level | Can Retrieve | Can Rotate | Can Delete |
|-------|--------------|------------|------------|
| read  | ✅           | ❌         | ❌         |
| write | ✅           | ✅         | ❌         |
| admin | ✅           | ✅         | ✅         |

### Principle of Least Privilege

Always grant minimum necessary access:

```typescript
// Good ✅
grantAccess(credId, 'payment_skill', 'skill', { accessLevel: 'read' });

// Bad ❌
grantAccess(credId, 'payment_skill', 'skill', { accessLevel: 'admin' });
```

---

## Audit Trail

### 100% Coverage

Every operation is logged:

- `create` - Credential creation
- `retrieve` - Success + failures
- `rotate` - Value rotation
- `revoke` - Revocation
- `grant_access` - Permission grant
- `revoke_access` - Permission revoke

### Logged Data

- Credential ID
- Entity ID (skill/tool)
- User ID (if provided)
- IP address (if provided)
- Timestamp
- Success/failure
- Error message (if failed)

---

## Threat Model

### Protected Against ✅

- **Database theft** - Encrypted at rest
- **Unauthorized access** - Policy enforcement
- **Tampering** - Authenticated encryption
- **Insider threats** - Complete audit trail

### NOT Protected Against ❌

- **Compromised master key** - Decrypt all credentials
- **Memory dumps** - Credentials in memory during use
- **Malicious code** - Can access database directly

---

## Best Practices

### 1. Master Key

- Generate with `crypto.randomBytes(32)`
- Store in secure vault
- Rotate quarterly
- Never commit to git

### 2. Access Control

- Grant minimum access
- Use `read` by default
- Set expiration dates
- Review policies quarterly

### 3. Monitoring

- Review failed attempts daily
- Alert on suspicious patterns
- Investigate unexpected access
- Export audit logs for compliance

### 4. Rotation

- Rotate quarterly (minimum)
- Rotate immediately on suspected compromise
- Test in staging first
- Keep old keys during rollout

---

## Compliance

### SOC 2

✅ Access Controls (CC6.1)  
✅ Audit Logging (CC7.2)  
✅ Encryption (CC6.7)

### GDPR

✅ Data Protection (Article 32)  
✅ Breach Notification (Article 33)

---

## Security Contact

For security issues:
- **DO NOT** open public GitHub issues
- Email: [Create private security advisory](https://github.com/MauricioPerera/Skill-Bank/security/advisories/new)

---

**Last Updated:** December 2025  
**Version:** 2.0.0
