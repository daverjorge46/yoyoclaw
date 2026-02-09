import type { CircuitBreakerCheck } from "./policy-engine.js";

/** Reason why the circuit breaker was tripped. */
export type TripReason =
  | "manual"               // /kill command
  | "consecutive_failures" // auto-trip threshold hit
  | "anomaly";             // future: anomaly detection

/** Snapshot of circuit breaker state. */
export interface CircuitBreakerState {
  tripped: boolean;
  tripReason?: TripReason;
  trippedAt?: number;
  consecutiveFailures: number;
}

/** Callback when breaker state changes. */
export type BreakerCallback = (state: CircuitBreakerState) => void;

/**
 * Circuit Breaker — emergency shutdown for all financial operations.
 *
 * Two trip modes:
 * 1. Manual: operator sends /kill via Telegram
 * 2. Auto: N consecutive execution failures
 *
 * Recovery is ALWAYS manual (/resume). The system never auto-recovers
 * from a tripped state — a human must acknowledge and resume.
 *
 * Implements CircuitBreakerCheck so the PolicyEngine can query it.
 */
export class CircuitBreaker implements CircuitBreakerCheck {
  private tripped = false;
  private tripReason?: TripReason;
  private trippedAt?: number;
  private consecutiveFailures = 0;
  private readonly autoTripThreshold: number;
  private onTripCallback?: BreakerCallback;
  private onResumeCallback?: BreakerCallback;

  constructor(autoTripThreshold: number) {
    this.autoTripThreshold = autoTripThreshold;
  }

  /** Wire callbacks for state change notifications (Telegram bot uses these). */
  onTrip(cb: BreakerCallback): void {
    this.onTripCallback = cb;
  }

  onResume(cb: BreakerCallback): void {
    this.onResumeCallback = cb;
  }

  /** PolicyEngine interface: check if breaker is tripped. */
  isTripped(): boolean {
    return this.tripped;
  }

  /** Get full state snapshot for /status command. */
  getState(): CircuitBreakerState {
    return {
      tripped: this.tripped,
      tripReason: this.tripReason,
      trippedAt: this.trippedAt,
      consecutiveFailures: this.consecutiveFailures,
    };
  }

  /**
   * Manual trip — called by /kill command.
   * Immediately halts all financial operations.
   */
  manualTrip(): void {
    this.trip("manual");
  }

  /**
   * Record a successful execution. Resets the consecutive failure counter.
   */
  recordSuccess(): void {
    this.consecutiveFailures = 0;
  }

  /**
   * Record a failed execution.
   * If consecutive failures reach the threshold, auto-trips.
   */
  recordFailure(): void {
    this.consecutiveFailures++;

    if (
      this.autoTripThreshold > 0 &&
      this.consecutiveFailures >= this.autoTripThreshold &&
      !this.tripped
    ) {
      this.trip("consecutive_failures");
    }
  }

  /**
   * Resume operations — called by /resume command.
   * Only works if currently tripped.
   * Returns true if successfully resumed, false if wasn't tripped.
   */
  resume(): boolean {
    if (!this.tripped) {
      return false;
    }

    this.tripped = false;
    this.tripReason = undefined;
    this.trippedAt = undefined;
    this.consecutiveFailures = 0;

    const state = this.getState();
    this.onResumeCallback?.(state);

    return true;
  }

  private trip(reason: TripReason): void {
    this.tripped = true;
    this.tripReason = reason;
    this.trippedAt = Date.now();

    const state = this.getState();
    this.onTripCallback?.(state);
  }
}
