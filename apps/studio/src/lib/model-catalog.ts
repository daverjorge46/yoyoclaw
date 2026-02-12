export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  group: string;
  cost: {
    input: number; // per 1M tokens
    output: number; // per 1M tokens
  };
}

export const MODEL_CATALOG: ModelOption[] = [
  // Standard Providers
  { id: "gpt-4o", name: "GPT-4o", provider: "openai", group: "OpenAI", cost: { input: 2.50, output: 10.00 } }, // Updated pricing
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai", group: "OpenAI", cost: { input: 0.15, output: 0.60 } },
  { id: "o1", name: "o1", provider: "openai", group: "OpenAI", cost: { input: 15.00, output: 60.00 } },
  { id: "o3-mini", name: "o3-mini", provider: "openai", group: "OpenAI", cost: { input: 1.10, output: 4.40 } },
  
  { id: "claude-3-5-sonnet-latest", name: "Claude 3.5 Sonnet", provider: "anthropic", group: "Anthropic", cost: { input: 3.00, output: 15.00 } },
  { id: "claude-3-5-haiku-latest", name: "Claude 3.5 Haiku", provider: "anthropic", group: "Anthropic", cost: { input: 0.80, output: 4.00 } },
  
  { id: "gemini-3-pro-preview", name: "Gemini 3 Pro (Preview)", provider: "google", group: "Google", cost: { input: 1.25, output: 5.00 } },
  { id: "gemini-3-flash-preview", name: "Gemini 3 Flash (Preview)", provider: "google", group: "Google", cost: { input: 0.075, output: 0.30 } },

  // Specialized / Regional
  { id: "MiniMax-M2.1", name: "MiniMax M2.1", provider: "minimax", group: "Minimax", cost: { input: 15.00, output: 60.00 } },
  { id: "MiniMax-VL-01", name: "MiniMax VL 01", provider: "minimax", group: "Minimax", cost: { input: 15.00, output: 60.00 } },
  
  { id: "deepseek-v3.2", name: "DeepSeek V3.2 (Qianfan)", provider: "qianfan", group: "Baidu Qianfan", cost: { input: 0, output: 0 } },
  { id: "ernie-5.0-thinking-preview", name: "ERNIE 5.0 Thinking", provider: "qianfan", group: "Baidu Qianfan", cost: { input: 0, output: 0 } },
  
  { id: "kimi-k2.5", name: "Kimi K2.5", provider: "moonshot", group: "Moonshot", cost: { input: 0, output: 0 } },
  { id: "mimo-v2-flash", name: "Xiaomi MiMo V2", provider: "xiaomi", group: "Xiaomi", cost: { input: 0, output: 0 } },
];

export function getModelsByGroup() {
  const groups: Record<string, ModelOption[]> = {};
  for (const model of MODEL_CATALOG) {
    if (!groups[model.group]) {
      groups[model.group] = [];
    }
    groups[model.group].push(model);
  }
  return groups;
}

export function getModelCost(modelId: string): { input: number; output: number } | undefined {
    const model = MODEL_CATALOG.find(m => m.id === modelId || `${m.provider}/${m.id}` === modelId);
    return model?.cost;
}
