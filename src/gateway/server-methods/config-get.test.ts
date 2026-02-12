import { describe, expect, it, vi } from "vitest";
import type { ConnectParams } from "../protocol/index.js";
import type { GatewayClient, GatewayRequestHandlerOptions } from "./types.js";

const fakeSnapshot = {
  path: "/test/config.json5",
  exists: true,
  raw: '{ "models": { "providers": { "openai": { "apiKey": "sk-real-key" } } } }',
  parsed: { models: { providers: { openai: { apiKey: "sk-real-key" } } } },
  valid: true,
  config: { models: { providers: { openai: { apiKey: "sk-real-key" } } } },
  hash: "abc123",
  issues: [],
  warnings: [],
  legacyIssues: [],
};

vi.mock("../../config/config.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../config/config.js")>();
  return {
    ...actual,
    readConfigFileSnapshot: () => Promise.resolve(fakeSnapshot),
    loadConfig: () => ({}),
    writeConfigFile: vi.fn(),
  };
});

const { configHandlers } = await import("./config.js");

function makeClient(mode: string, id: string): GatewayClient {
  return {
    connect: {
      minProtocol: 1,
      maxProtocol: 1,
      client: {
        id: id as ConnectParams["client"]["id"],
        version: "1.0.0",
        platform: "test",
        mode: mode as ConnectParams["client"]["mode"],
      },
    } as ConnectParams,
  };
}

function isWebchatConnect(params: ConnectParams | null | undefined): boolean {
  return params?.client?.mode === "webchat";
}

function extractApiKey(payload: unknown): string {
  const snap = payload as typeof fakeSnapshot;
  const models = snap.config.models as Record<string, Record<string, Record<string, string>>>;
  return models.providers.openai.apiKey;
}

function callConfigGet(
  params: Record<string, unknown>,
  client: GatewayClient | null,
): Promise<{ ok: boolean; payload?: unknown; error?: unknown }> {
  return new Promise((resolve) => {
    const respond = (ok: boolean, payload?: unknown, error?: unknown) => {
      resolve({ ok, payload, error });
    };
    void configHandlers["config.get"]({
      req: { type: "req", id: "test-1", method: "config.get", params },
      params,
      client,
      isWebchatConnect,
      respond,
      context: {} as GatewayRequestHandlerOptions["context"],
    });
  });
}

describe("config.get includeSecrets", () => {
  it("redacts secrets by default", async () => {
    const result = await callConfigGet({}, makeClient("ui", "openclaw-macos"));
    expect(result.ok).toBe(true);
    expect(extractApiKey(result.payload)).toBe("__OPENCLAW_REDACTED__");
  });

  it("redacts secrets when includeSecrets is false", async () => {
    const result = await callConfigGet(
      { includeSecrets: false },
      makeClient("ui", "openclaw-macos"),
    );
    expect(result.ok).toBe(true);
    expect(extractApiKey(result.payload)).toBe("__OPENCLAW_REDACTED__");
  });

  it("returns unredacted config when includeSecrets=true for trusted (non-webchat) client", async () => {
    const result = await callConfigGet(
      { includeSecrets: true },
      makeClient("ui", "openclaw-macos"),
    );
    expect(result.ok).toBe(true);
    expect(extractApiKey(result.payload)).toBe("sk-real-key");
  });

  it("returns unredacted config for CLI client with includeSecrets=true", async () => {
    const result = await callConfigGet({ includeSecrets: true }, makeClient("cli", "cli"));
    expect(result.ok).toBe(true);
    expect(extractApiKey(result.payload)).toBe("sk-real-key");
  });

  it("still redacts for webchat client even with includeSecrets=true", async () => {
    const result = await callConfigGet(
      { includeSecrets: true },
      makeClient("webchat", "webchat-ui"),
    );
    expect(result.ok).toBe(true);
    expect(extractApiKey(result.payload)).toBe("__OPENCLAW_REDACTED__");
  });

  it("still redacts when no client is present and includeSecrets=true", async () => {
    const result = await callConfigGet({ includeSecrets: true }, null);
    expect(result.ok).toBe(true);
    expect(extractApiKey(result.payload)).toBe("__OPENCLAW_REDACTED__");
  });
});
