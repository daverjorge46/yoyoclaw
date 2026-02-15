import fs from "node:fs/promises";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../../../config/config.js";
import type { HookHandler } from "../../hooks.js";
import { makeTempWorkspace, writeWorkspaceFile } from "../../../test-helpers/workspace.js";
import { createHookEvent } from "../../hooks.js";
import {
  parseInferences,
  formatInferenceMarkdown,
  shouldRunExtraction,
  writeInferenceFiles,
} from "./handler.js";

// Avoid calling the embedded Pi agent in unit tests
vi.mock("../../../agents/pi-embedded.js", () => ({
  runEmbeddedPiAgent: vi.fn().mockResolvedValue({ payloads: [] }),
}));

let handler: HookHandler;

beforeAll(async () => {
  ({ default: handler } = await import("./handler.js"));
});

/**
 * Create a mock session JSONL file with various entry types.
 */
function createMockSessionContent(
  entries: Array<{ role: string; content: string } | { type: string }>,
): string {
  return entries
    .map((entry) => {
      if ("role" in entry) {
        return JSON.stringify({
          type: "message",
          message: {
            role: entry.role,
            content: entry.content,
          },
        });
      }
      return JSON.stringify(entry);
    })
    .join("\n");
}

describe("inference-extraction hook", () => {
  describe("handler", () => {
    it("skips non-command events", async () => {
      const tempDir = await makeTempWorkspace("openclaw-inference-");

      const event = createHookEvent("agent", "bootstrap", "agent:main:main", {
        workspaceDir: tempDir,
      });

      await handler(event);

      const inferencesDir = path.join(tempDir, "memory", "inferences");
      await expect(fs.access(inferencesDir)).rejects.toThrow();
    });

    it("skips commands other than new/reset", async () => {
      const tempDir = await makeTempWorkspace("openclaw-inference-");

      const event = createHookEvent("command", "help", "agent:main:main", {
        workspaceDir: tempDir,
      });

      await handler(event);

      const inferencesDir = path.join(tempDir, "memory", "inferences");
      await expect(fs.access(inferencesDir)).rejects.toThrow();
    });

    it("skips when no session file is available", async () => {
      const tempDir = await makeTempWorkspace("openclaw-inference-");

      const cfg: OpenClawConfig = {
        agents: { defaults: { workspace: tempDir } },
      };

      const event = createHookEvent("command", "new", "agent:main:main", {
        cfg,
        previousSessionEntry: {
          sessionId: "test-123",
          // No sessionFile
        },
      });

      await handler(event);

      const inferencesDir = path.join(tempDir, "memory", "inferences");
      await expect(fs.access(inferencesDir)).rejects.toThrow();
    });

    it("skips extraction in test environment (below min turns)", async () => {
      const tempDir = await makeTempWorkspace("openclaw-inference-");
      const sessionsDir = path.join(tempDir, "sessions");
      await fs.mkdir(sessionsDir, { recursive: true });

      // Create a session with only 2 messages (below default min of 5)
      const sessionContent = createMockSessionContent([
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi" },
      ]);
      const sessionFile = await writeWorkspaceFile({
        dir: sessionsDir,
        name: "test-session.jsonl",
        content: sessionContent,
      });

      const cfg: OpenClawConfig = {
        agents: { defaults: { workspace: tempDir } },
      };

      const event = createHookEvent("command", "new", "agent:main:main", {
        cfg,
        previousSessionEntry: {
          sessionId: "test-123",
          sessionFile,
        },
      });

      await handler(event);

      // No inferences should be written (test env + below threshold)
      const inferencesDir = path.join(tempDir, "memory", "inferences");
      await expect(fs.access(inferencesDir)).rejects.toThrow();
    });

    it("handles reset command the same as new", async () => {
      const event = createHookEvent("command", "reset", "agent:main:main", {
        previousSessionEntry: { sessionId: "test-123" },
      });

      // Should not throw - handler should accept reset
      await handler(event);
    });
  });

  describe("parseInferences", () => {
    it("parses valid JSON array of inferences", () => {
      const input = JSON.stringify([
        {
          domain: "communication",
          insight: "User prefers direct feedback.",
          confidence: "high",
        },
        {
          domain: "decision-making",
          insight: "User requests multiple options before committing.",
          confidence: "medium",
        },
      ]);

      const result = parseInferences(input);
      expect(result).toHaveLength(2);
      expect(result[0].domain).toBe("communication");
      expect(result[0].confidence).toBe("high");
      expect(result[1].domain).toBe("decision-making");
    });

    it("extracts JSON from surrounding text", () => {
      const input = `Here are the inferences I extracted:

[{"domain": "behavior", "insight": "Test insight.", "confidence": "low"}]

These are the patterns I noticed.`;

      const result = parseInferences(input);
      expect(result).toHaveLength(1);
      expect(result[0].domain).toBe("behavior");
    });

    it("returns empty array for no JSON", () => {
      expect(parseInferences("No inferences found.")).toEqual([]);
    });

    it("returns empty array for invalid JSON", () => {
      expect(parseInferences("[{broken json}]")).toEqual([]);
    });

    it("returns empty array for non-array JSON", () => {
      expect(parseInferences('{"domain": "test"}')).toEqual([]);
    });

    it("filters out entries with missing required fields", () => {
      const input = JSON.stringify([
        { domain: "behavior", insight: "Valid.", confidence: "high" },
        { domain: "behavior", insight: "Missing confidence" },
        { insight: "Missing domain", confidence: "low" },
        { domain: "behavior", confidence: "low" },
        "not an object",
        null,
      ]);

      const result = parseInferences(input);
      expect(result).toHaveLength(1);
      expect(result[0].insight).toBe("Valid.");
    });

    it("preserves supersedes field when present", () => {
      const input = JSON.stringify([
        {
          domain: "behavior",
          insight: "Updated insight.",
          confidence: "high",
          supersedes: "Previous understanding of communication style",
        },
      ]);

      const result = parseInferences(input);
      expect(result).toHaveLength(1);
      expect(result[0].supersedes).toBe("Previous understanding of communication style");
    });
  });

  describe("formatInferenceMarkdown", () => {
    it("formats basic inference correctly", () => {
      const timestamp = new Date("2026-01-16T14:30:00Z");
      const inference = {
        domain: "communication",
        insight: "User prefers concise explanations.",
        confidence: "high",
      };

      const result = formatInferenceMarkdown(inference, timestamp);
      expect(result).toContain("# Inference: communication - 2026-01-16");
      expect(result).toContain("**Domain**: communication");
      expect(result).toContain("**Confidence**: high");
      expect(result).toContain("**Extracted**: 2026-01-16T14:30:00.000Z");
      expect(result).toContain("User prefers concise explanations.");
    });

    it("includes supersedes field when present", () => {
      const timestamp = new Date("2026-01-16T14:30:00Z");
      const inference = {
        domain: "behavior",
        insight: "Updated observation.",
        confidence: "high",
        supersedes: "Earlier observation about workflow",
      };

      const result = formatInferenceMarkdown(inference, timestamp);
      expect(result).toContain("**Supersedes**: Earlier observation about workflow");
    });

    it("omits supersedes field when not present", () => {
      const timestamp = new Date("2026-01-16T14:30:00Z");
      const inference = {
        domain: "behavior",
        insight: "Simple observation.",
        confidence: "medium",
      };

      const result = formatInferenceMarkdown(inference, timestamp);
      expect(result).not.toContain("Supersedes");
    });
  });

  describe("shouldRunExtraction", () => {
    it("returns false in test environment", () => {
      expect(shouldRunExtraction({ messageCount: 10, minTurns: 5, isTestEnv: true })).toBe(false);
    });

    it("returns false when below minimum turns", () => {
      expect(shouldRunExtraction({ messageCount: 3, minTurns: 5, isTestEnv: false })).toBe(false);
    });

    it("returns true when at minimum turns", () => {
      expect(shouldRunExtraction({ messageCount: 5, minTurns: 5, isTestEnv: false })).toBe(true);
    });

    it("returns true when above minimum turns", () => {
      expect(shouldRunExtraction({ messageCount: 20, minTurns: 5, isTestEnv: false })).toBe(true);
    });
  });

  describe("writeInferenceFiles", () => {
    it("creates inference files in output directory", async () => {
      const tempDir = await makeTempWorkspace("openclaw-inference-write-");
      const outputDir = path.join(tempDir, "inferences");
      const timestamp = new Date("2026-01-16T14:30:00Z");

      const inferences = [
        { domain: "communication", insight: "Test insight 1.", confidence: "high" },
        { domain: "behavior", insight: "Test insight 2.", confidence: "medium" },
      ];

      const written = await writeInferenceFiles({
        inferences,
        outputDir,
        timestamp,
      });

      expect(written).toHaveLength(2);

      // Verify files exist
      const files = await fs.readdir(outputDir);
      expect(files).toHaveLength(2);

      // Verify content
      const content1 = await fs.readFile(written[0], "utf-8");
      expect(content1).toContain("communication");
      expect(content1).toContain("Test insight 1.");
    });

    it("uses domain tag prefix when provided", async () => {
      const tempDir = await makeTempWorkspace("openclaw-inference-write-");
      const outputDir = path.join(tempDir, "inferences");
      const timestamp = new Date("2026-01-16T14:30:00Z");

      const inferences = [{ domain: "behavior", insight: "Tagged insight.", confidence: "high" }];

      const written = await writeInferenceFiles({
        inferences,
        outputDir,
        timestamp,
        domainTag: "trading",
      });

      const filename = path.basename(written[0]);
      expect(filename).toMatch(/^trading-behavior-/);
    });

    it("creates unique filenames via content hash", async () => {
      const tempDir = await makeTempWorkspace("openclaw-inference-write-");
      const outputDir = path.join(tempDir, "inferences");
      const timestamp = new Date("2026-01-16T14:30:00Z");

      const inferences = [
        { domain: "behavior", insight: "Insight A.", confidence: "high" },
        { domain: "behavior", insight: "Insight B.", confidence: "high" },
      ];

      const written = await writeInferenceFiles({
        inferences,
        outputDir,
        timestamp,
      });

      // Both should have different filenames due to different content hashes
      expect(path.basename(written[0])).not.toBe(path.basename(written[1]));
    });
  });
});
