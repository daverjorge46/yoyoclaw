import { describe, expect, it } from "vitest";

import { checkBudget, groupCostByProviderModel } from "./budget-monitor.js";
import type { CostUsageSummary, CostUsageDailyEntry } from "./session-cost-usage.js";

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

function makeSummary(dailyCost: number): CostUsageSummary {
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  return {
    updatedAt: Date.now(),
    days: 30,
    daily: [makeDaily(today, dailyCost)],
    totals: makeDaily(today, dailyCost),
  };
}

describe("checkBudget", () => {
  it("returns no warnings when under budget", () => {
    const result = checkBudget({
      summary: makeSummary(3.0),
      budget: { daily: 10.0 },
    });
    expect(result.warnings).toHaveLength(0);
  });

  it("returns warning at 80%+", () => {
    const result = checkBudget({
      summary: makeSummary(8.5),
      budget: { daily: 10.0 },
    });
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].level).toBe("warning");
    expect(result.warnings[0].percentage).toBe(85);
  });

  it("returns exceeded at 100%+", () => {
    const result = checkBudget({
      summary: makeSummary(12.0),
      budget: { daily: 10.0 },
    });
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].level).toBe("exceeded");
  });

  it("handles empty budget config", () => {
    const result = checkBudget({
      summary: makeSummary(100),
      budget: {},
    });
    expect(result.warnings).toHaveLength(0);
  });
});

describe("groupCostByProviderModel", () => {
  it("groups entries by provider/model", () => {
    const entries = [
      { provider: "openai", model: "gpt-4.1", costTotal: 1.0, totalTokens: 1000 },
      { provider: "openai", model: "gpt-4.1", costTotal: 2.0, totalTokens: 2000 },
      { provider: "anthropic", model: "claude-4", costTotal: 5.0, totalTokens: 3000 },
    ];

    const result = groupCostByProviderModel(entries);
    expect(result).toHaveLength(2);
    // Sorted by cost descending
    expect(result[0].provider).toBe("anthropic");
    expect(result[0].totalCost).toBe(5.0);
    expect(result[1].provider).toBe("openai");
    expect(result[1].totalCost).toBe(3.0);
    expect(result[1].requestCount).toBe(2);
  });

  it("handles missing provider/model", () => {
    const entries = [{ costTotal: 1.0 }];
    const result = groupCostByProviderModel(entries);
    expect(result[0].provider).toBe("unknown");
    expect(result[0].model).toBe("unknown");
  });

  it("handles empty input", () => {
    expect(groupCostByProviderModel([])).toEqual([]);
  });
});
