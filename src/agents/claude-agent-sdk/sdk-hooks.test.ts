import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { buildMoltbotSdkHooks } from "./sdk-hooks.js";

describe("sdk-hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("buildMoltbotSdkHooks", () => {
    it("returns hooks config with all expected hook types", () => {
      const emitEvent = vi.fn();
      const hooks = buildMoltbotSdkHooks({
        mcpServerName: "moltbot",
        emitEvent,
      });

      expect(hooks.PreToolUse).toBeDefined();
      expect(hooks.PostToolUse).toBeDefined();
      expect(hooks.PostToolUseFailure).toBeDefined();
      expect(hooks.Notification).toBeDefined();
      expect(hooks.SessionStart).toBeDefined();
      expect(hooks.SessionEnd).toBeDefined();
      expect(hooks.UserPromptSubmit).toBeDefined();
      expect(hooks.Stop).toBeDefined();
      expect(hooks.SubagentStart).toBeDefined();
      expect(hooks.SubagentStop).toBeDefined();
      expect(hooks.PreCompact).toBeDefined();
    });

    it("returns hooks with correct structure (array of matchers with hooks)", () => {
      const emitEvent = vi.fn();
      const hooks = buildMoltbotSdkHooks({
        mcpServerName: "moltbot",
        emitEvent,
      });

      // Each hook type should be an array of callback matchers
      expect(Array.isArray(hooks.PreToolUse)).toBe(true);
      expect(hooks.PreToolUse![0]).toHaveProperty("hooks");
      expect(Array.isArray(hooks.PreToolUse![0].hooks)).toBe(true);
      expect(typeof hooks.PreToolUse![0].hooks[0]).toBe("function");
    });

    describe("PreToolUse hook (toolStartHook)", () => {
      it("emits hook event with correct data", async () => {
        const emitEvent = vi.fn();
        const hooks = buildMoltbotSdkHooks({
          mcpServerName: "moltbot",
          emitEvent,
        });

        const toolStartHook = hooks.PreToolUse![0].hooks[0];
        await toolStartHook(
          { tool_name: "mcp__moltbot__bash", tool_input: { command: "ls" } },
          "tool-use-123",
          {},
        );

        expect(emitEvent).toHaveBeenCalledWith(
          "hook",
          expect.objectContaining({
            hookEventName: "PreToolUse",
            toolUseId: "tool-use-123",
          }),
        );
      });

      it("emits tool event with normalized name", async () => {
        const emitEvent = vi.fn();
        const hooks = buildMoltbotSdkHooks({
          mcpServerName: "moltbot",
          emitEvent,
        });

        const toolStartHook = hooks.PreToolUse![0].hooks[0];
        await toolStartHook(
          { tool_name: "mcp__moltbot__bash_exec", tool_input: { cmd: "pwd" } },
          "use-456",
          {},
        );

        // Should emit a tool event with phase: start
        const toolEvent = emitEvent.mock.calls.find((c) => c[0] === "tool");
        expect(toolEvent).toBeDefined();
        expect(toolEvent![1]).toMatchObject({
          phase: "start",
          name: expect.any(String),
          toolCallId: "use-456",
        });
      });

      it("strips MCP server prefix from tool name", async () => {
        const emitEvent = vi.fn();
        const hooks = buildMoltbotSdkHooks({
          mcpServerName: "moltbot",
          emitEvent,
        });

        const toolStartHook = hooks.PreToolUse![0].hooks[0];
        await toolStartHook({ tool_name: "mcp__moltbot__some_tool" }, "id-1", {});

        const toolEvent = emitEvent.mock.calls.find((c) => c[0] === "tool");
        expect(toolEvent![1].name).not.toContain("mcp__");
      });

      it("returns empty object (non-blocking)", async () => {
        const emitEvent = vi.fn();
        const hooks = buildMoltbotSdkHooks({
          mcpServerName: "moltbot",
          emitEvent,
        });

        const toolStartHook = hooks.PreToolUse![0].hooks[0];
        const result = await toolStartHook({ tool_name: "test" }, "id", {});

        expect(result).toEqual({});
      });

      it("handles missing tool_name gracefully", async () => {
        const emitEvent = vi.fn();
        const hooks = buildMoltbotSdkHooks({
          mcpServerName: "moltbot",
          emitEvent,
        });

        const toolStartHook = hooks.PreToolUse![0].hooks[0];
        // Should not throw
        await expect(toolStartHook({}, "id", {})).resolves.toEqual({});
      });
    });

    describe("PostToolUse hook (toolResultHook)", () => {
      it("emits tool event with result", async () => {
        const emitEvent = vi.fn();
        const hooks = buildMoltbotSdkHooks({
          mcpServerName: "moltbot",
          emitEvent,
        });

        const toolResultHook = hooks.PostToolUse![0].hooks[0];
        await toolResultHook(
          {
            tool_name: "mcp__moltbot__bash",
            tool_response: "command output here",
          },
          "tool-use-789",
          {},
        );

        const toolEvent = emitEvent.mock.calls.find((c) => c[0] === "tool");
        expect(toolEvent).toBeDefined();
        expect(toolEvent![1]).toMatchObject({
          phase: "result",
          isError: false,
          toolCallId: "tool-use-789",
        });
      });

      it("calls onToolResult callback with result text", async () => {
        const emitEvent = vi.fn();
        const onToolResult = vi.fn();
        const hooks = buildMoltbotSdkHooks({
          mcpServerName: "moltbot",
          emitEvent,
          onToolResult,
        });

        const toolResultHook = hooks.PostToolUse![0].hooks[0];
        await toolResultHook(
          {
            tool_name: "test_tool",
            tool_response: "Tool completed successfully",
          },
          "id",
          {},
        );

        expect(onToolResult).toHaveBeenCalledWith({
          text: expect.stringContaining("Tool completed"),
        });
      });

      it("does not call onToolResult when result is empty", async () => {
        const emitEvent = vi.fn();
        const onToolResult = vi.fn();
        const hooks = buildMoltbotSdkHooks({
          mcpServerName: "moltbot",
          emitEvent,
          onToolResult,
        });

        const toolResultHook = hooks.PostToolUse![0].hooks[0];
        await toolResultHook({ tool_name: "test_tool", tool_response: "" }, "id", {});

        expect(onToolResult).not.toHaveBeenCalled();
      });

      it("catches and ignores onToolResult callback errors", async () => {
        const emitEvent = vi.fn();
        const onToolResult = vi.fn().mockRejectedValue(new Error("Callback failed"));
        const hooks = buildMoltbotSdkHooks({
          mcpServerName: "moltbot",
          emitEvent,
          onToolResult,
        });

        const toolResultHook = hooks.PostToolUse![0].hooks[0];
        // Should not throw
        await expect(
          toolResultHook({ tool_name: "test", tool_response: "result" }, "id", {}),
        ).resolves.toEqual({});
      });
    });

    describe("PostToolUseFailure hook (toolFailureHook)", () => {
      it("emits tool event with isError true", async () => {
        const emitEvent = vi.fn();
        const hooks = buildMoltbotSdkHooks({
          mcpServerName: "moltbot",
          emitEvent,
        });

        const toolFailureHook = hooks.PostToolUseFailure![0].hooks[0];
        await toolFailureHook(
          {
            tool_name: "mcp__moltbot__bash",
            error: "Command failed with exit code 1",
          },
          "tool-use-error",
          {},
        );

        const toolEvent = emitEvent.mock.calls.find((c) => c[0] === "tool");
        expect(toolEvent).toBeDefined();
        expect(toolEvent![1]).toMatchObject({
          phase: "result",
          isError: true,
          toolCallId: "tool-use-error",
        });
      });

      it("calls onToolResult with error text", async () => {
        const emitEvent = vi.fn();
        const onToolResult = vi.fn();
        const hooks = buildMoltbotSdkHooks({
          mcpServerName: "moltbot",
          emitEvent,
          onToolResult,
        });

        const toolFailureHook = hooks.PostToolUseFailure![0].hooks[0];
        await toolFailureHook({ tool_name: "test_tool", error: "Something went wrong" }, "id", {});

        expect(onToolResult).toHaveBeenCalledWith({
          text: expect.stringContaining("Something went wrong"),
        });
      });

      it("catches and ignores onToolResult callback errors", async () => {
        const emitEvent = vi.fn();
        const onToolResult = vi.fn().mockRejectedValue(new Error("Callback error"));
        const hooks = buildMoltbotSdkHooks({
          mcpServerName: "moltbot",
          emitEvent,
          onToolResult,
        });

        const toolFailureHook = hooks.PostToolUseFailure![0].hooks[0];
        await expect(
          toolFailureHook({ tool_name: "test", error: "fail" }, "id", {}),
        ).resolves.toEqual({});
      });
    });

    describe("passthrough hooks", () => {
      const passthroughHookNames = [
        "Notification",
        "SessionStart",
        "SessionEnd",
        "UserPromptSubmit",
        "Stop",
        "SubagentStart",
        "SubagentStop",
        "PreCompact",
      ] as const;

      for (const hookName of passthroughHookNames) {
        it(`${hookName} emits hook event`, async () => {
          const emitEvent = vi.fn();
          const hooks = buildMoltbotSdkHooks({
            mcpServerName: "moltbot",
            emitEvent,
          });

          const hook = hooks[hookName]![0].hooks[0];
          await hook({ data: "test" }, "use-id", { session_id: "session" });

          expect(emitEvent).toHaveBeenCalledWith(
            "hook",
            expect.objectContaining({
              hookEventName: hookName,
            }),
          );
        });

        it(`${hookName} returns empty object`, async () => {
          const emitEvent = vi.fn();
          const hooks = buildMoltbotSdkHooks({
            mcpServerName: "moltbot",
            emitEvent,
          });

          const hook = hooks[hookName]![0].hooks[0];
          const result = await hook({}, "id", {});

          expect(result).toEqual({});
        });
      }
    });

    describe("tool name normalization", () => {
      it("removes mcp__serverName__ prefix", async () => {
        const emitEvent = vi.fn();
        const hooks = buildMoltbotSdkHooks({
          mcpServerName: "custom-server",
          emitEvent,
        });

        const toolStartHook = hooks.PreToolUse![0].hooks[0];
        await toolStartHook({ tool_name: "mcp__custom-server__my_tool" }, "id", {});

        const toolEvent = emitEvent.mock.calls.find((c) => c[0] === "tool");
        expect(toolEvent![1].name).toBe("my_tool");
      });

      it("handles tools without MCP prefix", async () => {
        const emitEvent = vi.fn();
        const hooks = buildMoltbotSdkHooks({
          mcpServerName: "moltbot",
          emitEvent,
        });

        const toolStartHook = hooks.PreToolUse![0].hooks[0];
        await toolStartHook({ tool_name: "plain_tool" }, "id", {});

        const toolEvent = emitEvent.mock.calls.find((c) => c[0] === "tool");
        expect(toolEvent![1].name).toBe("plain_tool");
      });

      it("handles empty tool name", async () => {
        const emitEvent = vi.fn();
        const hooks = buildMoltbotSdkHooks({
          mcpServerName: "moltbot",
          emitEvent,
        });

        const toolStartHook = hooks.PreToolUse![0].hooks[0];
        await toolStartHook({ tool_name: "" }, "id", {});

        const toolEvent = emitEvent.mock.calls.find((c) => c[0] === "tool");
        expect(toolEvent![1].name).toBe("tool"); // fallback
      });
    });

    describe("input sanitization", () => {
      it("wraps non-record input in object", async () => {
        const emitEvent = vi.fn();
        const hooks = buildMoltbotSdkHooks({
          mcpServerName: "moltbot",
          emitEvent,
        });

        const hook = hooks.Notification![0].hooks[0];
        await hook("string input", "id", {});

        expect(emitEvent).toHaveBeenCalledWith(
          "hook",
          expect.objectContaining({
            input: "string input",
          }),
        );
      });

      it("spreads record input into event", async () => {
        const emitEvent = vi.fn();
        const hooks = buildMoltbotSdkHooks({
          mcpServerName: "moltbot",
          emitEvent,
        });

        const hook = hooks.Notification![0].hooks[0];
        await hook({ key: "value", count: 42 }, "id", {});

        expect(emitEvent).toHaveBeenCalledWith(
          "hook",
          expect.objectContaining({
            key: "value",
            count: 42,
          }),
        );
      });
    });
  });
});
