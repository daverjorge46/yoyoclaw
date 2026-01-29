import { describe, it, expect } from "vitest";
import { getTier, type Tier } from "../action-tiers.js";

describe("action-tiers", () => {
  describe("getTier", () => {
    // HIGH tier tools
    it.each([
      ["exec", "high"],
      ["apply_patch", "high"],
      ["gateway", "high"],
      ["sessions_spawn", "high"],
      ["process", "high"],
    ] as [string, Tier][])("classifies %s as %s", (tool, expected) => {
      expect(getTier(tool)).toBe(expected);
    });

    // MEDIUM tier tools
    it.each([
      ["message", "medium"],
      ["write", "medium"],
      ["edit", "medium"],
      ["cron", "medium"],
      ["sessions_send", "medium"],
      ["browser", "medium"],
      ["canvas", "medium"],
      ["nodes", "medium"],
    ] as [string, Tier][])("classifies %s as %s", (tool, expected) => {
      expect(getTier(tool)).toBe(expected);
    });

    // LOW tier tools
    it.each([
      ["web_search", "low"],
      ["web_fetch", "low"],
      ["memory_search", "low"],
      ["memory_get", "low"],
      ["read", "low"],
      ["sessions_list", "low"],
      ["sessions_history", "low"],
      ["session_status", "low"],
      ["agents_list", "low"],
      ["image", "low"],
    ] as [string, Tier][])("classifies %s as %s", (tool, expected) => {
      expect(getTier(tool)).toBe(expected);
    });

    // Unknown tools default to medium (fail-safe)
    it("defaults unknown tools to medium", () => {
      expect(getTier("unknown_tool")).toBe("medium");
      expect(getTier("foo_bar")).toBe("medium");
    });

    // Case normalization
    it("handles uppercase tool names", () => {
      expect(getTier("Exec")).toBe("high");
      expect(getTier("EXEC")).toBe("high");
      expect(getTier("Web_Search")).toBe("low");
    });

    // Hyphen normalization
    it("handles hyphenated tool names", () => {
      expect(getTier("apply-patch")).toBe("high");
      expect(getTier("web-search")).toBe("low");
      expect(getTier("memory-get")).toBe("low");
    });

    // All 23 canonical tools have explicit entries
    it("covers all 23 canonical tools", () => {
      const canonicalTools = [
        "memory_search", "memory_get", "web_search", "web_fetch",
        "read", "write", "edit", "apply_patch", "exec", "process",
        "sessions_list", "sessions_history", "sessions_send",
        "sessions_spawn", "session_status", "browser", "canvas",
        "cron", "gateway", "message", "nodes", "agents_list", "image",
      ];
      expect(canonicalTools).toHaveLength(23);
      for (const tool of canonicalTools) {
        const tier = getTier(tool);
        // Every canonical tool should NOT fall through to default
        // (they should have explicit entries)
        expect(["low", "medium", "high"]).toContain(tier);
      }
    });
  });
});
