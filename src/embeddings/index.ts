import { config } from '../config.js';
import { generateMockEmbedding } from './mockEmbeddings.js';
import { generateOpenAIEmbedding, generateOpenAIEmbeddingsBatch } from './openaiEmbeddings.js';
import { generateOllamaEmbedding, generateOllamaEmbeddingsBatch } from './ollamaEmbeddings.js';
import { applyMatryoshka } from './matryoshka.js';

/**
 * Generate embedding for a single text using the configured service
 * @param text - Text to embed
 * @returns Embedding vector (possibly truncated if matryoshka is enabled)
 */
export async function embed(text: string): Promise<number[]> {
    let embedding: number[];
    
    switch (config.embeddingService) {
        case 'openai':
            embedding = await generateOpenAIEmbedding(text);
            break;
        case 'ollama':
            embedding = await generateOllamaEmbedding(text);
            break;
        case 'mock':
        default:
            embedding = await generateMockEmbedding(text);
            break;
    }
    
    // Apply matryoshka truncation if enabled
    return applyMatryoshka(embedding);
}

/**
 * Generate embeddings for multiple texts in batch
 * Note: Mock service processes one at a time, OpenAI can batch process
 * @param texts - Array of texts to embed
 * @returns Array of embedding vectors (possibly truncated if matryoshka is enabled)
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
    let embeddings: number[][];
    
    switch (config.embeddingService) {
        case 'openai':
            embeddings = await generateOpenAIEmbeddingsBatch(texts);
            break;
        case 'ollama':
            embeddings = await generateOllamaEmbeddingsBatch(texts);
            break;
        case 'mock':
        default:
            // Mock service doesn't have batch optimization, process sequentially
            embeddings = await Promise.all(texts.map(text => generateMockEmbedding(text)));
            break;
    }
    
    // Apply matryoshka truncation if enabled
    if (config.matryoshka.enabled) {
        return embeddings.map(emb => applyMatryoshka(emb));
    }
    
    return embeddings;
}

/**
 * Get information about the current embedding service
 */
export function getEmbeddingServiceInfo() {
    let model: string;
    let originalDimensions: number;
    let effectiveDimensions: number;

    switch (config.embeddingService) {
        case 'openai':
            model = config.openai.embeddingModel;
            originalDimensions = config.openai.dimensions || 1536; // OpenAI embedding dimensions
            break;
        case 'ollama':
            model = config.ollama.embeddingModel;
            // Common Ollama embedding models and their dimensions
            if (model.includes('nomic-embed-text')) {
                originalDimensions = config.ollama.dimensions || 768;
            } else if (model.includes('mxbai-embed-large')) {
                originalDimensions = config.ollama.dimensions || 1024;
            } else if (model.includes('all-minilm')) {
                originalDimensions = config.ollama.dimensions || 384;
            } else {
                originalDimensions = config.ollama.dimensions || 768; // Default for unknown models
            }
            break;
        case 'mock':
        default:
            model = 'mock-deterministic';
            originalDimensions = 1536;
            break;
    }

    // Apply matryoshka truncation to get effective dimensions
    effectiveDimensions = config.matryoshka.enabled 
        ? Math.min(config.matryoshka.targetDimensions, originalDimensions)
        : originalDimensions;

    return {
        service: config.embeddingService,
        model,
        dimensions: effectiveDimensions,
        originalDimensions: config.matryoshka.enabled ? originalDimensions : undefined,
        matryoshka: config.matryoshka.enabled ? {
            enabled: true,
            targetDimensions: config.matryoshka.targetDimensions,
            truncated: effectiveDimensions < originalDimensions
        } : undefined,
        url: config.embeddingService === 'ollama' ? config.ollama.url : undefined
    };
}

