import { describe, expect, it, beforeEach } from "vitest";

import {
  SkillsCache,
  buildCacheKey,
  createSkillUsageIndex,
  recordSkillUsage,
  sortByFrequency,
  runParallelInstalls,
} from "./cache.js";

describe("SkillsCache", () => {
  let cache: SkillsCache<string>;

  beforeEach(() => {
    cache = new SkillsCache<string>(100); // 100ms TTL for tests
  });

  it("returns undefined for missing keys", () => {
    expect(cache.get("missing")).toBeUndefined();
  });

  it("stores and retrieves values", () => {
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");
  });

  it("expires entries after TTL", async () => {
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");

    await new Promise((r) => setTimeout(r, 120));
    expect(cache.get("key1")).toBeUndefined();
  });

  it("tracks size correctly", () => {
    cache.set("a", "1");
    cache.set("b", "2");
    expect(cache.size).toBe(2);
  });

  it("clears all entries", () => {
    cache.set("a", "1");
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it("has() checks existence and expiry", () => {
    cache.set("a", "1");
    expect(cache.has("a")).toBe(true);
    expect(cache.has("b")).toBe(false);
  });

  it("delete() removes entry", () => {
    cache.set("a", "1");
    cache.delete("a");
    expect(cache.get("a")).toBeUndefined();
  });
});

describe("buildCacheKey", () => {
  it("produces consistent keys", () => {
    const key1 = buildCacheKey("/workspace");
    const key2 = buildCacheKey("/workspace");
    expect(key1).toBe(key2);
  });

  it("includes config hash when provided", () => {
    const key = buildCacheKey("/workspace", "abc123");
    expect(key).toContain(":");
    expect(key).toContain("abc123");
  });

  it("differs for different workspaces", () => {
    const key1 = buildCacheKey("/a");
    const key2 = buildCacheKey("/b");
    expect(key1).not.toBe(key2);
  });
});

describe("skill usage tracking", () => {
  it("records and sorts by frequency", () => {
    const index = createSkillUsageIndex();
    recordSkillUsage(index, "git-commit");
    recordSkillUsage(index, "lint");
    recordSkillUsage(index, "git-commit");
    recordSkillUsage(index, "git-commit");

    const items = [{ name: "lint" }, { name: "git-commit" }, { name: "unused" }];
    const sorted = sortByFrequency(items, index);
    expect(sorted[0].name).toBe("git-commit");
    expect(sorted[1].name).toBe("lint");
    expect(sorted[2].name).toBe("unused");
  });
});

describe("runParallelInstalls", () => {
  it("handles empty tasks", async () => {
    const results = await runParallelInstalls([]);
    expect(results).toEqual([]);
  });

  it("runs tasks with concurrency limit", async () => {
    let maxConcurrent = 0;
    let running = 0;

    const tasks = Array.from({ length: 10 }, () => async () => {
      running += 1;
      maxConcurrent = Math.max(maxConcurrent, running);
      await new Promise((r) => setTimeout(r, 10));
      running -= 1;
      return "done";
    });

    const results = await runParallelInstalls(tasks, 3);
    expect(results).toHaveLength(10);
    expect(maxConcurrent).toBeLessThanOrEqual(3);
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
  });

  it("handles mixed success and failure", async () => {
    const tasks = [
      async () => "ok",
      async () => {
        throw new Error("fail");
      },
      async () => "ok2",
    ];

    const results = await runParallelInstalls(tasks, 3);
    expect(results[0]).toEqual({ status: "fulfilled", value: "ok" });
    expect(results[1].status).toBe("rejected");
    expect(results[2]).toEqual({ status: "fulfilled", value: "ok2" });
  });
});
