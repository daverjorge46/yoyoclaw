import type { StreamFn } from "@mariozechner/pi-agent-core";
import { ollamaFetch } from "./ollama-retry.js";
import { OLLAMA_BASE_URL } from "./ollama-shared.js";
import { createOllamaStreamFn } from "./ollama-stream.js";

export interface OllamaProviderConfig {
  baseUrl?: string;
  apiKey?: string;
}

/** Resolve Ollama config. Priority: userConfig > OLLAMA_HOST env > default. */
export function resolveOllamaConfig(userConfig?: Record<string, unknown>): OllamaProviderConfig {
  const section = userConfig?.ollama as Record<string, unknown> | undefined;
  const configUrl = typeof section?.baseUrl === "string" ? section.baseUrl.trim() : "";
  return { baseUrl: configUrl || process.env.OLLAMA_HOST?.trim() || undefined };
}

/** Resolve effective base URL. Priority: model > provider > default. */
export function resolveOllamaBaseUrl(modelBaseUrl?: string, providerBaseUrl?: string): string {
  return (typeof modelBaseUrl === "string" ? modelBaseUrl.trim() : "")
    || (typeof providerBaseUrl === "string" ? providerBaseUrl.trim() : "")
    || OLLAMA_BASE_URL;
}

export interface OllamaProvider {
  streamFn: StreamFn;
  checkHealth: () => Promise<boolean>;
}

export function createOllamaProvider(config?: OllamaProviderConfig): OllamaProvider {
  const baseUrl = config?.baseUrl?.trim() || OLLAMA_BASE_URL;
  return {
    streamFn: createOllamaStreamFn(baseUrl),
    checkHealth: async () => {
      try {
        const res = await ollamaFetch(
          `${baseUrl.replace(/\/+$/, "")}/api/version`,
          { method: "GET" },
          { maxRetries: 1, timeoutMs: 5000 },
        );
        return res.ok;
      } catch { return false; }
    },
  };
}
