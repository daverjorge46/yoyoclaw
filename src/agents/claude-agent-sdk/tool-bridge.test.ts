import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type { AgentToolResult } from "@mariozechner/pi-agent-core";

// Mock dependencies
vi.mock("../../logging/subsystem.js", () => ({
  createSubsystemLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("../tool-policy.js", () => ({
  normalizeToolName: vi.fn((name: string) => name.toLowerCase().replace(/-/g, "_")),
}));

import {
  extractJsonSchema,
  convertToolResult,
  wrapToolHandler,
  mcpToolName,
  buildMcpAllowedTools,
  bridgeMoltbotToolsSync,
  resetMcpServerCache,
} from "./tool-bridge.js";
import type { AnyAgentTool } from "../tools/common.js";

describe("tool-bridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMcpServerCache();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("extractJsonSchema", () => {
    it("extracts JSON Schema from TypeBox schema", () => {
      const tool = {
        name: "test_tool",
        parameters: {
          type: "object",
          properties: {
            input: { type: "string" },
          },
          required: ["input"],
        },
      } as unknown as AnyAgentTool;

      const schema = extractJsonSchema(tool);

      expect(schema).toEqual({
        type: "object",
        properties: {
          input: { type: "string" },
        },
        required: ["input"],
      });
    });

    it("returns empty object schema when no parameters defined", () => {
      const tool = {
        name: "no_params_tool",
        parameters: undefined,
      } as unknown as AnyAgentTool;

      const schema = extractJsonSchema(tool);

      expect(schema).toEqual({ type: "object", properties: {} });
    });

    it("returns empty object schema for null parameters", () => {
      const tool = {
        name: "null_params_tool",
        parameters: null,
      } as unknown as AnyAgentTool;

      const schema = extractJsonSchema(tool);

      expect(schema).toEqual({ type: "object", properties: {} });
    });

    it("strips non-serializable properties from schema", () => {
      const symbolKey = Symbol("internal");
      const tool = {
        name: "symbol_tool",
        parameters: {
          type: "object",
          [symbolKey]: "should be stripped",
          properties: {},
        },
      } as unknown as AnyAgentTool;

      const schema = extractJsonSchema(tool);

      expect(schema).toEqual({ type: "object", properties: {} });
      expect(Object.getOwnPropertySymbols(schema)).toHaveLength(0);
    });
  });

  describe("convertToolResult", () => {
    it("converts text content blocks", () => {
      const result: AgentToolResult<unknown> = {
        content: [{ type: "text", text: "Hello world" }],
      };

      const mcpResult = convertToolResult(result);

      expect(mcpResult.content).toEqual([{ type: "text", text: "Hello world" }]);
      expect(mcpResult.isError).toBeUndefined();
    });

    it("converts image content blocks", () => {
      const result: AgentToolResult<unknown> = {
        content: [{ type: "image", data: "base64data", mimeType: "image/png" }],
      };

      const mcpResult = convertToolResult(result);

      expect(mcpResult.content).toEqual([
        { type: "image", data: "base64data", mimeType: "image/png" },
      ]);
    });

    it("converts tool_error blocks with isError flag", () => {
      const result: AgentToolResult<unknown> = {
        content: [{ type: "tool_error", error: "Something went wrong" }],
      };

      const mcpResult = convertToolResult(result);

      expect(mcpResult.content).toEqual([{ type: "text", text: "Something went wrong" }]);
      expect(mcpResult.isError).toBe(true);
    });

    it("converts blocks with error field to isError", () => {
      const result: AgentToolResult<unknown> = {
        content: [{ type: "custom", error: "Custom error message" }],
      };

      const mcpResult = convertToolResult(result);

      expect(mcpResult.isError).toBe(true);
      expect(mcpResult.content[0]).toEqual({ type: "text", text: "Custom error message" });
    });

    it("returns (no output) for empty content", () => {
      const result: AgentToolResult<unknown> = {
        content: [],
      };

      const mcpResult = convertToolResult(result);

      expect(mcpResult.content).toEqual([{ type: "text", text: "(no output)" }]);
    });

    it("serializes details as tool-details text block", () => {
      const result: AgentToolResult<unknown> = {
        content: [{ type: "text", text: "Output" }],
        details: { key: "value", count: 42 },
      };

      const mcpResult = convertToolResult(result);

      expect(mcpResult.content.length).toBe(2);
      expect(mcpResult.content[1]).toMatchObject({
        type: "text",
        text: expect.stringContaining("<tool-details>"),
      });
      expect(mcpResult.content[1]).toMatchObject({
        text: expect.stringContaining('"key": "value"'),
      });
    });

    it("handles null details gracefully", () => {
      const result: AgentToolResult<unknown> = {
        content: [{ type: "text", text: "Output" }],
        details: null,
      };

      const mcpResult = convertToolResult(result);

      // Should not add a details block for null
      expect(mcpResult.content.length).toBe(1);
    });

    it("handles multiple content blocks", () => {
      const result: AgentToolResult<unknown> = {
        content: [
          { type: "text", text: "Line 1" },
          { type: "text", text: "Line 2" },
          { type: "image", data: "abc", mimeType: "image/jpeg" },
        ],
      };

      const mcpResult = convertToolResult(result);

      expect(mcpResult.content.length).toBe(3);
    });
  });

  describe("wrapToolHandler", () => {
    it("executes tool and converts result", async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "Tool output" }],
      });

      const tool = {
        name: "test-tool",
        execute: mockExecute,
      } as unknown as AnyAgentTool;

      const handler = wrapToolHandler(tool);
      const result = await handler({ input: "test" });

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining("mcp-bridge-test_tool"),
        { input: "test" },
        undefined,
        undefined,
      );
      expect(result.content).toEqual([{ type: "text", text: "Tool output" }]);
    });

    it("passes abort signal to tool execute", async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "Done" }],
      });

      const tool = {
        name: "abort-aware-tool",
        execute: mockExecute,
      } as unknown as AnyAgentTool;

      const controller = new AbortController();
      const handler = wrapToolHandler(tool, controller.signal);
      await handler({});

      expect(mockExecute).toHaveBeenCalledWith(
        expect.any(String),
        {},
        controller.signal,
        undefined,
      );
    });

    it("handles tool execution errors gracefully", async () => {
      const mockExecute = vi.fn().mockRejectedValue(new Error("Tool crashed"));

      const tool = {
        name: "crashing-tool",
        execute: mockExecute,
      } as unknown as AnyAgentTool;

      const handler = wrapToolHandler(tool);
      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0]).toMatchObject({
        type: "text",
        text: expect.stringContaining("Tool error"),
      });
    });

    it("returns abort message for AbortError", async () => {
      const abortError = new Error("Aborted");
      abortError.name = "AbortError";
      const mockExecute = vi.fn().mockRejectedValue(abortError);

      const tool = {
        name: "abortable-tool",
        execute: mockExecute,
      } as unknown as AnyAgentTool;

      const handler = wrapToolHandler(tool);
      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0]).toMatchObject({
        type: "text",
        text: expect.stringContaining("was aborted"),
      });
    });

    it("calls onToolUpdate callback with update data", async () => {
      const mockExecute = vi.fn().mockImplementation(async (_id, _args, _signal, onUpdate) => {
        onUpdate?.({ progress: 50 });
        return { content: [{ type: "text", text: "Done" }] };
      });

      const tool = {
        name: "updating-tool",
        execute: mockExecute,
      } as unknown as AnyAgentTool;

      const onToolUpdate = vi.fn();
      const handler = wrapToolHandler(tool, undefined, onToolUpdate);
      await handler({});

      expect(onToolUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          toolName: "updating_tool",
          update: { progress: 50 },
        }),
      );
    });

    it("does not break execution when onToolUpdate callback throws", async () => {
      const mockExecute = vi.fn().mockImplementation(async (_id, _args, _signal, onUpdate) => {
        onUpdate?.({ progress: 100 });
        return { content: [{ type: "text", text: "Success" }] };
      });

      const tool = {
        name: "callback-error-tool",
        execute: mockExecute,
      } as unknown as AnyAgentTool;

      const onToolUpdate = vi.fn().mockRejectedValue(new Error("Callback failed"));
      const handler = wrapToolHandler(tool, undefined, onToolUpdate);

      // Should not throw even if callback fails
      const result = await handler({});

      expect(result.content[0]).toMatchObject({
        type: "text",
        text: "Success",
      });
    });

    it("generates unique tool call IDs for each invocation", async () => {
      const toolCallIds: string[] = [];
      const mockExecute = vi.fn().mockImplementation(async (id) => {
        toolCallIds.push(id);
        return { content: [{ type: "text", text: "Done" }] };
      });

      const tool = {
        name: "unique-id-tool",
        execute: mockExecute,
      } as unknown as AnyAgentTool;

      const handler = wrapToolHandler(tool);
      await handler({});
      await handler({});

      expect(toolCallIds[0]).not.toBe(toolCallIds[1]);
      expect(toolCallIds[0]).toContain("mcp-bridge-unique_id_tool");
      expect(toolCallIds[1]).toContain("mcp-bridge-unique_id_tool");
    });
  });

  describe("mcpToolName", () => {
    it("formats tool name with server prefix", () => {
      expect(mcpToolName("moltbot", "bash")).toBe("mcp__moltbot__bash");
    });

    it("handles multi-part tool names", () => {
      expect(mcpToolName("my-server", "my_tool_name")).toBe("mcp__my-server__my_tool_name");
    });
  });

  describe("buildMcpAllowedTools", () => {
    it("builds allowed tools list from tool array", () => {
      const tools = [{ name: "tool_a" }, { name: "tool_b" }] as AnyAgentTool[];

      const allowed = buildMcpAllowedTools("moltbot", tools);

      expect(allowed).toEqual(["mcp__moltbot__tool_a", "mcp__moltbot__tool_b"]);
    });

    it("returns empty array for empty tools list", () => {
      const allowed = buildMcpAllowedTools("moltbot", []);

      expect(allowed).toEqual([]);
    });
  });

  describe("bridgeMoltbotToolsSync", () => {
    // Helper to create a class-like McpServer mock (required because implementation uses `new`)
    function createMockMcpServerClass(toolFn: ReturnType<typeof vi.fn>) {
      return class MockMcpServer {
        tool = toolFn;
        constructor(_opts: { name: string; version: string }) {
          // Constructor receives options
        }
      };
    }

    it("registers tools with MCP server", () => {
      const registeredTools: string[] = [];
      const toolFn = vi.fn((name: string) => {
        registeredTools.push(name);
      });
      const MockMcpServer = createMockMcpServerClass(toolFn);

      const tools = [
        {
          name: "tool_one",
          description: "First tool",
          parameters: { type: "object", properties: {} },
          execute: vi.fn(),
        },
        {
          name: "tool_two",
          description: "Second tool",
          parameters: { type: "object", properties: {} },
          execute: vi.fn(),
        },
      ] as unknown as AnyAgentTool[];

      const result = bridgeMoltbotToolsSync({
        name: "test-server",
        tools,
        McpServer: MockMcpServer as any,
      });

      expect(result.toolCount).toBe(2);
      expect(result.registeredTools).toEqual(["tool_one", "tool_two"]);
      expect(result.skippedTools).toEqual([]);
    });

    it("skips tools with empty names", () => {
      const MockMcpServer = createMockMcpServerClass(vi.fn());

      const tools = [
        { name: "", execute: vi.fn() },
        { name: "   ", execute: vi.fn() },
        { name: "valid_tool", execute: vi.fn() },
      ] as unknown as AnyAgentTool[];

      const result = bridgeMoltbotToolsSync({
        name: "test-server",
        tools,
        McpServer: MockMcpServer as any,
      });

      expect(result.toolCount).toBe(1);
      expect(result.registeredTools).toEqual(["valid_tool"]);
      expect(result.skippedTools).toContain("(unnamed)");
    });

    it("returns correct server config structure", () => {
      const MockMcpServer = createMockMcpServerClass(vi.fn());

      const result = bridgeMoltbotToolsSync({
        name: "my-server",
        tools: [],
        McpServer: MockMcpServer as any,
      });

      expect(result.serverConfig.type).toBe("sdk");
      expect(result.serverConfig.name).toBe("my-server");
      expect(result.serverConfig.instance).toBeInstanceOf(MockMcpServer);
    });

    it("handles tool registration errors gracefully", () => {
      const toolFn = vi.fn((name: string) => {
        if (name === "bad_tool") throw new Error("Registration failed");
      });
      const MockMcpServer = createMockMcpServerClass(toolFn);

      const tools = [
        { name: "good_tool", execute: vi.fn() },
        { name: "bad_tool", execute: vi.fn() },
      ] as unknown as AnyAgentTool[];

      const result = bridgeMoltbotToolsSync({
        name: "test-server",
        tools,
        McpServer: MockMcpServer as any,
      });

      expect(result.registeredTools).toEqual(["good_tool"]);
      expect(result.skippedTools).toContain("bad_tool");
    });
  });
});
