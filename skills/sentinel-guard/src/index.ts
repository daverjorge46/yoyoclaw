/**
 * @agent-os/sentinel-guard — Transaction policy engine, executor, circuit breaker, and audit log.
 *
 * One external dependency (uuid). Works as both an npm library and an OpenClaw skill.
 *
 * @example
 * ```ts
 * import { PolicyEngine, AuditLog, CircuitBreaker, WalletExecutor } from "@agent-os/sentinel-guard";
 *
 * const auditLog = new AuditLog("./logs");
 * const breaker = new CircuitBreaker(3);
 * const engine = new PolicyEngine(config, auditLog, secret, breaker);
 * const verdict = await engine.evaluate(txRequest);
 * ```
 */

// Core types
export type {
  TransactionAction,
  Chain,
  TransactionRequest,
  ViolationSeverity,
  PolicyViolation,
  DecisionMaker,
  PolicyVerdict,
  AuditEntry,
  PolicyConfig,
  ExecutionResult,
  Policy,
  TransactionDispatcher,
} from "./types.js";

// Policy engine
export { PolicyEngine, computeIntegrityHash, VERDICT_TTL_MS } from "./policy-engine.js";
export type { HitlBridge, CircuitBreakerCheck } from "./policy-engine.js";

// Audit log
export { AuditLog } from "./audit-log.js";

// Circuit breaker
export { CircuitBreaker } from "./circuit-breaker.js";
export type { TripReason, CircuitBreakerState, BreakerCallback } from "./circuit-breaker.js";

// Executor
export { WalletExecutor, SecurityViolationError } from "./executor.js";

// Idempotency
export { JsonlIdempotencyStore, generateIdempotencyKey } from "./idempotency.js";
export type { IdempotencyRecord, IdempotencyStore } from "./idempotency.js";

// Policies (for direct use or extension)
export { allowlistPolicy } from "./policies/allowlist.js";
export { cooldownPolicy } from "./policies/cooldown.js";
export { rateLimitPolicy } from "./policies/rate-limit.js";
export { amountLimitPolicy } from "./policies/amount-limit.js";

// Constants
export { POLICY_DEFAULTS } from "./constants.js";
