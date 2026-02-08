import type { AgentMessage } from "@mariozechner/pi-agent-core";
import { SessionManager } from "@mariozechner/pi-coding-agent";
import { describe, expect, it } from "vitest";
import { installSessionToolResultGuard } from "./session-tool-result-guard.js";

type AppendMessage = Parameters<SessionManager["appendMessage"]>[0];

const asAppendMessage = (message: unknown) => message as AppendMessage;

const toolCallMessage = asAppendMessage({
  role: "assistant",
  content: [{ type: "toolCall", id: "call_1", name: "read", arguments: {} }],
});

describe("installSessionToolResultGuard", () => {
  it("inserts synthetic toolResult before non-tool message when pending", () => {
    const sm = SessionManager.inMemory();
    installSessionToolResultGuard(sm);

    sm.appendMessage(toolCallMessage);
    sm.appendMessage(
      asAppendMessage({
        role: "assistant",
        content: [{ type: "text", text: "error" }],
        stopReason: "error",
      }),
    );

    const entries = sm
      .getEntries()
      .filter((e) => e.type === "message")
      .map((e) => (e as { message: AgentMessage }).message);

    expect(entries.map((m) => m.role)).toEqual(["assistant", "toolResult", "assistant"]);
    const synthetic = entries[1] as {
      toolCallId?: string;
      isError?: boolean;
      content?: Array<{ type?: string; text?: string }>;
    };
    expect(synthetic.toolCallId).toBe("call_1");
    expect(synthetic.isError).toBe(true);
    expect(synthetic.content?.[0]?.text).toContain("missing tool result");
  });

  it("flushes pending tool calls when asked explicitly", () => {
    const sm = SessionManager.inMemory();
    const guard = installSessionToolResultGuard(sm);

    sm.appendMessage(toolCallMessage);
    guard.flushPendingToolResults();

    const messages = sm
      .getEntries()
      .filter((e) => e.type === "message")
      .map((e) => (e as { message: AgentMessage }).message);

    expect(messages.map((m) => m.role)).toEqual(["assistant", "toolResult"]);
  });

  it("does not add synthetic toolResult when a matching one exists", () => {
    const sm = SessionManager.inMemory();
    installSessionToolResultGuard(sm);

    sm.appendMessage(toolCallMessage);
    sm.appendMessage(
      asAppendMessage({
        role: "toolResult",
        toolCallId: "call_1",
        content: [{ type: "text", text: "ok" }],
        isError: false,
      }),
    );

    const messages = sm
      .getEntries()
      .filter((e) => e.type === "message")
      .map((e) => (e as { message: AgentMessage }).message);

    expect(messages.map((m) => m.role)).toEqual(["assistant", "toolResult"]);
  });

  it("preserves ordering with multiple tool calls and partial results", () => {
    const sm = SessionManager.inMemory();
    const guard = installSessionToolResultGuard(sm);

    sm.appendMessage(
      asAppendMessage({
        role: "assistant",
        content: [
          { type: "toolCall", id: "call_a", name: "one", arguments: {} },
          { type: "toolUse", id: "call_b", name: "two", arguments: {} },
        ],
      }),
    );
    sm.appendMessage(
      asAppendMessage({
        role: "toolResult",
        toolUseId: "call_a",
        content: [{ type: "text", text: "a" }],
        isError: false,
      }),
    );
    sm.appendMessage(
      asAppendMessage({
        role: "assistant",
        content: [{ type: "text", text: "after tools" }],
      }),
    );

    const messages = sm
      .getEntries()
      .filter((e) => e.type === "message")
      .map((e) => (e as { message: AgentMessage }).message);

    expect(messages.map((m) => m.role)).toEqual([
      "assistant", // tool calls
      "toolResult", // call_a real
      "toolResult", // synthetic for call_b
      "assistant", // text
    ]);
    expect((messages[2] as { toolCallId?: string }).toolCallId).toBe("call_b");
    expect(guard.getPendingIds()).toEqual([]);
  });

  it("flushes pending on guard when no toolResult arrived", () => {
    const sm = SessionManager.inMemory();
    const guard = installSessionToolResultGuard(sm);

    sm.appendMessage(toolCallMessage);
    sm.appendMessage(
      asAppendMessage({
        role: "assistant",
        content: [{ type: "text", text: "hard error" }],
        stopReason: "error",
      }),
    );
    expect(guard.getPendingIds()).toEqual([]);
  });

  it("handles toolUseId on toolResult", () => {
    const sm = SessionManager.inMemory();
    installSessionToolResultGuard(sm);

    sm.appendMessage(
      asAppendMessage({
        role: "assistant",
        content: [{ type: "toolUse", id: "use_1", name: "f", arguments: {} }],
      }),
    );
    sm.appendMessage(
      asAppendMessage({
        role: "toolResult",
        toolUseId: "use_1",
        content: [{ type: "text", text: "ok" }],
      }),
    );

    const messages = sm
      .getEntries()
      .filter((e) => e.type === "message")
      .map((e) => (e as { message: AgentMessage }).message);
    expect(messages.map((m) => m.role)).toEqual(["assistant", "toolResult"]);
  });

  it("drops malformed tool calls missing input before persistence", () => {
    const sm = SessionManager.inMemory();
    installSessionToolResultGuard(sm);

    sm.appendMessage(
      asAppendMessage({
        role: "assistant",
        content: [{ type: "toolCall", id: "call_1", name: "read" }],
      }),
    );

    const messages = sm
      .getEntries()
      .filter((e) => e.type === "message")
      .map((e) => (e as { message: AgentMessage }).message);

    expect(messages).toHaveLength(0);
  });

  it("flushes pending tool results when a sanitized assistant message is dropped", () => {
    const sm = SessionManager.inMemory();
    installSessionToolResultGuard(sm);

    sm.appendMessage(
      asAppendMessage({
        role: "assistant",
        content: [{ type: "toolCall", id: "call_1", name: "read", arguments: {} }],
      }),
    );

    sm.appendMessage(
      asAppendMessage({
        role: "assistant",
        content: [{ type: "toolCall", id: "call_2", name: "read" }],
      }),
    );

    const messages = sm
      .getEntries()
      .filter((e) => e.type === "message")
      .map((e) => (e as { message: AgentMessage }).message);

    expect(messages.map((m) => m.role)).toEqual(["assistant", "toolResult"]);
  });

  it("caps oversized tool result text during persistence", () => {
    const sm = SessionManager.inMemory();
    installSessionToolResultGuard(sm);

    sm.appendMessage(toolCallMessage);
    sm.appendMessage(
      asAppendMessage({
        role: "toolResult",
        toolCallId: "call_1",
        toolName: "read",
        content: [{ type: "text", text: "x".repeat(500_000) }],
        isError: false,
        timestamp: Date.now(),
      }),
    );

    const entries = sm
      .getEntries()
      .filter((e) => e.type === "message")
      .map((e) => (e as { message: AgentMessage }).message);

    const toolResult = entries.find((m) => m.role === "toolResult") as {
      content: Array<{ type: string; text: string }>;
    };
    expect(toolResult).toBeDefined();
    const textBlock = toolResult.content.find((b: { type: string }) => b.type === "text") as {
      text: string;
    };
    expect(textBlock.text.length).toBeLessThan(500_000);
    expect(textBlock.text).toContain("truncated");
  });

  it("does not truncate tool results under the limit", () => {
    const sm = SessionManager.inMemory();
    installSessionToolResultGuard(sm);

    const originalText = "small tool result";
    sm.appendMessage(toolCallMessage);
    sm.appendMessage(
      asAppendMessage({
        role: "toolResult",
        toolCallId: "call_1",
        toolName: "read",
        content: [{ type: "text", text: originalText }],
        isError: false,
        timestamp: Date.now(),
      }),
    );

    const entries = sm
      .getEntries()
      .filter((e) => e.type === "message")
      .map((e) => (e as { message: AgentMessage }).message);

    const toolResult = entries.find((m) => m.role === "toolResult") as {
      content: Array<{ type: string; text: string }>;
    };
    const textBlock = toolResult.content.find((b: { type: string }) => b.type === "text") as {
      text: string;
    };
    expect(textBlock.text).toBe(originalText);
  });

  it("redacts secrets from tool result text before persistence", () => {
    const sm = SessionManager.inMemory();
    installSessionToolResultGuard(sm);

    sm.appendMessage(toolCallMessage);
    sm.appendMessage(
      asAppendMessage({
        role: "toolResult",
        toolCallId: "call_1",
        content: [
          {
            type: "text",
            text: '{"botToken": "xoxb-fake-test-token-not-real-abcdefghij"}',
          },
        ],
      }),
    );

    const entries = sm
      .getEntries()
      .filter((e) => e.type === "message")
      .map((e) => (e as { message: AgentMessage }).message);

    const toolResult = entries.find((m) => m.role === "toolResult") as {
      content: Array<{ type: string; text: string }>;
    };
    const textBlock = toolResult.content.find((b: { type: string }) => b.type === "text") as {
      text: string;
    };
    // The xoxb- token should be redacted
    expect(textBlock.text).not.toContain("xoxb-fake-test-token-not-real-abcdefghij");
    expect(textBlock.text).toContain("xoxb-f");
    expect(textBlock.text).toContain("…");
  });

  it("redacts Anthropic API keys from tool result text", () => {
    const sm = SessionManager.inMemory();
    installSessionToolResultGuard(sm);

    sm.appendMessage(toolCallMessage);
    sm.appendMessage(
      asAppendMessage({
        role: "toolResult",
        toolCallId: "call_1",
        content: [
          {
            type: "text",
            text: 'token: "sk-ant-fake-test-key-abcdefghijklmnopqrstuvwxyz"',
          },
        ],
      }),
    );

    const entries = sm
      .getEntries()
      .filter((e) => e.type === "message")
      .map((e) => (e as { message: AgentMessage }).message);

    const toolResult = entries.find((m) => m.role === "toolResult") as {
      content: Array<{ type: string; text: string }>;
    };
    const textBlock = toolResult.content.find((b: { type: string }) => b.type === "text") as {
      text: string;
    };
    expect(textBlock.text).not.toContain("sk-ant-fake-test-key-abcdefghijklmnopqrstuvwxyz");
  });

  it("redacts Bearer tokens from tool result text", () => {
    const sm = SessionManager.inMemory();
    installSessionToolResultGuard(sm);

    sm.appendMessage(toolCallMessage);
    sm.appendMessage(
      asAppendMessage({
        role: "toolResult",
        toolCallId: "call_1",
        content: [
          {
            type: "text",
            text: 'curl -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwiZXhwIjoiMTIzNCJ9.payload.signature"',
          },
        ],
      }),
    );

    const entries = sm
      .getEntries()
      .filter((e) => e.type === "message")
      .map((e) => (e as { message: AgentMessage }).message);

    const toolResult = entries.find((m) => m.role === "toolResult") as {
      content: Array<{ type: string; text: string }>;
    };
    const textBlock = toolResult.content.find((b: { type: string }) => b.type === "text") as {
      text: string;
    };
    expect(textBlock.text).not.toContain(
      "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwiZXhwIjoiMTIzNCJ9",
    );
  });

  it("does not modify tool results without secrets", () => {
    const sm = SessionManager.inMemory();
    installSessionToolResultGuard(sm);

    const cleanText = "total 42\ndrwxr-xr-x 5 user user 4096 Feb 8 ls output";
    sm.appendMessage(toolCallMessage);
    sm.appendMessage(
      asAppendMessage({
        role: "toolResult",
        toolCallId: "call_1",
        content: [{ type: "text", text: cleanText }],
      }),
    );

    const entries = sm
      .getEntries()
      .filter((e) => e.type === "message")
      .map((e) => (e as { message: AgentMessage }).message);

    const toolResult = entries.find((m) => m.role === "toolResult") as {
      content: Array<{ type: string; text: string }>;
    };
    const textBlock = toolResult.content.find((b: { type: string }) => b.type === "text") as {
      text: string;
    };
    expect(textBlock.text).toBe(cleanText);
  });

  it("redacts Google API keys from tool result text", () => {
    const sm = SessionManager.inMemory();
    installSessionToolResultGuard(sm);

    sm.appendMessage(toolCallMessage);
    sm.appendMessage(
      asAppendMessage({
        role: "toolResult",
        toolCallId: "call_1",
        content: [
          {
            type: "text",
            text: '"apiKey": "AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"',
          },
        ],
      }),
    );

    const entries = sm
      .getEntries()
      .filter((e) => e.type === "message")
      .map((e) => (e as { message: AgentMessage }).message);

    const toolResult = entries.find((m) => m.role === "toolResult") as {
      content: Array<{ type: string; text: string }>;
    };
    const textBlock = toolResult.content.find((b: { type: string }) => b.type === "text") as {
      text: string;
    };
    expect(textBlock.text).not.toContain("AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
  });
});
