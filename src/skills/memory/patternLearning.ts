/**
 * Pattern Learning Engine
 * 
 * Detects usage patterns from execution history and creates/updates preferences
 * 
 * Algorithm:
 * 1. Analyze last N executions for user + skill
 * 2. For each parameter, count value frequency
 * 3. If a value appears >= threshold (70%), create/update preference
 * 4. Calculate confidence as ratio: frequency / total
 */

import { getExecutionsByUserAndSkill } from '../store/executionStore.js';
import {
  savePreference,
  getPreference,
  DEFAULT_LEARNING_CONFIG
} from '../store/preferenceStore.js';
import { UserPattern, PreferenceLearningConfig } from '../types/memory.js';

/**
 * Analyze execution history and update preferences
 * 
 * Called after each execution to learn from user behavior
 */
export function updatePreferencesFromExecution(
  userId: string,
  skillId: string,
  input: Record<string, any>,
  config: PreferenceLearningConfig = DEFAULT_LEARNING_CONFIG
): string[] {
  const updatedPreferences: string[] = [];
  
  // Get recent execution history for this user + skill
  const history = getExecutionsByUserAndSkill(
    userId,
    skillId,
    config.windowSize
  );
  
  // Need minimum executions to learn
  if (history.length < config.minExecutions) {
    return updatedPreferences;
  }
  
  // Analyze each parameter in the current input
  for (const [paramName, currentValue] of Object.entries(input)) {
    // Skip if value is null/undefined
    if (currentValue == null) continue;
    
    // Detect pattern for this parameter
    const pattern = detectParameterPattern(
      history,
      paramName,
      config
    );
    
    if (!pattern) continue;
    
    // Check if confidence meets threshold
    if (pattern.confidence >= config.confidenceThreshold) {
      // Save or update preference
      savePreference(
        userId,
        skillId,
        paramName,
        pattern.detectedValue,
        pattern.frequency,
        pattern.confidence
      );
      
      updatedPreferences.push(paramName);
    }
  }
  
  return updatedPreferences;
}

/**
 * Detect pattern for a specific parameter
 * 
 * Analyzes execution history and finds the most common value
 */
export function detectParameterPattern(
  history: Array<{ input: Record<string, any> }>,
  paramName: string,
  config: PreferenceLearningConfig = DEFAULT_LEARNING_CONFIG
): UserPattern | null {
  if (history.length === 0) return null;
  
  // Count value frequencies
  const valueFrequency = new Map<string, { value: any; count: number; first: string; last: string }>();
  
  for (const execution of history) {
    const value = execution.input[paramName];
    
    // Skip if parameter not present
    if (value === undefined) continue;
    
    // Use JSON serialization for comparison (handles objects/arrays)
    const valueKey = JSON.stringify(value);
    
    const existing = valueFrequency.get(valueKey);
    if (existing) {
      existing.count++;
      existing.last = new Date().toISOString();
    } else {
      valueFrequency.set(valueKey, {
        value,
        count: 1,
        first: new Date().toISOString(),
        last: new Date().toISOString()
      });
    }
  }
  
  // No values found
  if (valueFrequency.size === 0) return null;
  
  // Find most frequent value
  let maxCount = 0;
  let dominantEntry: { value: any; count: number; first: string; last: string } | null = null;
  
  for (const entry of valueFrequency.values()) {
    if (entry.count > maxCount) {
      maxCount = entry.count;
      dominantEntry = entry;
    }
  }
  
  if (!dominantEntry) return null;
  
  // Calculate confidence
  const totalExecutions = history.length;
  const confidence = maxCount / totalExecutions;
  
  return {
    userId: '', // Will be filled by caller
    skillId: '', // Will be filled by caller
    paramName,
    detectedValue: dominantEntry.value,
    frequency: maxCount,
    confidence,
    firstSeenAt: dominantEntry.first,
    lastSeenAt: dominantEntry.last
  };
}

/**
 * Detect all patterns for a user + skill combination
 * 
 * Returns all parameters with detectable patterns
 */
export function detectAllPatterns(
  userId: string,
  skillId: string,
  config: PreferenceLearningConfig = DEFAULT_LEARNING_CONFIG
): UserPattern[] {
  const history = getExecutionsByUserAndSkill(
    userId,
    skillId,
    config.windowSize
  );
  
  if (history.length < config.minExecutions) {
    return [];
  }
  
  // Collect all unique parameter names
  const paramNames = new Set<string>();
  for (const execution of history) {
    for (const paramName of Object.keys(execution.input)) {
      paramNames.add(paramName);
    }
  }
  
  // Detect pattern for each parameter
  const patterns: UserPattern[] = [];
  
  for (const paramName of paramNames) {
    const pattern = detectParameterPattern(history, paramName, config);
    
    if (pattern && pattern.confidence >= config.confidenceThreshold) {
      patterns.push({
        ...pattern,
        userId,
        skillId
      });
    }
  }
  
  return patterns;
}

/**
 * Learn preferences from all execution history
 * 
 * Batch process to update all preferences for a user
 * Useful for:
 * - Initial learning phase
 * - Periodic re-learning
 * - After preference reset
 */
export function learnPreferencesFromHistory(
  userId: string,
  config: PreferenceLearningConfig = DEFAULT_LEARNING_CONFIG
): {
  preferencesCreated: number;
  preferencesUpdated: number;
  skillsAnalyzed: number;
} {
  // Get all executions for this user
  const { getExecutionsByUser } = require('../store/executionStore.js');
  const allExecutions = getExecutionsByUser(userId, 1000);
  
  // Group by skill
  const bySkill = new Map<string, typeof allExecutions>();
  for (const execution of allExecutions) {
    const existing = bySkill.get(execution.skillId) || [];
    existing.push(execution);
    bySkill.set(execution.skillId, existing);
  }
  
  let created = 0;
  let updated = 0;
  
  // Learn patterns for each skill
  for (const [skillId, executions] of bySkill) {
    if (executions.length < config.minExecutions) {
      continue;
    }
    
    // Collect parameter names
    const paramNames = new Set<string>();
    for (const ex of executions) {
      for (const paramName of Object.keys(ex.input)) {
        paramNames.add(paramName);
      }
    }
    
    // Detect and save patterns
    for (const paramName of paramNames) {
      const pattern = detectParameterPattern(
        executions.slice(0, config.windowSize),
        paramName,
        config
      );
      
      if (!pattern || pattern.confidence < config.confidenceThreshold) {
        continue;
      }
      
      // Check if preference exists
      const existing = getPreference(userId, skillId, paramName);
      
      savePreference(
        userId,
        skillId,
        paramName,
        pattern.detectedValue,
        pattern.frequency,
        pattern.confidence
      );
      
      if (existing) {
        updated++;
      } else {
        created++;
      }
    }
  }
  
  return {
    preferencesCreated: created,
    preferencesUpdated: updated,
    skillsAnalyzed: bySkill.size
  };
}

/**
 * Check if a user has enough execution history to learn preferences
 */
export function canLearnPreferences(
  userId: string,
  skillId: string,
  config: PreferenceLearningConfig = DEFAULT_LEARNING_CONFIG
): boolean {
  const history = getExecutionsByUserAndSkill(userId, skillId, config.windowSize);
  return history.length >= config.minExecutions;
}

