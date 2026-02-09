import { describe, it, expect, beforeEach } from "vitest";
import { v4 as uuidv4 } from "uuid";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  JsonlIdempotencyStore,
  generateIdempotencyKey,
} from "../src/idempotency.js";
import { WalletExecutor, SecurityViolationError } from "../src/executor.js";
import { computeIntegrityHash } from "../src/policy-engine.js";
import { AuditLog } from "../src/audit-log.js";
import type {
  PolicyVerdict,
  TransactionRequest,
  ExecutionResult,
} from "../src/types.js";

const TEST_SECRET = "test-secret-key-for-idempotency-tests-32!!";

function makeRequest(overrides?: Partial<TransactionRequest>): TransactionRequest {
  return {
    id: uuidv4(),
    action: "swap",
    params: { fromToken: "ETH", toToken: "USDC", amount: "0.01" },
    chain: "base",
    reason: "Test swap",
    requestedAt: Date.now(),
    estimatedValueUsd: 10,
    source: "reasoning",
    ...overrides,
  };
}

function makeApprovedVerdict(request: TransactionRequest): PolicyVerdict {
  const decidedAt = Date.now();
  return {
    approved: true,
    txRequest: request,
    violations: [],
    requiresHitl: false,
    decidedBy: "policy_engine",
    decidedAt,
    integrityHash: computeIntegrityHash(request.id, true, decidedAt, TEST_SECRET),
  };
}

describe("generateIdempotencyKey", () => {
  it("produces deterministic keys for the same verdict", () => {
    const request = makeRequest();
    const verdict = makeApprovedVerdict(request);

    const key1 = generateIdempotencyKey(verdict, TEST_SECRET);
    const key2 = generateIdempotencyKey(verdict, TEST_SECRET);

    expect(key1).toBe(key2);
    expect(key1).toHaveLength(64); // SHA-256 hex
  });

  it("produces different keys for different verdicts", () => {
    const verdict1 = makeApprovedVerdict(makeRequest());
    const verdict2 = makeApprovedVerdict(makeRequest());

    expect(generateIdempotencyKey(verdict1, TEST_SECRET))
      .not.toBe(generateIdempotencyKey(verdict2, TEST_SECRET));
  });

  it("produces different keys with different secrets", () => {
    const request = makeRequest();
    const verdict = makeApprovedVerdict(request);

    const key1 = generateIdempotencyKey(verdict, TEST_SECRET);
    const key2 = generateIdempotencyKey(verdict, "different-secret-at-least-32-chars!!");

    expect(key1).not.toBe(key2);
  });

  it("produces different keys for same request with different decidedAt", () => {
    const request = makeRequest();

    const decidedAt1 = Date.now();
    const verdict1: PolicyVerdict = {
      approved: true,
      txRequest: request,
      violations: [],
      requiresHitl: false,
      decidedBy: "policy_engine",
      decidedAt: decidedAt1,
      integrityHash: computeIntegrityHash(request.id, true, decidedAt1, TEST_SECRET),
    };

    const decidedAt2 = decidedAt1 + 1000;
    const verdict2: PolicyVerdict = {
      approved: true,
      txRequest: request,
      violations: [],
      requiresHitl: false,
      decidedBy: "policy_engine",
      decidedAt: decidedAt2,
      integrityHash: computeIntegrityHash(request.id, true, decidedAt2, TEST_SECRET),
    };

    expect(generateIdempotencyKey(verdict1, TEST_SECRET))
      .not.toBe(generateIdempotencyKey(verdict2, TEST_SECRET));
  });
});

