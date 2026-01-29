import { describe, expect, it } from "vitest";
import { resolveImplicitProviders } from "./models-config.providers.js";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("Poe provider", () => {
  it("should not include poe when no API key is configured", async () => {
    const agentDir = mkdtempSync(join(tmpdir(), "clawd-test-"));
    const providers = await resolveImplicitProviders({ agentDir });

    // Poe requires explicit configuration via POE_API_KEY env var or profile
    expect(providers?.poe).toBeUndefined();
  });

  it("should include poe when POE_API_KEY is set", async () => {
    const originalEnv = process.env.POE_API_KEY;
    process.env.POE_API_KEY = "test-poe-api-key";

    try {
      const agentDir = mkdtempSync(join(tmpdir(), "clawd-test-"));
      const providers = await resolveImplicitProviders({ agentDir });

      expect(providers?.poe).toBeDefined();
      expect(providers?.poe?.baseUrl).toBe("https://api.poe.com/v1");
      expect(providers?.poe?.api).toBe("openai-completions");
      expect(providers?.poe?.apiKey).toBe("POE_API_KEY");
      expect(Array.isArray(providers?.poe?.models)).toBe(true);
      expect(providers?.poe?.models?.length).toBeGreaterThan(0);

      // Verify some key models are present
      const modelIds = providers?.poe?.models?.map((m) => m.id) ?? [];
      expect(modelIds).toContain("gpt-5.2");
      expect(modelIds).toContain("claude-opus-4.5");
      expect(modelIds).toContain("gemini-3-pro");
      expect(modelIds).toContain("grok-4");
      expect(modelIds).toContain("deepseek-r1");
    } finally {
      if (originalEnv === undefined) {
        delete process.env.POE_API_KEY;
      } else {
        process.env.POE_API_KEY = originalEnv;
      }
    }
  });

  it("should have correct model configurations", async () => {
    const originalEnv = process.env.POE_API_KEY;
    process.env.POE_API_KEY = "test-poe-api-key";

    try {
      const agentDir = mkdtempSync(join(tmpdir(), "clawd-test-"));
      const providers = await resolveImplicitProviders({ agentDir });

      const models = providers?.poe?.models ?? [];

      // Check GPT-5.2 model
      const gpt52 = models.find((m) => m.id === "gpt-5.2");
      expect(gpt52).toBeDefined();
      expect(gpt52?.name).toBe("GPT-5.2");
      expect(gpt52?.reasoning).toBe(false);
      expect(gpt52?.input).toContain("text");
      expect(gpt52?.input).toContain("image");

      // Check Claude Opus 4.5 model
      const claudeOpus = models.find((m) => m.id === "claude-opus-4.5");
      expect(claudeOpus).toBeDefined();
      expect(claudeOpus?.name).toBe("Claude Opus 4.5");
      expect(claudeOpus?.contextWindow).toBe(200000);

      // Check a reasoning model
      const o3 = models.find((m) => m.id === "o3");
      expect(o3).toBeDefined();
      expect(o3?.reasoning).toBe(true);

      // Check DeepSeek R1 (reasoning model)
      const deepseekR1 = models.find((m) => m.id === "deepseek-r1");
      expect(deepseekR1).toBeDefined();
      expect(deepseekR1?.reasoning).toBe(true);
    } finally {
      if (originalEnv === undefined) {
        delete process.env.POE_API_KEY;
      } else {
        process.env.POE_API_KEY = originalEnv;
      }
    }
  });
});
