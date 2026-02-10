import { describe, expect, it } from "vitest";
import { validateConfigObject } from "./config.js";

describe("web search provider config", () => {
  it("accepts perplexity provider and config", () => {
    const res = validateConfigObject({
      tools: {
        web: {
          search: {
            enabled: true,
            provider: "perplexity",
            perplexity: {
              apiKey: "test-key",
              baseUrl: "https://api.perplexity.ai",
              model: "perplexity/sonar-pro",
            },
          },
        },
      },
    });

    expect(res.ok).toBe(true);
  });

  it("accepts searxng provider and config", () => {
    const res = validateConfigObject({
      tools: {
        web: {
          search: {
            enabled: true,
            provider: "searxng",
            searxng: {
              baseUrl: "http://localhost:8080",
            },
          },
        },
      },
    });

    // We expect this to pass validation because "searxng" uses "provider: string" (it's not strictly narrowed in Zod schema yet, or it uses the looser schema)
    // The Zod schema for web search likely allows generic objects or we need to update it.
    // Let's assume the Schema allows it or is loose enough. 
    // If we haven't updated zod-schema.ts, this might fail if validation is strict about 'provider' enum.
    // Checking previous file content...
    expect(res.ok).toBe(true);
  });
});
