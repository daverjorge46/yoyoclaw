import type { OpenClawConfig } from "../config/config.js";
import type { MemoryMongoDBDeploymentProfile } from "../config/types.memory.js";
import type { WizardPrompter } from "./prompts.js";
import { resolveOpenClawPackageName } from "../infra/openclaw-root.js";

/**
 * Interactive memory backend selection for the onboarding wizard.
 * Only shown in advanced mode. Returns updated config with memory backend settings.
 *
 * When running as @romiluz/clawmongo, MongoDB is the recommended default.
 * When running as openclaw (upstream), builtin (SQLite) remains the default.
 */
export async function setupMemoryBackend(
  config: OpenClawConfig,
  prompter: WizardPrompter,
): Promise<OpenClawConfig> {
  const packageName = await resolveOpenClawPackageName();
  const isClawMongo = packageName === "@romiluz/clawmongo";
  const defaultBackend = config.memory?.backend ?? (isClawMongo ? "mongodb" : "builtin");

  const backend = await prompter.select({
    message: "Memory backend",
    options: [
      {
        value: "builtin" as const,
        label: "Built-in (SQLite)",
        hint: isClawMongo
          ? "Basic. Local-only, no multi-instance support."
          : "Default. Works everywhere, no setup needed.",
      },
      {
        value: "mongodb" as const,
        label: isClawMongo ? "MongoDB (Recommended)" : "MongoDB",
        hint: isClawMongo
          ? "ACID transactions, vector search, TTL, analytics, change streams."
          : "Scalable. Requires MongoDB 8.0+ connection.",
      },
      {
        value: "qmd" as const,
        label: "QMD",
        hint: "Advanced. Local semantic search with qmd binary.",
      },
    ],
    initialValue: defaultBackend,
  });

  if (backend === "builtin") {
    return config;
  }

  if (backend === "mongodb") {
    return setupMongoDBMemory(config, prompter, isClawMongo);
  }

  // QMD — set backend, existing QMD config flow handles the rest
  return {
    ...config,
    memory: { ...config.memory, backend: "qmd" },
  };
}

async function setupMongoDBMemory(
  config: OpenClawConfig,
  prompter: WizardPrompter,
  isClawMongo: boolean,
): Promise<OpenClawConfig> {
  const existingUri = config.memory?.mongodb?.uri?.trim();
  const uri = await prompter.text({
    message: "MongoDB connection URI",
    placeholder: isClawMongo
      ? "mongodb://localhost:27017/openclaw"
      : "mongodb+srv://user:pass@cluster.mongodb.net/",
    initialValue: existingUri,
    validate: (value) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return "URI is required for MongoDB backend";
      }
      if (!trimmed.startsWith("mongodb://") && !trimmed.startsWith("mongodb+srv://")) {
        return "URI must start with mongodb:// or mongodb+srv://";
      }
      return undefined;
    },
  });

  // Auto-detect deployment profile based on URI
  const trimmedUri = uri.trim();
  const isAtlas = trimmedUri.includes(".mongodb.net");
  const suggestedProfile: MemoryMongoDBDeploymentProfile = isAtlas
    ? "atlas-default"
    : "community-mongot";

  const profile = await prompter.select<MemoryMongoDBDeploymentProfile>({
    message: "Deployment profile",
    options: [
      {
        value: "atlas-default",
        label: "Atlas (standard)",
        hint: "Full Atlas Search + Vector Search",
      },
      {
        value: "atlas-m0",
        label: "Atlas (free tier M0)",
        hint: "Limited to 3 search indexes total",
      },
      {
        value: "community-mongot",
        label: "Community + mongot",
        hint: "Self-hosted with mongot search engine",
      },
      {
        value: "community-bare",
        label: "Community (bare)",
        hint: "No mongot. Keyword search via $text only",
      },
    ],
    initialValue: suggestedProfile,
  });

  // Auto-set embeddingMode based on profile
  const isCommunity = profile === "community-mongot" || profile === "community-bare";
  const embeddingMode = isCommunity ? "managed" : "automated";

  const baseResult: OpenClawConfig = {
    ...config,
    memory: {
      ...config.memory,
      backend: "mongodb",
      mongodb: {
        ...config.memory?.mongodb,
        uri: trimmedUri,
        deploymentProfile: profile,
        embeddingMode,
      },
    },
  };

  if (!isCommunity) {
    return baseResult;
  }

  // community-bare: no mongot → text search only, no vector search possible
  if (profile === "community-bare") {
    await prompter.note(
      [
        "Text/keyword search via $text is available out of the box.",
        "Vector/semantic search requires mongot (Community + mongot profile).",
      ].join("\n"),
      "Search Capabilities",
    );
    return baseResult;
  }

  // community-mongot: vector search available with managed embeddings
  const wantVectorSearch = await prompter.confirm({
    message: "Enable vector/semantic search? (requires an embedding API key)",
    initialValue: true,
  });

  if (!wantVectorSearch) {
    await prompter.note(
      [
        "Text search will work out of the box.",
        `Enable later: ${isClawMongo ? "clawmongo" : "openclaw"} configure → Memory`,
      ].join("\n"),
      "Text Search Only",
    );
    return baseResult;
  }

  const embeddingProvider = await prompter.select<"openai" | "gemini" | "voyage" | "local">({
    message: "Embedding provider for vector search",
    options: [
      { value: "voyage", label: "Voyage AI", hint: "Best for code retrieval" },
      { value: "openai", label: "OpenAI", hint: "text-embedding-3-small" },
      { value: "gemini", label: "Google Gemini", hint: "text-embedding-004" },
      { value: "local", label: "Local (no API key needed)", hint: "On-device via node-llama-cpp" },
    ],
    initialValue: "voyage",
  });

  if (embeddingProvider === "local") {
    return {
      ...baseResult,
      agents: {
        ...baseResult.agents,
        defaults: {
          ...baseResult.agents?.defaults,
          memorySearch: {
            ...baseResult.agents?.defaults?.memorySearch,
            provider: "local",
          },
        },
      },
    };
  }

  const ENV_VAR_MAP: Record<string, string> = {
    voyage: "VOYAGE_API_KEY",
    openai: "OPENAI_API_KEY",
    gemini: "GEMINI_API_KEY",
  };
  const envVar = ENV_VAR_MAP[embeddingProvider] ?? "API_KEY";

  const rawKey = await prompter.text({
    message: envVar,
    placeholder: "sk-... (leave blank if already set as env var)",
    validate: () => undefined,
  });
  const apiKey = rawKey?.trim() || undefined;

  if (!apiKey) {
    await prompter.note(
      `Set ${envVar} in your environment before starting the gateway.`,
      "Reminder",
    );
  }

  return {
    ...baseResult,
    agents: {
      ...baseResult.agents,
      defaults: {
        ...baseResult.agents?.defaults,
        memorySearch: {
          ...baseResult.agents?.defaults?.memorySearch,
          provider: embeddingProvider,
          ...(apiKey
            ? { remote: { ...baseResult.agents?.defaults?.memorySearch?.remote, apiKey } }
            : {}),
        },
      },
    },
  };
}
