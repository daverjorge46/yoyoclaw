import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PersistentQueueManager } from "./manager.js";
import { runPersistentQueueWorker } from "./worker.js";

describe("runPersistentQueueWorker", () => {
  let tempDir: string | null = null;

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it("processes queued entries and persists offsets", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-queue-worker-"));
    const manager = new PersistentQueueManager<{ value: number }>({
      queueName: "demo",
      stateDir: tempDir,
    });

    await manager.enqueue({ value: 1 });
    await manager.enqueue({ value: 2 });
    await manager.enqueue({ value: 3 });

    const seen: number[] = [];
    const controller = new AbortController();

    await runPersistentQueueWorker({
      manager,
      batchSize: 2,
      pollIntervalMs: 50,
      errorBackoffMs: 50,
      signal: controller.signal,
      handler: async (entry) => {
        seen.push(entry.payload.value);
        if (seen.length >= 3) {
          controller.abort();
        }
      },
    });

    expect(seen).toEqual([1, 2, 3]);

    const newManager = new PersistentQueueManager<{ value: number }>({
      queueName: "demo",
      stateDir: tempDir,
    });
    expect(await newManager.getQueueSize()).toBe(0);
    expect(await newManager.readBatch(1)).toEqual([]);
  });
});
