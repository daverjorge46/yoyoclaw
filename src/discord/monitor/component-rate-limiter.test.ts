import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ComponentInteractionRateLimiter } from "./component-rate-limiter.js";

describe("ComponentInteractionRateLimiter", () => {
  let limiter: ComponentInteractionRateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    limiter?.dispose();
    vi.useRealTimers();
  });

  it("allows interactions under the limit", () => {
    limiter = new ComponentInteractionRateLimiter({ maxInteractions: 3, windowMs: 10_000 });

    expect(limiter.checkAndRecord("u1", "c1", "button")).toBe(true);
    expect(limiter.checkAndRecord("u1", "c1", "button")).toBe(true);
    expect(limiter.checkAndRecord("u1", "c1", "button")).toBe(true);
  });

  it("denies interactions over the limit", () => {
    limiter = new ComponentInteractionRateLimiter({ maxInteractions: 2, windowMs: 10_000 });

    expect(limiter.checkAndRecord("u1", "c1", "button")).toBe(true);
    expect(limiter.checkAndRecord("u1", "c1", "button")).toBe(true);
    expect(limiter.checkAndRecord("u1", "c1", "button")).toBe(false);
  });

  it("allows interactions after window expires", () => {
    limiter = new ComponentInteractionRateLimiter({ maxInteractions: 1, windowMs: 5_000 });

    expect(limiter.checkAndRecord("u1", "c1", "button")).toBe(true);
    expect(limiter.checkAndRecord("u1", "c1", "button")).toBe(false);

    vi.advanceTimersByTime(5_001);
    expect(limiter.checkAndRecord("u1", "c1", "button")).toBe(true);
  });

  it("uses sliding window, not fixed window", () => {
    limiter = new ComponentInteractionRateLimiter({ maxInteractions: 2, windowMs: 10_000 });

    limiter.checkAndRecord("u1", "c1", "button"); // t=0
    vi.advanceTimersByTime(5_000);
    limiter.checkAndRecord("u1", "c1", "button"); // t=5000

    // Both interactions within window — limit reached
    expect(limiter.checkAndRecord("u1", "c1", "button")).toBe(false);

    // First interaction expires at t=10001
    vi.advanceTimersByTime(5_001);
    expect(limiter.checkAndRecord("u1", "c1", "button")).toBe(true);
  });

  it("tracks users separately", () => {
    limiter = new ComponentInteractionRateLimiter({ maxInteractions: 1, windowMs: 10_000 });

    expect(limiter.checkAndRecord("u1", "c1", "button")).toBe(true);
    expect(limiter.checkAndRecord("u1", "c1", "button")).toBe(false);
    expect(limiter.checkAndRecord("u2", "c1", "button")).toBe(true);
  });

  it("tracks channels separately", () => {
    limiter = new ComponentInteractionRateLimiter({ maxInteractions: 1, windowMs: 10_000 });

    expect(limiter.checkAndRecord("u1", "c1", "button")).toBe(true);
    expect(limiter.checkAndRecord("u1", "c1", "button")).toBe(false);
    expect(limiter.checkAndRecord("u1", "c2", "button")).toBe(true);
  });

  it("tracks component types separately", () => {
    limiter = new ComponentInteractionRateLimiter({ maxInteractions: 1, windowMs: 10_000 });

    expect(limiter.checkAndRecord("u1", "c1", "button")).toBe(true);
    expect(limiter.checkAndRecord("u1", "c1", "button")).toBe(false);
    expect(limiter.checkAndRecord("u1", "c1", "selectMenu")).toBe(true);
  });

  it("allows all interactions when disabled", () => {
    limiter = new ComponentInteractionRateLimiter({ enabled: false, maxInteractions: 1 });

    for (let i = 0; i < 50; i++) {
      expect(limiter.checkAndRecord("u1", "c1", "button")).toBe(true);
    }
  });

  it("uses default config values", () => {
    limiter = new ComponentInteractionRateLimiter();

    // Default: 5 interactions per 10s window
    for (let i = 0; i < 5; i++) {
      expect(limiter.checkAndRecord("u1", "c1", "button")).toBe(true);
    }
    expect(limiter.checkAndRecord("u1", "c1", "button")).toBe(false);
  });
});
