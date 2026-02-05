/**
 * Cache infrastructure exports.
 */

export {
  getRedis,
  closeRedis,
  getRedisConfig,
  isRedisConnected,
  type RedisConfig,
} from "./redis.js";

export {
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheDeletePattern,
  cacheGetOrSet,
  CACHE_KEYS,
  CACHE_TTL,
  type CacheOptions,
} from "./cache.js";

// Memory cache (fallback)
export {
  memoryCacheGet,
  memoryCacheSet,
  memoryCacheDelete,
  memoryCacheDeletePattern,
  memoryCacheKeys,
  memoryCacheClear,
  memoryCacheSize,
  memoryCacheStopCleanup,
} from "./memory-cache.js";

// Unified cache with auto-detection (Redis → Memory)
export {
  initializeCache,
  getCacheBackend,
  isCacheDistributed,
  unifiedCacheGet,
  unifiedCacheSet,
  unifiedCacheDelete,
  unifiedCacheDeletePattern,
  unifiedCacheGetOrSet,
  type CacheBackend,
} from "./unified-cache.js";
