/**
 * Gemini embedding provider — uses plain fetch, no SDK.
 * Model: gemini-embedding-001 (3072 dimensions)
 */

import type { EmbeddingProvider } from "./types.js";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export class GeminiEmbeddingProvider implements EmbeddingProvider {
  readonly providerId = "gemini";
  readonly dimensions: number;

  constructor(
    private readonly apiKey: string,
    private readonly model: string = "gemini-embedding-001",
    dimensions: number = 3072,
  ) {
    this.dimensions = dimensions;
  }

  async embed(text: string): Promise<number[]> {
    const url = `${BASE_URL}/${this.model}:embedContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${this.model}`,
        content: { parts: [{ text }] },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Gemini embedContent failed (${response.status}): ${body.slice(0, 200)}`,
      );
    }

    const data = (await response.json()) as {
      embedding: { values: number[] };
    };
    return data.embedding.values;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    if (texts.length === 1) return [await this.embed(texts[0])];

    const url = `${BASE_URL}/${this.model}:batchEmbedContents?key=${this.apiKey}`;

    const requests = texts.map((text) => ({
      model: `models/${this.model}`,
      content: { parts: [{ text }] },
    }));

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requests }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Gemini batchEmbedContents failed (${response.status}): ${body.slice(0, 200)}`,
      );
    }

    const data = (await response.json()) as {
      embeddings: Array<{ values: number[] }>;
    };
    return data.embeddings.map((e) => e.values);
  }
}
