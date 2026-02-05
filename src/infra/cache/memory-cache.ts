/**
 * In-memory cache implementation with TTL support.
 * Used as fallback when Redis is not available.
 */

type CacheEntry<T> = {
  value: T;
  expiresAt: number | null; // null = no expiration
};

const cache = new Map<string, CacheEntry<unknown>>();

// Cleanup interval (every 60 seconds)
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function ensureCleanupRunning() {
  if (cleanupInterval) {
    return;
  }
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (entry.expiresAt !== null && entry.expiresAt < now) {
        cache.delete(key);
      }
    }
  }, 60_000);

  // Don't prevent Node.js from exiting
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }
}

export function memoryCacheGet<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) {
    return null;
  }

  // Check if expired
  if (entry.expiresAt !== null && entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

export function memoryCacheSet<T>(key: string, value: T, ttlSeconds?: number): void {
  ensureCleanupRunning();

  const expiresAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;

  cache.set(key, { value, expiresAt });
}

export function memoryCacheDelete(key: string): boolean {
  return cache.delete(key);
}

export function memoryCacheDeletePattern(pattern: string): number {
  // Convert glob-style pattern to regex
  const regexPattern = pattern.replace(/\*/g, ".*").replace(/\?/g, ".");
  const regex = new RegExp(`^${regexPattern}$`);

  let deleted = 0;
  for (const key of cache.keys()) {
    if (regex.test(key)) {
      cache.delete(key);
      deleted++;
    }
  }

  return deleted;
}

export function memoryCacheKeys(pattern?: string): string[] {
  if (!pattern) {
    return Array.from(cache.keys());
  }

  const regexPattern = pattern.replace(/\*/g, ".*").replace(/\?/g, ".");
  const regex = new RegExp(`^${regexPattern}$`);

  return Array.from(cache.keys()).filter((key) => regex.test(key));
}

export function memoryCacheClear(): void {
  cache.clear();
}

export function memoryCacheSize(): number {
  return cache.size;
}

/**
 * Stop the cleanup interval (for testing/shutdown).
 */
export function memoryCacheStopCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
