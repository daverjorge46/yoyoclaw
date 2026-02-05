/**
 * memory-smart config schema, types, and validation.
 */

import { homedir } from "node:os";
import { join } from "node:path";

// ============================================================================
// Types
// ============================================================================

export type EmbeddingProviderType = "gemini" | "openai" | "auto";

export type EmbeddingConfig = {
  provider: EmbeddingProviderType;
  apiKey: string;
  model: string;
};

export type CoreMemoryConfig = {
  enabled: boolean;
  maxTokens: number;
  filePath: string;
};

export type EntitiesConfig = {
  enabled: boolean;
  autoCreate: boolean;
  minMentionsToCreate: number;
};

export type AutoRecallConfig = {
  enabled: boolean;
  maxResults: number;
  maxTokens: number;
  minScore: number;
  entityBoost: boolean;
};

export type ExtractionConfig = {
  enabled: boolean;
  provider: string;
  model: string;
  apiKey: string;
  maxFactsPerConversation: number;
  minConversationLength: number;
};

export type AutoCaptureConfig = {
  enabled: boolean;
};

export type ReflectionConfig = {
  enabled: boolean;
  intervalMinutes: number;
  maxOperationsPerRun: number;
  deduplicateThreshold: number;
  decayDays: number;
  pruneThreshold: number;
};

export type StoreConfig = {
  dbPath: string;
};

export type SmartMemoryConfig = {
  embedding: EmbeddingConfig;
  coreMemory: CoreMemoryConfig;
  entities: EntitiesConfig;
  autoRecall: AutoRecallConfig;
  extraction: ExtractionConfig;
  autoCapture: AutoCaptureConfig;
  reflection: ReflectionConfig;
  store: StoreConfig;
};

/** @deprecated Use SmartMemoryConfig */
export type MemorySmartConfig = SmartMemoryConfig;

// ============================================================================
// Constants
// ============================================================================

export const MEMORY_CATEGORIES = [
  "preference",
  "decision",
  "fact",
  "entity",
  "rule",
  "project",
  "relationship",
  "other",
] as const;
export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

export const ENTITY_TYPES = [
  "person",
  "project",
  "tool",
  "place",
  "organization",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

const DEFAULT_DB_PATH = join(homedir(), ".openclaw", "memory", "smart-memory");

// Model → dimension mapping
const EMBEDDING_DIMENSIONS: Record<string, number> = {
  // Gemini
  "gemini-embedding-001": 3072,
  // OpenAI
  "text-embedding-3-small": 1536,
  "text-embedding-3-large": 3072,
};

// Default models per provider
const DEFAULT_MODELS: Record<string, string> = {
  gemini: "gemini-embedding-001",
  openai: "text-embedding-3-small",
};

// ============================================================================
// Helpers
// ============================================================================

export function vectorDimsForModel(model: string): number {
  const dims = EMBEDDING_DIMENSIONS[model];
  if (!dims) {
    throw new Error(
      `Unsupported embedding model: ${model}. Supported: ${Object.keys(EMBEDDING_DIMENSIONS).join(", ")}`,
    );
  }
  return dims;
}

function resolveEnvVars(value: string): string {
  return value.replace(/\$\{([^}]+)\}/g, (_, envVar) => {
    const envValue = process.env[envVar];
    if (!envValue) {
      throw new Error(`Environment variable ${envVar} is not set`);
    }
    return envValue;
  });
}

/**
 * Auto-detect which embedding provider to use based on available API keys.
 */
function autoDetectProvider(): { provider: "gemini" | "openai"; apiKey: string } {
  // Check Gemini first (free, generous quota)
  const geminiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (geminiKey) {
    return { provider: "gemini", apiKey: geminiKey };
  }

  // Then OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return { provider: "openai", apiKey: openaiKey };
  }

  throw new Error(
    "memory-smart: No embedding API key found. Set GEMINI_API_KEY or OPENAI_API_KEY, " +
      'or configure embedding.provider and embedding.apiKey explicitly.',
  );
}

// ============================================================================
// Config Parser
// ============================================================================

