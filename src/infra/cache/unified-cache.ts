/**
 * Unified cache abstraction for OpenClaw.
 * Auto-detects Redis availability and falls back to in-memory cache.
 */

import { createSubsystemLogger } from "../../logging/subsystem.js";
import {
  memoryCacheGet,
  memoryCacheSet,
  memoryCacheDelete,
  memoryCacheDeletePattern,
} from "./memory-cache.js";
import { getRedis, isRedisConnected, getRedisConfig } from "./redis.js";

const log = createSubsystemLogger("cache/unified");

export type CacheBackend = "redis" | "memory";

let currentBackend: CacheBackend = "memory";
let initialized = false;

/**
 * Initialize the cache backend.
 * Tries Redis first, then falls back to memory.
 */
export async function initializeCache(): Promise<CacheBackend> {
  if (initialized) {
    return currentBackend;
  }

  // Try Redis first
  const redisConnected = await isRedisConnected();
  if (redisConnected) {
    currentBackend = "redis";
    const config = getRedisConfig();
    log.info(`cache backend: Redis (${config.host}:${config.port})`);
    initialized = true;
    return currentBackend;
  }

  // Fall back to memory
  currentBackend = "memory";
  log.info("cache backend: memory (Redis not available)");
  initialized = true;
  return currentBackend;
}

/**
 * Get the current cache backend.
 */
export function getCacheBackend(): CacheBackend {
  return currentBackend;
}

/**
 * Check if cache is using Redis (not memory-only).
 */
export function isCacheDistributed(): boolean {
  return currentBackend === "redis";
}

export type CacheOptions = {
  ttlSeconds?: number;
};

const DEFAULT_TTL = 300; // 5 minutes

/**
 * Get a value from the cache.
 */
export async function unifiedCacheGet<T>(key: string): Promise<T | null> {
  if (!initialized) {
    await initializeCache();
  }

  if (currentBackend === "redis") {
    try {
      const redis = getRedis();
      const value = await redis.get(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch {
      // Redis error, try memory fallback
      return memoryCacheGet<T>(key);
    }
  }

  return memoryCacheGet<T>(key);
}

/**
 * Set a value in the cache.
 */
export async function unifiedCacheSet<T>(
  key: string,
  value: T,
  options?: CacheOptions,
): Promise<boolean> {
  if (!initialized) {
    await initializeCache();
  }

  const ttl = options?.ttlSeconds ?? DEFAULT_TTL;
  const serialized = JSON.stringify(value);

  if (currentBackend === "redis") {
    try {
      const redis = getRedis();
      if (ttl > 0) {
        await redis.setex(key, ttl, serialized);
      } else {
        await redis.set(key, serialized);
      }
      return true;
    } catch {
      // Redis error, fallback to memory
      memoryCacheSet(key, value, ttl > 0 ? ttl : undefined);
      return true;
    }
  }

  memoryCacheSet(key, value, ttl > 0 ? ttl : undefined);
  return true;
}

/**
 * Delete a value from the cache.
 */
export async function unifiedCacheDelete(key: string): Promise<boolean> {
  if (!initialized) {
    await initializeCache();
  }

  if (currentBackend === "redis") {
    try {
      const redis = getRedis();
      await redis.del(key);
      return true;
    } catch {
      // Redis error, try memory fallback
      return memoryCacheDelete(key);
    }
  }

  return memoryCacheDelete(key);
}

/**
 * Delete all keys matching a pattern.
 */
export async function unifiedCacheDeletePattern(pattern: string): Promise<number> {
  if (!initialized) {
    await initializeCache();
  }

  if (currentBackend === "redis") {
    try {
      const redis = getRedis();
      const config = getRedisConfig();
      const keys = await redis.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      // Remove prefix from keys as del() will add it back
      const prefix = config.keyPrefix ?? "";
      const unprefixedKeys = keys.map((k: string) =>
        k.startsWith(prefix) ? k.slice(prefix.length) : k,
      );
      return await redis.del(...unprefixedKeys);
    } catch {
      // Redis error, fallback to memory
      return memoryCacheDeletePattern(pattern);
    }
  }

  return memoryCacheDeletePattern(pattern);
}

/**
 * Get or set a cached value.
 */
export async function unifiedCacheGetOrSet<T>(
  key: string,
  factory: () => Promise<T>,
  options?: CacheOptions,
): Promise<T> {
  const cached = await unifiedCacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }
  const value = await factory();
  await unifiedCacheSet(key, value, options);
  return value;
}
