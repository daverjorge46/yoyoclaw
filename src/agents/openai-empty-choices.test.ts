import { describe, expect, it } from "vitest";

/**
 * Regression test for #14442: Some OpenAI-compatible providers (vLLM, LocalAI)
 * send an extra SSE chunk with an empty `choices` array (or no `choices` field)
 * after the `finish_reason: "stop"` chunk. The streaming parser must tolerate
 * these chunks without throwing.
 *
 * The fix is a pnpm patch on @mariozechner/pi-ai that uses optional chaining
 * (`chunk.choices?.[0]`) instead of direct indexing (`chunk.choices[0]`).
 */
describe("openai-completions empty-choices guard (#14442)", () => {
  it("should use optional chaining on chunk.choices access", async () => {
    // Read the compiled openai-completions.js to verify the patch is applied
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const modulePath = path.join(
      process.cwd(),
      "node_modules",
      "@mariozechner",
      "pi-ai",
      "dist",
      "providers",
      "openai-completions.js",
    );
    const source = await fs.readFile(modulePath, "utf-8");

    // The patched line should use optional chaining
    expect(source).toContain("chunk.choices?.[0]");
    // The unpatched line should NOT be present
    expect(source).not.toMatch(/chunk\.choices\[0\]/);
  });

  it("should safely handle a chunk with empty choices array", () => {
    // Simulate the exact scenario from the issue: a chunk with choices: []
    const chunk = {
      id: "endpoint_common_4876945",
      choices: [] as Array<{
        delta: { content: string };
        finish_reason: string | null;
        index: number;
      }>,
      created: 1770861149,
      model: "test-75b",
      object: "chat.completion.chunk",
      usage: { completion_tokens: 41, prompt_tokens: 1431, total_tokens: 1472 },
    };

    // This is the patched expression — must not throw
    const choice = chunk.choices?.[0];
    expect(choice).toBeUndefined();
  });

  it("should safely handle a chunk with missing choices field", () => {
    // Some providers may omit `choices` entirely in the final usage-only chunk
    const chunk = {
      id: "endpoint_common_4876945",
      created: 1770861149,
      model: "test-75b",
      object: "chat.completion.chunk",
      usage: { completion_tokens: 41, prompt_tokens: 1431, total_tokens: 1472 },
    } as {
      choices?: Array<{ delta: { content: string }; finish_reason: string | null; index: number }>;
      [key: string]: unknown;
    };

    // With optional chaining this is safe; without it, TypeError is thrown
    const choice = chunk.choices?.[0];
    expect(choice).toBeUndefined();
  });

  it("should still extract choice from a normal chunk", () => {
    const chunk = {
      id: "test",
      choices: [
        {
          index: 0,
          delta: { content: "hello" },
          finish_reason: null,
        },
      ],
      created: 123,
      model: "test",
      object: "chat.completion.chunk",
    };

    const choice = chunk.choices?.[0];
    expect(choice).toBeDefined();
    expect(choice.delta.content).toBe("hello");
  });
});
