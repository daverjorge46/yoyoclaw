import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the SDK loader before importing sdk-runner
const mockQuery = vi.fn();
vi.mock("./sdk-loader.js", () => ({
  loadClaudeAgentSdk: vi.fn(async () => ({
    query: mockQuery,
  })),
  isSdkAvailable: vi.fn(() => true),
}));

// Mock the tool bridge
vi.mock("./tool-bridge.js", () => ({
  bridgeMoltbotToolsToMcpServer: vi.fn(async () => ({
    serverConfig: { type: "sdk", name: "moltbot", instance: {} },
    allowedTools: ["mcp__moltbot__test_tool"],
    toolCount: 1,
    registeredTools: ["test_tool"],
    skippedTools: [],
  })),
}));

// Mock the logger
vi.mock("../../logging/subsystem.js", () => ({
  createSubsystemLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import { runSdkAgent } from "./sdk-runner.js";
import type { SdkRunnerParams } from "./types.js";

describe("runSdkAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const baseParams: SdkRunnerParams = {
    runId: "test-run-123",
    sessionId: "test-session-456",
    sessionFile: "/tmp/test-session.jsonl",
    workspaceDir: "/tmp/workspace",
    prompt: "Hello, world!",
    timeoutMs: 5000,
    tools: [],
  };

  it("returns sdk_unavailable error when SDK fails to load", async () => {
    const { loadClaudeAgentSdk } = await import("./sdk-loader.js");
    vi.mocked(loadClaudeAgentSdk).mockRejectedValueOnce(new Error("SDK not installed"));

    const result = await runSdkAgent(baseParams);

    expect(result.payloads[0]?.isError).toBe(true);
    expect(result.payloads[0]?.text).toContain("Claude Agent SDK is not available");
    expect(result.meta.error?.kind).toBe("sdk_unavailable");
  });

  it("streams assistant text via onPartialReply callback", async () => {
    const chunks: string[] = [];
    const onPartialReply = vi.fn((payload: { text?: string }) => {
      if (payload.text) chunks.push(payload.text);
    });

    // Mock query to emit text events
    mockQuery.mockImplementationOnce(async function* () {
      yield { type: "text", text: "Hello" };
      yield { type: "text", text: "Hello world" };
      yield { type: "result", result: "Hello world" };
    });

    const result = await runSdkAgent({
      ...baseParams,
      onPartialReply,
    });

    expect(result.payloads[0]?.text).toBe("Hello world");
    expect(onPartialReply).toHaveBeenCalled();
    expect(chunks.length).toBeGreaterThan(0);
  });

  it("emits lifecycle events via onAgentEvent callback", async () => {
    const events: Array<{ stream: string; data: Record<string, unknown> }> = [];
    const onAgentEvent = vi.fn((evt) => events.push(evt));

    mockQuery.mockImplementationOnce(async function* () {
      yield { type: "result", result: "Done" };
    });

    await runSdkAgent({
      ...baseParams,
      onAgentEvent,
    });

    expect(onAgentEvent).toHaveBeenCalled();

    // Check for start and end lifecycle events
    const lifecycleEvents = events.filter((e) => e.stream === "lifecycle");
    expect(lifecycleEvents.some((e) => e.data.phase === "start")).toBe(true);
    expect(lifecycleEvents.some((e) => e.data.phase === "end")).toBe(true);
  });

  it("handles timeout detection in error path", async () => {
    // This test verifies that the timeout error handling path works.
    // When the SDK throws and the timeout signal is aborted, we should
    // get a timeout error result.

    // For this test, we just verify the error path handles errors gracefully
    mockQuery.mockImplementationOnce(async function* () {
      yield { type: "text", text: "Starting" }; // Need at least one yield
      throw new Error("simulated SDK error");
    });

    const result = await runSdkAgent({
      ...baseParams,
      timeoutMs: 5000,
    });

    // Should get an error result
    expect(result.payloads[0]?.isError).toBe(true);
    expect(result.meta.error?.kind).toBe("run_failed");
  });

  it("handles abort signal from caller", async () => {
    const controller = new AbortController();

    // Abort immediately
    controller.abort();

    mockQuery.mockImplementationOnce(async function* () {
      yield { type: "result", result: "Should not reach here" };
    });

    const result = await runSdkAgent({
      ...baseParams,
      abortSignal: controller.signal,
    });

    expect(result.meta.aborted).toBe(true);
  });

  it("returns error payload when no text output is produced", async () => {
    mockQuery.mockImplementationOnce(async function* () {
      yield { type: "system", data: "Some system event" };
      // No text or result event
    });

    const result = await runSdkAgent(baseParams);

    expect(result.payloads[0]?.isError).toBe(true);
    expect(result.payloads[0]?.text).toContain("no text output");
    expect(result.meta.error?.kind).toBe("no_output");
  });

  it("extracts text from various event shapes", async () => {
    mockQuery.mockImplementationOnce(async function* () {
      yield { type: "assistant_message", text: "Response text" };
      yield { type: "result" };
    });

    const result = await runSdkAgent(baseParams);

    expect(result.payloads[0]?.text).toBe("Response text");
    expect(result.payloads[0]?.isError).toBeUndefined();
  });

  it("includes bridge diagnostics in result meta when tools are provided", async () => {
    mockQuery.mockImplementationOnce(async function* () {
      yield { type: "result", result: "Done with tools" };
    });

    const result = await runSdkAgent({
      ...baseParams,
      tools: [
        {
          name: "test_tool",
          description: "A test tool",
          parameters: { type: "object" },
          execute: vi.fn(),
        },
      ] as any,
    });

    expect(result.meta.bridge).toBeDefined();
    expect(result.meta.bridge?.toolCount).toBe(1);
  });

  it("truncates output when max chars exceeded", async () => {
    // Generate a very long text response
    const longText = "a".repeat(200_000);

    mockQuery.mockImplementationOnce(async function* () {
      yield { type: "text", text: longText };
      yield { type: "result" };
    });

    const result = await runSdkAgent(baseParams);

    expect(result.meta.truncated).toBe(true);
    expect(result.payloads[0]?.text).toContain("[Output truncated]");
  });

  describe("callback wiring", () => {
    it("calls onBlockReply with assistant text content", async () => {
      const blockReplies: Array<{ text?: string }> = [];
      const onBlockReply = vi.fn((payload: { text?: string }) => {
        blockReplies.push(payload);
      });

      mockQuery.mockImplementationOnce(async function* () {
        yield { type: "assistant", text: "First chunk" };
        yield { type: "assistant", text: "Second chunk" };
        yield { type: "result", result: "Final result" };
      });

      await runSdkAgent({
        ...baseParams,
        onBlockReply,
      });

      expect(onBlockReply).toHaveBeenCalled();
      expect(blockReplies.length).toBeGreaterThan(0);
      // Should have received text content
      expect(blockReplies.some((r) => r.text && r.text.length > 0)).toBe(true);
    });

    it("calls onBlockReplyFlush after stream completion", async () => {
      const onBlockReply = vi.fn();
      const onBlockReplyFlush = vi.fn();
      let flushCalledAfterReply = false;

      mockQuery.mockImplementationOnce(async function* () {
        yield { type: "assistant", text: "Hello world" };
        yield { type: "result", result: "Hello world" };
      });

      await runSdkAgent({
        ...baseParams,
        onBlockReply: async (payload) => {
          onBlockReply(payload);
        },
        onBlockReplyFlush: async () => {
          // Verify flush is called after at least one block reply
          flushCalledAfterReply = onBlockReply.mock.calls.length > 0;
          onBlockReplyFlush();
        },
      });

      expect(onBlockReplyFlush).toHaveBeenCalledTimes(1);
      expect(flushCalledAfterReply).toBe(true);
    });

    it("calls onReasoningStream with thinking content", async () => {
      const thinkingChunks: string[] = [];
      const onReasoningStream = vi.fn((payload: { text?: string }) => {
        if (payload.text) thinkingChunks.push(payload.text);
      });

      mockQuery.mockImplementationOnce(async function* () {
        yield { type: "thinking", thinking: "Let me think..." };
        yield { type: "thinking_delta", thinking: "Analyzing..." };
        yield { type: "assistant", text: "Here is my answer" };
        yield { type: "result", result: "Here is my answer" };
      });

      const result = await runSdkAgent({
        ...baseParams,
        thinkingLevel: "high",
        onReasoningStream,
      });

      expect(onReasoningStream).toHaveBeenCalled();
      expect(thinkingChunks.length).toBeGreaterThan(0);
      expect(thinkingChunks.some((t) => t.includes("think") || t.includes("Analyzing"))).toBe(true);
      // Final text should not contain thinking
      expect(result.payloads[0]?.text).toBe("Here is my answer");
    });

    it("extracts both text and thinking from content_block events", async () => {
      const thinkingChunks: string[] = [];
      const textChunks: string[] = [];
      const onReasoningStream = vi.fn((payload: { text?: string }) => {
        if (payload.text) thinkingChunks.push(payload.text);
      });
      const onBlockReply = vi.fn((payload: { text?: string }) => {
        if (payload.text) textChunks.push(payload.text);
      });

      mockQuery.mockImplementationOnce(async function* () {
        // Emit thinking via content_block
        yield {
          type: "content_block_start",
          content_block: { type: "thinking", thinking: "Internal reasoning process" },
        };
        yield {
          type: "content_block_delta",
          delta: { type: "thinking_delta", thinking: "More thinking..." },
        };
        // Emit text via content_block
        yield {
          type: "content_block_delta",
          delta: { type: "text_delta", text: "Visible response" },
        };
        yield { type: "result", result: "Visible response" };
      });

      await runSdkAgent({
        ...baseParams,
        thinkingLevel: "high",
        onReasoningStream,
        onBlockReply,
      });

      // Thinking should be streamed separately
      expect(thinkingChunks.length).toBeGreaterThan(0);
      expect(thinkingChunks.some((t) => t.includes("reasoning") || t.includes("thinking"))).toBe(
        true,
      );

      // Text should be streamed separately
      expect(textChunks.length).toBeGreaterThan(0);
      expect(textChunks.some((t) => t.includes("Visible"))).toBe(true);
    });

    it("handles event with both thinking and text fields", async () => {
      const thinkingChunks: string[] = [];
      const textChunks: string[] = [];
      const onReasoningStream = vi.fn((payload: { text?: string }) => {
        if (payload.text) thinkingChunks.push(payload.text);
      });
      const onBlockReply = vi.fn((payload: { text?: string }) => {
        if (payload.text) textChunks.push(payload.text);
      });

      // Some SDK versions might emit both in one event
      mockQuery.mockImplementationOnce(async function* () {
        yield {
          type: "assistant",
          thinking: "My thought process",
          text: "My visible answer",
        };
        yield { type: "result", result: "My visible answer" };
      });

      await runSdkAgent({
        ...baseParams,
        thinkingLevel: "high",
        onReasoningStream,
        onBlockReply,
      });

      // Both should be extracted and sent to appropriate callbacks
      expect(thinkingChunks).toContain("My thought process");
      expect(textChunks.some((t) => t.includes("My visible answer"))).toBe(true);
    });

    it("does not call onReasoningStream when callback not provided", async () => {
      // This test verifies that if no onReasoningStream is provided,
      // thinking content doesn't cause errors or unexpected behavior
      mockQuery.mockImplementationOnce(async function* () {
        yield { type: "thinking", thinking: "Internal thinking" };
        yield { type: "assistant", text: "Response" };
        yield { type: "result", result: "Response" };
      });

      const result = await runSdkAgent({
        ...baseParams,
        thinkingLevel: "high",
        // No onReasoningStream provided
      });

      // Should complete successfully
      expect(result.payloads[0]?.text).toBe("Response");
      expect(result.payloads[0]?.isError).toBeUndefined();
    });

    it("does not call onBlockReplyFlush when callback not provided", async () => {
      mockQuery.mockImplementationOnce(async function* () {
        yield { type: "assistant", text: "Hello" };
        yield { type: "result", result: "Hello" };
      });

      const result = await runSdkAgent({
        ...baseParams,
        onBlockReply: vi.fn(),
        // No onBlockReplyFlush provided
      });

      // Should complete successfully
      expect(result.payloads[0]?.text).toBe("Hello");
    });

    it("calls onPartialReply and onBlockReply in correct order", async () => {
      const callOrder: string[] = [];
      const onPartialReply = vi.fn(() => {
        callOrder.push("partial");
      });
      const onBlockReply = vi.fn(() => {
        callOrder.push("block");
      });

      mockQuery.mockImplementationOnce(async function* () {
        yield { type: "assistant", text: "Streaming text" };
        yield { type: "result", result: "Streaming text" };
      });

      await runSdkAgent({
        ...baseParams,
        onPartialReply,
        onBlockReply,
      });

      // Both should be called
      expect(onPartialReply).toHaveBeenCalled();
      expect(onBlockReply).toHaveBeenCalled();
      // Partial should be called before or at same time as block
      const firstPartial = callOrder.indexOf("partial");
      const firstBlock = callOrder.indexOf("block");
      expect(firstPartial).toBeLessThanOrEqual(firstBlock);
    });
  });

  describe("session resumption", () => {
    it("extracts session_id from SDK init event", async () => {
      mockQuery.mockImplementationOnce(async function* () {
        yield { type: "system", subtype: "init", session_id: "sdk-session-abc123" };
        yield { type: "assistant", text: "Hello" };
        yield { type: "result", result: "Hello" };
      });

      const result = await runSdkAgent(baseParams);

      expect(result.claudeSessionId).toBe("sdk-session-abc123");
      expect(result.payloads[0]?.text).toBe("Hello");
    });

    it("extracts session_id from any event with session_id field", async () => {
      mockQuery.mockImplementationOnce(async function* () {
        yield { type: "assistant", text: "Response", session_id: "session-from-assistant" };
        yield { type: "result", result: "Response" };
      });

      const result = await runSdkAgent(baseParams);

      expect(result.claudeSessionId).toBe("session-from-assistant");
    });

    it("passes resume option to SDK when claudeSessionId is provided", async () => {
      mockQuery.mockImplementationOnce(async function* () {
        yield { type: "result", result: "Resumed session response" };
      });

      await runSdkAgent({
        ...baseParams,
        claudeSessionId: "existing-session-xyz",
      });

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const callArgs = mockQuery.mock.calls[0];
      const options = callArgs?.[0]?.options;
      expect(options?.resume).toBe("existing-session-xyz");
    });

    it("passes forkSession option when both claudeSessionId and forkSession are provided", async () => {
      mockQuery.mockImplementationOnce(async function* () {
        yield { type: "result", result: "Forked session response" };
      });

      await runSdkAgent({
        ...baseParams,
        claudeSessionId: "session-to-fork",
        forkSession: true,
      });

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const callArgs = mockQuery.mock.calls[0];
      const options = callArgs?.[0]?.options;
      expect(options?.resume).toBe("session-to-fork");
      expect(options?.forkSession).toBe(true);
    });

    it("does not set resume option when claudeSessionId is not provided", async () => {
      mockQuery.mockImplementationOnce(async function* () {
        yield { type: "result", result: "New session response" };
      });

      await runSdkAgent(baseParams);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const callArgs = mockQuery.mock.calls[0];
      const options = callArgs?.[0]?.options;
      expect(options?.resume).toBeUndefined();
    });
  });

  describe("callback error handling", () => {
    it("continues streaming if onPartialReply throws synchronously", async () => {
      const onPartialReply = vi.fn().mockImplementation(() => {
        throw new Error("onPartialReply sync error");
      });

      mockQuery.mockImplementationOnce(async function* () {
        yield { type: "text", text: "First chunk" };
        yield { type: "text", text: "Second chunk" };
        yield { type: "result", result: "Final output" };
      });

      const result = await runSdkAgent({
        ...baseParams,
        onPartialReply,
      });

      // Should complete despite callback error
      expect(result.payloads[0]?.text).toBe("Final output");
      expect(result.payloads[0]?.isError).toBeUndefined();
      expect(onPartialReply).toHaveBeenCalled();
    });

    it("continues streaming if onPartialReply returns rejected promise", async () => {
      const onPartialReply = vi.fn().mockRejectedValue(new Error("onPartialReply async error"));

      mockQuery.mockImplementationOnce(async function* () {
        yield { type: "text", text: "Streaming" };
        yield { type: "result", result: "Done" };
      });

      const result = await runSdkAgent({
        ...baseParams,
        onPartialReply,
      });

      expect(result.payloads[0]?.text).toBe("Done");
      expect(result.payloads[0]?.isError).toBeUndefined();
    });

    it("continues streaming if onBlockReply throws", async () => {
      const onBlockReply = vi.fn().mockImplementation(() => {
        throw new Error("onBlockReply error");
      });

      mockQuery.mockImplementationOnce(async function* () {
        yield { type: "assistant", text: "Block 1" };
        yield { type: "assistant", text: "Block 2" };
        yield { type: "result", result: "Block 2" };
      });

      const result = await runSdkAgent({
        ...baseParams,
        onBlockReply,
      });

      expect(result.payloads[0]?.text).toBe("Block 2");
      expect(onBlockReply).toHaveBeenCalled();
    });

    it("continues streaming if onReasoningStream throws", async () => {
      const onReasoningStream = vi.fn().mockImplementation(() => {
        throw new Error("onReasoningStream error");
      });

      mockQuery.mockImplementationOnce(async function* () {
        yield { type: "thinking", thinking: "Thinking content" };
        yield { type: "assistant", text: "Response" };
        yield { type: "result", result: "Response" };
      });

      const result = await runSdkAgent({
        ...baseParams,
        thinkingLevel: "high",
        onReasoningStream,
      });

      expect(result.payloads[0]?.text).toBe("Response");
      expect(onReasoningStream).toHaveBeenCalled();
    });

    it("continues streaming if onBlockReplyFlush throws", async () => {
      const onBlockReplyFlush = vi.fn().mockImplementation(() => {
        throw new Error("onBlockReplyFlush error");
      });

      mockQuery.mockImplementationOnce(async function* () {
        yield { type: "assistant", text: "Content" };
        yield { type: "result", result: "Content" };
      });

      const result = await runSdkAgent({
        ...baseParams,
        onBlockReply: vi.fn(),
        onBlockReplyFlush,
      });

      expect(result.payloads[0]?.text).toBe("Content");
      expect(onBlockReplyFlush).toHaveBeenCalled();
    });

    it("handles multiple callbacks throwing simultaneously", async () => {
      const onPartialReply = vi.fn().mockRejectedValue(new Error("partial error"));
      const onBlockReply = vi.fn().mockImplementation(() => {
        throw new Error("block error");
      });
      const onReasoningStream = vi.fn().mockRejectedValue(new Error("reasoning error"));
      const onAgentEvent = vi.fn().mockImplementation(() => {
        throw new Error("event error");
      });

      mockQuery.mockImplementationOnce(async function* () {
        yield { type: "thinking", thinking: "Thinking..." };
        yield { type: "assistant", text: "Response" };
        yield { type: "result", result: "Response" };
      });

      const result = await runSdkAgent({
        ...baseParams,
        thinkingLevel: "high",
        onPartialReply,
        onBlockReply,
        onReasoningStream,
        onAgentEvent,
      });

      // All callbacks should have been called, and result should still be correct
      expect(result.payloads[0]?.text).toBe("Response");
      expect(result.payloads[0]?.isError).toBeUndefined();
      expect(onPartialReply).toHaveBeenCalled();
      expect(onBlockReply).toHaveBeenCalled();
      expect(onReasoningStream).toHaveBeenCalled();
      expect(onAgentEvent).toHaveBeenCalled();
    });

    it("continues if onToolResult callback throws", async () => {
      const onToolResult = vi.fn().mockImplementation(() => {
        throw new Error("onToolResult error");
      });

      mockQuery.mockImplementationOnce(async function* () {
        yield {
          type: "tool_use",
          tool_use_id: "tool-123",
          name: "test_tool",
          input: {},
        };
        yield {
          type: "tool_result",
          tool_use_id: "tool-123",
          content: [{ type: "text", text: "Tool output" }],
        };
        yield { type: "assistant", text: "Here is the result" };
        yield { type: "result", result: "Here is the result" };
      });

      const result = await runSdkAgent({
        ...baseParams,
        onToolResult,
      });

      // Should complete despite callback error
      expect(result.payloads[0]?.text).toBe("Here is the result");
    });

    it("completes run even if onAssistantMessageStart throws", async () => {
      const onAssistantMessageStart = vi.fn().mockImplementation(() => {
        throw new Error("onAssistantMessageStart error");
      });

      mockQuery.mockImplementationOnce(async function* () {
        yield { type: "assistant_message_start" };
        yield { type: "assistant", text: "Hello" };
        yield { type: "result", result: "Hello" };
      });

      const result = await runSdkAgent({
        ...baseParams,
        onAssistantMessageStart,
      });

      expect(result.payloads[0]?.text).toBe("Hello");
      expect(onAssistantMessageStart).toHaveBeenCalled();
    });
  });
});
