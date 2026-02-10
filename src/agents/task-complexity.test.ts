import { describe, expect, it } from "vitest";

import {
  estimateTaskComplexity,
  analyzeComplexitySignals,
  resolveModelForComplexity,
} from "./task-complexity.js";

describe("estimateTaskComplexity", () => {
  it("classifies short simple messages as simple", () => {
    expect(estimateTaskComplexity("Fix the typo in README")).toBe("simple");
    expect(estimateTaskComplexity("What time is it?")).toBe("simple");
  });

  it("classifies messages with analysis keywords as medium or complex", () => {
    expect(estimateTaskComplexity("Analyze the performance of this function")).toBe("medium");
    expect(estimateTaskComplexity("Compare these two approaches and evaluate trade-offs")).toBe(
      "medium",
    );
  });

  it("classifies long multi-step technical requests as complex", () => {
    const msg = `Step by step, refactor the microservice architecture:
1) First analyze the current distributed system
2) Then evaluate the scaling bottlenecks
3) Propose a migration plan for the security vulnerabilities
4) Implement the optimization algorithm

\`\`\`typescript
class ServiceMesh {
  // existing code
}
\`\`\`

\`\`\`typescript
class LoadBalancer {
  // existing code
}
\`\`\`

\`\`\`typescript
class CircuitBreaker {
  // existing code
}
\`\`\`

Please review the performance implications and security audit results.`;
    expect(estimateTaskComplexity(msg)).toBe("complex");
  });

  it("detects code blocks", () => {
    const signals = analyzeComplexitySignals("Here:\n```js\nconsole.log('hi')\n```");
    expect(signals.codeBlockCount).toBe(1);
  });

  it("detects multi-step patterns", () => {
    const signals = analyzeComplexitySignals("First do X, then do Y");
    expect(signals.hasMultiStep).toBe(true);
  });

  it("detects technical keywords", () => {
    const signals = analyzeComplexitySignals("Refactor the microservice for better scaling");
    expect(signals.hasTechnicalKeywords).toBe(true);
  });
});

describe("resolveModelForComplexity", () => {
  it("returns null when disabled", () => {
    expect(resolveModelForComplexity("simple", { enabled: false })).toBeNull();
    expect(resolveModelForComplexity("simple")).toBeNull();
  });

  it("returns simple tier model for simple tasks", () => {
    const config = {
      enabled: true,
      modelTiers: { simple: "openai/gpt-4.1-mini", complex: "anthropic/claude-opus-4-5" },
    };
    expect(resolveModelForComplexity("simple", config)).toBe("openai/gpt-4.1-mini");
  });

  it("returns complex tier model for complex tasks", () => {
    const config = {
      enabled: true,
      modelTiers: { simple: "openai/gpt-4.1-mini", complex: "anthropic/claude-opus-4-5" },
    };
    expect(resolveModelForComplexity("complex", config)).toBe("anthropic/claude-opus-4-5");
  });

  it("returns null for medium (uses default model)", () => {
    const config = {
      enabled: true,
      modelTiers: { simple: "openai/gpt-4.1-mini", complex: "anthropic/claude-opus-4-5" },
    };
    expect(resolveModelForComplexity("medium", config)).toBeNull();
  });
});
