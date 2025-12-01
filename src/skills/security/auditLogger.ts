/**
 * Audit Logger for Skill Bank v2.0
 * 
 * Provides complete audit trail for all credential operations:
 * - Log all access attempts (success and failure)
 * - Track who accessed what, when
 * - Query audit history
 * - Generate analytics summaries
 * 
 * @module skills/security/auditLogger
 */

import { getDb } from '../store/unifiedStore.js';
import { generateAuditId } from './encryption.js';
import {
  CredentialAuditEntry,
  AuditAction,
  EntityType,
  AuditQueryOptions,
  AuditSummary
} from '../types/credentials.js';

// ============================================
// Audit Logging
// ============================================

/**
 * Log a credential access attempt
 * 
 * @param credentialId - Credential ID
 * @param entityId - Skill ID or tool ID
 * @param entityType - 'skill' or 'tool'
 * @param action - Action performed
 * @param success - Whether the action succeeded
 * @param options - Optional metadata
 */
export function logCredentialAccess(
  credentialId: string,
  entityId: string,
  entityType: EntityType,
  action: AuditAction,
  success: boolean,
  options: {
    userId?: string;
    ipAddress?: string;
    errorMessage?: string;
    metadata?: Record<string, any>;
  } = {}
): void {
  const db = getDb();
  
  const id = generateAuditId();
  const now = new Date().toISOString();
  
  db.prepare(`
    INSERT INTO credential_audit_log (
      id, credential_id, entity_id, entity_type, user_id,
      action, success, timestamp, ip_address, error_message, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    credentialId,
    entityId,
    entityType,
    options.userId || null,
    action,
    success ? 1 : 0,
    now,
    options.ipAddress || null,
    options.errorMessage || null,
    options.metadata ? JSON.stringify(options.metadata) : null
  );
}

// ============================================
// Audit Queries
// ============================================

/**
 * Get audit trail for a credential
 * 
 * @param credentialId - Credential ID
 * @param options - Query options
 * @returns Array of audit entries
 */
export function getAuditTrail(
  credentialId: string,
  options: AuditQueryOptions = {}
): CredentialAuditEntry[] {
  const db = getDb();
  
  let query = `
    SELECT id, credential_id, entity_id, entity_type, user_id,
           action, success, timestamp, ip_address, error_message, metadata
    FROM credential_audit_log
    WHERE credential_id = ?
  `;
  
  const params: any[] = [credentialId];
  
  if (options.since) {
    query += ` AND timestamp >= ?`;
    params.push(options.since);
  }
  
  if (options.until) {
    query += ` AND timestamp <= ?`;
    params.push(options.until);
  }
  
  if (options.action) {
    query += ` AND action = ?`;
    params.push(options.action);
  }
  
  if (options.entityId) {
    query += ` AND entity_id = ?`;
    params.push(options.entityId);
  }
  
  if (options.userId) {
    query += ` AND user_id = ?`;
    params.push(options.userId);
  }
  
  if (options.successOnly) {
    query += ` AND success = 1`;
  }
  
  query += ` ORDER BY timestamp DESC`;
  
  if (options.limit) {
    query += ` LIMIT ?`;
    params.push(options.limit);
  }
  
  const rows = db.prepare(query).all(...params) as any[];
  
  return rows.map(row => ({
    id: row.id,
    credentialId: row.credential_id,
    entityId: row.entity_id,
    entityType: row.entity_type as EntityType,
    userId: row.user_id,
    action: row.action as AuditAction,
    success: row.success === 1,
    timestamp: row.timestamp,
    ipAddress: row.ip_address,
    errorMessage: row.error_message,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined
  }));
}

/**
 * Get audit entries for an entity (skill or tool)
 * 
 * @param entityId - Skill ID or tool ID
 * @param entityType - 'skill' or 'tool'
 * @param options - Query options
 * @returns Array of audit entries
 */
export function getAuditTrailForEntity(
  entityId: string,
  entityType: EntityType,
  options: AuditQueryOptions = {}
): CredentialAuditEntry[] {
  const db = getDb();
  
  let query = `
    SELECT id, credential_id, entity_id, entity_type, user_id,
           action, success, timestamp, ip_address, error_message, metadata
    FROM credential_audit_log
    WHERE entity_id = ? AND entity_type = ?
  `;
  
  const params: any[] = [entityId, entityType];
  
  if (options.since) {
    query += ` AND timestamp >= ?`;
    params.push(options.since);
  }
  
  if (options.until) {
    query += ` AND timestamp <= ?`;
    params.push(options.until);
  }
  
  if (options.action) {
    query += ` AND action = ?`;
    params.push(options.action);
  }
  
  if (options.successOnly) {
    query += ` AND success = 1`;
  }
  
  query += ` ORDER BY timestamp DESC`;
  
  if (options.limit) {
    query += ` LIMIT ?`;
    params.push(options.limit);
  }
  
  const rows = db.prepare(query).all(...params) as any[];
  
  return rows.map(row => ({
    id: row.id,
    credentialId: row.credential_id,
    entityId: row.entity_id,
    entityType: row.entity_type as EntityType,
    userId: row.user_id,
    action: row.action as AuditAction,
    success: row.success === 1,
    timestamp: row.timestamp,
    ipAddress: row.ip_address,
    errorMessage: row.error_message,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined
  }));
}

/**
 * Get audit entries for a user
 * 
 * @param userId - User ID
 * @param options - Query options
 * @returns Array of audit entries
 */
export function getAuditTrailForUser(
  userId: string,
  options: AuditQueryOptions = {}
): CredentialAuditEntry[] {
  const db = getDb();
  
  let query = `
    SELECT id, credential_id, entity_id, entity_type, user_id,
           action, success, timestamp, ip_address, error_message, metadata
    FROM credential_audit_log
    WHERE user_id = ?
  `;
  
  const params: any[] = [userId];
  
  if (options.since) {
    query += ` AND timestamp >= ?`;
    params.push(options.since);
  }
  
  if (options.until) {
    query += ` AND timestamp <= ?`;
    params.push(options.until);
  }
  
  if (options.action) {
    query += ` AND action = ?`;
    params.push(options.action);
  }
  
  if (options.successOnly) {
    query += ` AND success = 1`;
  }
  
  query += ` ORDER BY timestamp DESC`;
  
  if (options.limit) {
    query += ` LIMIT ?`;
    params.push(options.limit);
  }
  
  const rows = db.prepare(query).all(...params) as any[];
  
  return rows.map(row => ({
    id: row.id,
    credentialId: row.credential_id,
    entityId: row.entity_id,
    entityType: row.entity_type as EntityType,
    userId: row.user_id,
    action: row.action as AuditAction,
    success: row.success === 1,
    timestamp: row.timestamp,
    ipAddress: row.ip_address,
    errorMessage: row.error_message,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined
  }));
}

/**
 * Get recent audit entries (all credentials)
 * 
 * @param options - Query options
 * @returns Array of audit entries
 */
export function getRecentAuditEntries(
  options: AuditQueryOptions = {}
): CredentialAuditEntry[] {
  const db = getDb();
  
  let query = `
    SELECT id, credential_id, entity_id, entity_type, user_id,
           action, success, timestamp, ip_address, error_message, metadata
    FROM credential_audit_log
    WHERE 1=1
  `;
  
  const params: any[] = [];
  
  if (options.since) {
    query += ` AND timestamp >= ?`;
    params.push(options.since);
  }
  
  if (options.until) {
    query += ` AND timestamp <= ?`;
    params.push(options.until);
  }
  
  if (options.action) {
    query += ` AND action = ?`;
    params.push(options.action);
  }
  
  if (options.successOnly) {
    query += ` AND success = 1`;
  }
  
  query += ` ORDER BY timestamp DESC`;
  
  if (options.limit) {
    query += ` LIMIT ?`;
    params.push(options.limit);
  } else {
    query += ` LIMIT 100`; // Default limit
  }
  
  const rows = db.prepare(query).all(...params) as any[];
  
  return rows.map(row => ({
    id: row.id,
    credentialId: row.credential_id,
    entityId: row.entity_id,
    entityType: row.entity_type as EntityType,
    userId: row.user_id,
    action: row.action as AuditAction,
    success: row.success === 1,
    timestamp: row.timestamp,
    ipAddress: row.ip_address,
    errorMessage: row.error_message,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined
  }));
}

// ============================================
// Analytics & Summary
// ============================================

/**
 * Get audit summary statistics
 * 
 * @returns Summary of audit activity
 */
export function getAuditSummary(): AuditSummary {
  const db = getDb();
  
  // Total accesses
  const totalRow = db.prepare(`
    SELECT COUNT(*) as count FROM credential_audit_log
  `).get() as any;
  
  // By credential
  const byCredentialRows = db.prepare(`
    SELECT credential_id, COUNT(*) as count
    FROM credential_audit_log
    GROUP BY credential_id
    ORDER BY count DESC
  `).all() as any[];
  
  const byCredential: Record<string, number> = {};
  for (const row of byCredentialRows) {
    byCredential[row.credential_id] = row.count;
  }
  
  // By entity
  const byEntityRows = db.prepare(`
    SELECT entity_id, COUNT(*) as count
    FROM credential_audit_log
    GROUP BY entity_id
    ORDER BY count DESC
  `).all() as any[];
  
  const byEntity: Record<string, number> = {};
  for (const row of byEntityRows) {
    byEntity[row.entity_id] = row.count;
  }
  
  // By action
  const byActionRows = db.prepare(`
    SELECT action, COUNT(*) as count
    FROM credential_audit_log
    GROUP BY action
    ORDER BY count DESC
  `).all() as any[];
  
  const byAction: Record<string, number> = {};
  for (const row of byActionRows) {
    byAction[row.action] = row.count;
  }
  
  // Failed accesses
  const failedRow = db.prepare(`
    SELECT COUNT(*) as count
    FROM credential_audit_log
    WHERE success = 0
  `).get() as any;
  
  // Last access
  const lastAccessRow = db.prepare(`
    SELECT timestamp
    FROM credential_audit_log
    ORDER BY timestamp DESC
    LIMIT 1
  `).get() as any;
  
  return {
    totalAccesses: totalRow.count,
    byCredential,
    byEntity,
    byAction,
    failedAccesses: failedRow.count,
    lastAccessAt: lastAccessRow?.timestamp
  };
}

/**
 * Get failed access attempts (security monitoring)
 * 
 * @param options - Query options
 * @returns Array of failed access attempts
 */
export function getFailedAccessAttempts(
  options: AuditQueryOptions = {}
): CredentialAuditEntry[] {
  const db = getDb();
  
  let query = `
    SELECT id, credential_id, entity_id, entity_type, user_id,
           action, success, timestamp, ip_address, error_message, metadata
    FROM credential_audit_log
    WHERE success = 0
  `;
  
  const params: any[] = [];
  
  if (options.since) {
    query += ` AND timestamp >= ?`;
    params.push(options.since);
  }
  
  if (options.until) {
    query += ` AND timestamp <= ?`;
    params.push(options.until);
  }
  
  query += ` ORDER BY timestamp DESC`;
  
  if (options.limit) {
    query += ` LIMIT ?`;
    params.push(options.limit);
  } else {
    query += ` LIMIT 100`;
  }
  
  const rows = db.prepare(query).all(...params) as any[];
  
  return rows.map(row => ({
    id: row.id,
    credentialId: row.credential_id,
    entityId: row.entity_id,
    entityType: row.entity_type as EntityType,
    userId: row.user_id,
    action: row.action as AuditAction,
    success: false,
    timestamp: row.timestamp,
    ipAddress: row.ip_address,
    errorMessage: row.error_message,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined
  }));
}

/**
 * Count audit entries
 * 
 * @param filters - Optional filters
 * @returns Count of matching entries
 */
export function countAuditEntries(filters: {
  credentialId?: string;
  entityId?: string;
  action?: AuditAction;
  success?: boolean;
  since?: string;
  until?: string;
} = {}): number {
  const db = getDb();
  
  let query = `SELECT COUNT(*) as count FROM credential_audit_log WHERE 1=1`;
  const params: any[] = [];
  
  if (filters.credentialId) {
    query += ` AND credential_id = ?`;
    params.push(filters.credentialId);
  }
  
  if (filters.entityId) {
    query += ` AND entity_id = ?`;
    params.push(filters.entityId);
  }
  
  if (filters.action) {
    query += ` AND action = ?`;
    params.push(filters.action);
  }
  
  if (filters.success !== undefined) {
    query += ` AND success = ?`;
    params.push(filters.success ? 1 : 0);
  }
  
  if (filters.since) {
    query += ` AND timestamp >= ?`;
    params.push(filters.since);
  }
  
  if (filters.until) {
    query += ` AND timestamp <= ?`;
    params.push(filters.until);
  }
  
  const row = db.prepare(query).get(...params) as any;
  return row.count;
}

/**
 * Clean up old audit entries
 * 
 * Removes entries older than the specified number of days
 * 
 * @param olderThanDays - Number of days to keep
 * @returns Number of entries deleted
 */
export function cleanupOldAuditEntries(olderThanDays: number = 90): number {
  const db = getDb();
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  
  const result = db.prepare(`
    DELETE FROM credential_audit_log
    WHERE timestamp < ?
  `).run(cutoffDate.toISOString());
  
  return result.changes;
}

