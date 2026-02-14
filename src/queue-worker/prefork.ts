import type { QueueEntry, PersistentQueueManager } from "./manager.js";

export type PreforkWorkerOptions<T> = {
  manager: PersistentQueueManager<T>;
  handler: (entry: QueueEntry<T>) => Promise<void>;
  /** Number of concurrent workers (default: 4). */
  concurrency?: number;
  batchSize?: number;
  pollIntervalMs?: number;
  errorBackoffMs?: number;
  onError?: (error: unknown, entry?: QueueEntry<T>) => void;
  signal?: AbortSignal;
};

const DEFAULT_CONCURRENCY = 4;
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_POLL_INTERVAL = 500;
const DEFAULT_ERROR_BACKOFF = 2_000;

/**
 * Prefork Manager: dispatches queue entries to N concurrent worker coroutines.
 *
 * Reads a batch from the queue, fans entries out to concurrent workers, waits
 * for the entire batch to settle, commits the highest contiguous completed
 * offset, then reads the next batch. Concurrency is within each batch.
 */
export async function runPreforkWorkers<T>(options: PreforkWorkerOptions<T>): Promise<void> {
  const concurrency = Math.max(1, Math.floor(options.concurrency ?? DEFAULT_CONCURRENCY));
  const batchSize = Math.max(1, Math.floor(options.batchSize ?? DEFAULT_BATCH_SIZE));
  const pollIntervalMs = Math.max(50, Math.floor(options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL));
  const errorBackoffMs = Math.max(200, Math.floor(options.errorBackoffMs ?? DEFAULT_ERROR_BACKOFF));
  const signal = options.signal;

  while (!signal?.aborted) {
    // Read a batch
    let entries: QueueEntry<T>[];
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

    // Process entries with bounded concurrency
    let highestCommittedOffset = -1;
    const results = new Map<string, { nextOffset: number; ok: boolean }>();

    // Process in chunks of `concurrency`
    for (let i = 0; i < entries.length; i += concurrency) {
      if (signal?.aborted) {
        break;
      }

      const chunk = entries.slice(i, i + concurrency);
      const tasks = chunk.map(async (entry) => {
        try {
          await options.handler(entry);
          results.set(entry.id, { nextOffset: entry.nextOffset, ok: true });
        } catch (err) {
          options.onError?.(err, entry);
          results.set(entry.id, { nextOffset: entry.nextOffset, ok: false });
          await sleep(errorBackoffMs, signal);
        }
      });

      await Promise.allSettled(tasks);
    }

    // Commit the highest contiguous completed offset from the batch.
    // Walk entries in order; stop at first incomplete entry.
    for (const entry of entries) {
      const result = results.get(entry.id);
      if (!result) {
        break;
      }
      // Mark as done regardless of ok (error handler is responsible for retry/DLQ)
      highestCommittedOffset = result.nextOffset;
    }

    if (highestCommittedOffset >= 0) {
      await options.manager.commitOffset(highestCommittedOffset);
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
