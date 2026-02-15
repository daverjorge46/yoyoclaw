import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CamelRuntimeResult } from "../../camel/runtime.js";
import { runEmbeddedCamelAttempt } from "./camel-attempt.js";

const runCamelRuntimeMock = vi.fn<Promise<CamelRuntimeResult>, [unknown]>();

vi.mock("../../camel/runtime.js", () => ({
  runCamelRuntime: (params: unknown) => runCamelRuntimeMock(params),
}));

vi.mock("../../pi-tools.js", () => ({
  createOpenClawCodingTools: () => [],
}));

vi.mock("../../sandbox.js", () => ({
  resolveSandboxContext: async () => undefined,
}));

vi.mock("../google.js", () => ({
  sanitizeSessionHistory: async (params: { messages: unknown[] }) => params.messages,
}));

vi.mock("../../bootstrap-files.js", () => ({
  makeBootstrapWarn: ({ warn }: { warn: (message: string) => void }) => warn,
  resolveBootstrapContextForRun: async () => ({
    bootstrapFiles: [],
    contextFiles: [],
  }),
}));

vi.mock("../../skills.js", () => ({
  loadWorkspaceSkillEntries: () => [],
  resolveSkillsPromptForRun: () => "",
  applySkillEnvOverrides: () => () => {},
  applySkillEnvOverridesFromSnapshot: () => () => {},
}));

vi.mock("../system-prompt.js", () => ({
  buildEmbeddedSystemPrompt: () => "CAMEL SYSTEM PROMPT",
}));

vi.mock("../../system-prompt-report.js", () => ({
  buildSystemPromptReport: () => ({ source: "run", systemPrompt: "CAMEL SYSTEM PROMPT" }),
}));

vi.mock("../../system-prompt-params.js", () => ({
  buildSystemPromptParams: () => ({
    runtimeInfo: {
      host: "test-host",
      os: "test-os",
      arch: "x64",
      node: process.version,
      model: "openai/mock-1",
    },
    userTimezone: "UTC",
    userTime: "2026-02-14T00:00:00Z",
    userTimeFormat: "iso",
  }),
}));

vi.mock("../../docs-path.js", () => ({
  resolveOpenClawDocsPath: async () => undefined,
}));

vi.mock("../../../infra/machine-name.js", () => ({
  getMachineDisplayName: async () => "test-machine",
}));

vi.mock("../../../config/channel-capabilities.js", () => ({
  resolveChannelCapabilities: () => [],
}));

vi.mock("../../channel-tools.js", () => ({
  listChannelSupportedActions: () => [],
  resolveChannelMessageToolHints: () => [],
}));

vi.mock("../../model-selection.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../model-selection.js")>();
  return {
    ...actual,
    resolveDefaultModelForAgent: () => ({ provider: "openai", model: "mock-1" }),
  };
});

vi.mock("../model.js", () => ({
  buildModelAliasLines: () => [],
}));

vi.mock("../sandbox-info.js", () => ({
  buildEmbeddedSandboxInfo: () => undefined,
}));

vi.mock("../../sandbox/runtime-status.js", () => ({
  resolveSandboxRuntimeStatus: () => ({ mode: "off", sandboxed: false }),
}));

vi.mock("../../shell-utils.js", () => ({
  detectRuntimeShell: () => "bash",
}));

afterEach(() => {
  runCamelRuntimeMock.mockReset();
});

describe("runEmbeddedCamelAttempt", () => {
  it("passes generated system prompt to runtime and emits final reply callbacks", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-camel-attempt-"));
    const sessionFile = path.join(workspaceDir, "session.jsonl");

    const onAssistantMessageStart = vi.fn<() => void>();
    const onPartialReply = vi.fn<(payload: { text?: string }) => void>();
    const onBlockReply = vi.fn<(payload: { text?: string }) => void>();
    const onBlockReplyFlush = vi.fn<() => void>();

    runCamelRuntimeMock.mockResolvedValueOnce({
      assistantTexts: ["final answer"],
      toolMetas: [],
      lastAssistant: undefined,
      lastToolError: undefined,
      didSendViaMessagingTool: false,
      messagingToolSentTexts: [],
      messagingToolSentTargets: [],
      attemptUsage: { input: 1, output: 1, total: 2 },
      executionTrace: [],
      issues: [],
    });

    try {
      const result = await runEmbeddedCamelAttempt({
        sessionId: "session:test",
        sessionKey: "agent:main:main",
        sessionFile,
        workspaceDir,
        prompt: "hello",
        provider: "openai",
        modelId: "mock-1",
        model: {
          api: "openai-responses",
          provider: "openai",
          input: ["text"],
        } as never,
        authStorage: {} as never,
        modelRegistry: {} as never,
        thinkLevel: "off",
        runtimePlanRetries: 4,
        timeoutMs: 10_000,
        runId: "run:camel-attempt-test",
        onAssistantMessageStart,
        onPartialReply,
        onBlockReply,
        onBlockReplyFlush,
      });

      expect(result.promptError).toBeNull();
      expect(runCamelRuntimeMock).toHaveBeenCalledTimes(1);
      expect(runCamelRuntimeMock.mock.calls[0]?.[0]).toMatchObject({
        extraSystemPrompt: "CAMEL SYSTEM PROMPT",
        maxPlanRetries: 4,
      });
      expect(onAssistantMessageStart).toHaveBeenCalledTimes(1);
      expect(onPartialReply).toHaveBeenCalledWith({ text: "final answer" });
      expect(onBlockReply).toHaveBeenCalledWith({ text: "final answer" });
      expect(onBlockReplyFlush).toHaveBeenCalledTimes(1);
      expect(result.systemPromptReport).toMatchObject({ source: "run" });
      expect(result.assistantTexts.at(-1)).toBe("final answer");
    } finally {
      await fs.rm(workspaceDir, { recursive: true, force: true });
    }
  });
});
