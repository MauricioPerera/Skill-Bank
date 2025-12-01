/**
 * Memory & Learning - Type Definitions
 * 
 * Foundation types for Fase 4: Memory & Learning Layer
 */

/**
 * User execution context
 * 
 * Provides user identity for memory and learning features
 */
export interface ExecutionContext {
  userId: string;          // User identifier (UUID, 'anonymous', etc.)
  sessionId?: string;      // Optional session grouping
  source?: 'cli' | 'api' | 'ui' | 'agent';  // Execution source
  metadata?: Record<string, any>;  // Additional context
}

/**
 * User skill preference
 * 
 * Learned default values for skill parameters per user
 */
export interface UserSkillPreference {
  id: string;
  userId: string;
  skillId: string;
  paramName: string;
  defaultValue: any;
  usageCount: number;      // Times this value was used
  confidence: number;       // 0-1, how confident we are (ratio)
  lastUsedAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Preference learning configuration
 */
export interface PreferenceLearningConfig {
  minExecutions: number;      // Minimum executions before creating preference (default: 5)
  confidenceThreshold: number; // Minimum confidence to apply (default: 0.7)
  windowSize: number;         // Number of recent executions to analyze (default: 20)
}

/**
 * Result of applying preferences to input parameters
 */
export interface PreferenceApplicationResult {
  finalParams: Record<string, any>;
  appliedPreferences: Array<{
    paramName: string;
    value: any;
    confidence: number;
  }>;
  source: 'user_preference' | 'system_default' | 'explicit';
}

/**
 * User pattern detection result
 */
export interface UserPattern {
  userId: string;
  skillId: string;
  paramName: string;
  detectedValue: any;
  frequency: number;        // How often this value appears
  confidence: number;       // Ratio of frequency
  firstSeenAt: string;
  lastSeenAt: string;
}

