import { describe, it, expect } from "vitest";

/**
 * Helper to replicate the classification logic for testing.
 * This mirrors the classifySessionType function in status.summary.ts
 */
const classifySessionType = (key: string): string => {
  if (/:cron:[^:]+:run:/.test(key)) {
    return "cronRun";
  }
  if (/:cron:[^:]+$/.test(key)) {
    return "cronJob";
  }
  if (/^agent:[^:]+:main$/.test(key)) {
    return "main";
  }
  if (/^agent:[^:]+:[^:]+$/.test(key) && !key.includes(":cron:")) {
    return "main";
  }
  return "other";
};

describe("Session Type Classification", () => {
  describe("main sessions", () => {
    it("classifies agent:main:main as main", () => {
      expect(classifySessionType("agent:main:main")).toBe("main");
    });

    it("classifies agent:custom:direct as main", () => {
      expect(classifySessionType("agent:custom:direct")).toBe("main");
    });

    it("classifies agent:worker:session123 as main", () => {
      expect(classifySessionType("agent:worker:session123")).toBe("main");
    });
  });

  describe("cron job definitions", () => {
    it("classifies agent:main:cron:abc123 as cronJob", () => {
      expect(classifySessionType("agent:main:cron:abc123")).toBe("cronJob");
    });

    it("classifies agent:worker:cron:xyz789 as cronJob", () => {
      expect(classifySessionType("agent:worker:cron:xyz789")).toBe("cronJob");
    });
  });

  describe("cron run history", () => {
    it("classifies agent:main:cron:abc123:run:def456 as cronRun", () => {
      expect(classifySessionType("agent:main:cron:abc123:run:def456")).toBe("cronRun");
    });

    it("classifies nested cron runs as cronRun", () => {
      expect(classifySessionType("agent:main:cron:4dbb2a6a-c68c-4a8d-9a4a:run:c8d4f669")).toBe(
        "cronRun",
      );
    });
  });

  describe("other sessions", () => {
    it("classifies unknown patterns as other", () => {
      expect(classifySessionType("global")).toBe("other");
      expect(classifySessionType("unknown")).toBe("other");
    });

    it("classifies group sessions as other (handled by kind)", () => {
      expect(classifySessionType("agent:main:group:discord")).toBe("other");
    });
  });
});

describe("Session Grouping Logic", () => {
  // These will be integration tests that require full setup
  it.todo("groups sessions correctly by type");
  it.todo("collapses cron runs when count > 20");
  it.todo("preserves all sessions in uncollapsed groups");
});
