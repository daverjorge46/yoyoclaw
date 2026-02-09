// Lazy-load pi-coding-agent model metadata so we can infer context windows when
// the agent reports a model id. This includes custom models.json entries.

import { loadConfig } from "../config/config.js";
import { resolveOpenClawAgentDir } from "./agent-paths.js";
import { ensureOpenClawModelsJson } from "./models-config.js";

type ModelEntry = { id: string; contextWindow?: number };

// Known context window overrides for models with incorrect values in upstream catalogs.
// These values reflect the extended context windows available via beta or tier 4 access.
const KNOWN_CONTEXT_OVERRIDES: Record<string, number> = {
  // Claude 4.5 models support 1M context window (beta, tier 4+)
  // Source: https://platform.claude.com/docs/en/build-with-claude/context-windows
  "claude-sonnet-4-5": 1_000_000,
  "claude-opus-4-6": 1_000_000,
  "claude-sonnet-4": 1_000_000,
};

const MODEL_CACHE = new Map<string, number>();
const loadPromise = (async () => {
  try {
    const { discoverAuthStorage, discoverModels } = await import("./pi-model-discovery.js");
    const cfg = loadConfig();
    await ensureOpenClawModelsJson(cfg);
    const agentDir = resolveOpenClawAgentDir();
    const authStorage = discoverAuthStorage(agentDir);
    const modelRegistry = discoverModels(authStorage, agentDir);
    const models = modelRegistry.getAll() as ModelEntry[];
    for (const m of models) {
      if (!m?.id) {
        continue;
      }
      if (typeof m.contextWindow === "number" && m.contextWindow > 0) {
        MODEL_CACHE.set(m.id, m.contextWindow);
      }
    }
  } catch {
    // If pi-ai isn't available, leave cache empty; lookup will fall back.
  }
})();

export function lookupContextTokens(modelId?: string): number | undefined {
  if (!modelId) {
    return undefined;
  }
  // Check known overrides first (for models with incorrect upstream values)
  const override = KNOWN_CONTEXT_OVERRIDES[modelId];
  if (override) {
    return override;
  }
  // Best-effort: kick off loading, but don't block.
  void loadPromise;
  return MODEL_CACHE.get(modelId);
}
