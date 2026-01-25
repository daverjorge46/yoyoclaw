import type { ModelDefinitionConfig } from "../config/types.js";

export const NANOGPT_BASE_URL = "https://nano-gpt.com/api/v1";
export const NANOGPT_DEFAULT_MODEL_ID = "zai-org/glm-4.7";
export const NANOGPT_DEFAULT_MODEL_REF = `nanogpt/${NANOGPT_DEFAULT_MODEL_ID}`;
export const NANOGPT_DEFAULT_COST = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
};

export const NANOGPT_MODEL_CATALOG = [
  {
    id: NANOGPT_DEFAULT_MODEL_ID,
    name: "GLM 4.7",
    reasoning: true,
    input: ["text"],
    contextWindow: 200000,
    maxTokens: 65535,
  },
  {
    id: "zai-org/glm-4.7:thinking",
    name: "GLM 4.7 Thinking",
    reasoning: true,
    input: ["text"],
    contextWindow: 200000,
    maxTokens: 65535,
  },
  {
    id: "zai-org/glm-4.7-original",
    name: "GLM 4.7 Original",
    reasoning: true,
    input: ["text"],
    contextWindow: 200000,
    maxTokens: 65535,
  },
  {
    id: "zai-org/glm-4.7-original:thinking",
    name: "GLM 4.7 Original Thinking",
    reasoning: true,
    input: ["text"],
    contextWindow: 200000,
    maxTokens: 65535,
  },
  {
    id: "zai-org/glm-4.7-flash",
    name: "GLM 4.7 Flash",
    reasoning: true,
    input: ["text"],
    contextWindow: 200000,
    maxTokens: 128000,
  },
  {
    id: "zai-org/glm-4.7-flash:thinking",
    name: "GLM 4.7 Flash Thinking",
    reasoning: true,
    input: ["text"],
    contextWindow: 200000,
    maxTokens: 128000,
  },
  {
    id: "zai-org/glm-4.7-flash-original",
    name: "GLM 4.7 Flash Original",
    reasoning: true,
    input: ["text"],
    contextWindow: 200000,
    maxTokens: 128000,
  },
  {
    id: "zai-org/glm-4.7-flash-original:thinking",
    name: "GLM 4.7 Flash Original Thinking",
    reasoning: true,
    input: ["text"],
    contextWindow: 200000,
    maxTokens: 128000,
  },
  {
    id: "minimax/minimax-m2.1",
    name: "MiniMax M2.1",
    reasoning: true,
    input: ["text"],
    contextWindow: 200000,
    maxTokens: 131072,
  },
  {
    id: "Qwen/Qwen3-VL-235B-A22B-Instruct",
    name: "Qwen3 VL 235B A22B Instruct",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 128000,
    maxTokens: 262144,
  },
  {
    id: "claude-opus-4-5-20251101",
    name: "Claude 4.5 Opus",
    reasoning: true,
    input: ["text", "image"],
    contextWindow: 200000,
    maxTokens: 32000,
  },
  {
    id: "claude-opus-4-5-20251101:thinking",
    name: "Claude 4.5 Opus Thinking",
    reasoning: true,
    input: ["text", "image"],
    contextWindow: 200000,
    maxTokens: 32000,
  },
  {
    id: "claude-sonnet-4-5-20250929",
    name: "Claude Sonnet 4.5",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 1000000,
    maxTokens: 64000,
  },
  {
    id: "claude-sonnet-4-5-20250929-thinking",
    name: "Claude Sonnet 4.5 Thinking",
    reasoning: true,
    input: ["text", "image"],
    contextWindow: 1000000,
    maxTokens: 64000,
  },
  {
    id: "claude-haiku-4-5-20251001",
    name: "Claude Haiku 4.5",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 200000,
    maxTokens: 64000,
  },
  {
    id: "claude-3-5-haiku-20241022",
    name: "Claude 3.5 Haiku",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 200000,
    maxTokens: 8192,
  },
  {
    id: "openai/gpt-5.2-chat",
    name: "GPT 5.2 Chat",
    reasoning: true,
    input: ["text", "image"],
    contextWindow: 400000,
    maxTokens: 16384,
  },
  {
    id: "openai/gpt-5.2",
    name: "GPT 5.2",
    reasoning: true,
    input: ["text", "image"],
    contextWindow: 400000,
    maxTokens: 128000,
  },
  {
    id: "openai/gpt-5.2-codex",
    name: "GPT 5.2 Codex",
    reasoning: true,
    input: ["text", "image"],
    contextWindow: 400000,
    maxTokens: 128000,
  },
  {
    id: "openai/gpt-5.2-pro",
    name: "GPT 5.2 Pro",
    reasoning: true,
    input: ["text", "image"],
    contextWindow: 400000,
    maxTokens: 128000,
  },
] as const;

export type NanoGptCatalogEntry = (typeof NANOGPT_MODEL_CATALOG)[number];

export function buildNanoGptModelDefinition(entry: NanoGptCatalogEntry): ModelDefinitionConfig {
  return {
    id: entry.id,
    name: entry.name,
    reasoning: entry.reasoning,
    input: [...entry.input],
    cost: NANOGPT_DEFAULT_COST,
    contextWindow: entry.contextWindow,
    maxTokens: entry.maxTokens,
  };
}
