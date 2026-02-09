import { describe, it, expect, beforeEach } from "vitest";
import { v4 as uuidv4 } from "uuid";
import { WalletExecutor, SecurityViolationError } from "../src/executor.js";
import { computeIntegrityHash } from "../src/policy-engine.js";
import { AuditLog } from "../src/audit-log.js";
import type { PolicyVerdict, TransactionRequest } from "../src/types.js";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TEST_SECRET = "test-secret-key-for-executor-tests-32chars!";

function makeRequest(): TransactionRequest {
  return {
    id: uuidv4(),
    action: "swap",
    params: { fromToken: "ETH", toToken: "USDC", amount: "0.01" },
    chain: "base",
    reason: "Test swap",
    requestedAt: Date.now(),
    estimatedValueUsd: 10,
    source: "reasoning",
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

function makeRejectedVerdict(request: TransactionRequest): PolicyVerdict {
  const decidedAt = Date.now();
  return {
    approved: false,
    txRequest: request,
    violations: [{ policy: "test", message: "Blocked for testing", severity: "block" }],
    requiresHitl: false,
    decidedBy: "policy_engine",
    decidedAt,
    integrityHash: computeIntegrityHash(request.id, false, decidedAt, TEST_SECRET),
  };
}

describe("WalletExecutor", () => {
  let executor: WalletExecutor;

  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "sentinel-exec-test-"));
    const auditLog = new AuditLog(dir);
    const noopBreaker = { isTripped: () => false };
    executor = new WalletExecutor(auditLog, TEST_SECRET, noopBreaker);
  });

  it("throws SecurityViolationError on unapproved verdict", async () => {
    const request = makeRequest();
    const verdict = makeRejectedVerdict(request);

    await expect(executor.execute(verdict)).rejects.toThrow(SecurityViolationError);
    await expect(executor.execute(verdict)).rejects.toThrow("unapproved");
  });

  it("throws SecurityViolationError on tampered verdict", async () => {
    const request = makeRequest();
    const verdict = makeApprovedVerdict(request);

    // Tamper with the integrity hash
    verdict.integrityHash = "tampered_hash_value";

    await expect(executor.execute(verdict)).rejects.toThrow(SecurityViolationError);
    await expect(executor.execute(verdict)).rejects.toThrow("integrity");
  });

  it("throws on verdict where approved was flipped after hash computation", async () => {
    const request = makeRequest();
    const decidedAt = Date.now();

    // Compute hash for approved=false, then set approved=true
    const verdict: PolicyVerdict = {
      approved: true,
      txRequest: request,
      violations: [],
      requiresHitl: false,
      decidedBy: "policy_engine",
      decidedAt,
      integrityHash: computeIntegrityHash(request.id, false, decidedAt, TEST_SECRET), // hash says false
    };

    await expect(executor.execute(verdict)).rejects.toThrow("integrity");
  });

  it("accepts approved verdict with valid integrity hash (returns read-only result)", async () => {
    const request = makeRequest();
    const verdict = makeApprovedVerdict(request);

    // No dispatcher configured → read-only mode
    const result = await executor.execute(verdict);

    expect(result.success).toBe(false);
    expect(result.error).toContain("read-only mode");
  });

  it("SecurityViolationError includes the verdict for forensics", async () => {
    const request = makeRequest();
    const verdict = makeRejectedVerdict(request);

    try {
      await executor.execute(verdict);
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(SecurityViolationError);
      expect((e as SecurityViolationError).verdict).toBe(verdict);
    }
  });
});
