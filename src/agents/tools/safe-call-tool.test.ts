import { describe, expect, it } from "vitest";
import type { AnyAgentTool } from "./common.js";
import { createSafeCallTool } from "./safe-call-tool.js";

function createStubTool(payload: unknown): AnyAgentTool {
  return {
    label: "Stub",
    name: "stub",
    description: "stub tool",
    parameters: {},
    execute: async () => ({
      content: [{ type: "text", text: JSON.stringify(payload) }],
      details: payload,
    }),
  };
}

describe("safe_call tool", () => {
  it("applies fields and array pagination", async () => {
    const stub = createStubTool([
      { id: 1, name: "one" },
      { id: 2, name: "two" },
      { id: 3, name: "three" },
    ]);
    const tool = createSafeCallTool({
      resolveTool: (name) => (name === "stub" ? stub : undefined),
    });

    const result = await tool.execute("call-1", {
      tool: "stub",
      params: {},
      fields: ["id"],
      offset: 1,
      limit: 1,
    });

    const details = result.details as {
      totalItems: number;
      hasMore: boolean;
      nextOffset?: number;
      output: string;
      fields: string[];
    };

    expect(details.totalItems).toBe(3);
    expect(details.hasMore).toBe(true);
    expect(details.nextOffset).toBe(2);
    expect(details.fields).toEqual(["id"]);
    expect(details.output).toContain('"id": 2');
    expect(details.output).not.toContain('"name"');
  });

  it("paginates non-array payloads by line", async () => {
    const stub = createStubTool({ a: 1, b: 2, c: 3 });
    const tool = createSafeCallTool({
      resolveTool: (name) => (name === "stub" ? stub : undefined),
    });

    const result = await tool.execute("call-2", {
      tool: "stub",
      params: {},
      offset: 1,
      limit: 2,
    });

    const details = result.details as {
      mode: string;
      totalItems: number;
      hasMore: boolean;
      nextOffset?: number;
      output: string;
    };

    expect(details.mode).toBe("lines");
    expect(details.totalItems).toBeGreaterThan(2);
    expect(details.hasMore).toBe(true);
    expect(details.nextOffset).toBe(3);
    expect(details.output).toContain('"a": 1');
    expect(details.output).toContain('"b": 2');
    expect(details.output).not.toContain('"c": 3');
  });

  it("truncates oversized output with head and tail", async () => {
    const stub = createStubTool(`HEAD-${"x".repeat(120)}-TAIL`);
    const tool = createSafeCallTool({
      resolveTool: (name) => (name === "stub" ? stub : undefined),
    });

    const result = await tool.execute("call-3", {
      tool: "stub",
      params: {},
      maxChars: 80,
    });

    const details = result.details as {
      truncated: boolean;
      output: string;
    };

    expect(details.truncated).toBe(true);
    expect(details.output).toContain("HEAD-");
    expect(details.output).toContain("-TAIL");
    expect(details.output).toContain("用 offset 翻页查看更多");
    expect(details.output.length).toBeLessThanOrEqual(80);
  });

  it("rejects unknown tools and self wrapping", async () => {
    const stub = createStubTool({ ok: true });
    const tool = createSafeCallTool({
      resolveTool: (name) => (name === "stub" ? stub : undefined),
    });

    await expect(tool.execute("call-4", { tool: "missing", params: {} })).rejects.toThrow(
      "Unknown tool: missing",
    );
    await expect(tool.execute("call-5", { tool: "safe_call", params: {} })).rejects.toThrow(
      "safe_call cannot wrap itself",
    );
  });
});
