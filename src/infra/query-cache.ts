/**
 * Query Caching Layer
 *
 * Caches results from expensive operations (web searches, API calls, LLM queries)
 * to reduce redundant API calls and costs.
 *
 * TTL strategy:
 *   - News/weather: 1 day (24h)
 *   - Documentation/analysis: 7 days
 *   - LLM queries (exact match): 7 days
 *   - Default: 1 day
 *
 * Key: hash(service, query, params)
 */

import crypto from "node:crypto";

export type CacheCategory = "news" | "weather" | "docs" | "analysis" | "llm" | "web_search" | "api";

export type CacheEntry<T = unknown> = {
  key: string;
  category: CacheCategory;
  value: T;
  createdAt: number;
  expiresAt: number;
  lastAccessedAt: number;
  hitCount: number;
  sizeBytes: number;
};

export type CacheStats = {
  totalEntries: number;
  totalSizeBytes: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  entriesByCategory: Record<string, number>;
  evictionCount: number;
};

export type QueryCacheConfig = {
  enabled: boolean;
  maxEntries: number;
  maxSizeBytes: number;
  ttlByCategory: Partial<Record<CacheCategory, number>>;
  defaultTtlMs: number;
};

const DEFAULT_TTL_MS: Record<CacheCategory, number> = {
  news: 24 * 60 * 60 * 1000, // 1 day
  weather: 24 * 60 * 60 * 1000, // 1 day
  docs: 7 * 24 * 60 * 60 * 1000, // 7 days
  analysis: 7 * 24 * 60 * 60 * 1000, // 7 days
  llm: 7 * 24 * 60 * 60 * 1000, // 7 days
  web_search: 24 * 60 * 60 * 1000, // 1 day
  api: 24 * 60 * 60 * 1000, // 1 day
};

const DEFAULT_CONFIG: QueryCacheConfig = {
  enabled: true,
  maxEntries: 1000,
  maxSizeBytes: 50 * 1024 * 1024, // 50MB
  ttlByCategory: DEFAULT_TTL_MS,
  defaultTtlMs: 24 * 60 * 60 * 1000,
};

/**
 * Generate a cache key from service, query, and params.
 * Uses stable JSON serialization (sorted keys) for consistent hashing.
 */
export function generateCacheKey(
  service: string,
  query: string,
  params?: Record<string, unknown>,
): string {
  const stableParams = params ? sortObjectKeys(params) : {};
  const input = JSON.stringify({ service, query, params: stableParams });
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 32);
}

/**
 * Recursively sort object keys for stable serialization.
 */
function sortObjectKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).toSorted()) {
    sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
  }
  return sorted;
}

/**
 * In-memory query cache with TTL and LRU eviction.
 */
export class QueryCache {
  private cache = new Map<string, CacheEntry>();
  private config: QueryCacheConfig;
  private stats = {
    hitCount: 0,
    missCount: 0,
    evictionCount: 0,
  };

  constructor(config?: Partial<QueryCacheConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get a cached value. Returns undefined on miss or expiry.
   */
  get<T = unknown>(key: string): T | undefined {
    if (!this.config.enabled) {
      this.stats.missCount++;
      return undefined;
    }

    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.missCount++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.missCount++;
      return undefined;
    }

    entry.hitCount++;
    entry.lastAccessedAt = Date.now();
    this.stats.hitCount++;
    return entry.value as T;
  }

  /**
   * Store a value in the cache.
   */
  set<T = unknown>(params: {
    key: string;
    category: CacheCategory;
    value: T;
    ttlMs?: number;
  }): void {
    if (!this.config.enabled) {
      return;
    }

    const { key, category, value } = params;
    const ttlMs =
      params.ttlMs ??
      this.config.ttlByCategory[category] ??
      DEFAULT_TTL_MS[category] ??
      this.config.defaultTtlMs;

    const serialized = JSON.stringify(value);
    const sizeBytes = Buffer.byteLength(serialized, "utf8");

    // If overwriting, delete old entry first to maintain accurate size accounting
    const oldEntry = this.cache.get(key);
    if (oldEntry) {
      this.cache.delete(key);
    }

    // Evict if needed
    this.evictIfNeeded(sizeBytes);

    const now = Date.now();
    const entry: CacheEntry = {
      key,
      category,
      value,
      createdAt: now,
      expiresAt: now + ttlMs,
      lastAccessedAt: now,
      hitCount: 0,
      sizeBytes,
    };

    this.cache.set(key, entry);
  }

  /**
   * Check if a key exists and is not expired.
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Delete a cached entry.
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Get cache statistics.
   */
  getStats(): CacheStats {
    this.purgeExpired();

    const entriesByCategory: Record<string, number> = {};
    let totalSizeBytes = 0;

    for (const entry of this.cache.values()) {
      entriesByCategory[entry.category] = (entriesByCategory[entry.category] ?? 0) + 1;
      totalSizeBytes += entry.sizeBytes;
    }

    const totalHits = this.stats.hitCount + this.stats.missCount;
    return {
      totalEntries: this.cache.size,
      totalSizeBytes,
      hitCount: this.stats.hitCount,
      missCount: this.stats.missCount,
      hitRate: totalHits > 0 ? this.stats.hitCount / totalHits : 0,
      entriesByCategory,
      evictionCount: this.stats.evictionCount,
    };
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hitCount: 0, missCount: 0, evictionCount: 0 };
  }

  /**
   * Remove expired entries.
   */
  purgeExpired(): number {
    const now = Date.now();
    let purged = 0;
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        purged++;
      }
    }
    return purged;
  }

  private evictIfNeeded(newSizeBytes: number): void {
    // Evict by count
    while (this.cache.size >= this.config.maxEntries) {
      this.evictOldest();
    }

    // Evict by size
    let totalSize = this.getTotalSize();
    while (totalSize + newSizeBytes > this.config.maxSizeBytes && this.cache.size > 0) {
      this.evictOldest();
      totalSize = this.getTotalSize();
    }
  }

  private evictOldest(): void {
    // Evict the least recently accessed entry (true LRU)
    let lruKey: string | undefined;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessedAt < oldestAccess) {
        oldestAccess = entry.lastAccessedAt;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.stats.evictionCount++;
    }
  }

  private getTotalSize(): number {
    let total = 0;
    for (const entry of this.cache.values()) {
      total += entry.sizeBytes;
    }
    return total;
  }
}

// Singleton instance for global use
let globalCache: QueryCache | undefined;

export function getGlobalQueryCache(): QueryCache {
  if (!globalCache) {
    globalCache = new QueryCache();
  }
  return globalCache;
}

export function resetGlobalQueryCache(): void {
  globalCache?.clear();
  globalCache = undefined;
}

/**
 * Convenience: cache-through wrapper for async operations.
 */
export async function cachedQuery<T>(params: {
  service: string;
  query: string;
  queryParams?: Record<string, unknown>;
  category: CacheCategory;
  ttlMs?: number;
  execute: () => Promise<T>;
  cache?: QueryCache;
}): Promise<{ value: T; cached: boolean }> {
  const cache = params.cache ?? getGlobalQueryCache();
  const key = generateCacheKey(params.service, params.query, params.queryParams);

  const cached = cache.get<T>(key);
  if (cached !== undefined) {
    return { value: cached, cached: true };
  }

  const value = await params.execute();
  cache.set({
    key,
    category: params.category,
    value,
    ttlMs: params.ttlMs,
  });

  return { value, cached: false };
}
