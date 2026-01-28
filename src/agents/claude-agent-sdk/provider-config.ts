/**
 * Provider configuration builders for the Claude Agent SDK.
 *
 * Supports multiple authentication methods:
 * - Anthropic API key (ANTHROPIC_API_KEY) - when explicitly configured in moltbot.json
 * - Claude Code SDK native auth (default) - inherits parent env, SDK handles credential resolution
 * - z.AI subscription (via ANTHROPIC_AUTH_TOKEN)
 * - OpenRouter (Anthropic-compatible API)
 * - AWS Bedrock
 * - Google Vertex AI
 *
 * For SDK native auth, we inherit the full parent process environment and let the SDK
 * handle credential resolution. If the user has ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN
 * set in their environment, the SDK will use them. Otherwise, it uses its native
 * keychain-based OAuth flow.
 */

import type { SdkProviderConfig, SdkProviderEnv } from "./types.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("agents/claude-agent-sdk");

/**
 * Mask a token for logging - shows length and first/last 4 chars.
 */
function maskToken(token: string | undefined): string {
  if (!token) return "(empty)";
  if (token.length <= 12) return `${"*".repeat(token.length)} (length: ${token.length})`;
  const first = token.slice(0, 4);
  const last = token.slice(-4);
  return `${first}...${"*".repeat(Math.min(8, token.length - 8))}...${last} (length: ${token.length})`;
}

/**
 * Log the resolved provider config with masked credentials.
 */
function logProviderConfig(config: SdkProviderConfig, source: string): void {
  const envKeys = config.env ? Object.keys(config.env) : [];
  const maskedEnv: Record<string, string> = {};

  if (config.env) {
    for (const [key, value] of Object.entries(config.env)) {
      if (key.includes("KEY") || key.includes("TOKEN") || key.includes("SECRET")) {
        maskedEnv[key] = maskToken(value);
      } else {
        maskedEnv[key] = value ?? "(undefined)";
      }
    }
  }

  log.debug("[CCSDK-PROVIDER] Provider config resolved", {
    source,
    providerName: config.name,
    envKeys,
    maskedEnv,
    model: config.model,
    maxTurns: config.maxTurns,
  });
}

/**
 * Build provider config for direct Anthropic API access.
 */
export function buildAnthropicSdkProvider(apiKey: string): SdkProviderConfig {
  return {
    name: "Anthropic",
    env: {
      ANTHROPIC_API_KEY: apiKey,
    },
  };
}

/**
 * Build provider config for Claude Code SDK native auth.
 *
 * This returns a minimal config with no env overrides, allowing the SDK to:
 * - Inherit any ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN from parent process
 * - Use its internal credential resolution (keychain → OAuth) if no env vars are set
 *
 * We don't try to be "smart" about unsetting env vars - if the user has auth
 * env vars set in their system environment, that's their configuration choice.
 */
export function buildClaudeCliSdkProvider(): SdkProviderConfig {
  log.debug("[CCSDK-PROVIDER] buildClaudeCliSdkProvider called - using SDK native auth");

  const config: SdkProviderConfig = {
    name: "Claude CLI (SDK native)",
    env: {},
  };

  logProviderConfig(config, "sdk-native-auth");
  return config;
}

/**
 * Build provider config for z.AI subscription access.
 *
 * z.AI uses Anthropic-compatible API with a different base URL.
 */
export function buildZaiSdkProvider(
  authToken: string,
  options?: {
    baseUrl?: string;
    defaultModel?: string;
    haikuModel?: string;
    sonnetModel?: string;
    opusModel?: string;
  },
): SdkProviderConfig {
  const env: SdkProviderEnv = {
    ANTHROPIC_AUTH_TOKEN: authToken,
  };

  // Set base URL if provided (z.AI may use a custom endpoint)
  if (options?.baseUrl) {
    env.ANTHROPIC_BASE_URL = options.baseUrl;
  }

  // Set model tier defaults for z.AI
  if (options?.haikuModel) {
    env.ANTHROPIC_DEFAULT_HAIKU_MODEL = options.haikuModel;
  }
  if (options?.sonnetModel) {
    env.ANTHROPIC_DEFAULT_SONNET_MODEL = options.sonnetModel;
  }
  if (options?.opusModel) {
    env.ANTHROPIC_DEFAULT_OPUS_MODEL = options.opusModel;
  }

  const config: SdkProviderConfig = {
    name: "z.AI",
    env,
    model: options?.defaultModel,
  };

  log.debug("[CCSDK-PROVIDER] Built z.AI provider config", {
    hasBaseUrl: Boolean(options?.baseUrl),
    baseUrl: options?.baseUrl ?? "(default)",
    defaultModel: options?.defaultModel ?? "(sdk default)",
    haikuModel: options?.haikuModel ?? "(sdk default)",
    sonnetModel: options?.sonnetModel ?? "(sdk default)",
    opusModel: options?.opusModel ?? "(sdk default)",
    authTokenMasked: maskToken(authToken),
  });

  return config;
}

/**
 * Build provider config for OpenRouter (Anthropic-compatible).
 *
 * OpenRouter requires explicit model names since their model IDs differ
 * from Anthropic's native IDs.
 */
