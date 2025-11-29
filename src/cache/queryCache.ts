/**
 * Query Cache
 * 
 * In-memory cache with LRU eviction and TTL support.
 * Interface designed for easy Redis migration.
 */

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  hits: number;
  createdAt: number;
}

export interface CacheConfig {
  maxSize: number;        // Max number of entries
  ttlMs: number;          // Time to live in milliseconds
  enabled: boolean;       // Enable/disable cache
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  evictions: number;
  hitRate: number;
}

const DEFAULT_CONFIG: CacheConfig = {
  maxSize: 1000,
  ttlMs: 5 * 60 * 1000,  // 5 minutes
  enabled: true
};

class QueryCache<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Generate cache key from query parameters
   */
  static generateKey(params: Record<string, any>): string {
    const sorted = Object.keys(params)
      .sort()
      .map(k => `${k}:${JSON.stringify(params[k])}`)
      .join('|');
    return sorted;
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    if (!this.config.enabled) return null;

    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    entry.hits++;
    this.stats.hits++;
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttlMs?: number): void {
    if (!this.config.enabled) return;

    // Evict if at capacity
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    const now = Date.now();
    this.cache.set(key, {
      value,
      expiresAt: now + (ttlMs || this.config.ttlMs),
      hits: 0,
      createdAt: now
    });
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    if (!this.config.enabled) return false;
    
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete a key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0
    };
  }

  /**
   * Update configuration
   */
  configure(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldest: { key: string; entry: CacheEntry<T> } | null = null;

    for (const [key, entry] of this.cache.entries()) {
      if (!oldest || entry.createdAt < oldest.entry.createdAt) {
        oldest = { key, entry };
      }
    }

    if (oldest) {
      this.cache.delete(oldest.key);
      this.stats.evictions++;
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton instances for different cache types
export const queryResultCache = new QueryCache({
  maxSize: 500,
  ttlMs: 5 * 60 * 1000  // 5 minutes
});

export const embeddingCache = new QueryCache<number[]>({
  maxSize: 2000,
  ttlMs: 30 * 60 * 1000  // 30 minutes (embeddings don't change)
});

export const graphExpansionCache = new QueryCache({
  maxSize: 200,
  ttlMs: 10 * 60 * 1000  // 10 minutes
});

/**
 * Cache decorator for async functions
 */
export function cached<T>(
  cache: QueryCache<T>,
  keyGenerator: (...args: any[]) => string
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = keyGenerator(...args);
      
      const cached = cache.get(key);
      if (cached !== null) {
        return cached;
      }

      const result = await originalMethod.apply(this, args);
      cache.set(key, result);
      return result;
    };

    return descriptor;
  };
}

/**
 * Wrapper for caching async function results
 */
export async function withCache<T>(
  cache: QueryCache<T>,
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  const cached = cache.get(key);
  if (cached !== null) {
    return cached;
  }

  const result = await fn();
  cache.set(key, result);
  return result;
}

/**
 * Get all cache stats
 */
export function getAllCacheStats(): Record<string, CacheStats> {
  return {
    queryResults: queryResultCache.getStats(),
    embeddings: embeddingCache.getStats(),
    graphExpansion: graphExpansionCache.getStats()
  };
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  queryResultCache.clear();
  embeddingCache.clear();
  graphExpansionCache.clear();
}

