import type { Context, Model } from "@mariozechner/pi-ai/dist/types.js";
import { convertMessages } from "@mariozechner/pi-ai/dist/providers/google-shared.js";
import { describe, expect, it } from "vitest";

const makeGemini3Model = (id: string): Model<"google-generative-ai"> =>
  ({
    id,
    name: id,
    api: "google-generative-ai",
    provider: "google",
    baseUrl: "https://example.invalid",
    reasoning: true,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 8192,
  }) as Model<"google-generative-ai">;

describe("google-shared convertMessages — Gemini 3 unsigned tool calls", () => {
  it("uses dummy thought signature instead of downgrading to text", () => {
    const model = makeGemini3Model("gemini-3-pro-preview");
    const now = Date.now();
    const context = {
      messages: [
        { role: "user", content: "Hi", timestamp: now },
        {
          role: "assistant",
          content: [
            {
              type: "toolCall",
              id: "call_1",
              name: "bash",
              arguments: { command: "ls -la" },
              // No thoughtSignature: simulates Claude via Antigravity.
            },
          ],
          api: "google-gemini-cli",
          provider: "google-antigravity",
          model: "claude-sonnet-4-20250514",
          usage: {
            input: 0,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: 0,
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
          },
          stopReason: "stop",
          timestamp: now,
        },
      ],
    } as unknown as Context;

    const contents = convertMessages(model, context);

    // Find the model turn that should contain the tool call.
    const modelTurn = contents.find(
      (c) => c.role === "model" && c.parts?.some((p) => "functionCall" in p),
    );

    expect(modelTurn).toBeTruthy();

    const fcPart = modelTurn!.parts!.find((p) => "functionCall" in p)!;

    // Tool call is preserved as a native functionCall (NOT downgraded to text).
    expect(fcPart.functionCall).toBeTruthy();
    expect(fcPart.functionCall!.name).toBe("bash");
    expect(fcPart.functionCall!.args).toEqual({ command: "ls -la" });

    // Dummy signature applied so Gemini 3 accepts it.
    expect(fcPart.thoughtSignature).toBe("skip_thought_signature_validator");

    // No text downgrade artifacts.
    const hasHistoricalText = modelTurn!.parts!.some(
      (p) =>
        typeof (p as { text?: string }).text === "string" &&
        (p as { text: string }).text.includes("Historical context"),
    );
    expect(hasHistoricalText).toBe(false);
  });
});
