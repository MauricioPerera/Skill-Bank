import { config } from '../config.js';

/**
 * Matryoshka Embeddings Support
 * 
 * Matryoshka embeddings allow truncating high-dimensional vectors to lower dimensions
 * while maintaining reasonable quality. This reduces storage and improves search speed.
 * 
 * Supported models:
 * - OpenAI: text-embedding-3-small, text-embedding-3-large (can be truncated)
 * - Ollama: nomic-embed-text, mxbai-embed-large (support truncation)
 */

/**
 * Truncate an embedding vector to specified dimensions
 * @param embedding - Original embedding vector
 * @param targetDimensions - Target number of dimensions
 * @returns Truncated embedding vector
 */
export function truncateEmbedding(embedding: number[], targetDimensions: number): number[] {
    if (targetDimensions >= embedding.length) {
        return embedding; // No truncation needed
    }
    
    if (targetDimensions < 64) {
        console.warn(`Warning: Truncating to ${targetDimensions} dimensions may significantly reduce quality. Minimum recommended: 64`);
    }
    
    return embedding.slice(0, targetDimensions);
}

/**
 * Apply matryoshka truncation if enabled in config
 * @param embedding - Original embedding vector
 * @returns Possibly truncated embedding vector
 */
export function applyMatryoshka(embedding: number[]): number[] {
    if (!config.matryoshka.enabled) {
        return embedding;
    }
    
    const targetDims = config.matryoshka.targetDimensions;
    
    if (targetDims >= embedding.length) {
        console.log(`Matryoshka enabled but target dimensions (${targetDims}) >= embedding length (${embedding.length}). No truncation applied.`);
        return embedding;
    }
    
    console.log(`Matryoshka: Truncating embedding from ${embedding.length} to ${targetDims} dimensions`);
    return truncateEmbedding(embedding, targetDims);
}

/**
 * Batch truncate embeddings
 * @param embeddings - Array of embedding vectors
 * @param targetDimensions - Target number of dimensions
 * @returns Array of truncated embeddings
 */
export function truncateEmbeddingsBatch(embeddings: number[][], targetDimensions: number): number[][] {
    return embeddings.map(emb => truncateEmbedding(emb, targetDimensions));
}

/**
 * Get recommended truncation dimensions for a model
 * @param modelName - Name of the embedding model
 * @param originalDimensions - Original embedding dimensions
 * @returns Array of recommended truncation dimensions
 */
export function getRecommendedDimensions(modelName: string, originalDimensions: number): number[] {
    // Common matryoshka truncation points
    const commonDimensions = [64, 128, 256, 384, 512, 768, 1024, 1536];
    
    // Filter to dimensions smaller than original
    const valid = commonDimensions.filter(d => d < originalDimensions);
    
    // Model-specific recommendations
    if (modelName.includes('nomic-embed-text')) {
        // nomic-embed-text: 768 dims, can truncate to 512, 384, 256, 128, 64
        return [512, 384, 256, 128, 64];
    }
    
    if (modelName.includes('text-embedding-3')) {
        // OpenAI text-embedding-3: 1536 dims, can truncate to 1024, 768, 512, 256
        return [1024, 768, 512, 256];
    }
    
    if (modelName.includes('mxbai-embed-large')) {
        // mxbai: 1024 dims, can truncate to 768, 512, 384, 256
        return [768, 512, 384, 256];
    }
    
    // Default recommendations
    return valid;
}

/**
 * Calculate approximate quality retention for truncation
 * Based on empirical studies of matryoshka embeddings
 * @param originalDims - Original embedding dimensions
 * @param truncatedDims - Truncated dimensions
 * @returns Approximate quality retention (0-1)
 */
export function estimateQualityRetention(originalDims: number, truncatedDims: number): number {
    if (truncatedDims >= originalDims) return 1.0;
    
    const ratio = truncatedDims / originalDims;
    
    // Empirical approximation based on matryoshka research
    // Quality drops more slowly at first, then faster
    if (ratio >= 0.75) return 0.95 + (ratio - 0.75) * 0.2;  // 95-100%
    if (ratio >= 0.50) return 0.85 + (ratio - 0.50) * 0.4;  // 85-95%
    if (ratio >= 0.33) return 0.70 + (ratio - 0.33) * 0.88; // 70-85%
    if (ratio >= 0.25) return 0.60 + (ratio - 0.25) * 1.25; // 60-70%
    return 0.50 + ratio * 0.4; // 50-60% for very small ratios
}

/**
 * Get storage savings from truncation
 * @param originalDims - Original embedding dimensions
 * @param truncatedDims - Truncated dimensions
 * @returns Object with storage info
 */
export function getStorageSavings(originalDims: number, truncatedDims: number): {
    reductionPercent: number;
    bytesPerEmbedding: {
        original: number;
        truncated: number;
        saved: number;
    };
} {
    const bytesPerFloat = 4; // 32-bit float
    const originalBytes = originalDims * bytesPerFloat;
    const truncatedBytes = truncatedDims * bytesPerFloat;
    const savedBytes = originalBytes - truncatedBytes;
    const reductionPercent = (savedBytes / originalBytes) * 100;
    
    return {
        reductionPercent: Math.round(reductionPercent * 100) / 100,
        bytesPerEmbedding: {
            original: originalBytes,
            truncated: truncatedBytes,
            saved: savedBytes
        }
    };
}

