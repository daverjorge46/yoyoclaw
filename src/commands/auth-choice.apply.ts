import type { OpenClawConfig } from "../config/config.js";
import type { RuntimeEnv } from "../runtime.js";
import type { WizardPrompter } from "../wizard/prompts.js";
import { applyAuthChoiceAnthropic } from "./auth-choice.apply.anthropic.js";
import { applyAuthChoiceApiProviders } from "./auth-choice.apply.api-providers.js";
import { applyAuthChoiceCopilotProxy } from "./auth-choice.apply.copilot-proxy.js";
import { applyAuthChoiceGitHubCopilot } from "./auth-choice.apply.github-copilot.js";
import { applyAuthChoiceGoogleAntigravity } from "./auth-choice.apply.google-antigravity.js";
import { applyAuthChoiceGoogleGeminiCli } from "./auth-choice.apply.google-gemini-cli.js";
import { applyAuthChoiceMiniMax } from "./auth-choice.apply.minimax.js";
import { applyAuthChoiceOAuth } from "./auth-choice.apply.oauth.js";
import { applyAuthChoiceOpenAI } from "./auth-choice.apply.openai.js";
import { applyAuthChoiceQwenPortal } from "./auth-choice.apply.qwen-portal.js";
import { applyAuthChoicePluginProvider } from "./auth-choice.apply.plugin-provider.js";
import type { AuthChoice } from "./onboard-types.js";
import { resolvePluginProviders } from "../plugins/providers.js";
import { resolveDefaultAgentWorkspaceDir } from "../agents/workspace.js";

export type ApplyAuthChoiceParams = {
  authChoice: AuthChoice;
  config: OpenClawConfig;
  prompter: WizardPrompter;
  runtime: RuntimeEnv;
  agentDir?: string;
  setDefaultModel: boolean;
  agentId?: string;
  opts?: {
    tokenProvider?: string;
    token?: string;
  };
};

export type ApplyAuthChoiceResult = {
  config: OpenClawConfig;
  agentModelOverride?: string;
};

export async function applyAuthChoice(
  params: ApplyAuthChoiceParams,
): Promise<ApplyAuthChoiceResult> {
  const handlers: Array<(p: ApplyAuthChoiceParams) => Promise<ApplyAuthChoiceResult | null>> = [
    applyAuthChoiceAnthropic,
    applyAuthChoiceOpenAI,
    applyAuthChoiceOAuth,
    applyAuthChoiceApiProviders,
    applyAuthChoiceMiniMax,
    applyAuthChoiceGitHubCopilot,
    applyAuthChoiceGoogleAntigravity,
    applyAuthChoiceGoogleGeminiCli,
    applyAuthChoiceCopilotProxy,
    applyAuthChoiceQwenPortal,
  ];

  for (const handler of handlers) {
    const result = await handler(params);
    if (result) {
      return result;
    }
  }

  // Fallback: check if authChoice matches any plugin provider
  const workspaceDir = resolveDefaultAgentWorkspaceDir();
  const pluginProviders = resolvePluginProviders({ config: params.config, workspaceDir });

  const matchingProvider = pluginProviders.find((provider) => provider.id === params.authChoice);
  if (matchingProvider) {
    // Find the plugin that registered this provider
    const { listPlugins } = await import("../plugins/registry.js");
    const allPlugins = listPlugins({ config: params.config, workspaceDir });
    const pluginEntry = allPlugins.find((p) => p.providerIds?.includes(matchingProvider.id));

    if (pluginEntry) {
      const result = await applyAuthChoicePluginProvider(params, {
        authChoice: params.authChoice,
        pluginId: pluginEntry.id,
        providerId: matchingProvider.id,
        methodId: matchingProvider.auth[0]?.id,
        label: matchingProvider.label,
      });
      if (result) {
        return result;
      }
    }
  }

  return { config: params.config };
}
