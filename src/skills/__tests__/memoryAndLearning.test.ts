/**
 * Memory & Learning Tests
 * 
 * Tests for Fase 4: User preferences and pattern learning
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import {
  logExecution,
  getExecutionsByUser,
  getExecutionsByUserAndSkill,
  getUserStats,
  initExecutionStore
} from '../store/executionStore.js';
import {
  savePreference,
  getPreference,
  getPreferencesForUserAndSkill,
  getPreferencesByUser,
  deletePreference,
  deleteUserPreferences,
  cleanupLowConfidencePreferences,
  getPreferenceStats,
  initPreferenceStore,
  DEFAULT_LEARNING_CONFIG
} from '../store/preferenceStore.js';
import {
  detectParameterPattern,
  detectAllPatterns,
  updatePreferencesFromExecution,
  learnPreferencesFromHistory,
  canLearnPreferences
} from '../memory/patternLearning.js';
import {
  applyUserPreferences,
  previewPreferences,
  mergeWithPreferences,
  explainPreferenceDecisions
} from '../memory/preferenceApplication.js';
import { setDbPath, closeDb } from '../store/unifiedStore.js';

const TEST_DB = 'test-memory-learning.db';

describe('Memory & Learning - Preference Store', () => {
  beforeEach(() => {
    // Clean up test database
    if (fs.existsSync(TEST_DB)) {
      fs.unlinkSync(TEST_DB);
    }
    setDbPath(TEST_DB);
    initPreferenceStore();
    initExecutionStore();
  });

  afterEach(() => {
    closeDb(); // Close database connection first
    if (fs.existsSync(TEST_DB)) {
      fs.unlinkSync(TEST_DB);
    }
  });

  it('should save a new preference', () => {
    const prefId = savePreference(
      'user1',
      'generate_report',
      'format',
      'PDF',
      5,
      0.8
    );

    expect(prefId).toBeDefined();
    expect(prefId).toContain('pref_');
  });

  it('should retrieve a saved preference', () => {
    savePreference('user1', 'generate_report', 'format', 'PDF', 5, 0.8);

    const pref = getPreference('user1', 'generate_report', 'format');

    expect(pref).toBeDefined();
    expect(pref?.userId).toBe('user1');
    expect(pref?.skillId).toBe('generate_report');
    expect(pref?.paramName).toBe('format');
    expect(pref?.defaultValue).toBe('PDF');
    expect(pref?.confidence).toBe(0.8);
  });

  it('should update existing preference', () => {
    // Save initial
    savePreference('user1', 'generate_report', 'format', 'PDF', 5, 0.8);

    // Update
    savePreference('user1', 'generate_report', 'format', 'Excel', 10, 0.9);

    const pref = getPreference('user1', 'generate_report', 'format');

    expect(pref?.defaultValue).toBe('Excel');
    expect(pref?.usageCount).toBe(10);
    expect(pref?.confidence).toBe(0.9);
  });

  it('should get all preferences for user + skill', () => {
    savePreference('user1', 'generate_report', 'format', 'PDF', 5, 0.8);
    savePreference('user1', 'generate_report', 'recipients', 'team@company.com', 7, 0.85);

    const prefs = getPreferencesForUserAndSkill('user1', 'generate_report');

    expect(prefs).toHaveLength(2);
    expect(prefs[0].confidence).toBeGreaterThanOrEqual(prefs[1].confidence); // Sorted by confidence
  });

  it('should delete a preference', () => {
    savePreference('user1', 'generate_report', 'format', 'PDF', 5, 0.8);

    const deleted = deletePreference('user1', 'generate_report', 'format');

    expect(deleted).toBe(true);
    expect(getPreference('user1', 'generate_report', 'format')).toBeNull();
  });

  it('should delete all user preferences', () => {
    savePreference('user1', 'skill1', 'param1', 'value1', 5, 0.8);
    savePreference('user1', 'skill2', 'param2', 'value2', 5, 0.8);

    const deleted = deleteUserPreferences('user1');

    expect(deleted).toBe(2);
    expect(getPreferencesByUser('user1')).toHaveLength(0);
  });

  it('should cleanup low confidence preferences', () => {
    savePreference('user1', 'skill1', 'param1', 'value1', 5, 0.4); // Low
    savePreference('user2', 'skill2', 'param2', 'value2', 5, 0.9); // High

    const cleaned = cleanupLowConfidencePreferences(0.5);

    expect(cleaned).toBe(1);
    expect(getPreferencesByUser('user1')).toHaveLength(0);
    expect(getPreferencesByUser('user2')).toHaveLength(1);
  });

  it('should calculate preference statistics', () => {
    savePreference('user1', 'skill1', 'param1', 'value1', 5, 0.7);
    savePreference('user1', 'skill2', 'param2', 'value2', 5, 0.9);
    savePreference('user2', 'skill1', 'param1', 'value1', 5, 0.85);

    const stats = getPreferenceStats();

    expect(stats.totalPreferences).toBe(3);
    expect(stats.byUser['user1']).toBe(2);
    expect(stats.byUser['user2']).toBe(1);
    expect(stats.highConfidenceCount).toBe(2); // >= 0.8
  });
});

describe('Memory & Learning - Pattern Learning', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DB)) {
      fs.unlinkSync(TEST_DB);
    }
    setDbPath(TEST_DB);
    initPreferenceStore();
    initExecutionStore();
  });

  afterEach(() => {
    closeDb(); // Close database connection first
    if (fs.existsSync(TEST_DB)) {
      fs.unlinkSync(TEST_DB);
    }
  });

  it('should detect simple parameter pattern (100% confidence)', () => {
    const history = [
      { input: { format: 'PDF' } },
      { input: { format: 'PDF' } },
      { input: { format: 'PDF' } },
      { input: { format: 'PDF' } },
      { input: { format: 'PDF' } }
    ];

    const pattern = detectParameterPattern(history, 'format');

    expect(pattern).toBeDefined();
    expect(pattern?.detectedValue).toBe('PDF');
    expect(pattern?.frequency).toBe(5);
    expect(pattern?.confidence).toBe(1.0);
  });

  it('should detect pattern with 70% confidence', () => {
    const history = [
      { input: { format: 'PDF' } },
      { input: { format: 'PDF' } },
      { input: { format: 'PDF' } },
      { input: { format: 'PDF' } },
      { input: { format: 'PDF' } },
      { input: { format: 'PDF' } },
      { input: { format: 'PDF' } }, // 7 PDFs
      { input: { format: 'Excel' } },
      { input: { format: 'Excel' } },
      { input: { format: 'Excel' } } // 3 Excels
    ];

    const pattern = detectParameterPattern(history, 'format');

    expect(pattern).toBeDefined();
    expect(pattern?.detectedValue).toBe('PDF');
    expect(pattern?.confidence).toBe(0.7);
  });

  it('should not detect pattern with low confidence (< 70%)', () => {
    const history = [
      { input: { format: 'PDF' } },
      { input: { format: 'PDF' } },
      { input: { format: 'PDF' } }, // 3 PDFs
      { input: { format: 'Excel' } },
      { input: { format: 'Excel' } },
      { input: { format: 'Excel' } },
      { input: { format: 'Excel' } } // 4 Excels
    ];

    const pattern = detectParameterPattern(history, 'format', {
      ...DEFAULT_LEARNING_CONFIG,
      confidenceThreshold: 0.7
    });

    expect(pattern).toBeDefined();
    expect(pattern?.confidence).toBeLessThan(0.7);
  });

  it('should detect all patterns for multiple parameters', () => {
    // Log 10 executions with consistent patterns
    for (let i = 0; i < 10; i++) {
      logExecution({
        skillId: 'generate_report',
        skillType: 'tool_based',
        input: { format: 'PDF', recipients: 'team@company.com', dateRange: 'last_month' },
        output: { success: true },
        success: true,
        executionTime: 100,
        userId: 'user1',
        sessionId: 'session1'
      });
    }

    const patterns = detectAllPatterns('user1', 'generate_report');

    expect(patterns.length).toBeGreaterThanOrEqual(3);
    const formatPattern = patterns.find(p => p.paramName === 'format');
    expect(formatPattern).toBeDefined();
    expect(formatPattern?.confidence).toBe(1.0);
  });

  it('should update preferences from execution automatically', () => {
    // Log 5 executions to meet minExecutions threshold
    for (let i = 0; i < 5; i++) {
      logExecution({
        skillId: 'generate_report',
        skillType: 'tool_based',
        input: { format: 'PDF' },
        output: { success: true },
        success: true,
        executionTime: 100,
        userId: 'user1'
      });
    }

    // Now update preferences
    const updated = updatePreferencesFromExecution(
      'user1',
      'generate_report',
      { format: 'PDF' }
    );

    expect(updated).toContain('format');

    // Verify preference was saved
    const pref = getPreference('user1', 'generate_report', 'format');
    expect(pref).toBeDefined();
    expect(pref?.defaultValue).toBe('PDF');
    expect(pref?.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('should not create preference with insufficient executions', () => {
    // Only 3 executions (< minExecutions = 5)
    for (let i = 0; i < 3; i++) {
      logExecution({
        skillId: 'generate_report',
        skillType: 'tool_based',
        input: { format: 'PDF' },
        output: { success: true },
        success: true,
        executionTime: 100,
        userId: 'user1'
      });
    }

    const updated = updatePreferencesFromExecution(
      'user1',
      'generate_report',
      { format: 'PDF' }
    );

    expect(updated).toHaveLength(0);
  });

  it('should check if user can learn preferences', () => {
    const canLearnBefore = canLearnPreferences('user1', 'generate_report');
    expect(canLearnBefore).toBe(false);

    // Log 5 executions
    for (let i = 0; i < 5; i++) {
      logExecution({
        skillId: 'generate_report',
        skillType: 'tool_based',
        input: { format: 'PDF' },
        output: { success: true },
        success: true,
        executionTime: 100,
        userId: 'user1'
      });
    }

    const canLearnAfter = canLearnPreferences('user1', 'generate_report');
    expect(canLearnAfter).toBe(true);
  });
});

describe('Memory & Learning - Preference Application', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DB)) {
      fs.unlinkSync(TEST_DB);
    }
    setDbPath(TEST_DB);
    initPreferenceStore();
  });

  afterEach(() => {
    closeDb(); // Close database connection first
    if (fs.existsSync(TEST_DB)) {
      fs.unlinkSync(TEST_DB);
    }
  });

  it('should apply user preferences to empty input', () => {
    savePreference('user1', 'generate_report', 'format', 'PDF', 5, 0.8);
    savePreference('user1', 'generate_report', 'recipients', 'team@company.com', 5, 0.85);

    const result = applyUserPreferences('user1', 'generate_report', {});

    expect(result.finalParams.format).toBe('PDF');
    expect(result.finalParams.recipients).toBe('team@company.com');
    expect(result.appliedPreferences).toHaveLength(2);
  });

  it('should not override explicit user input', () => {
    savePreference('user1', 'generate_report', 'format', 'PDF', 5, 0.8);

    const result = applyUserPreferences('user1', 'generate_report', {
      format: 'Excel'
    });

    expect(result.finalParams.format).toBe('Excel'); // Explicit value preserved
    expect(result.appliedPreferences).toHaveLength(0);
  });

  it('should only apply high-confidence preferences', () => {
    savePreference('user1', 'generate_report', 'format', 'PDF', 5, 0.6); // Low confidence

    const result = applyUserPreferences('user1', 'generate_report', {});

    expect(result.appliedPreferences).toHaveLength(0); // Below threshold (0.7)
  });

  it('should preview preferences without applying', () => {
    savePreference('user1', 'generate_report', 'format', 'PDF', 5, 0.8);

    const preview = previewPreferences('user1', 'generate_report', {});

    expect(preview.wouldApply).toHaveLength(1);
    expect(preview.wouldApply[0].paramName).toBe('format');
  });

  it('should explain preference decisions', () => {
    savePreference('user1', 'generate_report', 'format', 'PDF', 5, 0.8);
    savePreference('user1', 'generate_report', 'recipients', 'team@company.com', 5, 0.6); // Low confidence

    const explanation = explainPreferenceDecisions('user1', 'generate_report', {
      format: 'Excel' // Explicit value
    });

    expect(explanation.applied).toHaveLength(0);
    expect(explanation.notApplied.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Memory & Learning - Execution Store with User Context', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DB)) {
      fs.unlinkSync(TEST_DB);
    }
    setDbPath(TEST_DB);
    initExecutionStore();
  });

  afterEach(() => {
    closeDb(); // Close database connection first
    if (fs.existsSync(TEST_DB)) {
      fs.unlinkSync(TEST_DB);
    }
  });

  it('should log execution with user context', () => {
    const execId = logExecution({
      skillId: 'generate_report',
      skillType: 'tool_based',
      input: { format: 'PDF' },
      output: { success: true },
      success: true,
      executionTime: 100,
      userId: 'user1',
      sessionId: 'session123',
      source: 'api'
    });

    expect(execId).toBeDefined();
  });

  it('should retrieve executions by user', () => {
    logExecution({
      skillId: 'skill1',
      skillType: 'tool_based',
      input: {},
      output: {},
      success: true,
      executionTime: 100,
      userId: 'user1'
    });

    logExecution({
      skillId: 'skill2',
      skillType: 'tool_based',
      input: {},
      output: {},
      success: true,
      executionTime: 100,
      userId: 'user2'
    });

    const user1Execs = getExecutionsByUser('user1');

    expect(user1Execs).toHaveLength(1);
    expect(user1Execs[0].userId).toBe('user1');
  });

  it('should retrieve executions by user and skill', () => {
    logExecution({
      skillId: 'generate_report',
      skillType: 'tool_based',
      input: {},
      output: {},
      success: true,
      executionTime: 100,
      userId: 'user1'
    });

    logExecution({
      skillId: 'send_email',
      skillType: 'tool_based',
      input: {},
      output: {},
      success: true,
      executionTime: 100,
      userId: 'user1'
    });

    const reportExecs = getExecutionsByUserAndSkill('user1', 'generate_report');

    expect(reportExecs).toHaveLength(1);
    expect(reportExecs[0].skillId).toBe('generate_report');
  });

  it('should calculate user-specific stats', () => {
    for (let i = 0; i < 5; i++) {
      logExecution({
        skillId: 'skill1',
        skillType: 'tool_based',
        input: {},
        output: {},
        success: true,
        executionTime: 100,
        userId: 'user1'
      });
    }

    const stats = getUserStats('user1');

    expect(stats.total).toBe(5);
    expect(stats.bySkill['skill1']).toBe(5);
  });
});

