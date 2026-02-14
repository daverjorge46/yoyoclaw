/**
 * pre-route.ts — Lightweight LLM-based message router
 *
 * Makes a single Ollama call with ONLY the user's message + a tiny
 * classification prompt (~300 tokens total). Returns a model reference
 * string that OpenClaw uses for the actual agent run.
 *
 * This runs BEFORE system prompt assembly, tool loading, or any of
 * the heavy context injection. The local model never sees any of that.
 *
 * Install: Drop into src/hooks/ and wire into the reply handler.
 * Config: Add `router` section to openclaw.json (see below).
 */

import { type OpenClawConfig } from "../config/config.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RouterConfig {
  /** Enable/disable the router. Default: false */
  enabled: boolean;

  /** Ollama base URL. Default: "http://localhost:11434" */
  ollamaBaseUrl?: string;

  /** Local model to use for classification. Default: "qwen3:4b-instruct-2507-q4_K_M" */
  model?: string;

  /** Timeout in ms for the classification call. Default: 10000 (10s) */
  timeoutMs?: number;

  /**
   * Routing table: maps tier labels to OpenClaw model references.
   * The local model outputs one of these tier names.
   *
   * Example:
   *   { "1": "minimax/MiniMax-Text-01",
   *     "2": "anthropic/claude-haiku-4-5-20251001",
   *     "3": "anthropic/claude-opus-4-6" }
   */
  tiers: Record<string, string>;

  /** Default tier if classification fails or is unrecognized. */
  defaultTier: string;

  /**
   * Optional: override the system prompt sent to the classifier.
   * If not set, the built-in ROUTER_PROMPT is used.
   */
  systemPrompt?: string;
}

export interface RouteResult {
  /** The tier label returned by the classifier (e.g. "code") */
  tier: string;

  /** The resolved OpenClaw model reference (e.g. "anthropic/claude-haiku-4-5-20251001") */
  modelRef: string;

  /** Classification latency in ms */
  latencyMs: number;

  /** Whether this was a fallback (classification failed or unrecognized) */
  fallback: boolean;
}

// ---------------------------------------------------------------------------
// Default classification prompt
// ---------------------------------------------------------------------------

const ROUTER_PROMPT = `Classify the message into category 1, 2, or 3. Reply with ONLY the number.
1 = casual (greetings, simple questions, small talk, quick tasks)
2 = code (programming, debugging, scripts, technical errors, code review)
3 = complex (architecture, planning, deep analysis, reports, essays)

"hey" → 1
"fix this TypeError" → 2
"design a system" → 3
"what time is it" → 1
"write a python function" → 2
"compare approaches in detail" → 3
"thanks" → 1
"review my PR" → 2
"plan a new project" → 3

Reply ONLY the number.`;

// ---------------------------------------------------------------------------
// Router implementation
// ---------------------------------------------------------------------------

/**
 * Classify a user message by calling a local LLM via Ollama.
 * Returns the tier and resolved model reference.
 */
export async function routeMessage(
  message: string,
  config: RouterConfig,
): Promise<RouteResult> {
  const start = Date.now();
  const baseUrl = config.ollamaBaseUrl ?? "http://localhost:11434";
  const model = config.model ?? "qwen3:4b-instruct-2507-q4_K_M";
  const timeoutMs = config.timeoutMs ?? 10_000;
  const systemPrompt = config.systemPrompt ?? ROUTER_PROMPT;

  const tierNames = Object.keys(config.tiers);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        system: systemPrompt,
        prompt: message,
        stream: false,
        think: false,
        options: {
          num_predict: 8,
          temperature: 0.0,
          top_k: 1,
          num_ctx: 1024,
          stop: ["\n", ".", ",", " "],
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}`);
    }

    const data = (await response.json()) as { response: string };
    const raw = data.response.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

    const latencyMs = Date.now() - start;

    // Match first character against tier numbers (1, 2, 3)
    const firstChar = raw.charAt(0);
    if (firstChar && config.tiers[firstChar]) {
      return {
        tier: firstChar,
        modelRef: config.tiers[firstChar],
        latencyMs,
        fallback: false,
      };
    }

    // Fallback: check if response contains any tier key
    const matchedTier = tierNames.find((t) => raw.includes(t));

    if (matchedTier) {
      return {
        tier: matchedTier,
        modelRef: config.tiers[matchedTier],
        latencyMs,
        fallback: false,
      };
    }

    // Unrecognized output — use default
    console.warn(
      `[pre-route] Unrecognized tier "${raw}" from local model, using default "${config.defaultTier}"`,
    );
    return {
      tier: config.defaultTier,
      modelRef: config.tiers[config.defaultTier],
      latencyMs,
      fallback: true,
    };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const errMsg = err instanceof Error ? err.message : String(err);

    // On any failure (timeout, connection refused, etc), fall back to default
    console.warn(
      `[pre-route] Classification failed (${errMsg}), using default "${config.defaultTier}"`,
    );
    return {
      tier: config.defaultTier,
      modelRef: config.tiers[config.defaultTier],
      latencyMs,
      fallback: true,
    };
  }
}

// ---------------------------------------------------------------------------
// Config resolver
// ---------------------------------------------------------------------------

/**
 * Extract router config from openclaw.json.
 * Expected location: config.router (top-level)
 *
 * Returns null if router is not configured or disabled.
 */
export function resolveRouterConfig(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: OpenClawConfig | Record<string, any>,
): RouterConfig | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const router = (config as any).router;
  if (!router || router.enabled === false) return null;

  if (!router.tiers || typeof router.tiers !== "object") {
    console.warn("[pre-route] Router enabled but no tiers configured, disabling");
    return null;
  }

  if (!router.defaultTier || !router.tiers[router.defaultTier]) {
    console.warn("[pre-route] Router defaultTier missing or not in tiers, disabling");
    return null;
  }

  return {
    enabled: true,
    ollamaBaseUrl: router.ollamaBaseUrl,
    model: router.model,
    timeoutMs: router.timeoutMs,
    tiers: router.tiers,
    defaultTier: router.defaultTier,
    systemPrompt: router.systemPrompt,
  };
}

// ---------------------------------------------------------------------------
// parseModelRef helper (matches OpenClaw convention: "provider/modelId")
// ---------------------------------------------------------------------------

export function parseRoutedModelRef(modelRef: string): {
  provider: string;
  model: string;
} {
  const slash = modelRef.indexOf("/");
  if (slash === -1) {
    return { provider: "anthropic", model: modelRef };
  }
  return {
    provider: modelRef.slice(0, slash),
    model: modelRef.slice(slash + 1),
  };
}
