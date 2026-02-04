import type { AgentMessage } from "@mariozechner/pi-agent-core";
import { describe, expect, it, vi } from "vitest";
import {
  removeOrphanedToolResults,
  sanitizeToolUseResultPairing,
} from "./session-transcript-repair.js";

describe("sanitizeToolUseResultPairing", () => {
  it("moves tool results directly after tool calls and inserts missing results", () => {
    const input = [
      {
        role: "assistant",
        content: [
          { type: "toolCall", id: "call_1", name: "read", arguments: {} },
          { type: "toolCall", id: "call_2", name: "exec", arguments: {} },
        ],
      },
      { role: "user", content: "user message that should come after tool use" },
      {
        role: "toolResult",
        toolCallId: "call_2",
        toolName: "exec",
        content: [{ type: "text", text: "ok" }],
        isError: false,
      },
    ] satisfies AgentMessage[];

    const out = sanitizeToolUseResultPairing(input);
    expect(out[0]?.role).toBe("assistant");
    expect(out[1]?.role).toBe("toolResult");
    expect((out[1] as { toolCallId?: string }).toolCallId).toBe("call_1");
    expect(out[2]?.role).toBe("toolResult");
    expect((out[2] as { toolCallId?: string }).toolCallId).toBe("call_2");
    expect(out[3]?.role).toBe("user");
  });

  it("drops duplicate tool results for the same id within a span", () => {
    const input = [
      {
        role: "assistant",
        content: [{ type: "toolCall", id: "call_1", name: "read", arguments: {} }],
      },
      {
        role: "toolResult",
        toolCallId: "call_1",
        toolName: "read",
        content: [{ type: "text", text: "first" }],
        isError: false,
      },
      {
        role: "toolResult",
        toolCallId: "call_1",
        toolName: "read",
        content: [{ type: "text", text: "second" }],
        isError: false,
      },
      { role: "user", content: "ok" },
    ] satisfies AgentMessage[];

    const out = sanitizeToolUseResultPairing(input);
    expect(out.filter((m) => m.role === "toolResult")).toHaveLength(1);
  });

  it("drops duplicate tool results for the same id across the transcript", () => {
    const input = [
      {
        role: "assistant",
        content: [{ type: "toolCall", id: "call_1", name: "read", arguments: {} }],
      },
      {
        role: "toolResult",
        toolCallId: "call_1",
        toolName: "read",
        content: [{ type: "text", text: "first" }],
        isError: false,
      },
      { role: "assistant", content: [{ type: "text", text: "ok" }] },
      {
        role: "toolResult",
        toolCallId: "call_1",
        toolName: "read",
        content: [{ type: "text", text: "second (duplicate)" }],
        isError: false,
      },
    ] satisfies AgentMessage[];

    const out = sanitizeToolUseResultPairing(input);
    const results = out.filter((m) => m.role === "toolResult") as Array<{
      toolCallId?: string;
    }>;
    expect(results).toHaveLength(1);
    expect(results[0]?.toolCallId).toBe("call_1");
  });

  it("drops orphan tool results that do not match any tool call", () => {
    const input = [
      { role: "user", content: "hello" },
      {
        role: "toolResult",
        toolCallId: "call_orphan",
        toolName: "read",
        content: [{ type: "text", text: "orphan" }],
        isError: false,
      },
      {
        role: "assistant",
        content: [{ type: "text", text: "ok" }],
      },
    ] satisfies AgentMessage[];

    const out = sanitizeToolUseResultPairing(input);
    expect(out.some((m) => m.role === "toolResult")).toBe(false);
    expect(out.map((m) => m.role)).toEqual(["user", "assistant"]);
  });
});

