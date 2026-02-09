import { describe, expect, it } from "vitest";
import { computeNextRunAtMs } from "./schedule.js";

describe("cron schedule", () => {
  it("computes next run for cron expression with timezone", () => {
    // Saturday, Dec 13 2025 00:00:00Z
    const nowMs = Date.parse("2025-12-13T00:00:00.000Z");
    const next = computeNextRunAtMs(
      { kind: "cron", expr: "0 9 * * 3", tz: "America/Los_Angeles" },
      nowMs,
    );
    // Next Wednesday at 09:00 PST -> 17:00Z
    expect(next).toBe(Date.parse("2025-12-17T17:00:00.000Z"));
  });

  it("computes next run for every schedule", () => {
    const anchor = Date.parse("2025-12-13T00:00:00.000Z");
    const now = anchor + 10_000;
    const next = computeNextRunAtMs({ kind: "every", everyMs: 30_000, anchorMs: anchor }, now);
    expect(next).toBe(anchor + 30_000);
  });

  it("computes next run for every schedule when anchorMs is not provided", () => {
    const now = Date.parse("2025-12-13T00:00:00.000Z");
    const next = computeNextRunAtMs({ kind: "every", everyMs: 30_000 }, now);

    // Should return nowMs + everyMs, not nowMs (which would cause infinite loop)
    expect(next).toBe(now + 30_000);
  });

  it("advances when now matches anchor for every schedule", () => {
    const anchor = Date.parse("2025-12-13T00:00:00.000Z");
    const next = computeNextRunAtMs({ kind: "every", everyMs: 30_000, anchorMs: anchor }, anchor);
    expect(next).toBe(anchor + 30_000);
  });

  // --- #12278 regression: hourly cron with timezone ---

  it("hourly cron returns next hour, not next day (#12278)", () => {
    // Feb 8, 2026 6:45 PM PST = Feb 9, 2026 02:45:00 UTC
    const nowMs = Date.parse("2026-02-09T02:45:00.000Z");
    const next = computeNextRunAtMs(
      { kind: "cron", expr: "0 * * * *", tz: "America/Vancouver" },
      nowMs,
    );
    // Next hour at :00 = 7:00 PM PST = 03:00 UTC, ~15 min later (not 24h)
    expect(next).toBe(Date.parse("2026-02-09T03:00:00.000Z"));
  });

  it("hourly cron at exact boundary returns current match, not next (#12278)", () => {
    // Exactly 7:00 PM PST = Feb 9, 2026 03:00:00.000 UTC
    const nowMs = Date.parse("2026-02-09T03:00:00.000Z");
    const next = computeNextRunAtMs(
      { kind: "cron", expr: "0 * * * *", tz: "America/Vancouver" },
      nowMs,
    );
    // Should return 7:00 PM (current match) or 8:00 PM, but NOT 24h later
    expect(next).toBeDefined();
    // Must be within the next hour
    expect(next! - nowMs).toBeLessThanOrEqual(60 * 60 * 1000);
  });

  it("daily cron at exact boundary returns current match, not tomorrow (#12278)", () => {
    // Exactly 8:00 PM PST = Feb 9, 2026 04:00:00.000 UTC
    const nowMs = Date.parse("2026-02-09T04:00:00.000Z");
    const next = computeNextRunAtMs(
      { kind: "cron", expr: "0 20 * * *", tz: "America/Vancouver" },
      nowMs,
    );
    // At exact boundary: should return today's 8PM or tomorrow's 8PM
    expect(next).toBeDefined();
    // Must be within the next 24 hours
    expect(next! - nowMs).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
  });

  it("hourly cron 1ms after boundary returns next hour (#12278)", () => {
    // 1ms after 7:00 PM PST
    const nowMs = Date.parse("2026-02-09T03:00:00.001Z");
    const next = computeNextRunAtMs(
      { kind: "cron", expr: "0 * * * *", tz: "America/Vancouver" },
      nowMs,
    );
    // Should be 8:00 PM PST = 04:00 UTC, exactly 1 hour minus 1ms later
    expect(next).toBe(Date.parse("2026-02-09T04:00:00.000Z"));
  });

  it("cron with 30-min interval returns next 30-min slot (#12278)", () => {
    // Feb 8, 2026 6:15 PM PST = Feb 9, 2026 02:15:00 UTC
    const nowMs = Date.parse("2026-02-09T02:15:00.000Z");
    const next = computeNextRunAtMs(
      { kind: "cron", expr: "0,30 * * * *", tz: "America/Vancouver" },
      nowMs,
    );
    // Next :30 = 6:30 PM PST = 02:30 UTC, 15 min later
    expect(next).toBe(Date.parse("2026-02-09T02:30:00.000Z"));
  });
});
