import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import type { EmbeddedRunAttemptResult } from "./pi-embedded-runner/run/types.js";

const runEmbeddedAttemptMock = vi.fn<Promise<EmbeddedRunAttemptResult>, [unknown]>();
const runEmbeddedCamelAttemptMock = vi.fn<Promise<EmbeddedRunAttemptResult>, [unknown]>();

vi.mock("./pi-embedded-runner/run/attempt.js", () => ({
  runEmbeddedAttempt: (params: unknown) => runEmbeddedAttemptMock(params),
}));

vi.mock("./pi-embedded-runner/run/camel-attempt.js", () => ({
  runEmbeddedCamelAttempt: (params: unknown) => runEmbeddedCamelAttemptMock(params),
}));

let runEmbeddedPiAgent: typeof import("./pi-embedded-runner.js").runEmbeddedPiAgent;

beforeAll(async () => {
  ({ runEmbeddedPiAgent } = await import("./pi-embedded-runner.js"));
});

beforeEach(() => {
  runEmbeddedAttemptMock.mockReset();
  runEmbeddedCamelAttemptMock.mockReset();
});

const immediateEnqueue = async <T>(task: () => Promise<T>) => task();

function makeAttempt(): EmbeddedRunAttemptResult {
  return {
    aborted: false,
    timedOut: false,
    promptError: null,
    sessionIdUsed: "session:test",
    messagesSnapshot: [],
    assistantTexts: ["ok"],
    toolMetas: [],
    lastAssistant: {
      role: "assistant",
      content: [{ type: "text", text: "ok" }],
      api: "openai-responses",
      provider: "openai",
      model: "mock-1",
      usage: {
        input: 10,
        output: 20,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: 30,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
      },
      stopReason: "stop",
      timestamp: Date.now(),
    },
    didSendViaMessagingTool: false,
    messagingToolSentTexts: [],
    messagingToolSentTargets: [],
    cloudCodeAssistFormatError: false,
  };
}

function makeConfig(params: {
  defaultsRuntime?: "pi" | "camel";
  agentRuntime?: "pi" | "camel";
  defaultsEval?: "normal" | "strict";
  agentEval?: "normal" | "strict";
  defaultsPlanRetries?: number;
  agentPlanRetries?: number;
}): OpenClawConfig {
  return {
    agents: {
      defaults: {
        runtimeEngine: params.defaultsRuntime,
        runtimeEvalMode: params.defaultsEval,
        runtimePlanRetries: params.defaultsPlanRetries,
      },
      list:
        params.agentRuntime === undefined &&
        params.agentEval === undefined &&
        params.agentPlanRetries === undefined
          ? undefined
          : [
              {
                id: "work",
                runtimeEngine: params.agentRuntime,
                runtimeEvalMode: params.agentEval,
                runtimePlanRetries: params.agentPlanRetries,
              },
            ],
    },
    models: {
      providers: {
        openai: {
          api: "openai-responses",
          apiKey: "sk-test",
          baseUrl: "https://example.com",
          models: [
            {
              id: "mock-1",
              name: "Mock 1",
              reasoning: false,
              input: ["text"],
              cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
              contextWindow: 200_000,
              maxTokens: 8_000,
            },
          ],
        },
      },
    },
  };
}

