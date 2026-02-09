import { createHmac } from "node:crypto";
import { appendFileSync, readFileSync, existsSync } from "node:fs";
import type { PolicyVerdict, ExecutionResult } from "./types.js";

/**
 * A stored idempotency record: the key and the cached execution result.
 */
export interface IdempotencyRecord {
  key: string;
  result: ExecutionResult;
  createdAt: number;
}

/**
 * Interface for idempotency stores.
 * Implementations must be synchronous for the check-then-dispatch
 * critical section (no await gaps between check and record).
 */
export interface IdempotencyStore {
  /** Load persisted records from disk. */
  load(): void;
  /** Check if a key has already been executed. */
  get(key: string): ExecutionResult | undefined;
  /** Record a completed execution. */
  record(key: string, result: ExecutionResult): void;
  /** Number of stored records. */
  readonly size: number;
}

/**
 * JSONL-backed idempotency store.
 *
 * Each record is a single JSON line appended to a file.
 * On startup, `load()` reads the file into an in-memory Map.
 *
 * Design decisions:
 * - Append-only JSONL for crash safety (no partial writes corrupt the store)
 * - Synchronous I/O to eliminate TOCTOU gaps between check and record
 * - In-memory Map for O(1) lookups in the hot path
 */
export class JsonlIdempotencyStore implements IdempotencyStore {
  private readonly filePath: string;
  private readonly records = new Map<string, ExecutionResult>();

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /** Load existing records from the JSONL file. */
  load(): void {
    if (!existsSync(this.filePath)) return;

    const content = readFileSync(this.filePath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const record = JSON.parse(trimmed) as IdempotencyRecord;
        this.records.set(record.key, record.result);
      } catch {
        // Skip malformed lines — don't crash on corrupt data
        console.warn(`[idempotency] Skipping malformed line: ${trimmed.slice(0, 80)}`);
      }
    }

    console.log(`[idempotency] Loaded ${this.records.size} records from ${this.filePath}`);
  }

  /** Check if a key has already been executed. */
  get(key: string): ExecutionResult | undefined {
    return this.records.get(key);
  }

  /** Record a completed execution (in-memory + append to file). */
  record(key: string, result: ExecutionResult): void {
    this.records.set(key, result);

    const entry: IdempotencyRecord = {
      key,
      result,
      createdAt: Date.now(),
    };

    appendFileSync(this.filePath, JSON.stringify(entry) + "\n", "utf-8");
  }

  get size(): number {
    return this.records.size;
  }
}

/**
 * Generate a deterministic idempotency key from a policy verdict.
 *
 * Uses HMAC-SHA256 over the verdict's unique fields:
 * - txRequest.id (unique per proposal)
 * - decidedAt (unique per verdict)
 * - integrityHash (binds to the specific approval)
 *
 * The HMAC secret prevents external actors from predicting keys.
 */
export function generateIdempotencyKey(verdict: PolicyVerdict, secret: string): string {
  const payload = `${verdict.txRequest.id}:${verdict.decidedAt}:${verdict.integrityHash}`;
  return createHmac("sha256", secret).update(payload).digest("hex");
}
