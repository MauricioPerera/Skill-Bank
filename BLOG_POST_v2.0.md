# 🔐 Construyendo un Credentials Vault en TypeScript: AES-256-GCM, Políticas de Acceso y Audit Trail

**Por Mauricio Perera** | Skill Bank v2.0 Release

---

## El Problema: Credentials en AI Agents

Cuando estás construyendo sistemas de AI agents que necesitan interactuar con APIs externas, te enfrentas a un problema clásico pero crítico: **¿cómo manejas las credenciales de forma segura?**

En Skill Bank, los agents ejecutan "skills" que pueden necesitar:
- API keys de Stripe para procesar pagos
- Tokens OAuth de Google para acceder a documentos
- Credenciales de DB para consultar datos
- SSH keys para deploys automáticos

El patrón más común (y peligroso) es:

```typescript
// ❌ El anti-patrón
const STRIPE_KEY = 'sk_live_hardcoded_in_code';
const DB_PASSWORD = 'admin123'; // En .env pero sin encriptar
```

**Problemas:**
1. Credentials en plaintext (logs, git history, memory dumps)
2. Sin control de acceso (cualquier código puede usarlas)
3. Sin audit trail (¿quién accedió a qué?)
4. Difícil de rotar (requiere code changes)
5. No cumple compliance (SOC 2, GDPR)

---

## La Solución: v2.0 Credentials Vault

Después de analizar cómo lo hacen Vault de HashiCorp, AWS Secrets Manager y Azure Key Vault, diseñé un sistema que cumple con:

### Requisitos Técnicos
- ✅ Encriptación at-rest (AES-256-GCM)
- ✅ Access control granular (policy-based)
- ✅ Audit trail completo (100% coverage)
- ✅ Zero downtime rotation
- ✅ Multi-environment support

### Requisitos de DX
- ✅ API simple (3 funciones principales)
- ✅ Zero breaking changes
- ✅ TypeScript strict mode
- ✅ Autodocumentado

---

## Arquitectura: 4 Capas

```
┌─────────────────────────────────────┐
│   Application Layer                 │
│   (Skills ejecutando con creds)     │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   Access Control Layer              │
│   • Policy engine                   │
│   • Permission checks               │
│   • Expiration enforcement          │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   Encryption Layer                  │
│   • AES-256-GCM                     │
│   • PBKDF2 key derivation           │
│   • Per-credential salt + IV        │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   Storage Layer (SQLite)            │
│   • credentials                     │
│   • access_policies                 │
│   • audit_log                       │
│   • encryption_keys                 │
└─────────────────────────────────────┘
```

---

## Decisión 1: AES-256-GCM (No AES-CBC)

**¿Por qué GCM?**

AES-GCM (Galois/Counter Mode) es **authenticated encryption**. Esto significa que no solo encripta, sino que también detecta tampering.

```typescript
// AES-256-GCM en Node.js
const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);

let encrypted = cipher.update(JSON.stringify(value), 'utf8', 'hex');
encrypted += cipher.final('hex');

const authTag = cipher.getAuthTag(); // ← Esto detecta tampering

return {
  encryptedValue: encrypted,
  salt: salt.toString('hex'),
  iv: iv.toString('hex'),
  authTag: authTag.toString('hex')
};
```

**Beneficios:**
- Si alguien modifica el ciphertext → decrypt falla
- Protege contra bit-flipping attacks
- NIST approved (usado en TLS 1.3)
- Hardware acceleration en CPUs modernas

**Alternativas descartadas:**
- AES-CBC: Requiere HMAC separado para auth
- ChaCha20-Poly1305: Menos soporte en hardware

---

## Decisión 2: PBKDF2 para Key Derivation

El master key nunca se usa directamente. Cada credential deriva su propia key:

```typescript
function deriveKey(masterKey: Buffer, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(
    masterKey,
    salt,
    100000,  // ← 100K iterations (NIST recomienda 100K-600K)
    32,      // ← 256 bits output
    'sha256'
  );
}
```

**¿Por qué 100,000 iteraciones?**

Balance entre seguridad y performance:
- Brute-force se vuelve ~100K veces más costoso
- En hardware moderno: ~3-5ms por derivation
- Acceptable para nuestra use case (no high-frequency)

**Benchmark real:**
```
Encryption (incluye PBKDF2):  4.2ms avg
Decryption (incluye PBKDF2):  3.8ms avg
```

---

## Decisión 3: Policy-Based Access Control

Inspirado en AWS IAM, cada acceso requiere una **explicit policy grant**:

