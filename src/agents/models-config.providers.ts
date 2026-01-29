import type { MoltbotConfig } from "../config/config.js";
import type { ModelDefinitionConfig } from "../config/types.models.js";
import {
  DEFAULT_COPILOT_API_BASE_URL,
  resolveCopilotApiToken,
} from "../providers/github-copilot-token.js";
import { ensureAuthProfileStore, listProfilesForProvider } from "./auth-profiles.js";
import { resolveAwsSdkEnvVarName, resolveEnvApiKey } from "./model-auth.js";
import { discoverBedrockModels } from "./bedrock-discovery.js";
import {
  buildSyntheticModelDefinition,
  SYNTHETIC_BASE_URL,
  SYNTHETIC_MODEL_CATALOG,
} from "./synthetic-models.js";
import { discoverVeniceModels, VENICE_BASE_URL } from "./venice-models.js";

type ModelsConfig = NonNullable<MoltbotConfig["models"]>;
export type ProviderConfig = NonNullable<ModelsConfig["providers"]>[string];

const MINIMAX_API_BASE_URL = "https://api.minimax.chat/v1";
const MINIMAX_DEFAULT_MODEL_ID = "MiniMax-M2.1";
const MINIMAX_DEFAULT_VISION_MODEL_ID = "MiniMax-VL-01";
const MINIMAX_DEFAULT_CONTEXT_WINDOW = 200000;
const MINIMAX_DEFAULT_MAX_TOKENS = 8192;
// Pricing: MiniMax doesn't publish public rates. Override in models.json for accurate costs.
const MINIMAX_API_COST = {
  input: 15,
  output: 60,
  cacheRead: 2,
  cacheWrite: 10,
};

const MOONSHOT_BASE_URL = "https://api.moonshot.ai/v1";
const MOONSHOT_DEFAULT_MODEL_ID = "kimi-k2.5";
const MOONSHOT_DEFAULT_CONTEXT_WINDOW = 256000;
const MOONSHOT_DEFAULT_MAX_TOKENS = 8192;
const MOONSHOT_DEFAULT_COST = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
};
const KIMI_CODE_BASE_URL = "https://api.kimi.com/coding/v1";
const KIMI_CODE_MODEL_ID = "kimi-for-coding";
const KIMI_CODE_CONTEXT_WINDOW = 262144;
const KIMI_CODE_MAX_TOKENS = 32768;
const KIMI_CODE_HEADERS = { "User-Agent": "KimiCLI/0.77" } as const;
const KIMI_CODE_COMPAT = { supportsDeveloperRole: false } as const;
const KIMI_CODE_DEFAULT_COST = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
};

const QWEN_PORTAL_BASE_URL = "https://portal.qwen.ai/v1";
const QWEN_PORTAL_OAUTH_PLACEHOLDER = "qwen-oauth";
const QWEN_PORTAL_DEFAULT_CONTEXT_WINDOW = 128000;
const QWEN_PORTAL_DEFAULT_MAX_TOKENS = 8192;
const QWEN_PORTAL_DEFAULT_COST = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
};

const OLLAMA_BASE_URL = "http://127.0.0.1:11434/v1";
const OLLAMA_API_BASE_URL = "http://127.0.0.1:11434";
const OLLAMA_DEFAULT_CONTEXT_WINDOW = 128000;
const OLLAMA_DEFAULT_MAX_TOKENS = 8192;
const OLLAMA_DEFAULT_COST = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
};

// Poe API configuration
// Official OpenAI-compatible API: https://creator.poe.com/docs/api
// API Key: https://poe.com/api_key (requires Poe subscription)
const POE_BASE_URL = "https://api.poe.com/v1";
const POE_DEFAULT_CONTEXT_WINDOW = 128000;
const POE_DEFAULT_MAX_TOKENS = 8192;

