-- ============================================
-- Skill Bank v2.0 - Credentials Vault Schema
-- ============================================
-- Purpose: Secure storage of API keys, OAuth tokens,
--          database credentials, and other secrets
-- Encryption: AES-256-GCM
-- Access Control: Policy-based per skill/tool
-- Audit: Complete trail of all credential access

-- ============================================
-- Table: credentials
-- Stores encrypted credentials
-- ============================================
CREATE TABLE IF NOT EXISTS credentials (
  -- Identity
  id TEXT PRIMARY KEY,                          -- cred_<timestamp>_<hash>
  name TEXT NOT NULL,                           -- User-friendly name (e.g., 'stripe_production')
  
  -- Type and service
  type TEXT NOT NULL,                           -- 'api_key', 'oauth_token', 'basic_auth', 'db_connection', 'ssh_key', 'custom'
  service TEXT NOT NULL,                        -- 'stripe', 'openai', 'postgres', 'github', etc.
  
  -- Encrypted data
  encrypted_value TEXT NOT NULL,                -- AES-256-GCM encrypted JSON
  encryption_key_id TEXT NOT NULL,              -- Which encryption key was used (for key rotation)
  
  -- Metadata
  metadata TEXT,                                -- JSON: { expiresAt, scopes, description, etc. }
  environment TEXT NOT NULL DEFAULT 'production', -- 'dev', 'staging', 'production'
  
  -- Lifecycle
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_rotated_at TEXT,                         -- When credential value was last changed
  status TEXT NOT NULL DEFAULT 'active',        -- 'active', 'rotated', 'revoked'
  
  -- Constraints
  UNIQUE(name, environment),                    -- Unique name per environment
  CHECK(type IN ('api_key', 'oauth_token', 'basic_auth', 'db_connection', 'ssh_key', 'custom')),
  CHECK(status IN ('active', 'rotated', 'revoked')),
  CHECK(environment IN ('dev', 'staging', 'production'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cred_service ON credentials(service);
CREATE INDEX IF NOT EXISTS idx_cred_type ON credentials(type);
CREATE INDEX IF NOT EXISTS idx_cred_status ON credentials(status);
CREATE INDEX IF NOT EXISTS idx_cred_env ON credentials(environment);
CREATE INDEX IF NOT EXISTS idx_cred_name ON credentials(name);

-- ============================================
-- Table: credential_access_policies
-- Defines who can access which credentials
-- ============================================
CREATE TABLE IF NOT EXISTS credential_access_policies (
  -- Identity
  id TEXT PRIMARY KEY,                          -- policy_<timestamp>_<hash>
  
  -- What credential
  credential_id TEXT NOT NULL,
  
  -- Who has access
  entity_id TEXT NOT NULL,                      -- skill_id or tool_id
  entity_type TEXT NOT NULL,                    -- 'skill' or 'tool'
  
  -- Access level
  access_level TEXT NOT NULL DEFAULT 'read',    -- 'read', 'write', 'admin'
  
  -- Metadata
  granted_by TEXT,                              -- User/system that granted access
  granted_at TEXT NOT NULL,
  expires_at TEXT,                              -- Optional expiration
  reason TEXT,                                  -- Why this access was granted
  
  -- Foreign keys
  FOREIGN KEY (credential_id) REFERENCES credentials(id) ON DELETE CASCADE,
  
  -- Constraints
  UNIQUE(credential_id, entity_id, entity_type),
  CHECK(entity_type IN ('skill', 'tool')),
  CHECK(access_level IN ('read', 'write', 'admin'))
);

-- Indexes for access checks (performance critical)
CREATE INDEX IF NOT EXISTS idx_policy_credential ON credential_access_policies(credential_id);
CREATE INDEX IF NOT EXISTS idx_policy_entity ON credential_access_policies(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_policy_expires ON credential_access_policies(expires_at);
CREATE INDEX IF NOT EXISTS idx_policy_lookup ON credential_access_policies(credential_id, entity_id, entity_type);

-- ============================================
-- Table: credential_audit_log
-- Complete trail of all credential access
-- ============================================
CREATE TABLE IF NOT EXISTS credential_audit_log (
  -- Identity
  id TEXT PRIMARY KEY,                          -- audit_<timestamp>_<hash>
  
  -- What was accessed
  credential_id TEXT NOT NULL,
  
  -- Who accessed it
  entity_id TEXT NOT NULL,                      -- Which skill/tool
  entity_type TEXT NOT NULL,                    -- 'skill' or 'tool'
  user_id TEXT,                                 -- Which user triggered the execution
  
  -- What happened
  action TEXT NOT NULL,                         -- 'retrieve', 'rotate', 'revoke', 'grant_access', 'revoke_access'
  success INTEGER NOT NULL,                     -- 1 for success, 0 for failure
  
  -- When and where
  timestamp TEXT NOT NULL,
  ip_address TEXT,                              -- Optional: IP of the request
  
  -- Details
  error_message TEXT,                           -- If failed, why?
  metadata TEXT,                                -- JSON: additional context
  
  -- Foreign keys
  FOREIGN KEY (credential_id) REFERENCES credentials(id) ON DELETE CASCADE,
  
  -- Constraints
  CHECK(entity_type IN ('skill', 'tool')),
  CHECK(action IN ('retrieve', 'rotate', 'revoke', 'grant_access', 'revoke_access', 'create', 'update', 'delete')),
  CHECK(success IN (0, 1))
);

-- Indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_credential ON credential_audit_log(credential_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON credential_audit_log(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON credential_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON credential_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_user ON credential_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_success ON credential_audit_log(success);

-- ============================================
-- Table: encryption_keys
-- Tracks encryption keys for rotation
-- ============================================
CREATE TABLE IF NOT EXISTS encryption_keys (
  -- Identity
  id TEXT PRIMARY KEY,                          -- key_<timestamp>
  
  -- Key info (we don't store the actual key, just metadata)
  key_hash TEXT NOT NULL UNIQUE,                -- SHA-256 hash of the key (for verification)
  algorithm TEXT NOT NULL DEFAULT 'aes-256-gcm',
  
  -- Lifecycle
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',        -- 'active', 'rotated', 'revoked'
  rotated_to TEXT,                              -- ID of the new key (if rotated)
  
  -- Foreign keys
  FOREIGN KEY (rotated_to) REFERENCES encryption_keys(id),
  
  -- Constraints
  CHECK(status IN ('active', 'rotated', 'revoked')),
  CHECK(algorithm IN ('aes-256-gcm'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_key_status ON encryption_keys(status);

-- ============================================
-- Views for convenience
-- ============================================

-- Active credentials with access count
CREATE VIEW IF NOT EXISTS v_credentials_summary AS
SELECT 
  c.id,
  c.name,
  c.type,
  c.service,
  c.environment,
  c.status,
  c.created_at,
  c.last_rotated_at,
  COUNT(DISTINCT p.id) as access_policies_count,
  COUNT(DISTINCT a.id) as access_count_30d
FROM credentials c
LEFT JOIN credential_access_policies p ON c.id = p.credential_id
LEFT JOIN credential_audit_log a ON c.id = a.credential_id 
  AND a.timestamp > datetime('now', '-30 days')
  AND a.action = 'retrieve'
  AND a.success = 1
GROUP BY c.id;

-- Recent credential access
CREATE VIEW IF NOT EXISTS v_recent_access AS
SELECT 
  a.id,
  a.timestamp,
  c.name as credential_name,
  c.service,
  a.entity_id,
  a.entity_type,
  a.user_id,
  a.action,
  a.success,
  a.error_message
FROM credential_audit_log a
JOIN credentials c ON a.credential_id = c.id
ORDER BY a.timestamp DESC
LIMIT 100;

-- Credentials with expired policies
CREATE VIEW IF NOT EXISTS v_expired_policies AS
SELECT 
  c.name as credential_name,
  c.service,
  p.entity_id,
  p.entity_type,
  p.expires_at,
  p.granted_by,
  p.reason
FROM credential_access_policies p
JOIN credentials c ON p.credential_id = c.id
WHERE p.expires_at IS NOT NULL
  AND p.expires_at < datetime('now')
ORDER BY p.expires_at DESC;

-- ============================================
-- Sample Queries
-- ============================================

-- Get all active credentials
-- SELECT * FROM credentials WHERE status = 'active';

-- Check if a skill has access to a credential
-- SELECT EXISTS(
--   SELECT 1 FROM credential_access_policies 
--   WHERE credential_id = 'cred_xxx' 
--     AND entity_id = 'skill_yyy' 
--     AND entity_type = 'skill'
--     AND (expires_at IS NULL OR expires_at > datetime('now'))
-- );

-- Get audit trail for a credential
-- SELECT * FROM credential_audit_log 
-- WHERE credential_id = 'cred_xxx' 
-- ORDER BY timestamp DESC;

-- Find credentials that haven't been used in 90 days
-- SELECT c.* FROM credentials c
-- LEFT JOIN (
--   SELECT credential_id, MAX(timestamp) as last_used
--   FROM credential_audit_log
--   WHERE action = 'retrieve' AND success = 1
--   GROUP BY credential_id
-- ) a ON c.id = a.credential_id
-- WHERE c.status = 'active'
--   AND (a.last_used IS NULL OR a.last_used < datetime('now', '-90 days'));

-- Top 10 most accessed credentials (last 30 days)
-- SELECT 
--   c.name,
--   c.service,
--   COUNT(*) as access_count
-- FROM credential_audit_log a
-- JOIN credentials c ON a.credential_id = c.id
-- WHERE a.action = 'retrieve'
--   AND a.success = 1
--   AND a.timestamp > datetime('now', '-30 days')
-- GROUP BY c.id
-- ORDER BY access_count DESC
-- LIMIT 10;

-- Failed access attempts (potential security issues)
-- SELECT 
--   a.timestamp,
--   c.name as credential_name,
--   a.entity_id,
--   a.user_id,
--   a.error_message
-- FROM credential_audit_log a
-- JOIN credentials c ON a.credential_id = c.id
-- WHERE a.success = 0
--   AND a.action = 'retrieve'
-- ORDER BY a.timestamp DESC;

