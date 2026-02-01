import { describe, expect, it } from "vitest";

import {
  aggregateByPeriod,
  checkCostThresholds,
  type CostUsageDailyEntry,
  type CostUsageSummary,
} from "./session-cost-usage.js";

function makeDaily(date: string, cost: number): CostUsageDailyEntry {
  return {
    date,
    input: 1000,
    output: 500,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 1500,
    totalCost: cost,
    missingCostEntries: 0,
  };
}

describe("aggregateByPeriod", () => {
  const daily: CostUsageDailyEntry[] = [
    makeDaily("2025-01-06", 1.0), // Monday
    makeDaily("2025-01-07", 2.0), // Tuesday
    makeDaily("2025-01-13", 3.0), // Monday next week
    makeDaily("2025-02-01", 4.0), // February
  ];

  it("returns daily entries as-is", () => {
    const result = aggregateByPeriod(daily, "daily");
    expect(result).toHaveLength(4);
    expect(result[0].periodKey).toBe("2025-01-06");
  });

  it("aggregates by week", () => {
    const result = aggregateByPeriod(daily, "weekly");
    // Jan 6 and Jan 7 are same week, Jan 13 is next week, Feb 1 is another
    expect(result.length).toBeGreaterThanOrEqual(2);
    const firstWeek = result.find((r) => r.periodKey === "2025-01-06");
    expect(firstWeek?.totalCost).toBe(3.0); // 1.0 + 2.0
  });

  it("aggregates by month", () => {
    const result = aggregateByPeriod(daily, "monthly");
    const jan = result.find((r) => r.periodKey === "2025-01");
    const feb = result.find((r) => r.periodKey === "2025-02");
    expect(jan?.totalCost).toBe(6.0); // 1+2+3
    expect(feb?.totalCost).toBe(4.0);
  });

  it("handles empty input", () => {
    expect(aggregateByPeriod([], "weekly")).toEqual([]);
  });
});

describe("checkCostThresholds", () => {
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  const summary: CostUsageSummary = {
    updatedAt: Date.now(),
    days: 30,
    daily: [makeDaily(today, 8.5)],
    totals: makeDaily(today, 8.5),
  };

  it("detects daily limit exceeded", () => {
    const results = checkCostThresholds({
      summary,
      limits: { daily: 5.0 },
    });
    expect(results).toHaveLength(1);
    expect(results[0].exceeded).toBe(true);
    expect(results[0].percentage).toBeGreaterThan(100);
  });

  it("returns not exceeded when under limit", () => {
    const results = checkCostThresholds({
      summary,
      limits: { daily: 20.0 },
    });
    expect(results[0].exceeded).toBe(false);
    expect(results[0].percentage).toBeLessThan(100);
  });

  it("checks multiple periods", () => {
    const results = checkCostThresholds({
      summary,
      limits: { daily: 10, weekly: 50, monthly: 100 },
    });
    expect(results).toHaveLength(3);
  });

  it("skips undefined limits", () => {
    const results = checkCostThresholds({
      summary,
      limits: {},
    });
    expect(results).toHaveLength(0);
  });
});
