import { describe, expect, it } from "vitest";
import { parseAgentDefinition, parseAgentDefinitionFrontmatter } from "./loader.js";

describe("parseAgentDefinitionFrontmatter", () => {
  it("parses a complete frontmatter object", () => {
    const result = parseAgentDefinitionFrontmatter({
      name: "explorer",
      description: "Read-only codebase exploration",
      model: "google/gemini-2.5-flash",
      tools: {
        allow: ["read", "web_search"],
        deny: ["write", "edit"],
      },
    });
    expect(result).toEqual({
      name: "explorer",
      description: "Read-only codebase exploration",
      model: "google/gemini-2.5-flash",
      tools: {
        allow: ["read", "web_search"],
        deny: ["write", "edit"],
      },
    });
  });

  it("returns null when name is missing", () => {
    const result = parseAgentDefinitionFrontmatter({
      description: "No name agent",
    });
    expect(result).toBeNull();
  });

  it("returns null when name is empty string", () => {
    const result = parseAgentDefinitionFrontmatter({
      name: "  ",
    });
    expect(result).toBeNull();
  });

  it("handles missing optional fields", () => {
    const result = parseAgentDefinitionFrontmatter({
      name: "minimal",
    });
    expect(result).toEqual({
      name: "minimal",
      description: undefined,
      model: undefined,
      tools: undefined,
    });
  });

  it("parses comma-separated tool lists", () => {
    const result = parseAgentDefinitionFrontmatter({
      name: "test",
      tools: {
        allow: "read, write, edit",
      },
    });
    expect(result?.tools?.allow).toEqual(["read", "write", "edit"]);
  });

  it("ignores empty tools object", () => {
    const result = parseAgentDefinitionFrontmatter({
      name: "test",
      tools: {},
    });
    expect(result?.tools).toBeUndefined();
  });
});

describe("parseAgentDefinition", () => {
  it("parses a full agent definition markdown file", () => {
    const content = [
      "---",
      "name: explorer",
      'description: "Read-only codebase exploration"',
      "model: google/gemini-2.5-flash",
      "tools:",
      "  allow:",
      "    - read",
      "    - web_search",
      "  deny:",
      "    - write",
      "    - edit",
      "---",
      "",
      "You are a code explorer. Find and summarize relevant code.",
    ].join("\n");

    const result = parseAgentDefinition(content, {
      filePath: "/workspace/agents/explorer.md",
      source: "workspace",
    });

    expect(result).toEqual({
      name: "explorer",
      description: "Read-only codebase exploration",
      model: "google/gemini-2.5-flash",
      tools: {
        allow: ["read", "web_search"],
        deny: ["write", "edit"],
      },
      systemPrompt: "You are a code explorer. Find and summarize relevant code.",
      source: "workspace",
      filePath: "/workspace/agents/explorer.md",
    });
  });

  it("falls back to filename-based name when frontmatter has no name", () => {
    const content = [
      "---",
      'description: "A researcher agent"',
      "---",
      "",
      "Research things.",
    ].join("\n");

    const result = parseAgentDefinition(content, {
      filePath: "/workspace/agents/researcher.md",
      source: "workspace",
      filenameName: "researcher",
    });

    expect(result?.name).toBe("researcher");
    expect(result?.description).toBe("A researcher agent");
    expect(result?.systemPrompt).toBe("Research things.");
  });

  it("returns null for content without frontmatter", () => {
    const result = parseAgentDefinition("Just some text.", {
      filePath: "/workspace/agents/bad.md",
      source: "workspace",
    });
    expect(result).toBeNull();
  });

  it("returns null for invalid YAML frontmatter", () => {
    const content = ["---", "invalid: [unclosed", "---", "", "Body."].join("\n");
    const result = parseAgentDefinition(content, {
      filePath: "/workspace/agents/bad.md",
      source: "workspace",
    });
    expect(result).toBeNull();
  });

  it("returns null when neither name nor filenameName is provided", () => {
    const content = ["---", 'description: "No name"', "---", "", "Body."].join("\n");
    const result = parseAgentDefinition(content, {
      filePath: "/workspace/agents/test.md",
      source: "workspace",
    });
    expect(result).toBeNull();
  });

  it("handles empty body after frontmatter", () => {
    const content = ["---", "name: minimal", "---"].join("\n");
    const result = parseAgentDefinition(content, {
      filePath: "/workspace/agents/minimal.md",
      source: "workspace",
    });
    expect(result?.name).toBe("minimal");
    expect(result?.systemPrompt).toBeUndefined();
  });

  it("preserves multiline system prompt", () => {
    const content = [
      "---",
      "name: writer",
      "---",
      "",
      "You are a writer.",
      "",
      "Write clear and concise content.",
      "",
      "Follow the style guide.",
    ].join("\n");

    const result = parseAgentDefinition(content, {
      filePath: "/workspace/agents/writer.md",
      source: "workspace",
    });

    expect(result?.systemPrompt).toContain("You are a writer.");
    expect(result?.systemPrompt).toContain("Follow the style guide.");
  });
});
