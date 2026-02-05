/**
 * Embedding provider factory — creates the right provider based on config.
 */

import type { EmbeddingConfig } from "../config.js";
import { vectorDimsForModel } from "../config.js";
import type { EmbeddingProvider } from "./types.js";
import { GeminiEmbeddingProvider } from "./gemini.js";
import { OpenAIEmbeddingProvider } from "./openai.js";

export function createEmbeddingProvider(config: EmbeddingConfig): EmbeddingProvider {
  const dims = vectorDimsForModel(config.model);

  switch (config.provider) {
    case "gemini":
      return new GeminiEmbeddingProvider(config.apiKey, config.model, dims);

    case "openai":
      return new OpenAIEmbeddingProvider(config.apiKey, config.model, dims);

    default:
      throw new Error(
        `Unsupported embedding provider: ${config.provider}. Use "gemini" or "openai".`,
      );
  }
}
