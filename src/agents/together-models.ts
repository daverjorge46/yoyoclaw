import type { ModelDefinitionConfig } from "../config/types.js";

export const TOGETHER_BASE_URL = "https://api.together.xyz/v1";
export const TOGETHER_DEFAULT_MODEL_ID = "meta-llama/Llama-3.3-70B-Instruct-Turbo";
export const TOGETHER_DEFAULT_MODEL_REF = `together/${TOGETHER_DEFAULT_MODEL_ID}`;

export const TOGETHER_MODEL_CATALOG = [
  {
    id: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    name: "Llama 3.3 70B Instruct Turbo",
    reasoning: false,
    input: ["text"],
    contextWindow: 131072,
    maxTokens: 8192,
    cost: {
      input: 0.88,
      output: 0.88,
      cacheRead: 0.88,
      cacheWrite: 0.88,
    },
  },
  {
    id: "meta-llama/Llama-4-Scout-17B-16E-Instruct",
    name: "Llama 4 Scout 17B 16E Instruct",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 10000000,
    maxTokens: 32768,
    cost: {
      input: 0.18,
      output: 0.59,
      cacheRead: 0.18,
      cacheWrite: 0.18,
    },
  },
  {
    id: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
    name: "Llama 4 Maverick 17B 128E Instruct FP8",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 20000000,
    maxTokens: 32768,
    cost: {
      input: 0.27,
      output: 0.85,
      cacheRead: 0.27,
      cacheWrite: 0.27,
    },
  },
  {
    id: "deepseek-ai/DeepSeek-V3.1",
    name: "DeepSeek V3.1",
    reasoning: false,
    input: ["text"],
    contextWindow: 131072,
    maxTokens: 8192,
    cost: {
      input: 0.6,
      output: 1.25,
      cacheRead: 0.6,
      cacheWrite: 0.6,
    },
  },
  {
    id: "deepseek-ai/DeepSeek-R1",
    name: "DeepSeek R1",
    reasoning: true,
    input: ["text"],
    contextWindow: 131072,
    maxTokens: 8192,
    cost: {
      input: 3.0,
      output: 7.0,
      cacheRead: 3.0,
      cacheWrite: 3.0,
    },
  },
  {
    id: "Qwen/Qwen2.5-72B-Instruct-Turbo",
    name: "Qwen 2.5 72B Instruct Turbo",
    reasoning: false,
    input: ["text"],
    contextWindow: 131072,
    maxTokens: 8192,
    cost: {
      input: 0.35,
      output: 0.8,
      cacheRead: 0.35,
      cacheWrite: 0.35,
    },
  },
  {
    id: "mistralai/Mixtral-8x7B-Instruct-v0.1",
    name: "Mixtral 8x7B Instruct v0.1",
    reasoning: false,
    input: ["text"],
    contextWindow: 32768,
    maxTokens: 8192,
    cost: {
      input: 0.6,
      output: 0.6,
      cacheRead: 0.6,
      cacheWrite: 0.6,
    },
  },
] as const;

export function buildTogetherModelDefinition(
  model: (typeof TOGETHER_MODEL_CATALOG)[number],
): ModelDefinitionConfig {
  return {
    id: model.id,
    name: model.name,
    api: "openai-completions",
    reasoning: model.reasoning,
    input: [...model.input],
    cost: model.cost,
    contextWindow: model.contextWindow,
    maxTokens: model.maxTokens,
  };
}
