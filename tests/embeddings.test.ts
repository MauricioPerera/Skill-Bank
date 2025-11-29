import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { embed } from '../src/embeddings';

describe('embeddings', () => {
    describe('embed', () => {
        it('should return a vector of length 1536', async () => {
            const result = await embed('Test text');
            expect(result.length).toBe(1536);
        });

        it('should be deterministic (same text -> same vector)', async () => {
            const text = 'Deterministic test';
            const vec1 = await embed(text);
            const vec2 = await embed(text);

            expect(vec1).toEqual(vec2);
        });

        it('should produce different vectors for different texts', async () => {
            const vec1 = await embed('Text A');
            const vec2 = await embed('Text B');

            expect(vec1).not.toEqual(vec2);
        });

        it('should produce numeric values', async () => {
            const vec = await embed('Numbers test');
            expect(vec.every(v => typeof v === 'number')).toBe(true);
        });
    });
});
