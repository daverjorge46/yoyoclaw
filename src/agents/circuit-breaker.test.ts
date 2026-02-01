import { describe, expect, it, beforeEach } from "vitest";

import {
  isCircuitOpen,
  recordFailure,
  recordSuccess,
  getCircuitState,
  resetCircuits,
  type CircuitBreakerConfig,
} from "./circuit-breaker.js";

const enabledConfig: CircuitBreakerConfig = {
  enabled: true,
  failureThreshold: 3,
  resetTimeoutMs: 5000,
};

describe("circuit-breaker", () => {
  beforeEach(() => {
    resetCircuits();
  });

  it("starts with closed circuit", () => {
    expect(getCircuitState("test-provider")).toBe("closed");
    expect(isCircuitOpen("test-provider", enabledConfig)).toBe(false);
  });

  it("does nothing when disabled", () => {
    const disabled: CircuitBreakerConfig = { enabled: false };
    recordFailure("p1", disabled);
    recordFailure("p1", disabled);
    recordFailure("p1", disabled);
    expect(isCircuitOpen("p1", disabled)).toBe(false);
  });

  it("opens circuit after threshold failures", () => {
    recordFailure("p1", enabledConfig);
    expect(getCircuitState("p1")).toBe("closed");

    recordFailure("p1", enabledConfig);
    expect(getCircuitState("p1")).toBe("closed");

    recordFailure("p1", enabledConfig);
    expect(getCircuitState("p1")).toBe("open");
    expect(isCircuitOpen("p1", enabledConfig)).toBe(true);
  });

  it("resets on success", () => {
    recordFailure("p1", enabledConfig);
    recordFailure("p1", enabledConfig);
    recordSuccess("p1", enabledConfig);
    expect(getCircuitState("p1")).toBe("closed");

    // Should need 3 more failures to open
    recordFailure("p1", enabledConfig);
    recordFailure("p1", enabledConfig);
    expect(getCircuitState("p1")).toBe("closed");
  });

  it("transitions to half-open after timeout", () => {
    const fastConfig: CircuitBreakerConfig = {
      enabled: true,
      failureThreshold: 1,
      resetTimeoutMs: 50,
    };

    recordFailure("p1", fastConfig);
    expect(getCircuitState("p1")).toBe("open");
    expect(isCircuitOpen("p1", fastConfig)).toBe(true);

    // Simulate time passing
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // After timeout, should transition to half-open (isCircuitOpen returns false)
        expect(isCircuitOpen("p1", fastConfig)).toBe(false);
        expect(getCircuitState("p1")).toBe("half-open");
        resolve();
      }, 60);
    });
  });

  it("re-opens on probe failure in half-open state", () => {
    const fastConfig: CircuitBreakerConfig = {
      enabled: true,
      failureThreshold: 1,
      resetTimeoutMs: 10,
    };

    recordFailure("p1", fastConfig);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // Transition to half-open
        isCircuitOpen("p1", fastConfig);
        expect(getCircuitState("p1")).toBe("half-open");

        // Probe fails
        recordFailure("p1", fastConfig);
        expect(getCircuitState("p1")).toBe("open");
        resolve();
      }, 15);
    });
  });

  it("closes on probe success in half-open state", () => {
    const fastConfig: CircuitBreakerConfig = {
      enabled: true,
      failureThreshold: 1,
      resetTimeoutMs: 10,
    };

    recordFailure("p1", fastConfig);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        isCircuitOpen("p1", fastConfig);
        expect(getCircuitState("p1")).toBe("half-open");

        recordSuccess("p1", fastConfig);
        expect(getCircuitState("p1")).toBe("closed");
        resolve();
      }, 15);
    });
  });

  it("tracks providers independently", () => {
    recordFailure("a", enabledConfig);
    recordFailure("a", enabledConfig);
    recordFailure("a", enabledConfig);
    recordFailure("b", enabledConfig);

    expect(getCircuitState("a")).toBe("open");
    expect(getCircuitState("b")).toBe("closed");
  });
});
