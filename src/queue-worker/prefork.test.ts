import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PersistentQueueManager } from "./manager.js";
import { runPreforkWorkers } from "./prefork.js";

describe("runPreforkWorkers", () => {
  let tempDir: string | null = null;

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it("processes all entries with 4 concurrent workers", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-prefork-"));
    const manager = new PersistentQueueManager<{ value: number }>({
      queueName: "prefork-test",
      stateDir: tempDir,
    });

    const count = 12;
    for (let i = 1; i <= count; i++) {
      await manager.enqueue({ value: i });
    }

    const seen: number[] = [];
    const controller = new AbortController();

    await runPreforkWorkers({
      manager,
      concurrency: 4,
      batchSize: 5,
      pollIntervalMs: 50,
      errorBackoffMs: 50,
      signal: controller.signal,
      handler: async (entry) => {
        seen.push(entry.payload.value);
        if (seen.length >= count) {
          controller.abort();
        }
      },
    });

    // All entries must have been processed (order may vary due to concurrency)
    expect(seen.toSorted((a, b) => a - b)).toEqual(Array.from({ length: count }, (_, i) => i + 1));

    // Queue should be fully committed
    const fresh = new PersistentQueueManager<{ value: number }>({
      queueName: "prefork-test",
      stateDir: tempDir,
    });
    expect(await fresh.getQueueSize()).toBe(0);
  });

  it("handles concurrent slow handlers", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-prefork-slow-"));
    const manager = new PersistentQueueManager<{ value: number }>({
      queueName: "slow-test",
      stateDir: tempDir,
    });

    for (let i = 1; i <= 4; i++) {
      await manager.enqueue({ value: i });
    }

    const startTimes: number[] = [];
    const controller = new AbortController();

    await runPreforkWorkers({
      manager,
      concurrency: 4,
      batchSize: 10,
      pollIntervalMs: 50,
      errorBackoffMs: 50,
      signal: controller.signal,
      handler: async (_entry) => {
        startTimes.push(Date.now());
        // Simulate work
        await new Promise((r) => setTimeout(r, 50));
        if (startTimes.length >= 4) {
          controller.abort();
        }
      },
    });

    expect(startTimes).toHaveLength(4);
    // With 4 workers, all 4 should start roughly at the same time
    const spread = Math.max(...startTimes) - Math.min(...startTimes);
    // Allow generous margin but much less than 4 * 50ms sequential
    expect(spread).toBeLessThan(100);
  });

  it("continues processing after handler errors", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-prefork-err-"));
    const manager = new PersistentQueueManager<{ value: number }>({
      queueName: "err-test",
      stateDir: tempDir,
    });

    await manager.enqueue({ value: 1 });
    await manager.enqueue({ value: 2 });
    await manager.enqueue({ value: 3 });

    const seen: number[] = [];
    const errors: unknown[] = [];
    const controller = new AbortController();

    await runPreforkWorkers({
      manager,
      concurrency: 2,
      batchSize: 10,
      pollIntervalMs: 50,
      errorBackoffMs: 50,
      signal: controller.signal,
      onError: (err) => errors.push(err),
      handler: async (entry) => {
        if (entry.payload.value === 2) {
          throw new Error("boom");
        }
        seen.push(entry.payload.value);
        if (seen.length >= 2) {
          controller.abort();
        }
      },
    });

    expect(seen.toSorted((a, b) => a - b)).toEqual([1, 3]);
    expect(errors).toHaveLength(1);
  });

  it("defaults to concurrency of 4", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-prefork-default-"));
    const manager = new PersistentQueueManager<{ value: number }>({
      queueName: "default-conc",
      stateDir: tempDir,
    });

    await manager.enqueue({ value: 1 });

    const seen: number[] = [];
    const controller = new AbortController();

    // Don't pass concurrency — should default to 4
    await runPreforkWorkers({
      manager,
      batchSize: 10,
      pollIntervalMs: 50,
      signal: controller.signal,
      handler: async (entry) => {
        seen.push(entry.payload.value);
        controller.abort();
      },
    });

    expect(seen).toEqual([1]);
  });
});
