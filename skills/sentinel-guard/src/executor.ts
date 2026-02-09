import type { PolicyVerdict, ExecutionResult, TransactionDispatcher } from "./types.js";
import { computeIntegrityHash, VERDICT_TTL_MS, type CircuitBreakerCheck } from "./policy-engine.js";
import { AuditLog } from "./audit-log.js";
import { generateIdempotencyKey, type IdempotencyStore } from "./idempotency.js";

/**
 * Wallet Executor — the ONLY module that touches real money.
 *
 * It accepts a PolicyVerdict and refuses to execute unless:
 * 1. verdict.approved === true
 * 2. The HMAC integrity hash matches (prevents forgery)
 * 3. The verdict is within TTL (prevents replay)
 * 4. The circuit breaker is not tripped (defense-in-depth re-check)
 *
 * Dispatches approved verdicts to a TransactionDispatcher based on action type.
 * If no dispatcher is configured, falls back to read-only mode.
 *
 * Transport-agnostic: the dispatcher interface decouples this module from
 * any specific execution backend (bankr.bot, local signer, etc.).
 */
export class WalletExecutor {
  private readonly auditLog: AuditLog;
  private readonly guardSecret: string;
  private readonly circuitBreaker: CircuitBreakerCheck;
  private readonly dispatcher: TransactionDispatcher | null;
  private readonly idempotencyStore: IdempotencyStore | null;

  constructor(
    auditLog: AuditLog,
    guardSecret: string,
    circuitBreaker: CircuitBreakerCheck,
    dispatcher?: TransactionDispatcher,
    idempotencyStore?: IdempotencyStore
  ) {
    this.auditLog = auditLog;
    this.guardSecret = guardSecret;
    this.circuitBreaker = circuitBreaker;
    this.dispatcher = dispatcher ?? null;
    this.idempotencyStore = idempotencyStore ?? null;
  }

  /**
   * Execute a transaction that has been approved by the PolicyEngine.
   * Throws SecurityViolationError if any security check fails.
   */
  async execute(verdict: PolicyVerdict): Promise<ExecutionResult> {
    // HARD CHECK 1: Refuse unapproved verdicts
    if (!verdict.approved) {
      throw new SecurityViolationError(
        "Attempted to execute unapproved transaction",
        verdict
      );
    }

    // HARD CHECK 2: Verify HMAC integrity hash (prevents forgery)
    const expectedHash = computeIntegrityHash(
      verdict.txRequest.id,
      verdict.approved,
      verdict.decidedAt,
      this.guardSecret
    );

    if (verdict.integrityHash !== expectedHash) {
      throw new SecurityViolationError(
        "Verdict integrity hash mismatch — possible tampering",
        verdict
      );
    }

    // HARD CHECK 3: TTL check (prevents replay)
    const age = Date.now() - verdict.decidedAt;
    if (age > VERDICT_TTL_MS) {
      throw new SecurityViolationError(
        `Verdict expired: ${Math.round(age / 1000)}s old (max ${VERDICT_TTL_MS / 1000}s)`,
        verdict
      );
    }

    // HARD CHECK 4: Circuit breaker re-check (closes TOCTOU gap)
    if (this.circuitBreaker.isTripped()) {
      throw new SecurityViolationError(
        "Circuit breaker tripped between policy evaluation and execution",
        verdict
      );
    }

    // IDEMPOTENCY CHECK: After all security checks pass, check for duplicates.
    // This ordering is critical — a tampered verdict must throw SecurityViolationError,
    // never return a cached result.
    if (this.idempotencyStore) {
      const idempotencyKey = generateIdempotencyKey(verdict, this.guardSecret);
      const cached = this.idempotencyStore.get(idempotencyKey);
      if (cached) {
        return cached;
      }
    }

    // Dispatch to TransactionDispatcher if available
    const result = this.dispatcher
      ? await this.dispatcher.dispatch(verdict.txRequest)
      : { success: false, error: "No dispatcher configured — read-only mode" };

    // Record the result for idempotency (before audit, so even failed dispatches are deduped)
    if (this.idempotencyStore) {
      const idempotencyKey = generateIdempotencyKey(verdict, this.guardSecret);
      this.idempotencyStore.record(idempotencyKey, result);
    }

    this.auditLog.record(
      verdict.txRequest,
      result.success ? "EXECUTED" : "EXECUTION_FAILED",
      verdict.violations,
      result
    );

    return result;
  }
}

/**
 * Custom error for security violations in the executor.
 * These should be logged, alerted, and investigated.
 */
export class SecurityViolationError extends Error {
  readonly verdict: PolicyVerdict;

  constructor(message: string, verdict: PolicyVerdict) {
    super(`SECURITY VIOLATION: ${message}`);
    this.name = "SecurityViolationError";
    this.verdict = verdict;
  }
}
