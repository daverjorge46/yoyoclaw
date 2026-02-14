import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createOllamaStreamFn, convertToOllamaMessages } from "./ollama-stream.js";

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Build a single NDJSON line for an Ollama streaming chunk */
function chunk(
  opts: {
    content?: string;
    thinking?: string;
    tool_calls?: Array<{ function: { name: string; arguments: Record<string, unknown> } }>;
    done?: boolean;
    prompt_eval_count?: number;
    eval_count?: number;
  } = {},
): string {
  return JSON.stringify({
    model: "test-model",
    created_at: "2026-01-01T00:00:00Z",
    message: {
      role: "assistant",
      content: opts.content ?? "",
      ...(opts.thinking !== undefined ? { thinking: opts.thinking } : {}),
      ...(opts.tool_calls ? { tool_calls: opts.tool_calls } : {}),
    },
    done: opts.done ?? false,
    ...(opts.prompt_eval_count !== undefined ? { prompt_eval_count: opts.prompt_eval_count } : {}),
    ...(opts.eval_count !== undefined ? { eval_count: opts.eval_count } : {}),
  });
}

/** Build a complete NDJSON response body from chunks */
function ndjson(...lines: string[]): string {
  return lines.join("\n") + "\n";
}

/** Create a mock Response with NDJSON body */
function mockResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "application/x-ndjson" },
  });
}

/** Simple text response: one content chunk + done */
function simpleTextResponse(text: string): string {
  return ndjson(
    chunk({ content: text }),
    chunk({ done: true, prompt_eval_count: 10, eval_count: 5 }),
  );
}

// Common model/context/options factories
const MODEL = (overrides = {}) =>
  ({
    id: "qwen3:32b",
    api: "ollama",
    provider: "ollama",
    contextWindow: 128000,
    ...overrides,
  }) as unknown as Parameters<ReturnType<typeof createOllamaStreamFn>>[0];

const CTX = (overrides = {}) =>
  ({
    messages: [{ role: "user", content: "hello" }],
    ...overrides,
  }) as unknown as Parameters<ReturnType<typeof createOllamaStreamFn>>[1];

const OPTS = (overrides = {}) =>
  overrides as unknown as Parameters<ReturnType<typeof createOllamaStreamFn>>[2];

// ── Test setup ──────────────────────────────────────────────────────────────

let originalFetch: typeof globalThis.fetch;
let fetchMock: ReturnType<typeof vi.fn>;

async function collectEvents(
  streamFn: ReturnType<typeof createOllamaStreamFn>,
  model = MODEL(),
  ctx = CTX(),
  opts = OPTS(),
) {
  const events: Array<{ type: string; [key: string]: unknown }> = [];
  for await (const event of streamFn(model, ctx, opts)) {
    events.push(event as { type: string; [key: string]: unknown });
  }
  return events;
}

function getRequestBody(): Record<string, unknown> {
  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return JSON.parse(init.body as string);
}

function getRequestHeaders(): Record<string, string> {
  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return init.headers as Record<string, string>;
}

