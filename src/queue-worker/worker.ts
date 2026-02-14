import type { QueueEntry, PersistentQueueManager } from "./manager.js";

export type QueueWorkerOptions<T> = {
  manager: PersistentQueueManager<T>;
  handler: (entry: QueueEntry<T>) => Promise<void>;
  batchSize?: number;
  pollIntervalMs?: number;
  errorBackoffMs?: number;
  onError?: (error: unknown, entry?: QueueEntry<T>) => void;
  signal?: AbortSignal;
};

const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_POLL_INTERVAL = 500;
const DEFAULT_ERROR_BACKOFF = 2_000;

export async function runPersistentQueueWorker<T>(options: QueueWorkerOptions<T>): Promise<void> {
  const batchSize = Math.max(1, Math.floor(options.batchSize ?? DEFAULT_BATCH_SIZE));
  const pollIntervalMs = Math.max(50, Math.floor(options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL));
  const errorBackoffMs = Math.max(200, Math.floor(options.errorBackoffMs ?? DEFAULT_ERROR_BACKOFF));
  const signal = options.signal;

  while (!signal?.aborted) {
    let entries: QueueEntry<T>[] = [];
    try {
      entries = await options.manager.readBatch(batchSize);
    } catch (err) {
      options.onError?.(err);
      await sleep(errorBackoffMs, signal);
      continue;
    }

    if (entries.length === 0) {
      await sleep(pollIntervalMs, signal);
      continue;
    }

    for (const entry of entries) {
      if (signal?.aborted) {
        break;
      }
      try {
        await options.handler(entry);
        await options.manager.commitOffset(entry.nextOffset);
      } catch (err) {
        options.onError?.(err, entry);
        await sleep(errorBackoffMs, signal);
        break;
      }
    }
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
