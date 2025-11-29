import { describe, it, expect } from 'vitest';
import {
  truncateEmbedding,
  applyMatryoshka,
  truncateEmbeddingsBatch,
  getRecommendedDimensions,
  estimateQualityRetention,
  getStorageSavings
} from '../src/embeddings/matryoshka.js';
import { config } from '../src/config.js';

describe('Matryoshka Embeddings', () => {
  describe('truncateEmbedding', () => {
    it('should truncate embedding to target dimensions', () => {
      const embedding = Array.from({ length: 1536 }, (_, i) => i);
      const truncated = truncateEmbedding(embedding, 768);
      
      expect(truncated).toHaveLength(768);
      expect(truncated[0]).toBe(0);
      expect(truncated[767]).toBe(767);
    });

    it('should not truncate if target dimensions >= original', () => {
      const embedding = Array.from({ length: 768 }, (_, i) => i);
      const truncated = truncateEmbedding(embedding, 1024);
      
      expect(truncated).toHaveLength(768);
      expect(truncated).toEqual(embedding);
    });

    it('should handle small dimensions', () => {
      const embedding = Array.from({ length: 1536 }, (_, i) => i);
      const truncated = truncateEmbedding(embedding, 64);
      
      expect(truncated).toHaveLength(64);
    });

    it('should preserve original embedding values', () => {
      const embedding = [1.5, 2.7, 3.2, 4.1, 5.9];
      const truncated = truncateEmbedding(embedding, 3);
      
      expect(truncated).toEqual([1.5, 2.7, 3.2]);
    });
  });

  describe('truncateEmbeddingsBatch', () => {
    it('should truncate multiple embeddings', () => {
      const embeddings = [
        Array.from({ length: 1536 }, (_, i) => i),
        Array.from({ length: 1536 }, (_, i) => i * 2),
        Array.from({ length: 1536 }, (_, i) => i * 3)
      ];
      
      const truncated = truncateEmbeddingsBatch(embeddings, 768);
      
      expect(truncated).toHaveLength(3);
      expect(truncated[0]).toHaveLength(768);
      expect(truncated[1]).toHaveLength(768);
      expect(truncated[2]).toHaveLength(768);
      
      expect(truncated[0][0]).toBe(0);
      expect(truncated[1][0]).toBe(0);
      expect(truncated[2][0]).toBe(0);
      
      expect(truncated[0][767]).toBe(767);
      expect(truncated[1][767]).toBe(767 * 2);
      expect(truncated[2][767]).toBe(767 * 3);
    });

    it('should handle empty array', () => {
      const truncated = truncateEmbeddingsBatch([], 768);
      expect(truncated).toEqual([]);
    });
  });

  describe('applyMatryoshka', () => {
    it('should return original if matryoshka disabled', () => {
      // Temporarily disable
      const originalEnabled = config.matryoshka.enabled;
      config.matryoshka.enabled = false;
      
      const embedding = Array.from({ length: 1536 }, (_, i) => i);
      const result = applyMatryoshka(embedding);
      
      expect(result).toHaveLength(1536);
      expect(result).toEqual(embedding);
      
      // Restore
      config.matryoshka.enabled = originalEnabled;
    });

    it('should truncate if enabled and target < length', () => {
      // Temporarily enable
      const originalEnabled = config.matryoshka.enabled;
      const originalDims = config.matryoshka.targetDimensions;
      
      config.matryoshka.enabled = true;
      config.matryoshka.targetDimensions = 768;
      
      const embedding = Array.from({ length: 1536 }, (_, i) => i);
      const result = applyMatryoshka(embedding);
      
      expect(result).toHaveLength(768);
      
      // Restore
      config.matryoshka.enabled = originalEnabled;
      config.matryoshka.targetDimensions = originalDims;
    });

    it('should not truncate if target >= length', () => {
      const originalEnabled = config.matryoshka.enabled;
      const originalDims = config.matryoshka.targetDimensions;
      
      config.matryoshka.enabled = true;
      config.matryoshka.targetDimensions = 2048;
      
      const embedding = Array.from({ length: 1536 }, (_, i) => i);
      const result = applyMatryoshka(embedding);
      
      expect(result).toHaveLength(1536);
      expect(result).toEqual(embedding);
      
      config.matryoshka.enabled = originalEnabled;
      config.matryoshka.targetDimensions = originalDims;
    });
  });

  describe('getRecommendedDimensions', () => {
    it('should return recommendations for nomic-embed-text', () => {
      const recommendations = getRecommendedDimensions('nomic-embed-text', 768);
      
      expect(recommendations).toEqual([512, 384, 256, 128, 64]);
    });

    it('should return recommendations for OpenAI text-embedding-3', () => {
      const recommendations = getRecommendedDimensions('text-embedding-3-small', 1536);
      
      expect(recommendations).toEqual([1024, 768, 512, 256]);
    });

    it('should return recommendations for mxbai-embed-large', () => {
      const recommendations = getRecommendedDimensions('mxbai-embed-large', 1024);
      
      expect(recommendations).toEqual([768, 512, 384, 256]);
    });

    it('should return generic recommendations for unknown model', () => {
      const recommendations = getRecommendedDimensions('unknown-model', 1536);
      
      // Should return common dimensions smaller than original
      expect(recommendations).toContain(1024);
      expect(recommendations).toContain(768);
      expect(recommendations).toContain(512);
      expect(recommendations.every(d => d < 1536)).toBe(true);
    });

    it('should filter out dimensions >= original', () => {
      const recommendations = getRecommendedDimensions('any-model', 512);
      
      expect(recommendations.every(d => d < 512)).toBe(true);
    });
  });

  describe('estimateQualityRetention', () => {
    it('should return 1.0 for no truncation', () => {
      const quality = estimateQualityRetention(1536, 1536);
      expect(quality).toBe(1.0);
    });

    it('should return 1.0 for larger target dims', () => {
      const quality = estimateQualityRetention(768, 1024);
      expect(quality).toBe(1.0);
    });

    it('should estimate high quality for 75% retention', () => {
      const quality = estimateQualityRetention(1536, 1152); // 75%
      expect(quality).toBeGreaterThan(0.90);
      expect(quality).toBeLessThanOrEqual(1.0);
    });

    it('should estimate good quality for 50% retention', () => {
      const quality = estimateQualityRetention(1536, 768); // 50%
      expect(quality).toBeGreaterThan(0.80);
      expect(quality).toBeLessThan(0.95);
    });

    it('should estimate moderate quality for 33% retention', () => {
      const quality = estimateQualityRetention(1536, 512); // 33%
      expect(quality).toBeGreaterThan(0.70);
      expect(quality).toBeLessThan(0.90);
    });

    it('should estimate lower quality for very small ratios', () => {
      const quality = estimateQualityRetention(1536, 128); // ~8%
      expect(quality).toBeGreaterThan(0.50);
      expect(quality).toBeLessThan(0.70);
    });
  });

  describe('getStorageSavings', () => {
    it('should calculate 50% savings for 1536 -> 768', () => {
      const savings = getStorageSavings(1536, 768);
      
      expect(savings.reductionPercent).toBe(50);
      expect(savings.bytesPerEmbedding.original).toBe(1536 * 4);
      expect(savings.bytesPerEmbedding.truncated).toBe(768 * 4);
      expect(savings.bytesPerEmbedding.saved).toBe(768 * 4);
    });

    it('should calculate 67% savings for 1536 -> 512', () => {
      const savings = getStorageSavings(1536, 512);
      
      expect(savings.reductionPercent).toBeCloseTo(66.67, 1);
      expect(savings.bytesPerEmbedding.original).toBe(1536 * 4);
      expect(savings.bytesPerEmbedding.truncated).toBe(512 * 4);
    });

    it('should calculate 75% savings for 1536 -> 384', () => {
      const savings = getStorageSavings(1536, 384);
      
      expect(savings.reductionPercent).toBe(75);
      expect(savings.bytesPerEmbedding.original).toBe(1536 * 4);
      expect(savings.bytesPerEmbedding.truncated).toBe(384 * 4);
    });

    it('should handle no savings (same dimensions)', () => {
      const savings = getStorageSavings(768, 768);
      
      expect(savings.reductionPercent).toBe(0);
      expect(savings.bytesPerEmbedding.saved).toBe(0);
    });

    it('should calculate bytes correctly', () => {
      const savings = getStorageSavings(1000, 500);
      
      // Each float is 4 bytes
      expect(savings.bytesPerEmbedding.original).toBe(4000);
      expect(savings.bytesPerEmbedding.truncated).toBe(2000);
      expect(savings.bytesPerEmbedding.saved).toBe(2000);
    });
  });

  describe('Integration tests', () => {
    it('should demonstrate quality/storage trade-off', () => {
      const originalDims = 1536;
      const targetConfigs = [
        { dims: 1024, expectedQuality: 0.92, expectedSavings: 33 },
        { dims: 768, expectedQuality: 0.85, expectedSavings: 50 },
        { dims: 512, expectedQuality: 0.70, expectedSavings: 67 },
        { dims: 384, expectedQuality: 0.61, expectedSavings: 75 }
      ];

      targetConfigs.forEach(({ dims, expectedQuality, expectedSavings }) => {
        const quality = estimateQualityRetention(originalDims, dims);
        const savings = getStorageSavings(originalDims, dims);

        // Quality should be close to expected (with wider tolerance for lower dimensions)
        const tolerance = dims <= 384 ? 0.15 : 0.05;
        expect(quality).toBeGreaterThanOrEqual(expectedQuality - tolerance);
        expect(quality).toBeLessThanOrEqual(expectedQuality + tolerance);

        // Savings should be close to expected
        expect(savings.reductionPercent).toBeGreaterThanOrEqual(expectedSavings - 1);
        expect(savings.reductionPercent).toBeLessThanOrEqual(expectedSavings + 1);
      });
    });

    it('should work with real embedding dimensions', () => {
      // Test with OpenAI dimensions
      const openaiEmbedding = Array.from({ length: 1536 }, () => Math.random());
      const truncated = truncateEmbedding(openaiEmbedding, 768);
      expect(truncated).toHaveLength(768);

      // Test with Ollama nomic dimensions
      const nomicEmbedding = Array.from({ length: 768 }, () => Math.random());
      const truncatedNomic = truncateEmbedding(nomicEmbedding, 384);
      expect(truncatedNomic).toHaveLength(384);
    });

    it('should preserve embedding values during truncation', () => {
      const originalEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
      const truncated = truncateEmbedding(originalEmbedding, 5);
      
      expect(truncated).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
      
      // Original should be unchanged
      expect(originalEmbedding).toHaveLength(10);
    });
  });
});

