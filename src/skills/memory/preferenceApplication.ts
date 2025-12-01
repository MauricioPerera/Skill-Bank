/**
 * Preference Application
 * 
 * Applies learned preferences to skill inputs
 * Auto-fills parameters based on user history
 */

import { getPreferencesForUserAndSkill, DEFAULT_LEARNING_CONFIG } from '../store/preferenceStore.js';
import { PreferenceApplicationResult, PreferenceLearningConfig } from '../types/memory.js';

/**
 * Apply user preferences to input parameters
 * 
 * Only fills parameters that are NOT explicitly provided by the user
 * Returns both the final parameters and metadata about what was applied
 */
export function applyUserPreferences(
  userId: string,
  skillId: string,
  input: Record<string, any>,
  config: PreferenceLearningConfig = DEFAULT_LEARNING_CONFIG
): PreferenceApplicationResult {
  // Get all preferences for this user + skill
  const preferences = getPreferencesForUserAndSkill(userId, skillId);
  
  const finalParams: Record<string, any> = { ...input };
  const appliedPreferences: PreferenceApplicationResult['appliedPreferences'] = [];
  
  // Apply preferences for missing parameters
  for (const pref of preferences) {
    // Only apply if:
    // 1. Parameter not already provided
    // 2. Confidence meets threshold
    if (!(pref.paramName in finalParams) && pref.confidence >= config.confidenceThreshold) {
      finalParams[pref.paramName] = pref.defaultValue;
      appliedPreferences.push({
        paramName: pref.paramName,
        value: pref.defaultValue,
        confidence: pref.confidence
      });
    }
  }
  
  return {
    finalParams,
    appliedPreferences,
    source: appliedPreferences.length > 0 ? 'user_preference' : 'explicit'
  };
}

/**
 * Get preferences that would be applied (preview mode)
 * 
 * Shows what defaults would be used without actually applying them
 * Useful for:
 * - Showing user what preferences exist
 * - Debug/explanation mode
 * - UI preview before execution
 */
export function previewPreferences(
  userId: string,
  skillId: string,
  input: Record<string, any>,
  config: PreferenceLearningConfig = DEFAULT_LEARNING_CONFIG
): {
  wouldApply: Array<{
    paramName: string;
    currentValue: any;
    preferredValue: any;
    confidence: number;
  }>;
  alreadyProvided: string[];
} {
  const preferences = getPreferencesForUserAndSkill(userId, skillId);
  
  const wouldApply: Array<{
    paramName: string;
    currentValue: any;
    preferredValue: any;
    value: any;
    confidence: number;
  }> = [];
  const alreadyProvided: string[] = [];
  
  for (const pref of preferences) {
    if (pref.confidence < config.confidenceThreshold) {
      continue;
    }
    
    if (pref.paramName in input) {
      alreadyProvided.push(pref.paramName);
    } else {
      wouldApply.push({
        paramName: pref.paramName,
        currentValue: undefined,
        preferredValue: pref.defaultValue,
        value: pref.defaultValue,
        confidence: pref.confidence
      });
    }
  }
  
  return { wouldApply, alreadyProvided };
}

/**
 * Merge preferences with explicit input (advanced mode)
 * 
 * Unlike applyUserPreferences, this can override explicit values
 * if the preference confidence is very high
 * 
 * Use case: User mistakenly provides wrong value, system suggests correction
 */
export function mergeWithPreferences(
  userId: string,
  skillId: string,
  input: Record<string, any>,
  options: {
    overrideThreshold?: number;  // Confidence needed to override (default: 0.95)
    config?: PreferenceLearningConfig;
  } = {}
): {
  finalParams: Record<string, any>;
  applied: Array<{ paramName: string; value: any; confidence: number; overridden: boolean }>;
  suggestions: Array<{ paramName: string; currentValue: any; suggestedValue: any; confidence: number }>;
} {
  const overrideThreshold = options.overrideThreshold ?? 0.95;
  const config = options.config ?? DEFAULT_LEARNING_CONFIG;
  
  const preferences = getPreferencesForUserAndSkill(userId, skillId);
  
  const finalParams: Record<string, any> = { ...input };
  const applied: Array<{ paramName: string; value: any; confidence: number; overridden: boolean }> = [];
  const suggestions: Array<{ paramName: string; currentValue: any; suggestedValue: any; confidence: number }> = [];
  
  for (const pref of preferences) {
    if (pref.confidence < config.confidenceThreshold) {
      continue;
    }
    
    const paramName = pref.paramName;
    const hasExplicitValue = paramName in input;
    
    if (!hasExplicitValue) {
      // No explicit value: apply preference
      finalParams[paramName] = pref.defaultValue;
      applied.push({
        paramName,
        value: pref.defaultValue,
        confidence: pref.confidence,
        overridden: false
      });
    } else {
      // Has explicit value
      const explicitValue = input[paramName];
      const preferenceValue = pref.defaultValue;
      
      // Check if values differ
      const isDifferent = JSON.stringify(explicitValue) !== JSON.stringify(preferenceValue);
      
      if (isDifferent) {
        if (pref.confidence >= overrideThreshold) {
          // Very high confidence: override
          finalParams[paramName] = preferenceValue;
          applied.push({
            paramName,
            value: preferenceValue,
            confidence: pref.confidence,
            overridden: true
          });
        } else {
          // Suggest but don't override
          suggestions.push({
            paramName,
            currentValue: explicitValue,
            suggestedValue: preferenceValue,
            confidence: pref.confidence
          });
        }
      }
    }
  }
  
  return { finalParams, applied, suggestions };
}

/**
 * Explain why certain preferences were (or weren't) applied
 * 
 * Useful for transparency and debugging
 */
export function explainPreferenceDecisions(
  userId: string,
  skillId: string,
  input: Record<string, any>,
  config: PreferenceLearningConfig = DEFAULT_LEARNING_CONFIG
): {
  applied: Array<{
    paramName: string;
    reason: string;
    confidence: number;
  }>;
  notApplied: Array<{
    paramName: string;
    reason: string;
    confidence?: number;
  }>;
} {
  const preferences = getPreferencesForUserAndSkill(userId, skillId);
  
  const applied: Array<{ paramName: string; reason: string; confidence: number }> = [];
  const notApplied: Array<{ paramName: string; reason: string; confidence?: number }> = [];
  
  for (const pref of preferences) {
    const paramName = pref.paramName;
    const hasExplicitValue = paramName in input;
    const meetsThreshold = pref.confidence >= config.confidenceThreshold;
    
    if (!hasExplicitValue && meetsThreshold) {
      applied.push({
        paramName,
        reason: `Auto-filled with learned default (${(pref.confidence * 100).toFixed(0)}% confidence, used ${pref.usageCount} times)`,
        confidence: pref.confidence
      });
    } else if (hasExplicitValue) {
      notApplied.push({
        paramName,
        reason: 'User provided explicit value',
        confidence: pref.confidence
      });
    } else if (!meetsThreshold) {
      notApplied.push({
        paramName,
        reason: `Confidence too low (${(pref.confidence * 100).toFixed(0)}% < ${(config.confidenceThreshold * 100).toFixed(0)}% threshold)`,
        confidence: pref.confidence
      });
    }
  }
  
  return { applied, notApplied };
}

