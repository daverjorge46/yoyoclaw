import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { loginKimiPortalOAuth } from "./oauth.js";

const PROVIDER_ID = "kimi-portal";
const PROVIDER_LABEL = "Kimi";
const DEFAULT_MODEL = "kimi-for-coding";
const DEFAULT_BASE_URL = "https://api.kimi.com";
const DEFAULT_CONTEXT_WINDOW = 256000;
const DEFAULT_MAX_TOKENS = 8192;
const OAUTH_PLACEHOLDER = "kimi-oauth";

function modelRef(modelId: string): string {
  return `${PROVIDER_ID}/${modelId}`;
}

function buildModelDefinition(params: {
  id: string;
  name: string;
  input: Array<"text" | "image">;
}) {
  return {
    id: params.id,
    name: params.name,
    reasoning: false,
    input: params.input,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: DEFAULT_CONTEXT_WINDOW,
    maxTokens: DEFAULT_MAX_TOKENS,
  };
}

function createOAuthHandler() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (ctx: any) => {
    const progress = ctx.prompter.progress("Starting Kimi OAuth…");
    try {
      const result = await loginKimiPortalOAuth({
        openUrl: ctx.openUrl,
        note: ctx.prompter.note,
        progress,
      });

      progress.stop("Kimi OAuth complete");

      const profileId = `${PROVIDER_ID}:default`;

      return {
        profiles: [
          {
            profileId,
            credential: {
              type: "oauth" as const,
              provider: PROVIDER_ID,
              access: result.access,
              refresh: result.refresh,
              expires: result.expires,
            },
          },
        ],
        configPatch: {
          models: {
            providers: {
              [PROVIDER_ID]: {
                baseUrl: DEFAULT_BASE_URL,
                apiKey: OAUTH_PLACEHOLDER,
                api: "openai-chat",
                models: [
                  buildModelDefinition({
                    id: "kimi-for-coding",
                    name: "Kimi For Coding",
                    input: ["text"],
                  }),
                ],
              },
            },
          },
          agents: {
            defaults: {
              models: {
                [modelRef("kimi-for-coding")]: { alias: "kimi-for-coding" },
              },
            },
          },
        },
        defaultModel: modelRef(DEFAULT_MODEL),
        notes: [
          "Kimi OAuth tokens auto-refresh. Re-run login if refresh fails or access is revoked.",
          `Base URL defaults to ${DEFAULT_BASE_URL}. Override models.providers.${PROVIDER_ID}.baseUrl if needed.`,
        ],
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      progress.stop(`Kimi OAuth failed: ${errorMsg}`);
      await ctx.prompter.note(
        "If OAuth fails, verify your Kimi account has portal access and try again.",
        "Kimi OAuth",
      );
      throw err;
    }
  };
}

const kimiPortalPlugin = {
  id: "kimi-portal-auth",
  name: "Kimi OAuth",
  description: "OAuth flow for Kimi Code models",
  configSchema: emptyPluginConfigSchema(),
  register(api) {
    api.registerProvider({
      id: PROVIDER_ID,
      label: PROVIDER_LABEL,
      docsPath: "/providers/kimi",
      aliases: ["kimi"],
      auth: [
        {
          id: "oauth",
          label: "Kimi OAuth",
          hint: "OAuth device flow for Kimi Code",
          kind: "device_code",
          run: createOAuthHandler(),
        },
      ],
    });
  },
};

export default kimiPortalPlugin;
