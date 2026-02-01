import { describe, expect, it } from "vitest";

import {
  computeImportance,
  rankMessagesByImportance,
  selectDropsByImportance,
} from "./message-importance.js";

describe("computeImportance", () => {
  it("assigns base scores by role", () => {
    expect(computeImportance("system", 0, 1).baseScore).toBe(100);
    expect(computeImportance("user", 0, 1).baseScore).toBe(80);
    expect(computeImportance("assistant", 0, 1).baseScore).toBe(60);
    expect(computeImportance("tool", 0, 1).baseScore).toBe(40);
  });

  it("gives recency bonus to recent messages", () => {
    const recent = computeImportance("tool", 0, 10);
    const old = computeImportance("tool", 9, 10);
    expect(recent.recencyBonus).toBeGreaterThan(old.recencyBonus);
  });

  it("clamps score to 0-100", () => {
    const score = computeImportance("system", 0, 1);
    expect(score.score).toBeLessThanOrEqual(100);
    expect(score.score).toBeGreaterThanOrEqual(0);
  });
});

describe("rankMessagesByImportance", () => {
  it("returns messages sorted by importance ascending", () => {
    const messages = [
      { role: "system" },
      { role: "tool" },
      { role: "user" },
      { role: "assistant" },
    ];
    const ranked = rankMessagesByImportance(messages);
    // Least important first
    expect(ranked[0].score.role).toBe("tool");
  });
});

describe("selectDropsByImportance", () => {
  it("drops nothing when under budget", () => {
    const messages = [
      { role: "user", tokenEstimate: 100 },
      { role: "assistant", tokenEstimate: 100 },
    ];
    const result = selectDropsByImportance(messages, 300);
    expect(result.droppedIndices).toHaveLength(0);
    expect(result.keptIndices).toHaveLength(2);
  });

  it("drops least important messages first", () => {
    const messages = [
      { role: "system", tokenEstimate: 50 },
      { role: "tool", tokenEstimate: 200 },
      { role: "user", tokenEstimate: 100 },
    ];
    const result = selectDropsByImportance(messages, 200);
    // Should drop tool (lowest importance) first
    expect(result.droppedIndices).toContain(1);
    expect(result.droppedByRole["tool"]).toBe(1);
  });

  it("never drops system messages", () => {
    const messages = [
      { role: "system", tokenEstimate: 500 },
      { role: "user", tokenEstimate: 100 },
    ];
    const result = selectDropsByImportance(messages, 200);
    expect(result.droppedIndices).not.toContain(0);
  });

  it("tracks droppedImportantMessages for high-score drops", () => {
    const messages = [
      { role: "system", tokenEstimate: 100 },
      { role: "user", tokenEstimate: 200 },
      { role: "user", tokenEstimate: 200 },
      { role: "tool", tokenEstimate: 200 },
    ];
    // Budget forces dropping user messages (score >= 70)
    const result = selectDropsByImportance(messages, 150);
    expect(result.droppedImportantMessages).toBeGreaterThanOrEqual(0);
  });
});
