import { describe, expect, it, vi, beforeEach } from "vitest";

// We need to test lookupContextTokens with a pre-populated cache.
// Since MODEL_CACHE is module-private, we mock the discovery to populate it.

describe("lookupContextTokens provider-prefix stripping", () => {
  let lookupContextTokens: (modelId?: string) => number | undefined;

  beforeEach(async () => {
    // Reset module cache to re-run the IIFE
    vi.resetModules();

    // Mock the discovery to populate MODEL_CACHE with bare IDs
    vi.doMock("./pi-model-discovery.js", () => ({
      discoverAuthStorage: () => ({}),
      discoverModels: () => ({
        getAll: () => [
          { id: "eu.anthropic.claude-opus-4-6-v1", contextWindow: 1_000_000 },
          { id: "claude-3-5-sonnet-20241022", contextWindow: 200_000 },
        ],
      }),
    }));
    vi.doMock("../config/config.js", () => ({ loadConfig: () => ({}) }));
    vi.doMock("./agent-paths.js", () => ({ resolveOpenClawAgentDir: () => "/tmp" }));
    vi.doMock("./models-config.js", () => ({ ensureOpenClawModelsJson: async () => {} }));

    const mod = await import("./context.js");
    lookupContextTokens = mod.lookupContextTokens;

    // Allow the async IIFE to settle
    await new Promise((r) => setTimeout(r, 50));
  });

  it("returns exact match for bare model ID", () => {
    expect(lookupContextTokens("eu.anthropic.claude-opus-4-6-v1")).toBe(1_000_000);
  });

  it("strips provider prefix and finds the model (#14332)", () => {
    expect(lookupContextTokens("amazon-bedrock/eu.anthropic.claude-opus-4-6-v1")).toBe(1_000_000);
  });

  it("returns undefined for unknown model", () => {
    expect(lookupContextTokens("unknown/model")).toBeUndefined();
  });

  it("returns undefined for undefined input", () => {
    expect(lookupContextTokens(undefined)).toBeUndefined();
  });
});