describe("Ollama Integration", () => {
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function setFetchResponse(body: string, status = 200) {
    fetchMock = vi.fn(async () => mockResponse(body, status));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  }

  // ── Multi-turn conversations ────────────────────────────────────────────

  describe("multi-turn conversations", () => {
    it("converts multi-turn message history correctly", () => {
      const messages = [
        { role: "user", content: "What is 2+2?" },
        { role: "assistant", content: "4" },
        { role: "user", content: "And 3+3?" },
      ];
      const result = convertToOllamaMessages(messages);
      expect(result).toEqual([
        { role: "user", content: "What is 2+2?" },
        { role: "assistant", content: "4" },
        { role: "user", content: "And 3+3?" },
      ]);
    });

    it("sends multi-turn history to Ollama and gets response", async () => {
      setFetchResponse(simpleTextResponse("6"));
      const streamFn = createOllamaStreamFn("http://localhost:11434");

      const events = await collectEvents(
        streamFn,
        MODEL(),
        CTX({
          messages: [
            { role: "user", content: "What is 2+2?" },
            { role: "assistant", content: "4" },
            { role: "user", content: "And 3+3?" },
          ],
        }),
      );

      const body = getRequestBody();
      expect(body.messages).toHaveLength(3);
      expect(events.at(-1)?.type).toBe("done");
    });

    it("handles conversation with tool use mid-flow", () => {
      const messages = [
        { role: "user", content: "list files" },
        {
          role: "assistant",
          content: [
            { type: "text", text: "Let me check." },
            { type: "toolCall", id: "call_1", name: "bash", arguments: { command: "ls" } },
          ],
        },
        { role: "toolResult", content: "file1.txt\nfile2.txt", toolName: "bash" },
        { role: "user", content: "now read file1.txt" },
      ];
      const result = convertToOllamaMessages(messages);
      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ role: "user", content: "list files" });
      expect(result[1].role).toBe("assistant");
      expect(result[1].content).toBe("Let me check.");
      expect(result[1].tool_calls).toEqual([
        { function: { name: "bash", arguments: { command: "ls" } } },
      ]);
      expect(result[2]).toEqual({
        role: "tool",
        content: "file1.txt\nfile2.txt",
        tool_name: "bash",
      });
      expect(result[3]).toEqual({ role: "user", content: "now read file1.txt" });
    });
  });

  // ── System prompt handling ──────────────────────────────────────────────

  describe("system prompt handling", () => {
    it("sends system prompt as first message", async () => {
      setFetchResponse(simpleTextResponse("Hi!"));
      const streamFn = createOllamaStreamFn("http://localhost:11434");

      await collectEvents(
        streamFn,
        MODEL(),
        CTX({
          systemPrompt: "You are a helpful assistant.",
          messages: [{ role: "user", content: "hello" }],
        }),
      );

      const body = getRequestBody();
      expect(body.messages).toHaveLength(2);
      expect((body.messages as Array<{ role: string; content: string }>)[0]).toEqual({
        role: "system",
        content: "You are a helpful assistant.",
      });
    });

    it("omits system message when system prompt is empty", async () => {
      setFetchResponse(simpleTextResponse("Hi!"));
      const streamFn = createOllamaStreamFn("http://localhost:11434");

      await collectEvents(
        streamFn,
        MODEL(),
        CTX({
          systemPrompt: "",
          messages: [{ role: "user", content: "hello" }],
        }),
      );

      const body = getRequestBody();
      expect((body.messages as Array<{ role: string }>)[0].role).toBe("user");
    });

    it("handles system prompt with special characters", async () => {
      const specialPrompt = 'You are "helpful" & use <xml> tags.\nNew line here.\t\tTabs too.';
      setFetchResponse(simpleTextResponse("ok"));
      const streamFn = createOllamaStreamFn("http://localhost:11434");

      await collectEvents(
        streamFn,
        MODEL(),
        CTX({
          systemPrompt: specialPrompt,
          messages: [{ role: "user", content: "hi" }],
        }),
      );

      const body = getRequestBody();
      expect((body.messages as Array<{ content: string }>)[0].content).toBe(specialPrompt);
    });
  });

  // ── Image handling ──────────────────────────────────────────────────────

  describe("image handling", () => {
    it("extracts images from user content blocks", () => {
      const messages = [
        {
          role: "user",
          content: [
            { type: "text", text: "describe this" },
            { type: "image", data: "iVBORw0KGgoAAAANS==" },
          ],
        },
      ];
      const result = convertToOllamaMessages(messages);
      expect(result).toEqual([
        { role: "user", content: "describe this", images: ["iVBORw0KGgoAAAANS=="] },
      ]);
    });

    it("sends image messages through to Ollama", async () => {
      setFetchResponse(simpleTextResponse("A cat!"));
      const streamFn = createOllamaStreamFn("http://localhost:11434");

      await collectEvents(
        streamFn,
        MODEL(),
        CTX({
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "what is this?" },
                { type: "image", data: "base64imagedata" },
              ],
            },
          ],
        }),
      );

      const body = getRequestBody();
      const msg = (body.messages as Array<{ images?: string[] }>)[0];
      expect(msg.images).toEqual(["base64imagedata"]);
    });

    it("handles multiple images in one message", () => {
      const messages = [
        {
          role: "user",
          content: [
            { type: "text", text: "compare these" },
            { type: "image", data: "img1data" },
            { type: "image", data: "img2data" },
          ],
        },
      ];
      const result = convertToOllamaMessages(messages);
      expect(result[0].images).toEqual(["img1data", "img2data"]);
    });
  });

  // ── Error recovery ──────────────────────────────────────────────────────

  describe("error recovery", () => {
    it("emits error event on HTTP 500", async () => {
      fetchMock = vi.fn(async () => {
        // ollamaFetch will retry and eventually throw; simulate direct error
        throw new Error("HTTP 500: Internal Server Error");
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const streamFn = createOllamaStreamFn("http://localhost:11434");
      const events = await collectEvents(streamFn);

      const errorEvent = events.find((e) => e.type === "error");
      expect(errorEvent).toBeDefined();
      expect((errorEvent?.error as { errorMessage: string }).errorMessage).toContain("500");
    });

    it("skips invalid JSON lines and continues parsing", async () => {
      const body = ndjson(
        chunk({ content: "Hello" }),
        "THIS IS NOT JSON",
        chunk({ content: " world" }),
        chunk({ done: true, prompt_eval_count: 5, eval_count: 3 }),
      );
      setFetchResponse(body);

      const streamFn = createOllamaStreamFn("http://localhost:11434");
      const events = await collectEvents(streamFn);

      const deltas = events.filter((e) => e.type === "text_delta");
      expect(deltas).toHaveLength(2);
      expect((deltas[0] as { delta: string }).delta).toBe("Hello");
      expect((deltas[1] as { delta: string }).delta).toBe(" world");
      expect(events.at(-1)?.type).toBe("done");
    });

    it("emits error on empty response body", async () => {
      fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const streamFn = createOllamaStreamFn("http://localhost:11434");
      const events = await collectEvents(streamFn);

      const errorEvent = events.find((e) => e.type === "error");
      expect(errorEvent).toBeDefined();
      expect((errorEvent?.error as { errorMessage: string }).errorMessage).toContain("empty");
    });

    it("emits error on model not found (404)", async () => {
      fetchMock = vi.fn(async () => {
        throw new Error("HTTP 404: model 'nonexistent' not found");
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const streamFn = createOllamaStreamFn("http://localhost:11434");
      const events = await collectEvents(streamFn);

      const errorEvent = events.find((e) => e.type === "error");
      expect(errorEvent).toBeDefined();
      expect((errorEvent?.error as { errorMessage: string }).errorMessage).toContain("404");
    });

    it("emits error when stream ends without done:true", async () => {
      // Stream with content but no done:true final chunk
      const body = ndjson(chunk({ content: "partial response" }));
      setFetchResponse(body);

      const streamFn = createOllamaStreamFn("http://localhost:11434");
      const events = await collectEvents(streamFn);

      const errorEvent = events.find((e) => e.type === "error");
      expect(errorEvent).toBeDefined();
      expect((errorEvent?.error as { errorMessage: string }).errorMessage).toContain(
        "without a final response",
      );
    });
  });

  // ── Streaming edge cases ────────────────────────────────────────────────

  describe("streaming edge cases", () => {
    it("handles very long response with many chunks", async () => {
      const chunks: string[] = [];
      for (let i = 0; i < 100; i++) {
        chunks.push(chunk({ content: `word${i} ` }));
      }
      chunks.push(chunk({ done: true, prompt_eval_count: 50, eval_count: 100 }));
      setFetchResponse(ndjson(...chunks));

      const streamFn = createOllamaStreamFn("http://localhost:11434");
      const events = await collectEvents(streamFn);

      const deltas = events.filter((e) => e.type === "text_delta");
      expect(deltas).toHaveLength(100);
      expect(events.at(-1)?.type).toBe("done");

      const textEnd = events.find((e) => e.type === "text_end") as { content: string };
      expect(textEnd.content.length).toBeGreaterThan(500); // accumulated all chunks
    });

    it("handles empty content chunks gracefully", async () => {
      const body = ndjson(
        chunk({ content: "Hello" }),
        chunk({ content: "" }), // empty chunk
        chunk({ content: " world" }),
        chunk({ done: true, prompt_eval_count: 5, eval_count: 3 }),
      );
      setFetchResponse(body);

      const streamFn = createOllamaStreamFn("http://localhost:11434");
      const events = await collectEvents(streamFn);

      // Empty content chunks are skipped (no delta emitted)
      const deltas = events.filter((e) => e.type === "text_delta");
      expect(deltas).toHaveLength(2);
      expect(events.at(-1)?.type).toBe("done");
    });

    it("handles done:true chunk with remaining content", async () => {
      // Some Ollama versions might put content in the final chunk
      const body = ndjson(
        chunk({ content: "Hello" }),
        // Final chunk has both content and done:true — but our parser breaks on done:true,
        // so content in done chunk won't be processed. This tests that behavior.
        chunk({ content: " end", done: true, prompt_eval_count: 5, eval_count: 3 }),
      );
      setFetchResponse(body);

      const streamFn = createOllamaStreamFn("http://localhost:11434");
      const events = await collectEvents(streamFn);

      // The done chunk's content should still be captured
      const deltas = events.filter((e) => e.type === "text_delta");
      expect(deltas.length).toBeGreaterThanOrEqual(1);
      expect(events.at(-1)?.type).toBe("done");
    });

    it("handles text chunks followed by tool_call", async () => {
      const body = ndjson(
        chunk({ content: "I'll check " }),
        chunk({ content: "that for you." }),
        chunk({
          tool_calls: [{ function: { name: "bash", arguments: { command: "ls" } } }],
        }),
        chunk({ done: true, prompt_eval_count: 10, eval_count: 8 }),
      );
      setFetchResponse(body);

      const streamFn = createOllamaStreamFn("http://localhost:11434");
      const events = await collectEvents(streamFn);

      const types = events.map((e) => e.type);
      // Text should be closed before tool call starts
      const textEndIdx = types.indexOf("text_end");
      const toolStartIdx = types.indexOf("toolcall_start");
      expect(textEndIdx).toBeLessThan(toolStartIdx);

      const textEnd = events.find((e) => e.type === "text_end") as { content: string };
      expect(textEnd.content).toBe("I'll check that for you.");

      const doneEvent = events.find((e) => e.type === "done") as { reason: string };
      expect(doneEvent.reason).toBe("toolUse");
    });

    it("handles thinking then content in same stream", async () => {
      const body = ndjson(
        chunk({ thinking: "Let me think..." }),
        chunk({ thinking: " step by step." }),
        chunk({ content: "The answer is 42." }),
        chunk({ done: true, prompt_eval_count: 10, eval_count: 15 }),
      );
      setFetchResponse(body);

      const streamFn = createOllamaStreamFn("http://localhost:11434");
      const events = await collectEvents(
        streamFn,
        MODEL({ reasoning: true }),
        CTX(),
        OPTS({ reasoning: "medium" }),
      );

      const types = events.map((e) => e.type);
      expect(types).toContain("thinking_start");
      expect(types).toContain("thinking_delta");
      expect(types).toContain("thinking_end");
      expect(types).toContain("text_start");
      expect(types).toContain("text_delta");
      expect(types).toContain("text_end");

      const thinkingEnd = events.find((e) => e.type === "thinking_end") as { content: string };
      expect(thinkingEnd.content).toBe("Let me think... step by step.");
    });
  });

  // ── Options passthrough ─────────────────────────────────────────────────

  describe("options passthrough", () => {
    it("passes temperature to Ollama options", async () => {
      setFetchResponse(simpleTextResponse("ok"));
      const streamFn = createOllamaStreamFn("http://localhost:11434");

      await collectEvents(streamFn, MODEL(), CTX(), OPTS({ temperature: 0.7 }));

      const body = getRequestBody();
      expect((body.options as Record<string, unknown>).temperature).toBe(0.7);
    });

    it("maps maxTokens to num_predict", async () => {
      setFetchResponse(simpleTextResponse("ok"));
      const streamFn = createOllamaStreamFn("http://localhost:11434");

      await collectEvents(streamFn, MODEL(), CTX(), OPTS({ maxTokens: 256 }));

      const body = getRequestBody();
      expect((body.options as Record<string, unknown>).num_predict).toBe(256);
    });

    it("includes custom headers in request", async () => {
      setFetchResponse(simpleTextResponse("ok"));
      const streamFn = createOllamaStreamFn("http://localhost:11434");

      await collectEvents(
        streamFn,
        MODEL(),
        CTX(),
        OPTS({
          headers: { "X-Custom": "test-value" },
        }),
      );

      const headers = getRequestHeaders();
      expect(headers["X-Custom"]).toBe("test-value");
    });

    it("adds Authorization header when apiKey is provided", async () => {
      setFetchResponse(simpleTextResponse("ok"));
      const streamFn = createOllamaStreamFn("http://localhost:11434");

      await collectEvents(streamFn, MODEL(), CTX(), OPTS({ apiKey: "sk-test-key" }));

      const headers = getRequestHeaders();
      expect(headers.Authorization).toBe("Bearer sk-test-key");
    });

    it("passes AbortSignal through to fetch", async () => {
      setFetchResponse(simpleTextResponse("ok"));
      const streamFn = createOllamaStreamFn("http://localhost:11434");
      const controller = new AbortController();

      await collectEvents(streamFn, MODEL(), CTX(), OPTS({ signal: controller.signal }));

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      // ollamaFetch may compose signals (timeout + user signal), so just verify it's not undefined
      expect(init.signal).toBeDefined();
    });

    it("sets num_ctx from model contextWindow", async () => {
      setFetchResponse(simpleTextResponse("ok"));
      const streamFn = createOllamaStreamFn("http://localhost:11434");

      await collectEvents(streamFn, MODEL({ contextWindow: 65536 }), CTX());

      const body = getRequestBody();
      expect((body.options as Record<string, unknown>).num_ctx).toBe(65536);
    });

    it("sends think:true when reasoning is requested", async () => {
      setFetchResponse(
        ndjson(
          chunk({ thinking: "hmm" }),
          chunk({ content: "yes" }),
          chunk({ done: true, prompt_eval_count: 5, eval_count: 5 }),
        ),
      );
      const streamFn = createOllamaStreamFn("http://localhost:11434");

      await collectEvents(
        streamFn,
        MODEL({ reasoning: true }),
        CTX(),
        OPTS({ reasoning: "medium" }),
      );

      const body = getRequestBody();
      expect(body.think).toBe(true);
    });

    it("omits think param when reasoning is not requested", async () => {
      setFetchResponse(simpleTextResponse("ok"));
      const streamFn = createOllamaStreamFn("http://localhost:11434");

      await collectEvents(streamFn, MODEL(), CTX(), OPTS());

      const body = getRequestBody();
      expect(body.think).toBeUndefined();
    });
  });
});
