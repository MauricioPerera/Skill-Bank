/**
 * BM25 (Best Matching 25) Implementation
 * 
 * Full-text search ranking algorithm for hybrid search.
 * Combines with vector search for better retrieval quality.
 */

export interface BM25Config {
  k1: number;      // Term frequency saturation (default: 1.2)
  b: number;       // Length normalization (default: 0.75)
}

export interface Document {
  id: string;
  text: string;
  metadata?: Record<string, any>;
}

export interface BM25Result {
  id: string;
  score: number;
  matchedTerms: string[];
  metadata?: Record<string, any>;
}

const DEFAULT_CONFIG: BM25Config = {
  k1: 1.2,
  b: 0.75
};

// Common stopwords to filter out
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'were', 'will', 'with', 'the', 'this', 'but', 'they',
  'have', 'had', 'what', 'when', 'where', 'who', 'which', 'why', 'how',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
  'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
  'very', 'just', 'can', 'should', 'now', 'also', 'into', 'could', 'would'
]);

/**
 * Tokenize text into terms
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')  // Remove punctuation
    .split(/\s+/)
    .filter(term => term.length > 1 && !STOPWORDS.has(term));
}

/**
 * Calculate term frequency in a document
 */
function termFrequency(term: string, tokens: string[]): number {
  return tokens.filter(t => t === term).length;
}

/**
 * BM25 Index for efficient search
 */
export class BM25Index {
  private documents: Map<string, { tokens: string[]; metadata?: Record<string, any> }> = new Map();
  private avgDocLength: number = 0;
  private docFrequency: Map<string, number> = new Map();  // term -> number of docs containing term
  private config: BM25Config;

  constructor(config: Partial<BM25Config> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add a document to the index
   */
  addDocument(doc: Document): void {
    const tokens = tokenize(doc.text);
    this.documents.set(doc.id, { tokens, metadata: doc.metadata });
    
    // Update document frequency
    const uniqueTerms = new Set(tokens);
    for (const term of uniqueTerms) {
      this.docFrequency.set(term, (this.docFrequency.get(term) || 0) + 1);
    }

    // Update average document length
    this.updateAvgDocLength();
  }

  /**
   * Add multiple documents
   */
  addDocuments(docs: Document[]): void {
    for (const doc of docs) {
      const tokens = tokenize(doc.text);
      this.documents.set(doc.id, { tokens, metadata: doc.metadata });
      
      const uniqueTerms = new Set(tokens);
      for (const term of uniqueTerms) {
        this.docFrequency.set(term, (this.docFrequency.get(term) || 0) + 1);
      }
    }
    this.updateAvgDocLength();
  }

  /**
   * Remove a document from the index
   */
  removeDocument(id: string): boolean {
    const doc = this.documents.get(id);
    if (!doc) return false;

    // Update document frequency
    const uniqueTerms = new Set(doc.tokens);
    for (const term of uniqueTerms) {
      const freq = this.docFrequency.get(term) || 0;
      if (freq <= 1) {
        this.docFrequency.delete(term);
      } else {
        this.docFrequency.set(term, freq - 1);
      }
    }

    this.documents.delete(id);
    this.updateAvgDocLength();
    return true;
  }

  /**
   * Search the index
   */
  search(query: string, limit: number = 10): BM25Result[] {
    const queryTerms = tokenize(query);
    if (queryTerms.length === 0) return [];

    const scores: BM25Result[] = [];
    const N = this.documents.size;

    for (const [id, doc] of this.documents.entries()) {
      let score = 0;
      const matchedTerms: string[] = [];

      for (const term of queryTerms) {
        const tf = termFrequency(term, doc.tokens);
        if (tf === 0) continue;

        matchedTerms.push(term);

        const df = this.docFrequency.get(term) || 0;
        const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);
        
        const docLength = doc.tokens.length;
        const tfNorm = (tf * (this.config.k1 + 1)) / 
          (tf + this.config.k1 * (1 - this.config.b + this.config.b * docLength / this.avgDocLength));
        
        score += idf * tfNorm;
      }

      if (score > 0) {
        scores.push({ id, score, matchedTerms, metadata: doc.metadata });
      }
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, limit);
  }

  /**
   * Get index statistics
   */
  getStats(): {
    documentCount: number;
    uniqueTerms: number;
    avgDocLength: number;
  } {
    return {
      documentCount: this.documents.size,
      uniqueTerms: this.docFrequency.size,
      avgDocLength: this.avgDocLength
    };
  }

  /**
   * Clear the index
   */
  clear(): void {
    this.documents.clear();
    this.docFrequency.clear();
    this.avgDocLength = 0;
  }

  private updateAvgDocLength(): void {
    if (this.documents.size === 0) {
      this.avgDocLength = 0;
      return;
    }

    let totalLength = 0;
    for (const doc of this.documents.values()) {
      totalLength += doc.tokens.length;
    }
    this.avgDocLength = totalLength / this.documents.size;
  }
}

/**
 * Hybrid Search - combines BM25 and vector similarity
 */
export interface HybridResult {
  id: string;
  bm25Score: number;
  vectorScore: number;
  combinedScore: number;
  matchedTerms?: string[];
  metadata?: Record<string, any>;
}

export interface HybridConfig {
  alpha: number;  // Weight for vector score (0-1), BM25 gets (1-alpha)
}

/**
 * Combine BM25 and vector search results
 */
export function hybridSearch(
  bm25Results: BM25Result[],
  vectorResults: Array<{ id: string; score: number; metadata?: Record<string, any> }>,
  config: HybridConfig = { alpha: 0.5 }
): HybridResult[] {
  const { alpha } = config;
  const resultMap = new Map<string, HybridResult>();

  // Normalize BM25 scores
  const maxBM25 = Math.max(...bm25Results.map(r => r.score), 0.001);
  
  // Add BM25 results
  for (const result of bm25Results) {
    const normalizedScore = result.score / maxBM25;
    resultMap.set(result.id, {
      id: result.id,
      bm25Score: normalizedScore,
      vectorScore: 0,
      combinedScore: (1 - alpha) * normalizedScore,
      matchedTerms: result.matchedTerms,
      metadata: result.metadata
    });
  }

  // Normalize and add vector results (assuming distance, lower is better)
  const maxVector = Math.max(...vectorResults.map(r => r.score), 0.001);
  
  for (const result of vectorResults) {
    // Convert distance to similarity (1 - normalized distance)
    const normalizedScore = 1 - (result.score / maxVector);
    
    const existing = resultMap.get(result.id);
    if (existing) {
      existing.vectorScore = normalizedScore;
      existing.combinedScore = (1 - alpha) * existing.bm25Score + alpha * normalizedScore;
      existing.metadata = existing.metadata || result.metadata;
    } else {
      resultMap.set(result.id, {
        id: result.id,
        bm25Score: 0,
        vectorScore: normalizedScore,
        combinedScore: alpha * normalizedScore,
        metadata: result.metadata
      });
    }
  }

  // Sort by combined score
  const results = Array.from(resultMap.values());
  results.sort((a, b) => b.combinedScore - a.combinedScore);
  
  return results;
}

// Singleton index instance
let globalBM25Index: BM25Index | null = null;

export function getBM25Index(): BM25Index {
  if (!globalBM25Index) {
    globalBM25Index = new BM25Index();
  }
  return globalBM25Index;
}

