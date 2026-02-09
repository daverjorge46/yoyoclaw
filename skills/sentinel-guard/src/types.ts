/**
 * Core types for the Transaction Guard.
 *
 * These types define the boundary between the reasoning layer (LLM)
 * and the execution layer. The LLM produces TransactionRequests;
 * the PolicyEngine evaluates them into PolicyVerdicts; the WalletExecutor
 * only accepts approved verdicts.
 */

/** Supported financial actions the agent can propose. */
export type TransactionAction =
  | "swap"
  | "transfer"
  | "deploy_token"
  | "sign_message";

/** Supported chains. */
export type Chain = "base" | "ethereum" | "polygon";

/**
 * A financial action proposed by the reasoning layer.
 * This is NEVER executed directly — it must pass through the PolicyEngine.
 */
export interface TransactionRequest {
  /** Unique identifier (UUIDv4). */
  id: string;
  /** The financial action being proposed. */
  action: TransactionAction;
  /** Action-specific parameters. */
  params: Record<string, unknown>;
  /** Target blockchain. */
  chain: Chain;
  /** LLM-provided justification for this action. */
  reason: string;
  /** Unix timestamp (ms) when the request was created. */
  requestedAt: number;
  /**
   * USD value estimated by the PolicyEngine (NOT the LLM).
   * Set to 0 initially; computed independently by the guard.
   */
  estimatedValueUsd: number;
  /** Where this request originated. */
  source: "reasoning" | "scheduler";
}

/** Severity of a policy violation. */
export type ViolationSeverity =
  | "block"   // Hard rejection — cannot proceed
  | "hitl"    // Requires human approval via Telegram
  | "warn";   // Logged but auto-approved

/** A single policy violation detected during evaluation. */
export interface PolicyViolation {
  /** Which policy detected this (e.g., "rate-limit", "amount-limit"). */
  policy: string;
  /** Human-readable description. */
  message: string;
  /** How severe this violation is. */
  severity: ViolationSeverity;
}

/** Who made the final approval decision. */
export type DecisionMaker = "policy_engine" | "human";

/** The verdict after evaluating a TransactionRequest against all policies. */
export interface PolicyVerdict {
  /** Whether the transaction is approved for execution. */
  approved: boolean;
  /** The original request being evaluated. */
  txRequest: TransactionRequest;
  /** All violations detected (may be empty if clean pass). */
  violations: PolicyViolation[];
  /** Whether human approval was required (and obtained or denied). */
  requiresHitl: boolean;
  /** Who made the decision. */
  decidedBy: DecisionMaker;
  /** Unix timestamp (ms) when the verdict was issued. */
  decidedAt: number;
  /**
   * Integrity hash: SHA-256 of (txRequest.id + approved + decidedAt).
   * Verified by WalletExecutor before execution.
   */
  integrityHash: string;
}

/** Structured audit log entry for every policy decision. */
export interface AuditEntry {
  /** Unique entry ID. */
  id: string;
  /** The transaction request. */
  txRequest: TransactionRequest;
  /** The verdict. */
  verdict: "AUTO_APPROVED" | "APPROVED_HITL" | "REJECTED_HITL" | "BLOCKED" | "EXECUTED" | "EXECUTION_FAILED";
  /** All violations detected. */
  violations: PolicyViolation[];
  /** Unix timestamp (ms). */
  timestamp: number;
  /** Execution result (set after wallet execution). */
  executionResult?: {
    success: boolean;
    txHash?: string;
    error?: string;
  };
}

/** Configuration for the policy engine, loaded from policies/default.json. */
export interface PolicyConfig {
  /** Schema version for forward compatibility. */
  version: number;
  /** Max USD value per single transaction. */
  maxPerTransactionUsd: number;
  /** Max cumulative USD value per day. */
  maxDailyUsd: number;
  /** Max transactions per hour. */
  maxTransactionsPerHour: number;
  /** Max transactions per day. */
  maxTransactionsPerDay: number;
  /** Minimum seconds between financial actions. */
  cooldownSeconds: number;
  /** USD threshold above which HITL is required. */
  hitlThresholdUsd: number;
  /** Tokens the agent is allowed to interact with. */
  allowlistedTokens: string[];
  /** Contract addresses the agent is allowed to call. */
  allowlistedContracts: string[];
  /** Actions that are explicitly blocked (overrides everything). */
  blockedActions: TransactionAction[];
  /** Auto-trip circuit breaker after N consecutive failures. */
  circuitBreakerAutoTripOnConsecutiveFailures: number;
}

/** Result of a wallet execution attempt. */
export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  jobId?: string;
  error?: string;
}

/**
 * Interface that every policy must implement.
 * Policies are pure functions with no side effects.
 */
export interface Policy {
  /** Human-readable policy name (e.g., "rate-limit"). */
  name: string;
  /** Evaluate a request. Returns violations (empty array = pass). */
  evaluate(
    request: TransactionRequest,
    config: PolicyConfig,
    recentHistory: AuditEntry[]
  ): PolicyViolation[];
}

/**
 * Transport-agnostic transaction dispatcher.
 *
 * Implementations wrap a specific transport (bankr.bot, local signer, etc.)
 * and handle the actual on-chain execution. The WalletExecutor delegates to
 * this interface after all security checks pass.
 */
export interface TransactionDispatcher {
  dispatch(tx: TransactionRequest): Promise<ExecutionResult>;
}
