/**
 * Tests para Execution Store
 * 
 * Valida el tracking de ejecuciones y analytics
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  logExecution,
  getRecentExecutions,
  getExecutionHistory,
  getExecutionStats,
  getTopSkills,
  getExecution
} from '../store/executionStore.js';
import type { ExecutionRecord } from '../store/executionStore.js';

// Alias for clearer test names
const getExecutionsBySkill = getExecutionHistory;
const getStats = getExecutionStats;

describe('Execution Store', () => {
  describe('Log Execution', () => {
    it('should log execution successfully', () => {
      const record: Omit<ExecutionRecord, 'id' | 'timestamp'> = {
        skillId: 'test_skill',
        skillType: 'tool_based',
        input: { query: 'test query' },
        output: { result: 'success' },
        success: true,
        executionTime: 150
      };

      const id = logExecution(record);
      
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should log failed execution with error', () => {
      const record: Omit<ExecutionRecord, 'id' | 'timestamp'> = {
        skillId: 'failing_skill',
        skillType: 'tool_based',
        input: { action: 'fail' },
        output: null,
        success: false,
        executionTime: 50,
        error: 'Test error message'
      };

      const id = logExecution(record);
      
      expect(id).toBeDefined();
      
      const retrieved = getExecution(id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.success).toBe(false);
      expect(retrieved?.error).toBe('Test error message');
    });

    it('should store all execution fields', () => {
      const record: Omit<ExecutionRecord, 'id' | 'timestamp'> = {
        skillId: 'complete_skill',
        skillType: 'context_aware',
        input: { query: 'test', filters: { level: 2 } },
        output: { context: ['result1', 'result2'] },
        success: true,
        executionTime: 234
      };

      const id = logExecution(record);
      const retrieved = getExecution(id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.skillId).toBe('complete_skill');
      expect(retrieved?.skillType).toBe('context_aware');
      expect(retrieved?.input).toEqual({ query: 'test', filters: { level: 2 } });
      expect(retrieved?.output).toEqual({ context: ['result1', 'result2'] });
      expect(retrieved?.executionTime).toBe(234);
    });

    it('should generate unique IDs for each execution', () => {
      const record: Omit<ExecutionRecord, 'id' | 'timestamp'> = {
        skillId: 'test_skill',
        skillType: 'tool_based',
        input: {},
        output: {},
        success: true,
        executionTime: 100
      };

      const id1 = logExecution(record);
      const id2 = logExecution(record);
      const id3 = logExecution(record);

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should add timestamp automatically', () => {
      const record: Omit<ExecutionRecord, 'id' | 'timestamp'> = {
        skillId: 'test_skill',
        skillType: 'tool_based',
        input: {},
        output: {},
        success: true,
        executionTime: 100
      };

      const id = logExecution(record);
      const retrieved = getExecution(id);

      expect(retrieved?.timestamp).toBeDefined();
      expect(typeof retrieved?.timestamp).toBe('string');
      expect(new Date(retrieved!.timestamp).getTime()).toBeGreaterThan(0);
    });
  });

  describe('Retrieve Executions', () => {
    beforeEach(() => {
      // Log some test executions
      for (let i = 0; i < 5; i++) {
        logExecution({
          skillId: `skill_${i}`,
          skillType: 'tool_based',
          input: { index: i },
          output: { result: i },
          success: true,
          executionTime: 100 + i * 10
        });
      }
    });

    it('should retrieve recent executions', () => {
      const recent = getRecentExecutions(3);
      
      expect(recent).toBeDefined();
      expect(Array.isArray(recent)).toBe(true);
      expect(recent.length).toBeLessThanOrEqual(3);
    });

    it('should retrieve executions by skill ID', () => {
      const skillId = 'specific_skill';
      
      // Log multiple executions for same skill
      logExecution({
        skillId,
        skillType: 'tool_based',
        input: { run: 1 },
        output: {},
        success: true,
        executionTime: 100
      });
      
      logExecution({
        skillId,
        skillType: 'tool_based',
        input: { run: 2 },
        output: {},
        success: true,
        executionTime: 120
      });

      const executions = getExecutionsBySkill(skillId);
      
      expect(executions.length).toBeGreaterThanOrEqual(2);
      expect(executions.every(e => e.skillId === skillId)).toBe(true);
    });

    it('should limit results when specified', () => {
      const limit = 2;
      const recent = getRecentExecutions(limit);
      
      expect(recent.length).toBeLessThanOrEqual(limit);
    });

    it('should return empty array for non-existent skill', () => {
      const executions = getExecutionsBySkill('non_existent_skill_xyz');
      
      expect(Array.isArray(executions)).toBe(true);
      expect(executions.length).toBe(0);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      // Log diverse executions for stats
      const skills = ['skill_a', 'skill_b', 'skill_c'];
      const types = ['tool_based', 'context_aware', 'instructional'];

      for (let i = 0; i < 15; i++) {
        logExecution({
          skillId: skills[i % 3],
          skillType: types[i % 3],
          input: {},
          output: {},
          success: i % 4 !== 0, // 25% failure rate
          executionTime: 100 + Math.random() * 200
        });
      }
    });

    it('should calculate overall stats', () => {
      const stats = getStats();
      
      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.bySkill).toBeDefined();
      expect(stats.byType).toBeDefined();
      expect(typeof stats.successRate).toBe('number');
      expect(typeof stats.averageExecutionTime).toBe('number');
    });

    it('should calculate success rate correctly', () => {
      const stats = getStats();
      
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeLessThanOrEqual(1);
    });

    it('should group executions by skill', () => {
      const stats = getStats();
      
      expect(stats.bySkill).toBeDefined();
      expect(typeof stats.bySkill).toBe('object');
      expect(Object.keys(stats.bySkill).length).toBeGreaterThan(0);
    });

    it('should group executions by type', () => {
      const stats = getStats();
      
      expect(stats.byType).toBeDefined();
      expect(typeof stats.byType).toBe('object');
      
      // Should have at least one type
      const types = Object.keys(stats.byType);
      expect(types.length).toBeGreaterThan(0);
    });

    it('should calculate average execution time', () => {
      const stats = getStats();
      
      expect(stats.averageExecutionTime).toBeGreaterThan(0);
      expect(stats.averageExecutionTime).toBeLessThan(10000); // Reasonable time
    });
  });

  describe('Top Skills', () => {
    beforeEach(() => {
      // Log executions with different frequencies
      const skillFrequencies = [
        { id: 'popular_skill', count: 10 },
        { id: 'medium_skill', count: 5 },
        { id: 'rare_skill', count: 2 }
      ];

      for (const { id, count } of skillFrequencies) {
        for (let i = 0; i < count; i++) {
          logExecution({
            skillId: id,
            skillType: 'tool_based',
            input: {},
            output: {},
            success: true,
            executionTime: 100
          });
        }
      }
    });

    it('should return top skills by usage', () => {
      const topSkills = getTopSkills(3);
      
      expect(Array.isArray(topSkills)).toBe(true);
      expect(topSkills.length).toBeLessThanOrEqual(3);
    });

    it('should order skills by execution count', () => {
      const topSkills = getTopSkills(10);
      
      if (topSkills.length > 1) {
        for (let i = 0; i < topSkills.length - 1; i++) {
          expect(topSkills[i].executions).toBeGreaterThanOrEqual(topSkills[i + 1].executions);
        }
      }
    });

    it('should include required fields in top skills', () => {
      const topSkills = getTopSkills(5);
      
      for (const skill of topSkills) {
        expect(skill).toHaveProperty('skillId');
        expect(skill).toHaveProperty('executions');
        expect(skill).toHaveProperty('successRate');
        expect(skill).toHaveProperty('avgExecutionTime');
        expect(typeof skill.skillId).toBe('string');
        expect(typeof skill.executions).toBe('number');
        expect(typeof skill.successRate).toBe('number');
        expect(typeof skill.avgExecutionTime).toBe('number');
      }
    });

    it('should respect limit parameter', () => {
      const topSkills = getTopSkills(2);
      
      expect(topSkills.length).toBeLessThanOrEqual(2);
    });

    it('should handle limit larger than available skills', () => {
      const topSkills = getTopSkills(1000);
      
      expect(Array.isArray(topSkills)).toBe(true);
      // Should return all available skills, not crash
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent writes', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(
          Promise.resolve(logExecution({
            skillId: `concurrent_skill_${i}`,
            skillType: 'tool_based',
            input: { index: i },
            output: {},
            success: true,
            executionTime: 100
          }))
        );
      }

      const ids = await Promise.all(promises);
      
      expect(ids.length).toBe(10);
      expect(new Set(ids).size).toBe(10); // All unique
    });

    it('should handle concurrent reads', async () => {
      // Log some executions first
      for (let i = 0; i < 5; i++) {
        logExecution({
          skillId: 'test_skill',
          skillType: 'tool_based',
          input: {},
          output: {},
          success: true,
          executionTime: 100
        });
      }

      // Concurrent reads
      const reads = await Promise.all([
        Promise.resolve(getRecentExecutions(5)),
        Promise.resolve(getStats()),
        Promise.resolve(getTopSkills(5)),
        Promise.resolve(getExecutionsBySkill('test_skill'))
      ]);

      expect(reads[0]).toBeDefined(); // recent
      expect(reads[1]).toBeDefined(); // stats
      expect(reads[2]).toBeDefined(); // top skills
      expect(reads[3]).toBeDefined(); // by skill
    });
  });

  describe('Edge Cases', () => {
    it('should handle execution with zero execution time', () => {
      const id = logExecution({
        skillId: 'instant_skill',
        skillType: 'tool_based',
        input: {},
        output: {},
        success: true,
        executionTime: 0
      });

      const retrieved = getExecution(id);
      expect(retrieved?.executionTime).toBe(0);
    });

    it('should handle large input/output objects', () => {
      const largeInput = { data: 'x'.repeat(10000) };
      const largeOutput = { result: 'y'.repeat(10000) };

      const id = logExecution({
        skillId: 'large_data_skill',
        skillType: 'tool_based',
        input: largeInput,
        output: largeOutput,
        success: true,
        executionTime: 500
      });

      const retrieved = getExecution(id);
      expect(retrieved?.input).toEqual(largeInput);
      expect(retrieved?.output).toEqual(largeOutput);
    });

    it('should handle special characters in skill ID', () => {
      const specialId = 'skill-with_special.chars@123';
      
      const id = logExecution({
        skillId: specialId,
        skillType: 'tool_based',
        input: {},
        output: {},
        success: true,
        executionTime: 100
      });

      const executions = getExecutionsBySkill(specialId);
      expect(executions.length).toBeGreaterThan(0);
    });

    it('should handle null/undefined in optional fields', () => {
      const id = logExecution({
        skillId: 'minimal_skill',
        skillType: 'tool_based',
        input: {},
        output: null,
        success: true,
        executionTime: 100
      });

      const retrieved = getExecution(id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.output).toBe(null);
    });
  });
});

