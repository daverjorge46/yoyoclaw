import type { AgentTool, AgentToolResult } from "@mariozechner/pi-agent-core";
import fs from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import { ensureOpenClawModelsJson } from "./models-config.js";
import { splitSdkTools } from "./pi-embedded-runner.js";

vi.mock("@mariozechner/pi-ai", async () => {
  const actual = await vi.importActual<typeof import("@mariozechner/pi-ai")>("@mariozechner/pi-ai");
  return {
    ...actual,
    streamSimple: (model: { api: string; provider: string; id: string }) => {
      if (model.id === "mock-error") {
        throw new Error("boom");
      }
      const stream = new actual.AssistantMessageEventStream();
      queueMicrotask(() => {
        stream.push({
          type: "done",
          reason: "stop",
          message: {
            role: "assistant",
            content: [{ type: "text", text: "ok" }],
            stopReason: "stop",
            api: model.api,
            provider: model.provider,
            model: model.id,
            usage: {
              input: 1,
              output: 1,
              cacheRead: 0,
              cacheWrite: 0,
              totalTokens: 2,
              cost: {
                input: 0,
                output: 0,
                cacheRead: 0,
                cacheWrite: 0,
                total: 0,
              },
            },
            timestamp: Date.now(),
          },
        });
      });
      return stream;
    },
  };
});

const _makeOpenAiConfig = (modelIds: string[]) =>
  ({
    models: {
      providers: {
        openai: {
          api: "openai-responses",
          apiKey: "sk-test",
          baseUrl: "https://example.com",
          models: modelIds.map((id) => ({
            id,
            name: `Mock ${id}`,
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 16_000,
            maxTokens: 2048,
          })),
        },
      },
    },
  }) satisfies OpenClawConfig;

const _ensureModels = (cfg: OpenClawConfig, agentDir: string) =>
  ensureOpenClawModelsJson(cfg, agentDir) as unknown;

const _textFromContent = (content: unknown) => {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content) && content[0]?.type === "text") {
    return (content[0] as { text?: string }).text;
  }
  return undefined;
};

const _readSessionMessages = async (sessionFile: string) => {
  const raw = await fs.readFile(sessionFile, "utf-8");
  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map(
      (line) =>
        JSON.parse(line) as {
          type?: string;
          message?: { role?: string; content?: unknown };
        },
    )
    .filter((entry) => entry.type === "message")
    .map((entry) => entry.message as { role?: string; content?: unknown });
};

function createStubTool(name: string): AgentTool<unknown, unknown> {
  return {
    name,
    label: name,
    description: "",
    parameters: {},
    execute: async () => ({}) as AgentToolResult<unknown>,
  };
}

type DurationProbeResult = AgentToolResult<unknown> & {
  durationMs?: number;
  metadata?: { durationMs?: number };
};

describe("splitSdkTools", () => {
  const tools = [
    createStubTool("read"),
    createStubTool("exec"),
    createStubTool("edit"),
    createStubTool("write"),
    createStubTool("browser"),
  ];

  it("routes all tools to customTools when sandboxed", () => {
    const { builtInTools, customTools } = splitSdkTools({
      tools,
      sandboxEnabled: true,
    });
    expect(builtInTools).toEqual([]);
    expect(customTools.map((tool) => tool.name)).toEqual([
      "read",
      "exec",
      "edit",
      "write",
      "browser",
    ]);
  });
  it("routes all tools to customTools even when not sandboxed", () => {
    const { builtInTools, customTools } = splitSdkTools({
      tools,
      sandboxEnabled: false,
    });
    expect(builtInTools).toEqual([]);
    expect(customTools.map((tool) => tool.name)).toEqual([
      "read",
      "exec",
      "edit",
      "write",
      "browser",
    ]);
  });

  it("disables tool result duration injection when configured off", async () => {
    const probeTool: AgentTool<unknown, unknown> = {
      name: "probe",
      label: "probe",
      description: "",
      parameters: {},
      execute: async () =>
        ({ content: [{ type: "text", text: "ok" }] }) as AgentToolResult<unknown>,
    };

    const { customTools } = splitSdkTools({
      tools: [probeTool],
      sandboxEnabled: false,
      recordToolResultDurations: false,
    });

    const result = (await customTools[0].execute(
      "probe-call",
      {},
      undefined,
      undefined,
      undefined,
    )) as DurationProbeResult;

    expect(result.durationMs).toBeUndefined();
    expect(result.metadata?.durationMs).toBeUndefined();
  });

  it("keeps tool result duration injection enabled by default", async () => {
    const probeTool: AgentTool<unknown, unknown> = {
      name: "probeOn",
      label: "probeOn",
      description: "",
      parameters: {},
      execute: async () =>
        ({ content: [{ type: "text", text: "ok" }] }) as AgentToolResult<unknown>,
    };

    const { customTools } = splitSdkTools({
      tools: [probeTool],
      sandboxEnabled: false,
    });

    const result = (await customTools[0].execute(
      "probe-call-on",
      {},
      undefined,
      undefined,
      undefined,
    )) as DurationProbeResult;

    expect(typeof result.durationMs).toBe("number");
    expect(typeof result.metadata?.durationMs).toBe("number");
  });
});
