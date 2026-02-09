import { describe, it, expect, beforeEach } from "vitest";
import { v4 as uuidv4 } from "uuid";
import { PolicyEngine } from "../src/policy-engine.js";
import { AuditLog } from "../src/audit-log.js";
import type {
  TransactionRequest,
  PolicyConfig,
  AuditEntry,
} from "../src/types.js";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

function makeConfig(overrides?: Partial<PolicyConfig>): PolicyConfig {
  return {
    version: 1,
    maxPerTransactionUsd: 100,
    maxDailyUsd: 500,
    maxTransactionsPerHour: 10,
    maxTransactionsPerDay: 50,
    cooldownSeconds: 0,
    hitlThresholdUsd: 50,
    allowlistedTokens: ["ETH", "USDC"],
    allowlistedContracts: [],
    blockedActions: [],
    circuitBreakerAutoTripOnConsecutiveFailures: 3,
    ...overrides,
  };
}

function makeAuditEntry(overrides?: Partial<AuditEntry>): AuditEntry {
  return {
    id: uuidv4(),
    txRequest: makeRequest(),
    verdict: "AUTO_APPROVED",
    violations: [],
    timestamp: Date.now(),
    ...overrides,
  };
}

const TEST_SECRET = "test-secret-key-for-policy-engine-tests!";
const noopBreaker = { isTripped: () => false };

function createTempAuditLog(): AuditLog {
  const dir = mkdtempSync(join(tmpdir(), "sentinel-test-"));
  return new AuditLog(dir);
}