// Poe model catalog - comprehensive list of available LLM models
// Pricing is in Poe points per million tokens (approximate)
const POE_MODEL_CATALOG: Array<{
  id: string;
  name: string;
  reasoning: boolean;
  input: readonly ("text" | "image")[];
  contextWindow: number;
  maxTokens: number;
  cost: { input: number; output: number; cacheRead: number; cacheWrite: number };
}> = [
  // OpenAI GPT-5 Series
  {
    id: "gpt-5.2-instant",
    name: "GPT-5.2 Instant",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 128000,
    maxTokens: 16384,
    cost: { input: 1.6, output: 13, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "gpt-5.2",
    name: "GPT-5.2",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 128000,
    maxTokens: 16384,
    cost: { input: 1.6, output: 13, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "gpt-5.2-pro",
    name: "GPT-5.2 Pro",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 128000,
    maxTokens: 16384,
    cost: { input: 19, output: 150, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "gpt-5.2-codex",
    name: "GPT-5.2 Codex",
    reasoning: false,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 16384,
    cost: { input: 1.6, output: 13, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "gpt-5.1",
    name: "GPT-5.1",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 128000,
    maxTokens: 16384,
    cost: { input: 1.1, output: 9, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "gpt-5.1-instant",
    name: "GPT-5.1 Instant",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 128000,
    maxTokens: 16384,
    cost: { input: 1.1, output: 9, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "gpt-5.1-codex",
    name: "GPT-5.1 Codex",
    reasoning: false,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 16384,
    cost: { input: 1.1, output: 9, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "gpt-5",
    name: "GPT-5",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 128000,
    maxTokens: 16384,
    cost: { input: 1.1, output: 9, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "gpt-5-pro",
    name: "GPT-5 Pro",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 128000,
    maxTokens: 16384,
    cost: { input: 14, output: 110, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "gpt-5-mini",
    name: "GPT-5 Mini",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 128000,
    maxTokens: 16384,
    cost: { input: 0.22, output: 1.8, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "gpt-5-nano",
    name: "GPT-5 Nano",
    reasoning: false,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
    cost: { input: 0.05, output: 0.36, cacheRead: 0, cacheWrite: 0 },
  },
  // OpenAI GPT-4 Series
  {
    id: "gpt-4.1",
    name: "GPT-4.1",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 128000,
    maxTokens: 16384,
    cost: { input: 1.8, output: 7.2, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "gpt-4.1-mini",
    name: "GPT-4.1 Mini",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 128000,
    maxTokens: 16384,
    cost: { input: 0.36, output: 1.4, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "gpt-4.1-nano",
    name: "GPT-4.1 Nano",
    reasoning: false,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
    cost: { input: 0.09, output: 0.36, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 128000,
    maxTokens: 16384,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 128000,
    maxTokens: 16384,
    cost: { input: 0.14, output: 0.54, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "chatgpt-4o-latest",
    name: "ChatGPT-4o Latest",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 128000,
    maxTokens: 16384,
    cost: { input: 4.5, output: 14, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "gpt-4o-search",
    name: "GPT-4o Search",
    reasoning: false,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 16384,
    cost: { input: 2.2, output: 9, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 128000,
    maxTokens: 4096,
    cost: { input: 9, output: 27, cacheRead: 0, cacheWrite: 0 },
  },
  // OpenAI o-Series (Reasoning)
  {
    id: "o4-mini",
    name: "o4 Mini",
    reasoning: true,
    input: ["text", "image"],
    contextWindow: 128000,
    maxTokens: 65536,
    cost: { input: 0.99, output: 4, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "o3",
    name: "o3",
    reasoning: true,
    input: ["text", "image"],
    contextWindow: 128000,
    maxTokens: 65536,
    cost: { input: 1.8, output: 7.2, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "o3-pro",
    name: "o3 Pro",
    reasoning: true,
    input: ["text", "image"],
    contextWindow: 128000,
    maxTokens: 65536,
    cost: { input: 18, output: 72, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "o3-mini",
    name: "o3 Mini",
    reasoning: true,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 65536,
    cost: { input: 0.99, output: 4, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "o3-deep-research",
    name: "o3 Deep Research",
    reasoning: true,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 65536,
    cost: { input: 9, output: 36, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "o1",
    name: "o1",
    reasoning: true,
    input: ["text", "image"],
    contextWindow: 128000,
    maxTokens: 32768,
    cost: { input: 14, output: 54, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "o1-pro",
    name: "o1 Pro",
    reasoning: true,
    input: ["text", "image"],
    contextWindow: 128000,
    maxTokens: 32768,
    cost: { input: 140, output: 540, cacheRead: 0, cacheWrite: 0 },
  },
  // Anthropic Claude Series
  {
    id: "claude-opus-4.5",
    name: "Claude Opus 4.5",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 200000,
    maxTokens: 8192,
    cost: { input: 4.3, output: 21, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 200000,
    maxTokens: 8192,
    cost: { input: 2.6, output: 13, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "claude-haiku-4.5",
    name: "Claude Haiku 4.5",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 200000,
    maxTokens: 8192,
    cost: { input: 0.85, output: 4.3, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "claude-opus-4.1",
    name: "Claude Opus 4.1",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 200000,
    maxTokens: 8192,
    cost: { input: 13, output: 64, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "claude-opus-4",
    name: "Claude Opus 4",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 200000,
    maxTokens: 8192,
    cost: { input: 13, output: 64, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "claude-sonnet-4",
    name: "Claude Sonnet 4",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 200000,
    maxTokens: 8192,
    cost: { input: 2.6, output: 13, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "claude-sonnet-3.7",
    name: "Claude Sonnet 3.7",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 200000,
    maxTokens: 8192,
    cost: { input: 2.6, output: 13, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "claude-sonnet-3.5",
    name: "Claude Sonnet 3.5",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 200000,
    maxTokens: 8192,
    cost: { input: 2.6, output: 13, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "claude-haiku-3.5",
    name: "Claude Haiku 3.5",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 200000,
    maxTokens: 8192,
    cost: { input: 0.68, output: 3.4, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "claude-haiku-3",
    name: "Claude Haiku 3",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 200000,
    maxTokens: 4096,
    cost: { input: 0.21, output: 1.1, cacheRead: 0, cacheWrite: 0 },
  },
  // Google Gemini Series
  {
    id: "gemini-3-pro",
    name: "Gemini 3 Pro",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 1000000,
    maxTokens: 8192,
    cost: { input: 1.6, output: 9.6, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "gemini-3-flash",
    name: "Gemini 3 Flash",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 1000000,
    maxTokens: 8192,
    cost: { input: 0.4, output: 2.4, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 1000000,
    maxTokens: 8192,
    cost: { input: 0.87, output: 7, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 1000000,
    maxTokens: 8192,
    cost: { input: 0.21, output: 1.8, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 1000000,
    maxTokens: 8192,
    cost: { input: 0.07, output: 0.28, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 1000000,
    maxTokens: 8192,
    cost: { input: 0.1, output: 0.42, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "gemini-deep-research",
    name: "Gemini Deep Research",
    reasoning: true,
    input: ["text"],
    contextWindow: 1000000,
    maxTokens: 8192,
    cost: { input: 1.6, output: 9.6, cacheRead: 0, cacheWrite: 0 },
  },
  // XAI Grok Series
  {
    id: "grok-4",
    name: "Grok 4",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 128000,
    maxTokens: 8192,
    cost: { input: 3, output: 15, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "grok-4.1-fast-reasoning",
    name: "Grok 4.1 Fast Reasoning",
    reasoning: true,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "grok-4-fast-reasoning",
    name: "Grok 4 Fast Reasoning",
    reasoning: true,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
    cost: { input: 0.2, output: 0.5, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "grok-4-fast-non-reasoning",
    name: "Grok 4 Fast Non-Reasoning",
    reasoning: false,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
    cost: { input: 0.2, output: 0.5, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "grok-3",
    name: "Grok 3",
    reasoning: false,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "grok-3-mini",
    name: "Grok 3 Mini",
    reasoning: false,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
  // DeepSeek Series
  {
    id: "deepseek-r1",
    name: "DeepSeek R1",
    reasoning: true,
    input: ["text"],
    contextWindow: 64000,
    maxTokens: 8192,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "deepseek-v3.2",
    name: "DeepSeek V3.2",
    reasoning: false,
    input: ["text"],
    contextWindow: 64000,
    maxTokens: 8192,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "deepseek-v3.1",
    name: "DeepSeek V3.1",
    reasoning: false,
    input: ["text"],
    contextWindow: 64000,
    maxTokens: 8192,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "deepseek-v3",
    name: "DeepSeek V3",
    reasoning: false,
    input: ["text"],
    contextWindow: 64000,
    maxTokens: 8192,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "deepseek-prover-v2",
    name: "DeepSeek Prover V2",
    reasoning: true,
    input: ["text"],
    contextWindow: 64000,
    maxTokens: 8192,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
  // Meta Llama Series
  {
    id: "llama-3.3-70b",
    name: "Llama 3.3 70B",
    reasoning: false,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "llama-3.1-405b-fp16",
    name: "Llama 3.1 405B",
    reasoning: false,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "llama-3.1-70b-t",
    name: "Llama 3.1 70B",
    reasoning: false,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "llama-4-maverick-t",
    name: "Llama 4 Maverick",
    reasoning: false,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "llama-4-scout-t",
    name: "Llama 4 Scout",
    reasoning: false,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
  // Qwen Series
  {
    id: "qwen3-max",
    name: "Qwen3 Max",
    reasoning: false,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "qwen3-max-thinking",
    name: "Qwen3 Max Thinking",
    reasoning: true,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "qwen3-coder",
    name: "Qwen3 Coder",
    reasoning: false,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "kimi-k2",
    name: "Kimi K2",
    reasoning: false,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "kimi-k2-thinking",
    name: "Kimi K2 Thinking",
    reasoning: true,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
  // GLM Series
  {
    id: "glm-4.7",
    name: "GLM 4.7",
    reasoning: false,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "glm-4.6",
    name: "GLM 4.6",
    reasoning: false,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "glm-4.6v",
    name: "GLM 4.6 Vision",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 128000,
    maxTokens: 8192,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
  // Mistral Series
  {
    id: "mistral-medium",
    name: "Mistral Medium",
    reasoning: false,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
    cost: { input: 2.7, output: 8.1, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "mistral-large-2",
    name: "Mistral Large 2",
    reasoning: false,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
    cost: { input: 3, output: 9, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "mistral-small-3",
    name: "Mistral Small 3",
    reasoning: false,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
    cost: { input: 0.1, output: 0.3, cacheRead: 0, cacheWrite: 0 },
  },
  // MiniMax Series
  {
    id: "minimax-m2.1",
    name: "MiniMax M2.1",
    reasoning: false,
    input: ["text"],
    contextWindow: 200000,
    maxTokens: 8192,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "minimax-m2",
    name: "MiniMax M2",
    reasoning: false,
    input: ["text"],
    contextWindow: 200000,
    maxTokens: 8192,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
  // Search Models
  {
    id: "perplexity-sonar",
    name: "Perplexity Sonar",
    reasoning: false,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "perplexity-sonar-pro",
    name: "Perplexity Sonar Pro",
    reasoning: false,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "perplexity-deep-research",
    name: "Perplexity Deep Research",
    reasoning: true,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
  // Reka Series
  {
    id: "reka-core",
    name: "Reka Core",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 128000,
    maxTokens: 8192,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "reka-flash",
    name: "Reka Flash",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 128000,
    maxTokens: 8192,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "reka-research",
    name: "Reka Research",
    reasoning: true,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
];

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    family?: string;
    parameter_size?: string;
  };
}

interface OllamaTagsResponse {
  models: OllamaModel[];
}

async function discoverOllamaModels(): Promise<ModelDefinitionConfig[]> {
  // Skip Ollama discovery in test environments
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return [];
  }
  try {
    const response = await fetch(`${OLLAMA_API_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.warn(`Failed to discover Ollama models: ${response.status}`);
      return [];
    }
    const data = (await response.json()) as OllamaTagsResponse;
    if (!data.models || data.models.length === 0) {
      console.warn("No Ollama models found on local instance");
      return [];
    }
    return data.models.map((model) => {
      const modelId = model.name;
      const isReasoning =
        modelId.toLowerCase().includes("r1") || modelId.toLowerCase().includes("reasoning");
      return {
        id: modelId,
        name: modelId,
        reasoning: isReasoning,
        input: ["text"],
        cost: OLLAMA_DEFAULT_COST,
        contextWindow: OLLAMA_DEFAULT_CONTEXT_WINDOW,
        maxTokens: OLLAMA_DEFAULT_MAX_TOKENS,
      };
    });
  } catch (error) {
    console.warn(`Failed to discover Ollama models: ${String(error)}`);
    return [];
  }
}

function normalizeApiKeyConfig(value: string): string {
  const trimmed = value.trim();
  const match = /^\$\{([A-Z0-9_]+)\}$/.exec(trimmed);
  return match?.[1] ?? trimmed;
}

function resolveEnvApiKeyVarName(provider: string): string | undefined {
  const resolved = resolveEnvApiKey(provider);
  if (!resolved) return undefined;
  const match = /^(?:env: |shell env: )([A-Z0-9_]+)$/.exec(resolved.source);
  return match ? match[1] : undefined;
}

function resolveAwsSdkApiKeyVarName(): string {
  return resolveAwsSdkEnvVarName() ?? "AWS_PROFILE";
}

function resolveApiKeyFromProfiles(params: {
  provider: string;
  store: ReturnType<typeof ensureAuthProfileStore>;
}): string | undefined {
  const ids = listProfilesForProvider(params.store, params.provider);
  for (const id of ids) {
    const cred = params.store.profiles[id];
    if (!cred) continue;
    if (cred.type === "api_key") return cred.key;
    if (cred.type === "token") return cred.token;
  }
  return undefined;
}

export function normalizeGoogleModelId(id: string): string {
  if (id === "gemini-3-pro") return "gemini-3-pro-preview";
  if (id === "gemini-3-flash") return "gemini-3-flash-preview";
  return id;
}

function normalizeGoogleProvider(provider: ProviderConfig): ProviderConfig {
  let mutated = false;
  const models = provider.models.map((model) => {
    const nextId = normalizeGoogleModelId(model.id);
    if (nextId === model.id) return model;
    mutated = true;
    return { ...model, id: nextId };
  });
  return mutated ? { ...provider, models } : provider;
}

export function normalizeProviders(params: {
  providers: ModelsConfig["providers"];
  agentDir: string;
}): ModelsConfig["providers"] {
  const { providers } = params;
  if (!providers) return providers;
  const authStore = ensureAuthProfileStore(params.agentDir, {
    allowKeychainPrompt: false,
  });
  let mutated = false;
  const next: Record<string, ProviderConfig> = {};

  for (const [key, provider] of Object.entries(providers)) {
    const normalizedKey = key.trim();
    let normalizedProvider = provider;

    // Fix common misconfig: apiKey set to "${ENV_VAR}" instead of "ENV_VAR".
    if (
      normalizedProvider.apiKey &&
      normalizeApiKeyConfig(normalizedProvider.apiKey) !== normalizedProvider.apiKey
    ) {
      mutated = true;
      normalizedProvider = {
        ...normalizedProvider,
        apiKey: normalizeApiKeyConfig(normalizedProvider.apiKey),
      };
    }

    // If a provider defines models, pi's ModelRegistry requires apiKey to be set.
    // Fill it from the environment or auth profiles when possible.
    const hasModels =
      Array.isArray(normalizedProvider.models) && normalizedProvider.models.length > 0;
    if (hasModels && !normalizedProvider.apiKey?.trim()) {
      const authMode =
        normalizedProvider.auth ?? (normalizedKey === "amazon-bedrock" ? "aws-sdk" : undefined);
      if (authMode === "aws-sdk") {
        const apiKey = resolveAwsSdkApiKeyVarName();
        mutated = true;
        normalizedProvider = { ...normalizedProvider, apiKey };
      } else {
        const fromEnv = resolveEnvApiKeyVarName(normalizedKey);
        const fromProfiles = resolveApiKeyFromProfiles({
          provider: normalizedKey,
          store: authStore,
        });
        const apiKey = fromEnv ?? fromProfiles;
        if (apiKey?.trim()) {
          mutated = true;
          normalizedProvider = { ...normalizedProvider, apiKey };
        }
      }
    }

    if (normalizedKey === "google") {
      const googleNormalized = normalizeGoogleProvider(normalizedProvider);
      if (googleNormalized !== normalizedProvider) mutated = true;
      normalizedProvider = googleNormalized;
    }

    next[key] = normalizedProvider;
  }

  return mutated ? next : providers;
}

function buildMinimaxProvider(): ProviderConfig {
  return {
    baseUrl: MINIMAX_API_BASE_URL,
    api: "openai-completions",
    models: [
      {
        id: MINIMAX_DEFAULT_MODEL_ID,
        name: "MiniMax M2.1",
        reasoning: false,
        input: ["text"],
        cost: MINIMAX_API_COST,
        contextWindow: MINIMAX_DEFAULT_CONTEXT_WINDOW,
        maxTokens: MINIMAX_DEFAULT_MAX_TOKENS,
      },
      {
        id: MINIMAX_DEFAULT_VISION_MODEL_ID,
        name: "MiniMax VL 01",
        reasoning: false,
        input: ["text", "image"],
        cost: MINIMAX_API_COST,
        contextWindow: MINIMAX_DEFAULT_CONTEXT_WINDOW,
        maxTokens: MINIMAX_DEFAULT_MAX_TOKENS,
      },
    ],
  };
}

function buildMoonshotProvider(): ProviderConfig {
  return {
    baseUrl: MOONSHOT_BASE_URL,
    api: "openai-completions",
    models: [
      {
        id: MOONSHOT_DEFAULT_MODEL_ID,
        name: "Kimi K2.5",
        reasoning: false,
        input: ["text"],
        cost: MOONSHOT_DEFAULT_COST,
        contextWindow: MOONSHOT_DEFAULT_CONTEXT_WINDOW,
        maxTokens: MOONSHOT_DEFAULT_MAX_TOKENS,
      },
    ],
  };
}

function buildKimiCodeProvider(): ProviderConfig {
  return {
    baseUrl: KIMI_CODE_BASE_URL,
    api: "openai-completions",
    models: [
      {
        id: KIMI_CODE_MODEL_ID,
        name: "Kimi For Coding",
        reasoning: true,
        input: ["text"],
        cost: KIMI_CODE_DEFAULT_COST,
        contextWindow: KIMI_CODE_CONTEXT_WINDOW,
        maxTokens: KIMI_CODE_MAX_TOKENS,
        headers: KIMI_CODE_HEADERS,
        compat: KIMI_CODE_COMPAT,
      },
    ],
  };
}

function buildQwenPortalProvider(): ProviderConfig {
  return {
    baseUrl: QWEN_PORTAL_BASE_URL,
    api: "openai-completions",
    models: [
      {
        id: "coder-model",
        name: "Qwen Coder",
        reasoning: false,
        input: ["text"],
        cost: QWEN_PORTAL_DEFAULT_COST,
        contextWindow: QWEN_PORTAL_DEFAULT_CONTEXT_WINDOW,
        maxTokens: QWEN_PORTAL_DEFAULT_MAX_TOKENS,
      },
      {
        id: "vision-model",
        name: "Qwen Vision",
        reasoning: false,
        input: ["text", "image"],
        cost: QWEN_PORTAL_DEFAULT_COST,
        contextWindow: QWEN_PORTAL_DEFAULT_CONTEXT_WINDOW,
        maxTokens: QWEN_PORTAL_DEFAULT_MAX_TOKENS,
      },
    ],
  };
}

function buildSyntheticProvider(): ProviderConfig {
  return {
    baseUrl: SYNTHETIC_BASE_URL,
    api: "anthropic-messages",
    models: SYNTHETIC_MODEL_CATALOG.map(buildSyntheticModelDefinition),
  };
}

async function buildVeniceProvider(): Promise<ProviderConfig> {
  const models = await discoverVeniceModels();
  return {
    baseUrl: VENICE_BASE_URL,
    api: "openai-completions",
    models,
  };
}

async function buildOllamaProvider(): Promise<ProviderConfig> {
  const models = await discoverOllamaModels();
  return {
    baseUrl: OLLAMA_BASE_URL,
    api: "openai-completions",
    models,
  };
}

function buildPoeProvider(): ProviderConfig {
  return {
    baseUrl: POE_BASE_URL,
    api: "openai-completions",
    models: POE_MODEL_CATALOG.map((model) => ({
      id: model.id,
      name: model.name,
      reasoning: model.reasoning,
      input: [...model.input] as ("text" | "image")[],
      cost: model.cost,
      contextWindow: model.contextWindow,
      maxTokens: model.maxTokens,
    })),
  };
}

export async function resolveImplicitProviders(params: {
  agentDir: string;
}): Promise<ModelsConfig["providers"]> {
  const providers: Record<string, ProviderConfig> = {};
  const authStore = ensureAuthProfileStore(params.agentDir, {
    allowKeychainPrompt: false,
  });

  const minimaxKey =
    resolveEnvApiKeyVarName("minimax") ??
    resolveApiKeyFromProfiles({ provider: "minimax", store: authStore });
  if (minimaxKey) {
    providers.minimax = { ...buildMinimaxProvider(), apiKey: minimaxKey };
  }

  const moonshotKey =
    resolveEnvApiKeyVarName("moonshot") ??
    resolveApiKeyFromProfiles({ provider: "moonshot", store: authStore });
  if (moonshotKey) {
    providers.moonshot = { ...buildMoonshotProvider(), apiKey: moonshotKey };
  }

  const kimiCodeKey =
    resolveEnvApiKeyVarName("kimi-code") ??
    resolveApiKeyFromProfiles({ provider: "kimi-code", store: authStore });
  if (kimiCodeKey) {
    providers["kimi-code"] = { ...buildKimiCodeProvider(), apiKey: kimiCodeKey };
  }

  const syntheticKey =
    resolveEnvApiKeyVarName("synthetic") ??
    resolveApiKeyFromProfiles({ provider: "synthetic", store: authStore });
  if (syntheticKey) {
    providers.synthetic = { ...buildSyntheticProvider(), apiKey: syntheticKey };
  }

  const veniceKey =
    resolveEnvApiKeyVarName("venice") ??
    resolveApiKeyFromProfiles({ provider: "venice", store: authStore });
  if (veniceKey) {
    providers.venice = { ...(await buildVeniceProvider()), apiKey: veniceKey };
  }

  const qwenProfiles = listProfilesForProvider(authStore, "qwen-portal");
  if (qwenProfiles.length > 0) {
    providers["qwen-portal"] = {
      ...buildQwenPortalProvider(),
      apiKey: QWEN_PORTAL_OAUTH_PLACEHOLDER,
    };
  }

  // Ollama provider - only add if explicitly configured
  const ollamaKey =
    resolveEnvApiKeyVarName("ollama") ??
    resolveApiKeyFromProfiles({ provider: "ollama", store: authStore });
  if (ollamaKey) {
    providers.ollama = { ...(await buildOllamaProvider()), apiKey: ollamaKey };
  }

  // Poe provider - OpenAI-compatible API for accessing multiple LLM providers
  // API Key: https://poe.com/api_key (requires Poe subscription)
  const poeKey =
    resolveEnvApiKeyVarName("poe") ??
    resolveApiKeyFromProfiles({ provider: "poe", store: authStore });
  if (poeKey) {
    providers.poe = { ...buildPoeProvider(), apiKey: poeKey };
  }

  return providers;
}

export async function resolveImplicitCopilotProvider(params: {
  agentDir: string;
  env?: NodeJS.ProcessEnv;
}): Promise<ProviderConfig | null> {
  const env = params.env ?? process.env;
  const authStore = ensureAuthProfileStore(params.agentDir, { allowKeychainPrompt: false });
  const hasProfile = listProfilesForProvider(authStore, "github-copilot").length > 0;
  const envToken = env.COPILOT_GITHUB_TOKEN ?? env.GH_TOKEN ?? env.GITHUB_TOKEN;
  const githubToken = (envToken ?? "").trim();

  if (!hasProfile && !githubToken) return null;

  let selectedGithubToken = githubToken;
  if (!selectedGithubToken && hasProfile) {
    // Use the first available profile as a default for discovery (it will be
    // re-resolved per-run by the embedded runner).
    const profileId = listProfilesForProvider(authStore, "github-copilot")[0];
    const profile = profileId ? authStore.profiles[profileId] : undefined;
    if (profile && profile.type === "token") {
      selectedGithubToken = profile.token;
    }
  }

  let baseUrl = DEFAULT_COPILOT_API_BASE_URL;
  if (selectedGithubToken) {
    try {
      const token = await resolveCopilotApiToken({
        githubToken: selectedGithubToken,
        env,
      });
      baseUrl = token.baseUrl;
    } catch {
      baseUrl = DEFAULT_COPILOT_API_BASE_URL;
    }
  }

  // pi-coding-agent's ModelRegistry marks a model "available" only if its
  // `AuthStorage` has auth configured for that provider (via auth.json/env/etc).
  // Our Copilot auth lives in Moltbot's auth-profiles store instead, so we also
  // write a runtime-only auth.json entry for pi-coding-agent to pick up.
  //
  // This is safe because it's (1) within Moltbot's agent dir, (2) contains the
  // GitHub token (not the exchanged Copilot token), and (3) matches existing
  // patterns for OAuth-like providers in pi-coding-agent.
  // Note: we deliberately do not write pi-coding-agent's `auth.json` here.
  // Moltbot uses its own auth store and exchanges tokens at runtime.
  // `models list` uses Moltbot's auth heuristics for availability.

  // We intentionally do NOT define custom models for Copilot in models.json.
  // pi-coding-agent treats providers with models as replacements requiring apiKey.
  // We only override baseUrl; the model list comes from pi-ai built-ins.
  return {
    baseUrl,
    models: [],
  } satisfies ProviderConfig;
}

export async function resolveImplicitBedrockProvider(params: {
  agentDir: string;
  config?: MoltbotConfig;
  env?: NodeJS.ProcessEnv;
}): Promise<ProviderConfig | null> {
  const env = params.env ?? process.env;
  const discoveryConfig = params.config?.models?.bedrockDiscovery;
  const enabled = discoveryConfig?.enabled;
  const hasAwsCreds = resolveAwsSdkEnvVarName(env) !== undefined;
  if (enabled === false) return null;
  if (enabled !== true && !hasAwsCreds) return null;

  const region = discoveryConfig?.region ?? env.AWS_REGION ?? env.AWS_DEFAULT_REGION ?? "us-east-1";
  const models = await discoverBedrockModels({ region, config: discoveryConfig });
  if (models.length === 0) return null;

  return {
    baseUrl: `https://bedrock-runtime.${region}.amazonaws.com`,
    api: "bedrock-converse-stream",
    auth: "aws-sdk",
    models,
  } satisfies ProviderConfig;
}
