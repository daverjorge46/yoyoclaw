import { describe, expect, it, vi } from "vitest";

const { watchMock } = vi.hoisted(() => ({
  watchMock: vi.fn(() => ({
    on: vi.fn(),
    close: vi.fn(async () => undefined),
  })),
}));

vi.mock("chokidar", () => {
  return {
    default: { watch: watchMock },
  };
});

describe("skills watcher ignore patterns", () => {
  describe("resolveWatchIgnoredPatterns", () => {
    it("returns defaults when no custom patterns provided", async () => {
      const { DEFAULT_SKILLS_WATCH_IGNORED, resolveWatchIgnoredPatterns } =
        await import("./refresh.js");
      const patterns = resolveWatchIgnoredPatterns(undefined);
      expect(patterns).toEqual(DEFAULT_SKILLS_WATCH_IGNORED);
    });

    it("returns defaults when custom patterns is empty array", async () => {
      const { DEFAULT_SKILLS_WATCH_IGNORED, resolveWatchIgnoredPatterns } =
        await import("./refresh.js");
      const patterns = resolveWatchIgnoredPatterns([]);
      expect(patterns).toEqual(DEFAULT_SKILLS_WATCH_IGNORED);
    });

    it("merges custom patterns with defaults", async () => {
      const { DEFAULT_SKILLS_WATCH_IGNORED, resolveWatchIgnoredPatterns } =
        await import("./refresh.js");
      const customPatterns = ["/\\.env$/", "/\\.secret$/"];
      const patterns = resolveWatchIgnoredPatterns(customPatterns);

      // Should include all default patterns
      expect(patterns.length).toBeGreaterThan(DEFAULT_SKILLS_WATCH_IGNORED.length);

      // Should include custom patterns (converted to RegExp)
      const patternStrings = patterns.map((p) => p.toString());
      expect(patternStrings).toContain("/\\.env$/");
      expect(patternStrings).toContain("/\\.secret$/");
    });

    it("handles invalid regex patterns gracefully", async () => {
      const { DEFAULT_SKILLS_WATCH_IGNORED, resolveWatchIgnoredPatterns } =
        await import("./refresh.js");
      // Suppress the log warning during test
      vi.spyOn(console, "warn").mockImplementation(() => {});

      const customPatterns = ["valid-pattern", "[invalid-regex"];
      const patterns = resolveWatchIgnoredPatterns(customPatterns);

      // Should still include defaults
      expect(patterns.length).toBeGreaterThanOrEqual(DEFAULT_SKILLS_WATCH_IGNORED.length);

      // Valid pattern should be included
      const patternStrings = patterns.map((p) => p.toString());
      expect(patternStrings.some((p) => p.includes("valid-pattern"))).toBe(true);

      vi.restoreAllMocks();
    });

    it("filters out empty and whitespace-only patterns", async () => {
      const { DEFAULT_SKILLS_WATCH_IGNORED, resolveWatchIgnoredPatterns } =
        await import("./refresh.js");
      const customPatterns = ["valid-pattern", "", "  ", "\t"];
      const patterns = resolveWatchIgnoredPatterns(customPatterns);

      // Should have defaults + 1 valid custom pattern
      expect(patterns.length).toBe(DEFAULT_SKILLS_WATCH_IGNORED.length + 1);
    });

    it("parses regex patterns with flags", async () => {
      const { DEFAULT_SKILLS_WATCH_IGNORED, resolveWatchIgnoredPatterns } =
        await import("./refresh.js");
      const customPatterns = ["/test/i", "/another/gi"];
      const patterns = resolveWatchIgnoredPatterns(customPatterns);

      // Should include custom patterns with flags
      expect(patterns.length).toBe(DEFAULT_SKILLS_WATCH_IGNORED.length + 2);

      // Verify the patterns work correctly
      const testPattern = patterns.find((p) => p.source === "test");
      expect(testPattern).toBeDefined();
      expect(testPattern?.flags).toBe("i");

      const anotherPattern = patterns.find((p) => p.source === "another");
      expect(anotherPattern).toBeDefined();
      expect(anotherPattern?.flags).toBe("gi");
    });

    it("handles non-string values gracefully", async () => {
      const { DEFAULT_SKILLS_WATCH_IGNORED, resolveWatchIgnoredPatterns } =
        await import("./refresh.js");
      // @ts-expect-error Testing invalid input
      const patterns = resolveWatchIgnoredPatterns([123, null, undefined, "valid"]);

      // Should have defaults + 1 valid pattern
      expect(patterns.length).toBe(DEFAULT_SKILLS_WATCH_IGNORED.length + 1);
    });
  });
});

describe("ensureSkillsWatcher", () => {
  it("ignores node_modules, dist, .git, and Python venvs by default", async () => {
    const mod = await import("./refresh.js");
    mod.ensureSkillsWatcher({ workspaceDir: "/tmp/workspace" });

    expect(watchMock).toHaveBeenCalledTimes(1);
    const opts = watchMock.mock.calls[0]?.[1] as { ignored?: unknown };

    expect(opts.ignored).toEqual(mod.DEFAULT_SKILLS_WATCH_IGNORED);
    const ignored = mod.DEFAULT_SKILLS_WATCH_IGNORED;

    // Node/JS paths
    expect(ignored.some((re) => re.test("/tmp/workspace/skills/node_modules/pkg/index.js"))).toBe(
      true,
    );
    expect(ignored.some((re) => re.test("/tmp/workspace/skills/dist/index.js"))).toBe(true);
    expect(ignored.some((re) => re.test("/tmp/workspace/skills/.git/config"))).toBe(true);

    // Python virtual environments and caches
    expect(ignored.some((re) => re.test("/tmp/workspace/skills/scripts/.venv/bin/python"))).toBe(
      true,
    );
    expect(ignored.some((re) => re.test("/tmp/workspace/skills/venv/lib/python3.10/site.py"))).toBe(
      true,
    );
    expect(ignored.some((re) => re.test("/tmp/workspace/skills/__pycache__/module.pyc"))).toBe(
      true,
    );
    expect(ignored.some((re) => re.test("/tmp/workspace/skills/.mypy_cache/3.10/foo.json"))).toBe(
      true,
    );
    expect(ignored.some((re) => re.test("/tmp/workspace/skills/.pytest_cache/v/cache"))).toBe(true);

    // Build artifacts and caches
    expect(ignored.some((re) => re.test("/tmp/workspace/skills/build/output.js"))).toBe(true);
    expect(ignored.some((re) => re.test("/tmp/workspace/skills/.cache/data.json"))).toBe(true);

    // Should NOT ignore normal skill files
    expect(ignored.some((re) => re.test("/tmp/.hidden/skills/index.md"))).toBe(false);
    expect(ignored.some((re) => re.test("/tmp/workspace/skills/my-skill/SKILL.md"))).toBe(false);
  });
});