```typescript
// Schema de access_policies
CREATE TABLE credential_access_policies (
  id TEXT PRIMARY KEY,
  credential_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,        -- skill_id o tool_id
  entity_type TEXT NOT NULL,      -- 'skill' | 'tool'
  access_level TEXT NOT NULL,     -- 'read' | 'write' | 'admin'
  granted_at TEXT NOT NULL,
  granted_by TEXT,
  expires_at TEXT,
  revoked_at TEXT,
  reason TEXT
);
```

**Enforcement automático:**

```typescript
export function retrieveCredential(
  credentialId: string,
  entityId: string,
  entityType: 'skill' | 'tool',
  context?: { userId?: string; ipAddress?: string }
): DecryptedCredential {
  // 1. Check access policy
  assertAccess(credentialId, entityId, entityType, 'read');
  
  // 2. Check credential status
  const cred = getCredentialMetadata(credentialId);
  if (cred.status !== 'active') {
    throw new AccessDeniedError('Credential is revoked');
  }
  
  // 3. Decrypt
  const decrypted = decryptCredential(cred.encryptedValue, ...);
  
  // 4. Log audit entry
  logAuditEntry({
    credentialId,
    entityId,
    action: 'retrieve',
    success: true,
    userId: context?.userId,
    ipAddress: context?.ipAddress
  });
  
  return decrypted;
}
```

**Principio de mínimo privilegio by default:**
- Sin policy = sin acceso
- `read` no permite rotation
- `write` no permite deletion
- `admin` tiene todo

---

## Decisión 4: Audit Trail Inmutable

Cada operación genera una entrada de audit:

```typescript
export interface AuditLog {
  id: string;
  credentialId: string;
  entityId: string;
  entityType: 'skill' | 'tool';
  action: AuditAction;  // 'create' | 'retrieve' | 'rotate' | 'revoke' | ...
  success: boolean;
  userId?: string;
  ipAddress?: string;
  timestamp: string;
  errorMessage?: string;
}
```

**100% coverage:**
```typescript
// Instrumentado en todas las operaciones
logAuditEntry({ action: 'create', credentialId, ... });
logAuditEntry({ action: 'grant_access', credentialId, ... });
logAuditEntry({ action: 'retrieve', credentialId, success: true, ... });
logAuditEntry({ action: 'retrieve', credentialId, success: false, ... }); // ← Fallos también!
logAuditEntry({ action: 'rotate', credentialId, ... });
logAuditEntry({ action: 'revoke', credentialId, ... });
```

**Analytics en tiempo real:**

```typescript
// ¿Quién está intentando acceder sin permiso?
const failed = getFailedAccessAttempts({ limit: 100 });

// ¿Cuántas veces se usó esta credential hoy?
const summary = getAuditSummary();
console.log(`Total: ${summary.totalAccesses}`);
console.log(`Failed: ${summary.failedAccesses}`);
```

---

## API: Simplicidad sobre Complejidad

**Store (encripta automáticamente):**

```typescript
const credId = storeCredential('stripe_prod', 'api_key', 'stripe', {
  apiKey: 'sk_live_...',
  apiSecret: 'whsec_...'
}, {
  environment: 'production',
  metadata: { owner: 'team@company.com' }
});
```

**Grant (policy explícita):**

```typescript
grantAccess(credId, 'payment_skill', 'skill', {
  accessLevel: 'read',
  expiresAt: '2025-12-31',
  reason: 'Required for payment processing'
});
```

**Retrieve (verifica, decripta, audita):**

```typescript
const cred = retrieveCredential(credId, 'payment_skill', 'skill', {
  userId: 'alice@company.com',
  ipAddress: '192.168.1.100'
});

// cred.value es el objeto decriptado
// Audit log tiene registro completo
```

**Rotate (zero downtime):**

```typescript
rotateCredential(credId, {
  apiKey: 'sk_live_new_...',
  apiSecret: 'whsec_new_...'
});

// Policies se mantienen
// Audit trail registra la rotation
```

---

## Testing: 88 Tests, 100% Passing

**Approach:** Empecé por los tests antes del código (TDD).

### Unit Tests (81 tests)

```typescript
describe('Encryption', () => {
  it('should encrypt and decrypt API key', () => { ... });
  it('should use unique salt and IV per encryption', () => { ... });
  it('should detect tampering with encrypted value', () => { ... });
  it('should detect tampering with auth tag', () => { ... });
});

describe('Access Control', () => {
  it('should deny access without policy', () => { ... });
  it('should respect access level hierarchy', () => { ... });
  it('should deny expired policies', () => { ... });
  it('should deny revoked credentials', () => { ... });
});
```

### E2E Tests (6 tests)

Simulan workflows reales:

