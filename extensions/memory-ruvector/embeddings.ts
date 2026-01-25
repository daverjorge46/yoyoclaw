/**
 * Embedding Provider Abstraction for ruvector Memory Plugin
 *
 * Supports multiple embedding providers:
 * - OpenAI (text-embedding-3-small, text-embedding-3-large)
 * - Voyage AI (voyage-3, voyage-3-large, voyage-code-3)
 * - Local (via compatible OpenAI-style API)
 */

import type { RuvectorConfig } from "./config.js";

// ============================================================================
// Types
// ============================================================================

export interface EmbeddingProvider {
  /** Generate embedding vector for text */
  embed(text: string): Promise<number[]>;
  /** Generate embeddings for multiple texts (batch) */
  embedBatch(texts: string[]): Promise<number[][]>;
  /** Get the dimension of output vectors */
  dimension: number;
}

type EmbeddingResponse = {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
};

// ============================================================================
// OpenAI-Compatible Provider
// ============================================================================

/**
 * Generic OpenAI-compatible embedding provider.
 * Works with OpenAI, Voyage AI, and local servers with OpenAI-compatible API.
 */
export class OpenAICompatibleEmbeddings implements EmbeddingProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  readonly dimension: number;

  constructor(config: {
    baseUrl: string;
    apiKey: string;
    model: string;
    dimension: number;
  }) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.dimension = config.dimension;
  }

  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text]);
    const embedding = results[0];
    if (!embedding) {
      throw new Error("Embedding API returned empty results for single text input");
    }
    return embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    // Use AbortController for timeout (30 second default)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: texts,
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Embedding API request timed out after 30 seconds");
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(
        `Embedding API error (${response.status}): ${errorText}`,
      );
    }

    const data = (await response.json()) as unknown;

    // Validate response structure
    if (
      !data ||
      typeof data !== "object" ||
      !("data" in data) ||
      !Array.isArray((data as EmbeddingResponse).data)
    ) {
      throw new Error(
        "Invalid embedding API response: missing or malformed 'data' field",
      );
    }

    const responseData = data as EmbeddingResponse;

    if (responseData.data.length !== texts.length) {
      throw new Error(
        `Embedding count mismatch: expected ${texts.length}, got ${responseData.data.length}`,
      );
    }

    // Sort by index to ensure correct order
    const sorted = responseData.data.sort((a, b) => a.index - b.index);

    // Validate embedding dimensions
    for (let i = 0; i < sorted.length; i++) {
      const embedding = sorted[i].embedding;
      if (!Array.isArray(embedding)) {
        throw new Error(`Invalid embedding at index ${i}: not an array`);
      }
      if (embedding.length !== this.dimension) {
        throw new Error(
          `Embedding dimension mismatch at index ${i}: expected ${this.dimension}, got ${embedding.length}`,
        );
      }
    }

    return sorted.map((item) => item.embedding);
  }
}

// ============================================================================
// Provider Factory
// ============================================================================

const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  voyage: "https://api.voyageai.com/v1",
};

/**
 * Create an embedding provider from config.
 */
export function createEmbeddingProvider(
  config: RuvectorConfig["embedding"],
  dimension: number,
): EmbeddingProvider {
  const provider = config.provider;

  // Resolve base URL
  let baseUrl = config.baseUrl;
  if (!baseUrl) {
    baseUrl = PROVIDER_BASE_URLS[provider];
    if (!baseUrl) {
      throw new Error(
        `No default base URL for provider: ${provider}. Please specify embedding.baseUrl`,
      );
    }
  }

  // API key required for remote providers
  if (provider !== "local" && !config.apiKey) {
    throw new Error(`API key required for embedding provider: ${provider}`);
  }

  return new OpenAICompatibleEmbeddings({
    baseUrl,
    apiKey: config.apiKey ?? "",
    model: config.model ?? "text-embedding-3-small",
    dimension,
  });
}
