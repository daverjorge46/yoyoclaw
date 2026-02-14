import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadAgentDefinitions, resolveAgentDefinition } from "./workspace.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-def-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeAgentDef(dir: string, filename: string, content: string) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), content, "utf-8");
}

const explorerDef = [
  "---",
  "name: explorer",
  'description: "Read-only codebase exploration"',
  "model: google/gemini-2.5-flash",
  "tools:",
  "  allow:",
  "    - read",
  "    - web_search",
  "---",
  "",
  "You are a code explorer.",
].join("\n");

const researcherDef = [
  "---",
  "name: researcher",
  'description: "Research and analysis"',
  "---",
  "",
  "You are a researcher.",
].join("\n");

describe("loadAgentDefinitions", () => {
  it("loads definitions from workspace agents/ directory", () => {
    const agentsDir = path.join(tmpDir, "agents");
    writeAgentDef(agentsDir, "explorer.md", explorerDef);
    writeAgentDef(agentsDir, "researcher.md", researcherDef);

    const defs = loadAgentDefinitions(tmpDir);
    expect(defs).toHaveLength(2);

    const names = defs.map((d) => d.name).toSorted();
    expect(names).toEqual(["explorer", "researcher"]);

    const explorer = defs.find((d) => d.name === "explorer");
    expect(explorer?.model).toBe("google/gemini-2.5-flash");
    expect(explorer?.tools?.allow).toEqual(["read", "web_search"]);
    expect(explorer?.source).toBe("workspace");
  });

  it("loads definitions from .agents/agents/ directory", () => {
    const dotAgentsDir = path.join(tmpDir, ".agents", "agents");
    writeAgentDef(dotAgentsDir, "explorer.md", explorerDef);

    const defs = loadAgentDefinitions(tmpDir);
    expect(defs).toHaveLength(1);
    expect(defs[0].name).toBe("explorer");
    expect(defs[0].source).toBe("workspace");
  });

  it("workspace agents/ overrides .agents/agents/", () => {
    const dotAgentsDir = path.join(tmpDir, ".agents", "agents");
    const agentsDir = path.join(tmpDir, "agents");

    const overrideDef = [
      "---",
      "name: explorer",
      'description: "Overridden explorer"',
      "model: openai/gpt-4o",
      "---",
      "",
      "Custom explorer.",
    ].join("\n");

    writeAgentDef(dotAgentsDir, "explorer.md", explorerDef);
    writeAgentDef(agentsDir, "explorer.md", overrideDef);

    const defs = loadAgentDefinitions(tmpDir);
    expect(defs).toHaveLength(1);
    expect(defs[0].description).toBe("Overridden explorer");
    expect(defs[0].model).toBe("openai/gpt-4o");
  });

  it("bundled definitions are overridden by workspace", () => {
    const bundledDir = path.join(tmpDir, "bundled");
    const agentsDir = path.join(tmpDir, "workspace", "agents");

    writeAgentDef(bundledDir, "explorer.md", explorerDef);

    const overrideDef = [
      "---",
      "name: explorer",
      'description: "Workspace override"',
      "---",
      "",
      "Custom.",
    ].join("\n");
    writeAgentDef(agentsDir, "explorer.md", overrideDef);

    const defs = loadAgentDefinitions(path.join(tmpDir, "workspace"), {
      bundledDir,
    });
    expect(defs).toHaveLength(1);
    expect(defs[0].description).toBe("Workspace override");
    expect(defs[0].source).toBe("workspace");
  });

  it("returns empty array for non-existent directory", () => {
    const defs = loadAgentDefinitions(path.join(tmpDir, "nonexistent"));
    expect(defs).toEqual([]);
  });

  it("ignores non-markdown files", () => {
    const agentsDir = path.join(tmpDir, "agents");
    writeAgentDef(agentsDir, "explorer.md", explorerDef);
    fs.writeFileSync(path.join(agentsDir, "readme.txt"), "Not a definition", "utf-8");
    fs.writeFileSync(path.join(agentsDir, "config.yaml"), "key: value", "utf-8");

    const defs = loadAgentDefinitions(tmpDir);
    expect(defs).toHaveLength(1);
  });

  it("ignores directories inside agents/", () => {
    const agentsDir = path.join(tmpDir, "agents");
    writeAgentDef(agentsDir, "explorer.md", explorerDef);
    fs.mkdirSync(path.join(agentsDir, "subdir"), { recursive: true });

    const defs = loadAgentDefinitions(tmpDir);
    expect(defs).toHaveLength(1);
  });
});

describe("resolveAgentDefinition", () => {
  it("resolves a definition by name (case-insensitive)", () => {
    const agentsDir = path.join(tmpDir, "agents");
    writeAgentDef(agentsDir, "explorer.md", explorerDef);

    const def = resolveAgentDefinition(tmpDir, "Explorer");
    expect(def?.name).toBe("explorer");
  });

  it("returns undefined for unknown definition", () => {
    const agentsDir = path.join(tmpDir, "agents");
    writeAgentDef(agentsDir, "explorer.md", explorerDef);

    const def = resolveAgentDefinition(tmpDir, "unknown");
    expect(def).toBeUndefined();
  });
});