describe("removeOrphanedToolResults", () => {
  it("removes tool_result with no matching tool_use in any assistant message", () => {
    const input = [
      { role: "user", content: "hello" },
      {
        role: "assistant",
        content: [{ type: "text", text: "I will help you" }],
      },
      {
        role: "toolResult",
        toolCallId: "toolu_orphan123",
        toolName: "exec",
        content: [{ type: "text", text: "orphaned result" }],
        isError: false,
      },
    ] satisfies AgentMessage[];

    const result = removeOrphanedToolResults(input);
    expect(result.removedCount).toBe(1);
    expect(result.removedIds).toEqual(["toolu_orphan123"]);
    expect(result.messages).toHaveLength(2);
    expect(result.messages.some((m) => m.role === "toolResult")).toBe(false);
  });

  it("keeps tool_result that has matching tool_use in assistant message", () => {
    const input = [
      {
        role: "assistant",
        content: [{ type: "toolCall", id: "toolu_valid123", name: "exec", arguments: {} }],
      },
      {
        role: "toolResult",
        toolCallId: "toolu_valid123",
        toolName: "exec",
        content: [{ type: "text", text: "result" }],
        isError: false,
      },
    ] satisfies AgentMessage[];

    const result = removeOrphanedToolResults(input);
    expect(result.removedCount).toBe(0);
    expect(result.messages).toHaveLength(2);
    expect(result.messages).toBe(input); // Same reference when no changes
  });

  it("handles toolUseId field (alternative to toolCallId)", () => {
    const input = [
      {
        role: "assistant",
        content: [{ type: "toolUse", id: "toolu_alt456", name: "read", arguments: {} }],
      },
      {
        role: "toolResult",
        toolUseId: "toolu_alt456", // Using toolUseId instead of toolCallId
        toolName: "read",
        content: [{ type: "text", text: "result" }],
        isError: false,
      },
    ] satisfies AgentMessage[];

    const result = removeOrphanedToolResults(input as AgentMessage[]);
    expect(result.removedCount).toBe(0);
    expect(result.messages).toHaveLength(2);
  });

  it("removes multiple orphaned tool_results", () => {
    const input = [
      { role: "user", content: "compaction summary" },
      {
        role: "toolResult",
        toolCallId: "toolu_orphan1",
        toolName: "exec",
        content: [{ type: "text", text: "orphan 1" }],
        isError: true,
      },
      {
        role: "toolResult",
        toolCallId: "toolu_orphan2",
        toolName: "read",
        content: [{ type: "text", text: "orphan 2" }],
        isError: true,
      },
      {
        role: "assistant",
        content: [{ type: "text", text: "response" }],
      },
    ] satisfies AgentMessage[];

    const result = removeOrphanedToolResults(input);
    expect(result.removedCount).toBe(2);
    expect(result.removedIds).toContain("toolu_orphan1");
    expect(result.removedIds).toContain("toolu_orphan2");
    expect(result.messages).toHaveLength(2);
    expect(result.messages.map((m) => m.role)).toEqual(["user", "assistant"]);
  });

  it("handles mixed valid and orphaned tool_results", () => {
    const input = [
      {
        role: "assistant",
        content: [{ type: "toolCall", id: "toolu_valid", name: "exec", arguments: {} }],
      },
      {
        role: "toolResult",
        toolCallId: "toolu_valid",
        toolName: "exec",
        content: [{ type: "text", text: "valid result" }],
        isError: false,
      },
      { role: "user", content: "thanks" },
      {
        role: "toolResult",
        toolCallId: "toolu_orphan",
        toolName: "read",
        content: [{ type: "text", text: "orphan from compaction" }],
        isError: true,
      },
      {
        role: "assistant",
        content: [{ type: "text", text: "done" }],
      },
    ] satisfies AgentMessage[];

    const result = removeOrphanedToolResults(input);
    expect(result.removedCount).toBe(1);
    expect(result.removedIds).toEqual(["toolu_orphan"]);
    expect(result.messages).toHaveLength(4);
    expect(result.messages.filter((m) => m.role === "toolResult")).toHaveLength(1);
  });

  it("handles empty message array", () => {
    const result = removeOrphanedToolResults([]);
    expect(result.removedCount).toBe(0);
    expect(result.messages).toHaveLength(0);
  });

  it("handles messages with no tool_results", () => {
    const input = [
      { role: "user", content: "hello" },
      { role: "assistant", content: [{ type: "text", text: "hi" }] },
    ] satisfies AgentMessage[];

    const result = removeOrphanedToolResults(input);
    expect(result.removedCount).toBe(0);
    expect(result.messages).toBe(input);
  });

  it("logs when orphans are removed", () => {
    const logger = {
      debug: vi.fn(),
      warn: vi.fn(),
    };

    const input = [
      {
        role: "toolResult",
        toolCallId: "toolu_orphan",
        toolName: "exec",
        content: [{ type: "text", text: "orphan" }],
        isError: true,
      },
    ] satisfies AgentMessage[];

    removeOrphanedToolResults(input, logger);

    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining("toolu_orphan"));
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Removed 1 orphaned tool_result"),
    );
  });

  it("handles tool_result with missing id gracefully", () => {
    const input = [
      {
        role: "toolResult",
        // No toolCallId or toolUseId
        toolName: "exec",
        content: [{ type: "text", text: "no id" }],
        isError: false,
      } as AgentMessage,
      { role: "user", content: "hello" },
    ];

    const result = removeOrphanedToolResults(input);
    // Should keep the message since we can't validate it
    expect(result.removedCount).toBe(0);
    expect(result.messages).toHaveLength(2);
  });

  it("simulates post-compaction scenario: orphaned synthetic tool_result", () => {
    // This simulates the exact bug we're fixing:
    // 1. An assistant message with tool_use was compacted away
    // 2. But the synthetic tool_result (from transcript repair) remains
    const input = [
      { role: "user", content: "Compaction summary of previous conversation..." },
      {
        role: "assistant",
        content: [{ type: "text", text: "Let me help with that." }],
      },
      {
        role: "toolResult",
        toolCallId: "toolu_017dHsZfGmTiLaZZtvuhrW8w", // Real orphan ID from our bug
        toolName: "edit",
        content: [
          {
            type: "text",
            text: "[openclaw] missing tool result in session history; inserted synthetic error result for transcript repair.",
          },
        ],
        isError: true,
      },
      { role: "user", content: "What happened?" },
    ] satisfies AgentMessage[];

    const result = removeOrphanedToolResults(input);
    expect(result.removedCount).toBe(1);
    expect(result.removedIds).toEqual(["toolu_017dHsZfGmTiLaZZtvuhrW8w"]);
    expect(result.messages).toHaveLength(3);
    expect(result.messages.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
  });
});
