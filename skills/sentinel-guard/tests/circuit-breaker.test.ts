import { describe, it, expect, vi, beforeEach } from "vitest";
import { CircuitBreaker, type CircuitBreakerState } from "../src/circuit-breaker.js";

describe("CircuitBreaker", () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker(3); // auto-trip after 3 consecutive failures
  });

  it("starts in non-tripped state", () => {
    expect(breaker.isTripped()).toBe(false);
    expect(breaker.getState().consecutiveFailures).toBe(0);
  });

  it("trips on manual /kill", () => {
    breaker.manualTrip();

    expect(breaker.isTripped()).toBe(true);
    expect(breaker.getState().tripReason).toBe("manual");
    expect(breaker.getState().trippedAt).toBeTypeOf("number");
  });

  it("resumes after manual trip", () => {
    breaker.manualTrip();
    const resumed = breaker.resume();

    expect(resumed).toBe(true);
    expect(breaker.isTripped()).toBe(false);
    expect(breaker.getState().tripReason).toBeUndefined();
    expect(breaker.getState().consecutiveFailures).toBe(0);
  });

  it("returns false when resuming non-tripped breaker", () => {
    const resumed = breaker.resume();
    expect(resumed).toBe(false);
  });

  it("auto-trips after threshold consecutive failures", () => {
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.isTripped()).toBe(false);

    breaker.recordFailure(); // 3rd failure = threshold
    expect(breaker.isTripped()).toBe(true);
    expect(breaker.getState().tripReason).toBe("consecutive_failures");
  });

  it("resets failure count on success", () => {
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordSuccess(); // reset
    breaker.recordFailure();

    expect(breaker.isTripped()).toBe(false);
    expect(breaker.getState().consecutiveFailures).toBe(1);
  });

  it("does not double-trip if already tripped", () => {
    const onTrip = vi.fn();
    breaker.onTrip(onTrip);

    breaker.manualTrip();
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();

    // onTrip should only be called once (manual trip), not again for failures
    expect(onTrip).toHaveBeenCalledTimes(1);
  });

  it("calls onTrip callback when tripped", () => {
    const onTrip = vi.fn();
    breaker.onTrip(onTrip);

    breaker.manualTrip();

    expect(onTrip).toHaveBeenCalledOnce();
    const state: CircuitBreakerState = onTrip.mock.calls[0]![0];
    expect(state.tripped).toBe(true);
    expect(state.tripReason).toBe("manual");
  });

  it("calls onResume callback when resumed", () => {
    const onResume = vi.fn();
    breaker.onResume(onResume);

    breaker.manualTrip();
    breaker.resume();

    expect(onResume).toHaveBeenCalledOnce();
    const state: CircuitBreakerState = onResume.mock.calls[0]![0];
    expect(state.tripped).toBe(false);
  });

  it("works with zero auto-trip threshold (disabled)", () => {
    const noAutoTrip = new CircuitBreaker(0);

    for (let i = 0; i < 100; i++) {
      noAutoTrip.recordFailure();
    }

    expect(noAutoTrip.isTripped()).toBe(false);
    expect(noAutoTrip.getState().consecutiveFailures).toBe(100);
  });

  it("implements CircuitBreakerCheck interface for PolicyEngine", () => {
    // Verify the interface contract
    expect(breaker.isTripped).toBeTypeOf("function");
    expect(breaker.isTripped()).toBe(false);

    breaker.manualTrip();
    expect(breaker.isTripped()).toBe(true);
  });
});