```typescript
it('E2E: Store → Grant → Retrieve → Audit', () => {
  // 1. Store Stripe credential
  const credId = storeCredential('stripe', 'api_key', 'stripe', { ... });
  
  // 2. Grant access to payment skill
  grantAccess(credId, 'payment_skill', 'skill');
  
  // 3. Retrieve (should succeed)
  const cred = retrieveCredential(credId, 'payment_skill', 'skill');
  
  // 4. Verify audit trail
  const trail = getAuditTrail(credId);
  expect(trail).toContainAction('create');
  expect(trail).toContainAction('grant_access');
  expect(trail).toContainAction('retrieve');
});

it('E2E: Security breach → Revoke → Audit trail', () => {
  // Simula credential leak
  const credId = storeCredential('leaked', 'api_key', 'service', { ... });
  grantAccess(credId, 'skill_1', 'skill');
  
  // Skills usan credential
  retrieveCredential(credId, 'skill_1', 'skill', { userId: 'alice' });
  retrieveCredential(credId, 'skill_1', 'skill', { userId: 'bob' });
  
  // Breach detected! Revoke immediately
  revokeCredential(credId, 'Detected in logs - rotating');
  
  // Future access denied
  expect(() => retrieveCredential(credId, 'skill_1', 'skill'))
    .toThrow(AccessDeniedError);
  
  // Audit trail shows who accessed before revocation
  const trail = getAuditTrail(credId);
  const accessed = trail.filter(e => e.success).map(e => e.userId);
  expect(accessed).toContain('alice');
  expect(accessed).toContain('bob');
});
```

**Runtime:** ~270s total (la mayoría es PBKDF2)

---

## Lecciones Aprendidas

### 1. PBKDF2 es Costoso (y Eso es Bueno)

Inicialmente usaba 10,000 iteraciones. Los tests pasaban en ~30s.

Al subir a 100,000 iteraciones (NIST recommendation):
- Tests: ~270s
- Production impact: ~5ms por operation

**Trade-off:** Aceptable porque:
- No es high-frequency (credentials no se acceden cada ms)
- Brute-force se vuelve 10x más costoso para un atacante
- Puedo cachear credentials decriptadas en memory (si es aceptable)

### 2. TypeScript Strict Mode te Salva la Vida

Ejemplo real de bug que TypeScript detectó:

```typescript
// Mi código inicial (buggy)
throw new EncryptionError(
  'Failed to encrypt',
  'ENCRYPTION_FAILED',  // ← Este parámetro no existe
  { originalError: error.message }
);

// TypeScript error:
// Expected 1-2 arguments, but got 3
```

El constructor solo acepta `(message, details)`. El `code` se setea automáticamente por la clase. **TypeScript me obligó a revisar la interfaz.**

### 3. Audit Trail es Más Valioso de lo que Pensaba

Al principio lo implementé "porque SOC 2 lo requiere". Pero en los E2E tests me di cuenta de su valor real:

**Caso de uso inesperado:** Debugging de permission issues.

```typescript
// Usuario reporta: "No puedo acceder a Stripe credential"

// Debug con audit trail:
const trail = getAuditTrail(credId);
const attempts = trail.filter(e => e.entityId === 'payment_skill');

// Resultado: 5 intentos fallidos en últimas 2 horas
// Causa: Policy expiró ayer
// Fix: Renovar policy con nueva expiration date
```

Sin audit trail, este debug habría sido adivinar.

### 4. Zero Breaking Changes es Posible

v1.5 tenía 128 tests. Al agregar v2.0:
- **128/128 v1.5 tests siguen pasando**
- **88/88 v2.0 tests nuevos pasando**
- **Total: 216/216 (100%)**

**Clave:** Credentials es opt-in. Si no lo usas, tu código v1.5 sigue funcionando igual.

---

## Performance: Benchmarks Reales

Hardware: Laptop i7-10th gen, 16GB RAM, Windows 11

```
Operation              Time      Notes
──────────────────────────────────────────────────────
Encrypt credential     4.2ms     80% es PBKDF2
Decrypt credential     3.8ms     80% es PBKDF2
Access check           0.8ms     Simple SQL query
Audit log write        0.5ms     Async, non-blocking
Store credential       5.1ms     Encrypt + SQL insert
Retrieve credential    6.2ms     Access check + decrypt + audit
Rotate credential      8.9ms     Decrypt + encrypt + SQL update

Full test suite       270s       88 tests (many crypto ops)
```

**Optimizaciones posibles (no implementadas):**
- Credential caching en memory (reduce a ~1ms)
- Pre-derivar keys al startup
- Usar Argon2 en vez de PBKDF2 (más memory-hard)

