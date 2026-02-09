import { createHmac } from "node:crypto";
import type {
  TransactionRequest,
  PolicyVerdict,
  PolicyViolation,
  PolicyConfig,
  Policy,
  AuditEntry,
} from "./types.js";
import { AuditLog } from "./audit-log.js";
import { rateLimitPolicy } from "./policies/rate-limit.js";
import { amountLimitPolicy } from "./policies/amount-limit.js";
import { allowlistPolicy } from "./policies/allowlist.js";
import { cooldownPolicy } from "./policies/cooldown.js";

/**
 * Minimal HITL bridge interface.
 * Implemented by the Telegram bot layer (Phase 3).
 */
export interface HitlBridge {
  requestApproval(
    request: TransactionRequest,
    violations: PolicyViolation[]
  ): Promise<boolean>;
}

/**
 * Minimal circuit breaker interface.
 * Implemented by the security layer (Phase 3).
 */
export interface CircuitBreakerCheck {
  isTripped(): boolean;
}

/** Stub implementations for phases before Telegram/security are built. */
const noopHitl: HitlBridge = {
  async requestApproval() {
    return false; // fail-closed: deny if HITL not available
  },
};

/**
 * The Transaction Policy Engine.
 *
 * Evaluates TransactionRequests against all policies.
 * This is PURE LOGIC — no LLM, no network calls (except price feeds for valuation).
 * Every decision is logged to the audit trail.
 */
export class PolicyEngine {
  private readonly policies: Policy[];
  private config: PolicyConfig;
  private readonly auditLog: AuditLog;
  private readonly hitl: HitlBridge;
  private readonly circuitBreaker: CircuitBreakerCheck;
  private readonly guardSecret: string;
  private recentHistory: AuditEntry[] = [];

  constructor(
    config: PolicyConfig,
    auditLog: AuditLog,
    guardSecret: string,
    circuitBreaker: CircuitBreakerCheck,
    hitl?: HitlBridge
  ) {
    this.config = config;
    this.auditLog = auditLog;
    this.guardSecret = guardSecret;
    this.hitl = hitl ?? noopHitl;
    this.circuitBreaker = circuitBreaker;

    // Policy evaluation order matters: cheapest checks first
    this.policies = [
      allowlistPolicy,    // O(1) — check blocklist/allowlist
      cooldownPolicy,     // O(1) — time comparison
      rateLimitPolicy,    // O(n) — count recent entries
      amountLimitPolicy,  // O(n) — sum recent amounts
    ];
  }

  /**
   * Evaluate a transaction request against all policies.
   * Returns a verdict that the WalletExecutor can act on.
   */
  async evaluate(request: TransactionRequest): Promise<PolicyVerdict> {
    // 1. Circuit breaker check (highest priority)
    if (this.circuitBreaker.isTripped()) {
      const verdict = this.buildVerdict(request, false, [
        {
          policy: "circuit-breaker",
          message: "Circuit breaker is tripped. All financial operations halted.",
          severity: "block",
        },
      ], "policy_engine");

      this.auditLog.record(request, "BLOCKED", verdict.violations);
      return verdict;
    }

    // 2. Run all policies
    const violations: PolicyViolation[] = [];
    for (const policy of this.policies) {
      const result = policy.evaluate(request, this.config, this.recentHistory);
      violations.push(...result);
    }

    // 3. Determine outcome
    const hasBlockers = violations.some((v) => v.severity === "block");
    const needsHitl = !hasBlockers && violations.some((v) => v.severity === "hitl");

    if (hasBlockers) {
      const verdict = this.buildVerdict(request, false, violations, "policy_engine");
      this.auditLog.record(request, "BLOCKED", violations);
      return verdict;
    }

    if (needsHitl) {
      const humanApproved = await this.hitl.requestApproval(request, violations);
      const verdict = this.buildVerdict(
        request,
        humanApproved,
        violations,
        "human"
      );
      const auditVerdict = humanApproved ? "APPROVED_HITL" : "REJECTED_HITL";
      const entry = this.auditLog.record(request, auditVerdict, violations);
      this.recentHistory.push(entry);
      return verdict;
    }

    // 4. Auto-approved
    const verdict = this.buildVerdict(request, true, violations, "policy_engine");
    const entry = this.auditLog.record(request, "AUTO_APPROVED", violations);
    this.recentHistory.push(entry);
    return verdict;
  }

  /** Inject history for testing or after restart. */
  loadHistory(entries: AuditEntry[]): void {
    this.recentHistory = [...entries];
  }

  /** Prune old history (older than 24h) to limit memory. */
  pruneHistory(): void {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.recentHistory = this.recentHistory.filter(
      (e) => e.timestamp > oneDayAgo
    );
  }

  /** Hot-swap the policy config (used by ConfigWatcher). */
  updateConfig(newConfig: PolicyConfig): void {
    this.config = newConfig;
  }

  /** Get current config (for diagnostics). */
  getConfig(): PolicyConfig {
    return this.config;
  }

  private buildVerdict(
    request: TransactionRequest,
    approved: boolean,
    violations: PolicyViolation[],
    decidedBy: "policy_engine" | "human"
  ): PolicyVerdict {
    const decidedAt = Date.now();
    const integrityHash = computeIntegrityHash(
      request.id,
      approved,
      decidedAt,
      this.guardSecret
    );

    return {
      approved,
      txRequest: request,
      violations,
      requiresHitl: decidedBy === "human",
      decidedBy,
      decidedAt,
      integrityHash,
    };
  }
}

/** Max age (ms) for a verdict to remain valid. Prevents replay attacks. */
export const VERDICT_TTL_MS = 60_000;

/**
 * Compute HMAC-SHA256 integrity hash for verdict verification.
 * Uses a shared secret known only to PolicyEngine and WalletExecutor.
 * The WalletExecutor checks this + TTL before executing.
 */
export function computeIntegrityHash(
  requestId: string,
  approved: boolean,
  decidedAt: number,
  secret: string
): string {
  const payload = `${requestId}:${approved}:${decidedAt}`;
  return createHmac("sha256", secret).update(payload).digest("hex");
}
