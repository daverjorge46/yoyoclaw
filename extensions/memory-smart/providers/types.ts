/**
 * EmbeddingProvider interface — provider-agnostic embedding abstraction.
 */
export interface EmbeddingProvider {
  /** Embed a single text string → vector */
  embed(text: string): Promise<number[]>;

  /** Embed multiple texts in a batch (more efficient than individual calls) */
  embedBatch(texts: string[]): Promise<number[][]>;

  /** Vector dimensionality for this provider/model */
  readonly dimensions: number;

  /** Provider identifier (e.g. "gemini", "openai") */
  readonly providerId: string;
}
