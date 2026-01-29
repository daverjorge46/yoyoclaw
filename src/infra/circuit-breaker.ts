/**
 * Circuit Breaker pattern implementation for external API calls.
 * Prevents hammering failing services by opening the circuit after consecutive failures.
 *
 * States:
 * - CLOSED: Normal operation, all requests allowed
 * - OPEN: Service is failing, reject requests immediately
 * - HALF_OPEN: Testing if service recovered, allow limited requests
 */

export type CircuitState = "closed" | "open" | "half_open";

export type CircuitBreakerConfig = {
  /** Open circuit after this many consecutive failures. Default: 5. */
  failureThreshold: number;
  /** Wait this long before trying half-open. Default: 30000ms (30s). */
  recoveryTimeoutMs: number;
  /** Close circuit after this many consecutive successes. Default: 3. */
  successThreshold: number;
};

type CircuitStats = {
  state: CircuitState;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastFailureAt: number | null;
  lastSuccessAt: number | null;
  totalFailures: number;
  totalSuccesses: number;
  openedAt: number | null;
};

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeoutMs: 30_000,
  successThreshold: 3,
};

export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private stats: CircuitStats;

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = {
      state: "closed",
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      lastFailureAt: null,
      lastSuccessAt: null,
      totalFailures: 0,
      totalSuccesses: 0,
      openedAt: null,
    };
  }

  /**
   * Check if a request should be allowed.
   * Returns true if request can proceed, false if circuit is open.
   */
  public canExecute(): boolean {
    if (this.stats.state === "closed") {
      return true;
    }

    if (this.stats.state === "open") {
      // Check if we should transition to half-open
      if (this.shouldTransitionToHalfOpen()) {
        this.transitionToHalfOpen();
        return true;
      }
      return false;
    }

    // half_open: allow request to test recovery
    return true;
  }

  /**
   * Record a successful operation.
   */
  public recordSuccess(): void {
    this.stats.lastSuccessAt = Date.now();
    this.stats.totalSuccesses++;
    this.stats.consecutiveFailures = 0;
    this.stats.consecutiveSuccesses++;

    if (this.stats.state === "half_open") {
      if (this.stats.consecutiveSuccesses >= this.config.successThreshold) {
        this.transitionToClosed();
      }
    } else if (this.stats.state === "open") {
      // Should not happen (open doesn't allow requests), but handle gracefully
      this.transitionToHalfOpen();
    }
  }

  /**
   * Record a failed operation.
   */
  public recordFailure(): void {
    this.stats.lastFailureAt = Date.now();
    this.stats.totalFailures++;
    this.stats.consecutiveSuccesses = 0;
    this.stats.consecutiveFailures++;

    if (this.stats.state === "closed") {
      if (this.stats.consecutiveFailures >= this.config.failureThreshold) {
        this.transitionToOpen();
      }
    } else if (this.stats.state === "half_open") {
      // Any failure in half-open immediately opens circuit again
      this.transitionToOpen();
    }
  }

  /**
   * Get current circuit state and stats.
   */
  public getState(): Readonly<CircuitStats> {
    return { ...this.stats };
  }

  /**
   * Manually reset circuit to closed state (for testing/admin purposes).
   */
  public reset(): void {
    this.stats.state = "closed";
    this.stats.consecutiveFailures = 0;
    this.stats.consecutiveSuccesses = 0;
    this.stats.openedAt = null;
  }

  private shouldTransitionToHalfOpen(): boolean {
    if (this.stats.state !== "open") return false;
    if (this.stats.openedAt === null) return false;
    const elapsed = Date.now() - this.stats.openedAt;
    return elapsed >= this.config.recoveryTimeoutMs;
  }

  private transitionToOpen(): void {
    this.stats.state = "open";
    this.stats.openedAt = Date.now();
  }

  private transitionToHalfOpen(): void {
    this.stats.state = "half_open";
    this.stats.consecutiveSuccesses = 0;
  }

  private transitionToClosed(): void {
    this.stats.state = "closed";
    this.stats.consecutiveFailures = 0;
    this.stats.consecutiveSuccesses = 0;
    this.stats.openedAt = null;
  }
}

/**
 * Global registry of circuit breakers per service (e.g., "discord", "telegram", "openai").
 */
const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Get or create a circuit breaker for a service.
 */
export function getCircuitBreaker(
  serviceId: string,
  config?: Partial<CircuitBreakerConfig>,
): CircuitBreaker {
  const existing = circuitBreakers.get(serviceId);
  if (existing) return existing;

  const breaker = new CircuitBreaker(config);
  circuitBreakers.set(serviceId, breaker);
  return breaker;
}

/**
 * Execute an operation with circuit breaker protection.
 * Returns result on success, throws on failure or open circuit.
 */
export async function withCircuitBreaker<T>(
  serviceId: string,
  operation: () => Promise<T>,
  config?: Partial<CircuitBreakerConfig>,
): Promise<T> {
  const breaker = getCircuitBreaker(serviceId, config);

  if (!breaker.canExecute()) {
    const error = new Error(`Circuit breaker open for service: ${serviceId}`);
    (error as NodeJS.ErrnoException).code = "CIRCUIT_OPEN";
    throw error;
  }

  try {
    const result = await operation();
    breaker.recordSuccess();
    return result;
  } catch (err) {
    breaker.recordFailure();
    throw err;
  }
}

/**
 * Get circuit state for all services (for monitoring/debugging).
 */
export function getAllCircuitStates(): Record<string, CircuitStats> {
  const states: Record<string, CircuitStats> = {};
  for (const [serviceId, breaker] of circuitBreakers.entries()) {
    states[serviceId] = breaker.getState();
  }
  return states;
}
