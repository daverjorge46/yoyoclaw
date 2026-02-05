/**
 * OpenAI embedding provider — uses plain fetch, no SDK.
 * Models: text-embedding-3-small (1536), text-embedding-3-large (3072)
 */

import type { EmbeddingProvider } from "./types.js";

const EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly providerId = "openai";
  readonly dimensions: number;

  constructor(
    private readonly apiKey: string,
    private readonly model: string = "text-embedding-3-small",
    dimensions: number = 1536,
  ) {
    this.dimensions = dimensions;
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetch(EMBEDDINGS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `OpenAI embeddings failed (${response.status}): ${body.slice(0, 200)}`,
      );
    }

    const data = (await response.json()) as {
      data: Array<{ embedding: number[] }>;
    };
    return data.data[0].embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    if (texts.length === 1) return [await this.embed(texts[0])];

    const response = await fetch(EMBEDDINGS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `OpenAI embeddings batch failed (${response.status}): ${body.slice(0, 200)}`,
      );
    }

    const data = (await response.json()) as {
      data: Array<{ embedding: number[]; index: number }>;
    };

    // OpenAI returns results sorted by index, but let's be safe
    const sorted = data.data.sort((a, b) => a.index - b.index);
    return sorted.map((d) => d.embedding);
  }
}
