import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("agent/skills/cache");

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class SkillsCache<T = unknown> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly ttlMs: number;

  constructor(ttlMs = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      log.debug(`Cache miss (expired): ${key}`);
      return undefined;
    }
    log.debug(`Cache hit: ${key}`);
    return entry.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    this.evictExpired();
    return this.store.size;
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

// --- Skill usage frequency tracking ---

export type SkillUsageRecord = {
  name: string;
  count: number;
  lastUsed: number;
};

export type SkillUsageIndex = Map<string, SkillUsageRecord>;

export function createSkillUsageIndex(): SkillUsageIndex {
  return new Map();
}

export function recordSkillUsage(index: SkillUsageIndex, skillName: string): void {
  const existing = index.get(skillName);
  if (existing) {
    existing.count += 1;
    existing.lastUsed = Date.now();
  } else {
    index.set(skillName, { name: skillName, count: 1, lastUsed: Date.now() });
  }
}

export function sortByFrequency<T extends { name: string }>(
  items: T[],
  index: SkillUsageIndex,
): T[] {
  return [...items].sort((a, b) => {
    const aCount = index.get(a.name)?.count ?? 0;
    const bCount = index.get(b.name)?.count ?? 0;
    return bCount - aCount; // descending by usage
  });
}

// --- Cache key generation ---

import crypto from "node:crypto";

export function buildCacheKey(workspaceDir: string, configHash?: string): string {
  const base = crypto.createHash("sha256").update(workspaceDir).digest("hex").slice(0, 12);
  return configHash ? `${base}:${configHash}` : base;
}

// --- Parallel install helper ---

export type InstallTask<T> = () => Promise<T>;

export async function runParallelInstalls<T>(
  tasks: InstallTask<T>[],
  concurrency = 3,
): Promise<PromiseSettledResult<T>[]> {
  if (tasks.length === 0) return [];
  if (tasks.length <= concurrency) {
    return Promise.allSettled(tasks.map((t) => t()));
  }

  const results: PromiseSettledResult<T>[] = Array.from({ length: tasks.length });
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < tasks.length) {
      const idx = nextIndex;
      nextIndex += 1;
      try {
        const value = await tasks[idx]();
        results[idx] = { status: "fulfilled", value };
      } catch (reason) {
        results[idx] = { status: "rejected", reason };
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