describe("runEmbeddedPiAgent runtimeEngine dispatch", () => {
  it("defaults to pi runtime when runtimeEngine is unset", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-pi-fallback-"));
    try {
      runEmbeddedAttemptMock.mockResolvedValueOnce(makeAttempt());

      await runEmbeddedPiAgent({
        sessionId: "session:test",
        sessionKey: "agent:main:main",
        sessionFile: path.join(workspaceDir, "session.jsonl"),
        workspaceDir,
        config: makeConfig({}),
        prompt: "hello",
        provider: "openai",
        model: "mock-1",
        timeoutMs: 5_000,
        runId: "run:pi-fallback",
        enqueue: immediateEnqueue,
      });

      expect(runEmbeddedAttemptMock).toHaveBeenCalledTimes(1);
      expect(runEmbeddedCamelAttemptMock).not.toHaveBeenCalled();
    } finally {
      await fs.rm(workspaceDir, { recursive: true, force: true });
    }
  });

  it("uses camel runtime when agents.defaults.runtimeEngine=camel", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-camel-default-"));
    try {
      runEmbeddedCamelAttemptMock.mockResolvedValueOnce(makeAttempt());

      await runEmbeddedPiAgent({
        sessionId: "session:test",
        sessionKey: "agent:main:main",
        sessionFile: path.join(workspaceDir, "session.jsonl"),
        workspaceDir,
        config: makeConfig({ defaultsRuntime: "camel" }),
        prompt: "hello",
        provider: "openai",
        model: "mock-1",
        timeoutMs: 5_000,
        runId: "run:camel-default",
        enqueue: immediateEnqueue,
      });

      expect(runEmbeddedCamelAttemptMock).toHaveBeenCalledTimes(1);
      expect(runEmbeddedAttemptMock).not.toHaveBeenCalled();
      expect(runEmbeddedCamelAttemptMock.mock.calls[0]?.[0]).toMatchObject({
        runtimeEvalMode: "strict",
      });
    } finally {
      await fs.rm(workspaceDir, { recursive: true, force: true });
    }
  });

  it("uses pi runtime when agents.defaults.runtimeEngine=pi", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-pi-default-"));
    try {
      runEmbeddedAttemptMock.mockResolvedValueOnce(makeAttempt());

      await runEmbeddedPiAgent({
        sessionId: "session:test",
        sessionKey: "agent:main:main",
        sessionFile: path.join(workspaceDir, "session.jsonl"),
        workspaceDir,
        config: makeConfig({ defaultsRuntime: "pi" }),
        prompt: "hello",
        provider: "openai",
        model: "mock-1",
        timeoutMs: 5_000,
        runId: "run:pi-default",
        enqueue: immediateEnqueue,
      });

      expect(runEmbeddedAttemptMock).toHaveBeenCalledTimes(1);
      expect(runEmbeddedCamelAttemptMock).not.toHaveBeenCalled();
    } finally {
      await fs.rm(workspaceDir, { recursive: true, force: true });
    }
  });

  it("prefers per-agent runtimeEngine over defaults", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-camel-agent-"));
    try {
      runEmbeddedAttemptMock.mockResolvedValueOnce(makeAttempt());

      await runEmbeddedPiAgent({
        sessionId: "session:test",
        sessionKey: "agent:work:main",
        sessionFile: path.join(workspaceDir, "session.jsonl"),
        workspaceDir,
        config: makeConfig({ defaultsRuntime: "camel", agentRuntime: "pi" }),
        prompt: "hello",
        provider: "openai",
        model: "mock-1",
        timeoutMs: 5_000,
        runId: "run:agent-override",
        enqueue: immediateEnqueue,
      });

      expect(runEmbeddedAttemptMock).toHaveBeenCalledTimes(1);
      expect(runEmbeddedCamelAttemptMock).not.toHaveBeenCalled();
    } finally {
      await fs.rm(workspaceDir, { recursive: true, force: true });
    }
  });

  it("passes configured runtimeEvalMode to camel runtime", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-camel-eval-"));
    try {
      runEmbeddedCamelAttemptMock.mockResolvedValueOnce(makeAttempt());

      await runEmbeddedPiAgent({
        sessionId: "session:test",
        sessionKey: "agent:work:main",
        sessionFile: path.join(workspaceDir, "session.jsonl"),
        workspaceDir,
        config: makeConfig({
          defaultsRuntime: "camel",
          defaultsEval: "strict",
          agentEval: "normal",
        }),
        prompt: "hello",
        provider: "openai",
        model: "mock-1",
        timeoutMs: 5_000,
        runId: "run:camel-eval",
        enqueue: immediateEnqueue,
      });

      expect(runEmbeddedCamelAttemptMock).toHaveBeenCalledTimes(1);
      expect(runEmbeddedCamelAttemptMock.mock.calls[0]?.[0]).toMatchObject({
        runtimeEvalMode: "normal",
      });
    } finally {
      await fs.rm(workspaceDir, { recursive: true, force: true });
    }
  });

  it("passes configured runtimePlanRetries to camel runtime", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-camel-plan-retries-"));
    try {
      runEmbeddedCamelAttemptMock.mockResolvedValueOnce(makeAttempt());

      await runEmbeddedPiAgent({
        sessionId: "session:test",
        sessionKey: "agent:work:main",
        sessionFile: path.join(workspaceDir, "session.jsonl"),
        workspaceDir,
        config: makeConfig({
          defaultsRuntime: "camel",
          defaultsPlanRetries: 8,
          agentPlanRetries: 3,
        }),
        prompt: "hello",
        provider: "openai",
        model: "mock-1",
        timeoutMs: 5_000,
        runId: "run:camel-plan-retries",
        enqueue: immediateEnqueue,
      });

      expect(runEmbeddedCamelAttemptMock).toHaveBeenCalledTimes(1);
      expect(runEmbeddedCamelAttemptMock.mock.calls[0]?.[0]).toMatchObject({
        runtimePlanRetries: 3,
      });
    } finally {
      await fs.rm(workspaceDir, { recursive: true, force: true });
    }
  });
});