describe("PolicyEngine", () => {
  let engine: PolicyEngine;
  let auditLog: AuditLog;

  beforeEach(() => {
    auditLog = createTempAuditLog();
    engine = new PolicyEngine(makeConfig(), auditLog, TEST_SECRET, noopBreaker);
  });

  it("auto-approves a valid request within all limits", async () => {
    const request = makeRequest({ estimatedValueUsd: 10 });
    const verdict = await engine.evaluate(request);

    expect(verdict.approved).toBe(true);
    expect(verdict.violations).toHaveLength(0);
    expect(verdict.decidedBy).toBe("policy_engine");
    expect(verdict.integrityHash).toBeTruthy();
  });

  it("blocks when circuit breaker is tripped", async () => {
    const trippedBreaker = { isTripped: () => true };
    engine = new PolicyEngine(makeConfig(), auditLog, TEST_SECRET, trippedBreaker);

    const verdict = await engine.evaluate(makeRequest());

    expect(verdict.approved).toBe(false);
    expect(verdict.violations[0]!.policy).toBe("circuit-breaker");
    expect(verdict.violations[0]!.severity).toBe("block");
  });

  it("blocks when action is in blockedActions", async () => {
    engine = new PolicyEngine(
      makeConfig({ blockedActions: ["swap"] }),
      auditLog, TEST_SECRET, noopBreaker
    );

    const verdict = await engine.evaluate(makeRequest({ action: "swap" }));

    expect(verdict.approved).toBe(false);
    expect(verdict.violations.some((v) => v.policy === "allowlist")).toBe(true);
  });

  it("blocks when token is not in allowlist", async () => {
    const request = makeRequest({
      params: { fromToken: "SHIB", toToken: "USDC", amount: "1000" },
    });
    const verdict = await engine.evaluate(request);

    expect(verdict.approved).toBe(false);
    expect(verdict.violations.some(
      (v) => v.policy === "allowlist" && v.message.includes("SHIB")
    )).toBe(true);
  });

  it("blocks when per-tx amount exceeds limit", async () => {
    const request = makeRequest({ estimatedValueUsd: 150 });
    const verdict = await engine.evaluate(request);

    expect(verdict.approved).toBe(false);
    expect(verdict.violations.some((v) => v.policy === "amount-limit")).toBe(true);
  });

  it("blocks when daily cumulative exceeds limit", async () => {
    // Pre-load history with $490 of approved transactions
    const history: AuditEntry[] = [];
    for (let i = 0; i < 49; i++) {
      history.push(makeAuditEntry({
        txRequest: makeRequest({ estimatedValueUsd: 10 }),
        timestamp: Date.now() - i * 60_000,
      }));
    }
    engine.loadHistory(history);

    // This $20 request would push total to $510 > $500 limit
    const request = makeRequest({ estimatedValueUsd: 20 });
    const verdict = await engine.evaluate(request);

    expect(verdict.approved).toBe(false);
    expect(verdict.violations.some(
      (v) => v.policy === "amount-limit" && v.message.includes("Daily")
    )).toBe(true);
  });

  it("blocks when hourly rate limit exceeded", async () => {
    // Pre-load 10 approved transactions in the last hour
    const history: AuditEntry[] = [];
    for (let i = 0; i < 10; i++) {
      history.push(makeAuditEntry({
        timestamp: Date.now() - i * 60_000,
      }));
    }
    engine.loadHistory(history);

    const verdict = await engine.evaluate(makeRequest());

    expect(verdict.approved).toBe(false);
    expect(verdict.violations.some((v) => v.policy === "rate-limit")).toBe(true);
  });

  it("blocks when cooldown is active", async () => {
    engine = new PolicyEngine(
      makeConfig({ cooldownSeconds: 300 }),
      auditLog, TEST_SECRET, noopBreaker
    );

    // Add a recent transaction 60 seconds ago (within 300s cooldown)
    engine.loadHistory([
      makeAuditEntry({ timestamp: Date.now() - 60_000 }),
    ]);

    const verdict = await engine.evaluate(makeRequest());

    expect(verdict.approved).toBe(false);
    expect(verdict.violations.some((v) => v.policy === "cooldown")).toBe(true);
  });

  it("triggers HITL when amount exceeds HITL threshold but below block", async () => {
    let hitlCalled = false;
    const mockHitl = {
      async requestApproval() {
        hitlCalled = true;
        return true; // human approves
      },
    };

    engine = new PolicyEngine(makeConfig(), auditLog, TEST_SECRET, noopBreaker, mockHitl);

    // $75 > hitlThreshold($50) but < maxPerTx($100)
    const request = makeRequest({ estimatedValueUsd: 75 });
    const verdict = await engine.evaluate(request);

    expect(hitlCalled).toBe(true);
    expect(verdict.approved).toBe(true);
    expect(verdict.decidedBy).toBe("human");
    expect(verdict.requiresHitl).toBe(true);
  });

  it("rejects when HITL denies", async () => {
    const mockHitl = {
      async requestApproval() {
        return false; // human rejects
      },
    };

    engine = new PolicyEngine(makeConfig(), auditLog, TEST_SECRET, noopBreaker, mockHitl);

    const request = makeRequest({ estimatedValueUsd: 75 });
    const verdict = await engine.evaluate(request);

    expect(verdict.approved).toBe(false);
    expect(verdict.decidedBy).toBe("human");
  });

  it("defaults HITL to reject when bridge unavailable", async () => {
    // No HITL bridge provided — should fail closed
    engine = new PolicyEngine(makeConfig(), auditLog, TEST_SECRET, noopBreaker);

    const request = makeRequest({ estimatedValueUsd: 75 });
    const verdict = await engine.evaluate(request);

    expect(verdict.approved).toBe(false);
  });

  it("passes cooldown check when enough time has elapsed", async () => {
    engine = new PolicyEngine(
      makeConfig({ cooldownSeconds: 60 }),
      auditLog, TEST_SECRET, noopBreaker
    );

    // Transaction 120 seconds ago (past the 60s cooldown)
    engine.loadHistory([
      makeAuditEntry({ timestamp: Date.now() - 120_000 }),
    ]);

    const verdict = await engine.evaluate(makeRequest());
    expect(verdict.approved).toBe(true);
  });

  it("prunes history older than 24 hours", () => {
    const oldEntry = makeAuditEntry({
      timestamp: Date.now() - 25 * 60 * 60 * 1000,
    });
    const recentEntry = makeAuditEntry({
      timestamp: Date.now() - 1000,
    });

    engine.loadHistory([oldEntry, recentEntry]);
    engine.pruneHistory();

    // After pruning, old entry should not count toward limits
    // We can verify by loading 50 old entries and checking they don't block
  });

  it("accumulates violations from multiple policies", async () => {
    engine = new PolicyEngine(
      makeConfig({
        blockedActions: ["swap"],
        cooldownSeconds: 9999,
      }),
      auditLog, TEST_SECRET, noopBreaker
    );

    engine.loadHistory([makeAuditEntry({ timestamp: Date.now() - 1000 })]);

    const verdict = await engine.evaluate(makeRequest());

    expect(verdict.approved).toBe(false);
    // Should have violations from both allowlist (blocked action) and cooldown
    expect(verdict.violations.length).toBeGreaterThanOrEqual(2);
  });
});
