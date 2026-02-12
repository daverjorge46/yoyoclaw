import { describe, expect, it, vi } from "vitest";
import type { AuthProfileStore } from "../../agents/auth-profiles/types.js";
import { resolveProviderAuthOverview } from "./list.auth-overview.js";

vi.mock("../../agents/auth-profiles/paths.js", () => ({
  resolveAuthStorePathForDisplay: vi.fn().mockReturnValue("/tmp/auth-profiles.json"),
}));

vi.mock("../../agents/model-auth.js", () => ({
  resolveEnvApiKey: vi.fn().mockReturnValue(null),
  getCustomProviderApiKey: vi.fn().mockReturnValue(undefined),
}));

function makeStore(profiles: AuthProfileStore["profiles"]): AuthProfileStore {
  return { version: 1, profiles };
}

describe("resolveProviderAuthOverview token classification", () => {
  it("classifies sk-ant-oat01- token as oauth in counts", () => {
    const store = makeStore({
      "anthropic:oauth-tok": {
        type: "token",
        provider: "anthropic",
        token: "sk-ant-oat01-ACCESS-TOKEN-1234567890",
      },
    });
    const overview = resolveProviderAuthOverview({
      provider: "anthropic",
      cfg: {} as never,
      store,
      modelsPath: "/tmp/models.json",
    });
    expect(overview.profiles.oauth).toBe(1);
    expect(overview.profiles.token).toBe(0);
    expect(overview.profiles.apiKey).toBe(0);
    expect(overview.profiles.labels[0]).toContain("oauth_token:");
  });

  it("classifies sk-ant-api03- token as api_key in counts", () => {
    const store = makeStore({
      "anthropic:api-tok": {
        type: "token",
        provider: "anthropic",
        token: "sk-ant-api03-0123456789abcdef",
      },
    });
    const overview = resolveProviderAuthOverview({
      provider: "anthropic",
      cfg: {} as never,
      store,
      modelsPath: "/tmp/models.json",
    });
    expect(overview.profiles.oauth).toBe(0);
    expect(overview.profiles.token).toBe(0);
    expect(overview.profiles.apiKey).toBe(1);
    expect(overview.profiles.labels[0]).toContain("api_key:");
  });

  it("keeps unrecognised tokens as generic token", () => {
    const store = makeStore({
      "anthropic:unknown": {
        type: "token",
        provider: "anthropic",
        token: "eyJhbGciOi-SOMETHING",
      },
    });
    const overview = resolveProviderAuthOverview({
      provider: "anthropic",
      cfg: {} as never,
      store,
      modelsPath: "/tmp/models.json",
    });
    expect(overview.profiles.oauth).toBe(0);
    expect(overview.profiles.token).toBe(1);
    expect(overview.profiles.apiKey).toBe(0);
    expect(overview.profiles.labels[0]).toMatch(/^anthropic:unknown=token:/);
  });

  it("combines real oauth, reclassified oauth-token, and api_key correctly", () => {
    const store = makeStore({
      "anthropic:default": {
        type: "oauth",
        provider: "anthropic",
        access: "sk-ant-oat01-ACCESS",
        refresh: "sk-ant-ort01-REFRESH",
        expires: Date.now() + 60_000,
      } as never,
      "anthropic:token-oauth": {
        type: "token",
        provider: "anthropic",
        token: "sk-ant-oat01-STATIC-TOKEN",
      },
      "anthropic:work": {
        type: "api_key",
        provider: "anthropic",
        key: "sk-ant-api03-KEY",
      },
    });
    const overview = resolveProviderAuthOverview({
      provider: "anthropic",
      cfg: {} as never,
      store,
      modelsPath: "/tmp/models.json",
    });
    // 1 real oauth + 1 reclassified token-as-oauth
    expect(overview.profiles.oauth).toBe(2);
    expect(overview.profiles.token).toBe(0);
    // 1 real api_key
    expect(overview.profiles.apiKey).toBe(1);
    expect(overview.profiles.count).toBe(3);
  });
});
