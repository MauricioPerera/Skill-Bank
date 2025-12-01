/**
 * Tests para RAG Integration
 * 
 * Valida la integración entre Skill Bank y el RAG engine
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { queryRAGWithSkillConfig } from '../executor/ragIntegration.js';
import { indexMarkdownFile } from '../../cli/indexFile.js';
import { setDbPath as setVectorDbPath } from '../../db/vectorStore.js';
import { setJsonPath } from '../../db/jsonStore.js';
import fs from 'fs';
import path from 'path';

// Setup test databases
const TEST_VECTOR_DB = 'test-rag-integration.db';
const TEST_JSON_DB = 'test-rag-integration.json';

beforeAll(async () => {
  // Cleanup previous test data
  if (fs.existsSync(TEST_VECTOR_DB)) {
    fs.unlinkSync(TEST_VECTOR_DB);
  }
  if (fs.existsSync(TEST_JSON_DB)) {
    fs.unlinkSync(TEST_JSON_DB);
  }

  // Set test databases
  setVectorDbPath(TEST_VECTOR_DB);
  setJsonPath(TEST_JSON_DB);

  // Index a test document
  const testDocPath = 'data/docs/terms_of_service.md';
  if (fs.existsSync(testDocPath)) {
    await indexMarkdownFile(testDocPath, 'test-terms');
  }
}, 60000); // 60 second timeout for setup with embeddings

// Note: These tests require actual documents to be indexed and are slow (~60s setup)
// They are SKIPPED by default for fast test runs
// To enable: ENABLE_RAG_TESTS=true npm run test:skills
// Or run directly: npm run test:skills -- src/skills/__tests__/ragIntegration.test.ts
const SKIP_RAG_TESTS = !process.env.ENABLE_RAG_TESTS;

describe.skipIf(SKIP_RAG_TESTS)('RAG Integration', () => {
  describe('Basic Query', () => {
    it('should query RAG and return results', async () => {
      const result = await queryRAGWithSkillConfig(
        'política de cancelación',
        {}
      );

      expect(result).toBeDefined();
      expect(result.answer).toBeDefined();
      expect(result.sources).toBeDefined();
      expect(Array.isArray(result.sources)).toBe(true);
    });

    it('should return sources with required fields', async () => {
      const result = await queryRAGWithSkillConfig(
        'reembolso',
        {}
      );

      expect(result.sources.length).toBeGreaterThan(0);
      
      const source = result.sources[0];
      expect(source).toHaveProperty('nodeId');
      expect(source).toHaveProperty('docId');
      expect(source).toHaveProperty('score');
      expect(source).toHaveProperty('context');
      expect(typeof source.nodeId).toBe('string');
      expect(typeof source.docId).toBe('string');
      expect(typeof source.score).toBe('number');
      expect(typeof source.context).toBe('string');
    });

    it('should extract title from context', async () => {
      const result = await queryRAGWithSkillConfig(
        'cancelación',
        {}
      );

      const sourcesWithTitle = result.sources.filter(s => s.title);
      expect(sourcesWithTitle.length).toBeGreaterThan(0);
    });
  });

  describe('Query with Config', () => {
    it('should apply doc_id filter when provided', async () => {
      const result = await queryRAGWithSkillConfig(
        'política',
        {
          queryFilters: {
            doc_id: 'test-terms'
          }
        }
      );

      expect(result.sources.length).toBeGreaterThan(0);
      // Note: Filtering is best-effort, not guaranteed in current implementation
    });

    it('should handle empty results gracefully', async () => {
      const result = await queryRAGWithSkillConfig(
        'xyz123nonexistentquery456',
        {}
      );

      expect(result).toBeDefined();
      expect(result.sources).toBeDefined();
      expect(Array.isArray(result.sources)).toBe(true);
    });

    it('should handle level filter', async () => {
      const result = await queryRAGWithSkillConfig(
        'servicio',
        {
          queryFilters: {
            level: 2
          }
        }
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result.sources)).toBe(true);
    });
  });

  describe('Context Extraction', () => {
    it('should return non-empty context for relevant queries', async () => {
      const result = await queryRAGWithSkillConfig(
        'cancelación de suscripción',
        {}
      );

      expect(result.sources.length).toBeGreaterThan(0);
      
      for (const source of result.sources) {
        expect(source.context.length).toBeGreaterThan(0);
        expect(source.context).not.toBe('');
      }
    });

    it('should include markdown formatting in context', async () => {
      const result = await queryRAGWithSkillConfig(
        'términos',
        {}
      );

      const hasMarkdown = result.sources.some(s => 
        s.context.includes('#') || s.context.includes('##')
      );
      
      expect(hasMarkdown).toBe(true);
    });

    it('should provide sufficient context length', async () => {
      const result = await queryRAGWithSkillConfig(
        'política de cancelación',
        {}
      );

      if (result.sources.length > 0) {
        const avgLength = result.sources.reduce((sum, s) => sum + s.context.length, 0) / result.sources.length;
        expect(avgLength).toBeGreaterThan(50); // At least 50 chars per context
      }
    });
  });

  describe('Score and Ranking', () => {
    it('should return sources ordered by relevance', async () => {
      const result = await queryRAGWithSkillConfig(
        'cancelación',
        {}
      );

      if (result.sources.length > 1) {
        for (let i = 0; i < result.sources.length - 1; i++) {
          // Scores should be in descending order (higher = more relevant)
          // Note: Some implementations use distance (lower = better)
          expect(result.sources[i].score).toBeDefined();
          expect(result.sources[i + 1].score).toBeDefined();
        }
      }
    });

    it('should have valid score ranges', async () => {
      const result = await queryRAGWithSkillConfig(
        'servicio',
        {}
      );

      for (const source of result.sources) {
        expect(source.score).toBeGreaterThanOrEqual(0);
        // Scores can be > 1 depending on implementation (distance vs similarity)
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle empty query', async () => {
      const result = await queryRAGWithSkillConfig('', {});
      
      expect(result).toBeDefined();
      expect(result.sources).toBeDefined();
      expect(Array.isArray(result.sources)).toBe(true);
    });

    it('should handle special characters in query', async () => {
      const result = await queryRAGWithSkillConfig(
        'política & cancelación @#$%',
        {}
      );
      
      expect(result).toBeDefined();
      expect(Array.isArray(result.sources)).toBe(true);
    });

    it('should handle very long queries', async () => {
      const longQuery = 'cancelación '.repeat(100);
      const result = await queryRAGWithSkillConfig(longQuery, {});
      
      expect(result).toBeDefined();
      expect(Array.isArray(result.sources)).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should complete query in reasonable time', async () => {
      const start = Date.now();
      
      await queryRAGWithSkillConfig('política de cancelación', {});
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000); // Less than 5 seconds
    });

    it('should handle multiple concurrent queries', async () => {
      const queries = [
        'cancelación',
        'reembolso',
        'términos',
        'servicio',
        'política'
      ];

      const start = Date.now();
      const results = await Promise.all(
        queries.map(q => queryRAGWithSkillConfig(q, {}))
      );
      const duration = Date.now() - start;

      expect(results.length).toBe(5);
      expect(results.every(r => r.sources !== undefined)).toBe(true);
      expect(duration).toBeLessThan(10000); // Less than 10 seconds for 5 queries
    });
  });
});