export function buildOpenRouterSdkProvider(
  apiKey: string,
  options?: {
    baseUrl?: string;
    defaultModel?: string;
    haikuModel?: string;
    sonnetModel?: string;
    opusModel?: string;
  },
): SdkProviderConfig {
  const env: SdkProviderEnv = {
    ANTHROPIC_BASE_URL: options?.baseUrl ?? "https://openrouter.ai/api/v1",
    ANTHROPIC_API_KEY: apiKey,
  };

  // OpenRouter uses different model naming - set explicit model IDs
  // Default OpenRouter model names for Anthropic models:
  // - anthropic/claude-3-5-haiku-20241022
  // - anthropic/claude-sonnet-4-20250514
  // - anthropic/claude-opus-4-20250514
  if (options?.haikuModel) {
    env.ANTHROPIC_DEFAULT_HAIKU_MODEL = options.haikuModel;
  }
  if (options?.sonnetModel) {
    env.ANTHROPIC_DEFAULT_SONNET_MODEL = options.sonnetModel;
  }
  if (options?.opusModel) {
    env.ANTHROPIC_DEFAULT_OPUS_MODEL = options.opusModel;
  }

  const config: SdkProviderConfig = {
    name: "OpenRouter (Anthropic-compatible)",
    env,
    model: options?.defaultModel,
  };

  log.debug("[CCSDK-PROVIDER] Built OpenRouter provider config", {
    baseUrl: env.ANTHROPIC_BASE_URL,
    defaultModel: options?.defaultModel ?? "(sdk default)",
    haikuModel: options?.haikuModel ?? "(sdk default)",
    sonnetModel: options?.sonnetModel ?? "(sdk default)",
    opusModel: options?.opusModel ?? "(sdk default)",
    apiKeyMasked: maskToken(apiKey),
  });

  return config;
}

/**
 * Build provider config for AWS Bedrock.
 *
 * AWS credentials should be configured via standard AWS mechanisms
 * (environment variables, shared credentials file, IAM role, etc.).
 */
export function buildBedrockSdkProvider(): SdkProviderConfig {
  return {
    name: "AWS Bedrock",
    env: {
      CLAUDE_CODE_USE_BEDROCK: "1",
    },
  };
}

/**
 * Build provider config for Google Vertex AI.
 *
 * Google Cloud credentials should be configured via standard GCP mechanisms
 * (GOOGLE_APPLICATION_CREDENTIALS, default credentials, etc.).
 */
export function buildVertexSdkProvider(): SdkProviderConfig {
  return {
    name: "Google Vertex AI",
    env: {
      CLAUDE_CODE_USE_VERTEX: "1",
    },
  };
}

/**
 * Resolve provider configuration based on available credentials.
 *
 * Priority order:
 * 1. Explicit API key from moltbot config (options.apiKey)
 * 2. Explicit auth token from moltbot config (options.authToken) - for z.AI, etc.
 * 3. SDK native auth (default) - inherits parent env, SDK handles credential resolution
 *
 * The SDK will inherit the full parent process environment. If auth env vars
 * (ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN) are set in the parent process,
 * the SDK will use them. Otherwise, it falls back to its native credential
 * resolution (keychain → OAuth).
 */
export function resolveProviderConfig(options?: {
  apiKey?: string;
  authToken?: string;
  baseUrl?: string;
  useCliCredentials?: boolean;
}): SdkProviderConfig {
  log.debug("[CCSDK-PROVIDER] resolveProviderConfig called", {
    hasApiKey: Boolean(options?.apiKey),
    apiKeyMasked: maskToken(options?.apiKey),
    hasAuthToken: Boolean(options?.authToken),
    authTokenMasked: maskToken(options?.authToken),
    baseUrl: options?.baseUrl ?? "(default)",
    useCliCredentials: options?.useCliCredentials ?? true,
  });

  // 1. Explicit API key from moltbot config takes precedence
  if (options?.apiKey) {
    log.debug("[CCSDK-PROVIDER] Using explicit API key from moltbot config");
    const config = buildAnthropicSdkProvider(options.apiKey);
    if (options.baseUrl && config.env) {
      config.env.ANTHROPIC_BASE_URL = options.baseUrl;
    }
    logProviderConfig(config, "explicit-api-key");
    return config;
  }

  // 2. Explicit auth token from moltbot config (for z.AI, custom endpoints, etc.)
  if (options?.authToken) {
    log.debug("[CCSDK-PROVIDER] Using explicit auth token from moltbot config");
    const env: SdkProviderEnv = {
      ANTHROPIC_AUTH_TOKEN: options.authToken,
    };
    if (options.baseUrl) {
      env.ANTHROPIC_BASE_URL = options.baseUrl;
    }
    const config: SdkProviderConfig = {
      name: "Anthropic (auth token)",
      env,
    };
    logProviderConfig(config, "explicit-auth-token");
    return config;
  }

  // 3. Default: SDK native auth
  // Let the SDK use its internal credential resolution (keychain → OAuth flow).
  // We inherit the full parent process env - if the user has ANTHROPIC_API_KEY or
  // ANTHROPIC_AUTH_TOKEN set, that's their configuration choice.
  log.debug("[CCSDK-PROVIDER] Using SDK native auth (no explicit credentials configured)");
  const cliConfig = buildClaudeCliSdkProvider();
  if (options?.baseUrl && cliConfig.env) {
    cliConfig.env.ANTHROPIC_BASE_URL = options.baseUrl;
  }
  return cliConfig;
}