No optimicé porque:
1. Performance actual es acceptable (< 10ms)
2. Premature optimization es el root of all evil
3. Seguridad > velocidad en este caso

---

## Compliance: SOC 2 y GDPR

### SOC 2 Trust Service Criteria

**CC6.1 - Access Controls:**
✅ Policy-based access control  
✅ Principle of least privilege  
✅ Time-limited access with expiration  

**CC7.2 - System Monitoring:**
✅ 100% audit trail coverage  
✅ Failed access attempts logged  
✅ Real-time analytics  

**CC6.7 - Data Security:**
✅ Encryption at rest (AES-256-GCM)  
✅ Master key derivation (PBKDF2)  
✅ Tamper detection (GCM auth tag)  

### GDPR

**Article 32 - Security of Processing:**
✅ Encryption of personal data  
✅ Ability to ensure ongoing confidentiality  
✅ Regular testing and evaluation  

**Article 33 - Breach Notification:**
✅ Audit trail for breach detection  
✅ Ability to determine scope of breach  
✅ Timestamped access logs  

---

## Código Abierto: MIT License

Todo el código está en GitHub:
👉 https://github.com/MauricioPerera/Skill-Bank

**Stats:**
- 216 tests (100% passing)
- ~15,000 líneas de TypeScript
- 28+ archivos de documentación
- 0 breaking changes

**Estructura:**
```
src/skills/
├── types/credentials.ts          # Interfaces
├── security/
│   ├── encryption.ts             # AES-256-GCM
│   ├── accessControl.ts          # Policy engine
│   └── auditLogger.ts            # Audit system
├── store/credentialStore.ts      # CRUD operations
└── __tests__/
    ├── encryption.test.ts        # 19 tests
    ├── credentialStore.test.ts   # 25 tests
    ├── accessControl.test.ts     # 22 tests
    ├── auditTrail.test.ts        # 16 tests
    └── credentialIntegration.test.ts # 6 E2E tests
```

---

## Demo en Vivo

Puedes probar todo esto localmente:

```bash
git clone https://github.com/MauricioPerera/Skill-Bank.git
cd Skill-Bank
npm install

# Generate master key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env
echo "MASTER_ENCRYPTION_KEY=<your-key>" >> .env

# Run demo
npm run demo:credentials
```

El demo muestra:
1. Storing credentials (4 tipos: API keys, OAuth, DB, SSH)
2. Granting scoped access (5 policies)
3. Retrieving with permission checks
4. Failed access attempts
5. Credential rotation
6. Complete audit trail
7. Revocation

---

## Próximos Pasos

### v2.5 - Advanced RAG (Q3 2025)
- Multi-modal documents (PDFs, images, audio)
- Knowledge graph enrichment
- Better re-ranking

### v3.0 - Sub-Agents (Q4 2025)
- Layer 4: Sub-agent coordination
- Hierarchical task decomposition
- Agent-to-agent communication

---

## Reflexión Final

Construir un credentials vault desde cero me enseñó que:

1. **Seguridad no es solo encriptación** - Es encriptación + access control + audit trail + developer experience.

2. **Las decisiones de diseño importan más que el código** - AES-GCM vs AES-CBC, PBKDF2 iterations, policy model, audit granularity.

3. **Testing exhaustivo da confianza** - 88 tests me permiten dormir tranquilo sabiendo que si algo se rompe, los tests me avisan.

4. **La mejor API es la que no necesita docs** - Si tu API requiere 20 páginas de documentación, probablemente es muy compleja.

5. **Open source mejora tu código** - Saber que otros van a leer tu código te obliga a escribir mejor.

---

## ¿Preguntas?

Si estás construyendo algo similar, o tienes feedback sobre las decisiones de diseño, me encantaría discutirlo en los comentarios.

Específicamente:
- ¿Usarías Argon2 en vez de PBKDF2?
- ¿Implementarías credential caching? ¿Con qué TTL?
- ¿Qué otros tipos de credentials agregarías?
- ¿Cómo manejarías multi-region replication?

---

**Enlaces:**
- 📦 Repo: https://github.com/MauricioPerera/Skill-Bank
- 📝 Release Notes: https://github.com/MauricioPerera/Skill-Bank/releases/tag/v2.0.0
- 📚 Docs: https://github.com/MauricioPerera/Skill-Bank/tree/main/docs
- 🔒 Security Model: https://github.com/MauricioPerera/Skill-Bank/blob/main/docs/SECURITY.md

---

#AI #MachineLearning #Security #TypeScript #OpenSource #Cryptography #SystemDesign #SOC2 #GDPR

