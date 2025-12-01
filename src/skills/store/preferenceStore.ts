/**
 * Preference Store - User Skill Preferences
 * 
 * Stores learned default values for skill parameters per user
 * Foundation for personalized agent behavior
 */

import Database from 'better-sqlite3';
import crypto from 'crypto';
import { getDb } from './unifiedStore.js';
import { UserSkillPreference, PreferenceLearningConfig } from '../types/memory.js';

/**
 * Default learning configuration
 */
export const DEFAULT_LEARNING_CONFIG: PreferenceLearningConfig = {
  minExecutions: 5,          // Need at least 5 executions
  confidenceThreshold: 0.7,  // 70% consistency
  windowSize: 20             // Look at last 20 executions
};

/**
 * Initialize preference store table
 */
export function initPreferenceStore(): void {
  const db = getDb();
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      param_name TEXT NOT NULL,
      default_value TEXT NOT NULL,
      usage_count INTEGER NOT NULL DEFAULT 1,
      confidence REAL NOT NULL,
      last_used_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, skill_id, param_name)
    );
    
    CREATE INDEX IF NOT EXISTS idx_pref_user_skill
      ON user_preferences(user_id, skill_id);
    
    CREATE INDEX IF NOT EXISTS idx_pref_confidence
      ON user_preferences(confidence DESC);
    
    CREATE INDEX IF NOT EXISTS idx_pref_last_used
      ON user_preferences(last_used_at DESC);
  `);
}

/**
 * Generate unique ID for preference
 */
function generateId(): string {
  return `pref_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Save or update a preference
 */
export function savePreference(
  userId: string,
  skillId: string,
  paramName: string,
  defaultValue: any,
  usageCount: number,
  confidence: number
): string {
  const db = getDb();
  
  // Ensure table exists
  initPreferenceStore();
  
  const now = new Date().toISOString();
  
  // Check if preference already exists
  const existing = getPreference(userId, skillId, paramName);
  
  if (existing) {
    // Update existing
    const stmt = db.prepare(`
      UPDATE user_preferences
      SET 
        default_value = ?,
        usage_count = ?,
        confidence = ?,
        last_used_at = ?,
        updated_at = ?
      WHERE id = ?
    `);
    
    stmt.run(
      JSON.stringify(defaultValue),
      usageCount,
      confidence,
      now,
      now,
      existing.id
    );
    
    return existing.id;
  } else {
    // Insert new
    const id = generateId();
    
    const stmt = db.prepare(`
      INSERT INTO user_preferences (
        id, user_id, skill_id, param_name, default_value,
        usage_count, confidence, last_used_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      userId,
      skillId,
      paramName,
      JSON.stringify(defaultValue),
      usageCount,
      confidence,
      now,
      now,
      now
    );
    
    return id;
  }
}

/**
 * Get a specific preference
 */
export function getPreference(
  userId: string,
  skillId: string,
  paramName: string
): UserSkillPreference | null {
  const db = getDb();
  
  // Ensure table exists
  initPreferenceStore();
  
  const stmt = db.prepare(`
    SELECT * FROM user_preferences
    WHERE user_id = ? AND skill_id = ? AND param_name = ?
  `);
  
  const row = stmt.get(userId, skillId, paramName) as any;
  
  if (!row) return null;
  
  return parsePreferenceRecord(row);
}

/**
 * Get all preferences for a user + skill combination
 */
export function getPreferencesForUserAndSkill(
  userId: string,
  skillId: string
): UserSkillPreference[] {
  const db = getDb();
  
  // Ensure table exists
  initPreferenceStore();
  
  const stmt = db.prepare(`
    SELECT * FROM user_preferences
    WHERE user_id = ? AND skill_id = ?
    ORDER BY confidence DESC, last_used_at DESC
  `);
  
  const rows = stmt.all(userId, skillId) as any[];
  
  return rows.map(parsePreferenceRecord);
}

/**
 * Get all preferences for a user
 */
export function getPreferencesByUser(
  userId: string,
  limit?: number
): UserSkillPreference[] {
  const db = getDb();
  
  // Ensure table exists
  initPreferenceStore();
  
  let query = `
    SELECT * FROM user_preferences
    WHERE user_id = ?
    ORDER BY confidence DESC, last_used_at DESC
  `;
  
  if (limit) {
    query += ` LIMIT ${limit}`;
  }
  
  const stmt = db.prepare(query);
  const rows = stmt.all(userId) as any[];
  
  return rows.map(parsePreferenceRecord);
}

/**
 * Delete a preference
 */
export function deletePreference(
  userId: string,
  skillId: string,
  paramName: string
): boolean {
  const db = getDb();
  
  // Ensure table exists
  initPreferenceStore();
  
  const stmt = db.prepare(`
    DELETE FROM user_preferences
    WHERE user_id = ? AND skill_id = ? AND param_name = ?
  `);
  
  const result = stmt.run(userId, skillId, paramName);
  
  return result.changes > 0;
}

/**
 * Delete all preferences for a user
 */
export function deleteUserPreferences(userId: string): number {
  const db = getDb();
  
  // Ensure table exists
  initPreferenceStore();
  
  const stmt = db.prepare(`
    DELETE FROM user_preferences
    WHERE user_id = ?
  `);
  
  const result = stmt.run(userId);
  
  return result.changes;
}

/**
 * Delete low-confidence preferences (cleanup)
 */
export function cleanupLowConfidencePreferences(
  minConfidence: number = 0.5
): number {
  const db = getDb();
  
  // Ensure table exists
  initPreferenceStore();
  
  const stmt = db.prepare(`
    DELETE FROM user_preferences
    WHERE confidence < ?
  `);
  
  const result = stmt.run(minConfidence);
  
  return result.changes;
}

/**
 * Get preference statistics
 */
export function getPreferenceStats(): {
  totalPreferences: number;
  byUser: Record<string, number>;
  avgConfidence: number;
  highConfidenceCount: number;
} {
  const db = getDb();
  
  // Ensure table exists
  initPreferenceStore();
  
  // Total
  const totalRow = db.prepare(`
    SELECT COUNT(*) as count FROM user_preferences
  `).get() as { count: number };
  
  // By user
  const byUserRows = db.prepare(`
    SELECT user_id, COUNT(*) as count
    FROM user_preferences
    GROUP BY user_id
  `).all() as { user_id: string; count: number }[];
  
  const byUser: Record<string, number> = {};
  for (const row of byUserRows) {
    byUser[row.user_id] = row.count;
  }
  
  // Average confidence
  const avgRow = db.prepare(`
    SELECT AVG(confidence) as avg_conf
    FROM user_preferences
  `).get() as { avg_conf: number };
  
  // High confidence count (>= 0.8)
  const highConfRow = db.prepare(`
    SELECT COUNT(*) as count
    FROM user_preferences
    WHERE confidence >= 0.8
  `).get() as { count: number };
  
  return {
    totalPreferences: totalRow.count,
    byUser,
    avgConfidence: avgRow.avg_conf || 0,
    highConfidenceCount: highConfRow.count
  };
}

/**
 * Parse preference record from DB row
 */
function parsePreferenceRecord(row: any): UserSkillPreference {
  return {
    id: row.id,
    userId: row.user_id,
    skillId: row.skill_id,
    paramName: row.param_name,
    defaultValue: JSON.parse(row.default_value),
    usageCount: row.usage_count,
    confidence: row.confidence,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