export const memorySmartConfigSchema = {
  parse(value: unknown): SmartMemoryConfig {
    const cfg = (value && typeof value === "object" && !Array.isArray(value))
      ? (value as Record<string, unknown>)
      : {};

    // --- Embedding ---
    const embeddingRaw = (cfg.embedding as Record<string, unknown>) ?? {};
    let provider = (embeddingRaw.provider as EmbeddingProviderType) ?? "auto";
    let apiKey = typeof embeddingRaw.apiKey === "string" ? resolveEnvVars(embeddingRaw.apiKey) : "";

    if (provider === "auto" || (!apiKey && provider !== "auto")) {
      const detected = autoDetectProvider();
      if (provider === "auto") provider = detected.provider;
      if (!apiKey) apiKey = detected.apiKey;
    }

    if (!apiKey) {
      throw new Error("memory-smart: embedding.apiKey is required");
    }

    const model =
      typeof embeddingRaw.model === "string"
        ? embeddingRaw.model
        : DEFAULT_MODELS[provider] ?? DEFAULT_MODELS.gemini;

    // Validate model dimensions exist
    vectorDimsForModel(model);

    // --- Core Memory ---
    const coreRaw = (cfg.coreMemory as Record<string, unknown>) ?? {};
    const coreMemory: CoreMemoryConfig = {
      enabled: coreRaw.enabled !== false,
      maxTokens: typeof coreRaw.maxTokens === "number" ? coreRaw.maxTokens : 1500,
      filePath: typeof coreRaw.filePath === "string" ? coreRaw.filePath : "memory/core.md",
    };

    // --- Entities ---
    const entRaw = (cfg.entities as Record<string, unknown>) ?? {};
    const entities: EntitiesConfig = {
      enabled: entRaw.enabled !== false,
      autoCreate: entRaw.autoCreate !== false,
      minMentionsToCreate: typeof entRaw.minMentionsToCreate === "number" ? entRaw.minMentionsToCreate : 3,
    };

    // --- Auto Recall ---
    const arRaw = (cfg.autoRecall as Record<string, unknown>) ?? {};
    const autoRecall: AutoRecallConfig = {
      enabled: arRaw.enabled !== false,
      maxResults: typeof arRaw.maxResults === "number" ? arRaw.maxResults : 5,
      maxTokens: typeof arRaw.maxTokens === "number" ? arRaw.maxTokens : 2000,
      minScore: typeof arRaw.minScore === "number" ? arRaw.minScore : 0.3,
      entityBoost: arRaw.entityBoost !== false,
    };

    // --- Extraction ---
    const exRaw = (cfg.extraction as Record<string, unknown>) ?? {};
    // Resolve extraction API key: fallback to embedding API key
    let exApiKey = typeof exRaw.apiKey === "string" ? resolveEnvVars(exRaw.apiKey) : "";
    if (!exApiKey) {
      // Fallback: use Gemini key from env (extraction always uses Gemini)
      exApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || apiKey;
    }

    const extraction: ExtractionConfig = {
      enabled: exRaw.enabled !== false,
      provider: typeof exRaw.provider === "string" ? exRaw.provider : "gemini",
      model: typeof exRaw.model === "string" ? exRaw.model : "gemini-2.5-flash",
      apiKey: exApiKey,
      maxFactsPerConversation: typeof exRaw.maxFactsPerConversation === "number" ? exRaw.maxFactsPerConversation : 10,
      minConversationLength: typeof exRaw.minConversationLength === "number" ? exRaw.minConversationLength : 3,
    };

    // --- Auto Capture ---
    const acRaw = (cfg.autoCapture as Record<string, unknown>) ?? {};
    const autoCapture: AutoCaptureConfig = {
      enabled: acRaw.enabled !== false,
    };

    // --- Reflection ---
    const rfRaw = (cfg.reflection as Record<string, unknown>) ?? {};
    const reflection: ReflectionConfig = {
      enabled: rfRaw.enabled !== false,
      intervalMinutes: typeof rfRaw.intervalMinutes === "number" ? rfRaw.intervalMinutes : 360,
      maxOperationsPerRun: typeof rfRaw.maxOperationsPerRun === "number" ? rfRaw.maxOperationsPerRun : 50,
      deduplicateThreshold: typeof rfRaw.deduplicateThreshold === "number" ? rfRaw.deduplicateThreshold : 0.92,
      decayDays: typeof rfRaw.decayDays === "number" ? rfRaw.decayDays : 90,
      pruneThreshold: typeof rfRaw.pruneThreshold === "number" ? rfRaw.pruneThreshold : 0.1,
    };

    // --- Store ---
    const storeRaw = (cfg.store as Record<string, unknown>) ?? {};
    const store: StoreConfig = {
      dbPath: typeof storeRaw.dbPath === "string" ? storeRaw.dbPath : DEFAULT_DB_PATH,
    };

    return {
      embedding: { provider: provider as "gemini" | "openai", apiKey, model },
      coreMemory,
      entities,
      autoRecall,
      extraction,
      autoCapture,
      reflection,
      store,
    };
  },
};
