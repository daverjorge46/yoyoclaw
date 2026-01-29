import type { ProviderPlugin } from "../../../src/plugins/types.js";

export const eigenCloudProvider: ProviderPlugin = {
  id: "eigencloud",
  label: "EigenCloud (EigenAI)",
  docsPath: "/providers/eigencloud",
  aliases: ["eigenai", "eigen"],
  envVars: ["EIGENCLOUD_API_KEY"],
  auth: [
    {
      id: "eigencloud-api-key",
      label: "EigenCloud API Key",
      hint: "Get your key at developers.eigencloud.xyz",
      kind: "api_key",
      async run(_ctx) {
        const apiKey = process.env.EIGENCLOUD_API_KEY;
        if (!apiKey) {
          return {
            profiles: [],
            notes: [
              "Set EIGENCLOUD_API_KEY env var. Apply at developers.eigencloud.xyz",
            ],
          };
        }
        return {
          profiles: [
            {
              profileId: "eigencloud",
              credential: { type: "api_key", key: apiKey },
            },
          ],
          configPatch: {
            models: {
              providers: {
                eigencloud: {
                  baseUrl: "https://eigenai.eigencloud.xyz/v1",
                  apiKey,
                  api: "openai-completions",
                  headers: {
                    "x-api-key": apiKey,
                  },
                  models: [
                    {
                      id: "gpt-oss-120b-f16",
                      name: "EigenAI GPT-OSS 120B",
                      reasoning: false,
                      input: ["text"],
                      contextWindow: 128_000,
                      maxTokens: 8_192,
                      cost: {
                        input: 0,
                        output: 0,
                        cacheRead: 0,
                        cacheWrite: 0,
                      },
                    },
                  ],
                },
              },
            },
          } as any,
          defaultModel: "gpt-oss-120b-f16",
        };
      },
    },
  ],
};