describe("JsonlIdempotencyStore", () => {
  let storePath: string;

  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "sentinel-idem-test-"));
    storePath = join(dir, "idempotency.jsonl");
  });

  it("starts empty", () => {
    const store = new JsonlIdempotencyStore(storePath);
    store.load();
    expect(store.size).toBe(0);
  });

  it("records and retrieves results", () => {
    const store = new JsonlIdempotencyStore(storePath);
    store.load();

    const result: ExecutionResult = { success: true, txHash: "0xabc" };
    store.record("key-1", result);

    expect(store.get("key-1")).toEqual(result);
    expect(store.size).toBe(1);
  });

  it("returns undefined for unknown keys", () => {
    const store = new JsonlIdempotencyStore(storePath);
    store.load();

    expect(store.get("nonexistent")).toBeUndefined();
  });

  it("persists records across store instances", () => {
    // Write
    const store1 = new JsonlIdempotencyStore(storePath);
    store1.load();
    store1.record("key-a", { success: true, txHash: "0x111" });
    store1.record("key-b", { success: false, error: "timeout" });

    // Read with new instance
    const store2 = new JsonlIdempotencyStore(storePath);
    store2.load();

    expect(store2.size).toBe(2);
    expect(store2.get("key-a")).toEqual({ success: true, txHash: "0x111" });
    expect(store2.get("key-b")).toEqual({ success: false, error: "timeout" });
  });

  it("appends to file in JSONL format", () => {
    const store = new JsonlIdempotencyStore(storePath);
    store.load();
    store.record("k1", { success: true });
    store.record("k2", { success: false, error: "fail" });

    const content = readFileSync(storePath, "utf-8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(2);

    const parsed1 = JSON.parse(lines[0]!);
    expect(parsed1.key).toBe("k1");
    expect(parsed1.result.success).toBe(true);
    expect(parsed1.createdAt).toBeTypeOf("number");
  });

  it("handles load() on nonexistent file gracefully", () => {
    const store = new JsonlIdempotencyStore("/tmp/does-not-exist-" + Date.now() + ".jsonl");
    expect(() => store.load()).not.toThrow();
    expect(store.size).toBe(0);
  });
});

describe("WalletExecutor with IdempotencyStore", () => {
  let store: JsonlIdempotencyStore;
  let auditLog: AuditLog;
  let executor: WalletExecutor;

  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "sentinel-exec-idem-"));
    store = new JsonlIdempotencyStore(join(dir, "idempotency.jsonl"));
    store.load();
    auditLog = new AuditLog(dir);
    const noopBreaker = { isTripped: () => false };
    executor = new WalletExecutor(auditLog, TEST_SECRET, noopBreaker, undefined, store);
  });

  it("returns cached result on duplicate execution", async () => {
    const request = makeRequest();
    const verdict = makeApprovedVerdict(request);

    // First execution — goes through (read-only mode)
    const result1 = await executor.execute(verdict);
    expect(result1.success).toBe(false);
    expect(result1.error).toContain("read-only mode");

    // Second execution — returns cached result, no re-dispatch
    const result2 = await executor.execute(verdict);
    expect(result2).toEqual(result1);
  });

  it("security checks run BEFORE idempotency check", async () => {
    const request = makeRequest();
    const verdict = makeApprovedVerdict(request);

    // Execute once to populate the store
    await executor.execute(verdict);

    // Now tamper with the verdict — security check must still throw
    verdict.integrityHash = "tampered";
    await expect(executor.execute(verdict)).rejects.toThrow(SecurityViolationError);
  });

  it("unapproved verdict throws even if key is in store", async () => {
    const request = makeRequest();
    const decidedAt = Date.now();
    const rejectedVerdict: PolicyVerdict = {
      approved: false,
      txRequest: request,
      violations: [{ policy: "test", message: "blocked", severity: "block" }],
      requiresHitl: false,
      decidedBy: "policy_engine",
      decidedAt,
      integrityHash: computeIntegrityHash(request.id, false, decidedAt, TEST_SECRET),
    };

    // Manually plant a cached result for this key
    const key = generateIdempotencyKey(rejectedVerdict, TEST_SECRET);
    store.record(key, { success: true, txHash: "0xfake" });

    // Security check (unapproved) fires before idempotency check
    await expect(executor.execute(rejectedVerdict)).rejects.toThrow("unapproved");
  });

  it("different verdicts for same request produce different keys", async () => {
    const request = makeRequest();

    const verdict1 = makeApprovedVerdict(request);
    const result1 = await executor.execute(verdict1);

    // Create a new verdict with different decidedAt
    await new Promise((r) => setTimeout(r, 5));
    const verdict2 = makeApprovedVerdict(request);

    // Different key → not cached → executes again
    const result2 = await executor.execute(verdict2);
    expect(result2).toEqual(result1); // Same result (read-only mode), but executed independently
    expect(store.size).toBe(2); // Two separate entries
  });
});
