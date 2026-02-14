import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PersistentQueueManager } from "../src/queue-worker/manager.js";
import { runPersistentQueueWorker } from "../src/queue-worker/worker.js";

async function main() {
  const stateDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-queue-worker-"));
  const manager = new PersistentQueueManager<string>({
    queueName: "dry-run",
    stateDir,
    maxBytesBeforeCompact: 1024,
  });

  await manager.enqueue("first");
  await manager.enqueue("second");
  await manager.enqueue("third");

  const processed: string[] = [];
  const controller = new AbortController();

  const workerPromise = runPersistentQueueWorker({
    manager,
    batchSize: 1,
    pollIntervalMs: 50,
    signal: controller.signal,
    handler: async (entry) => {
      processed.push(entry.payload);
      if (processed.length >= 3) {
        controller.abort();
      }
    },
  });

  await workerPromise;

  console.log("Processed entries:", processed.join(", "));
  console.log("Remaining queue size:", await manager.getQueueSize());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
