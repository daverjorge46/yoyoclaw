import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./run/attempt.js", () => ({
  runEmbeddedAttempt: vi.fn(),
}));

vi.mock("./compact.js", () => ({
  compactEmbeddedPiSessionDirect: vi.fn(),
}));

vi.mock("./model.js", () => ({
  resolveModel: vi.fn(() => ({
    model: {
      id: "test-model",
      provider: "anthropic",
      contextWindow: 200000,
      api: "messages",
    },
    error: null,
    authStorage: {
      setRuntimeApiKey: vi.fn(),
    },
    modelRegistry: {},
  })),
}));

vi.mock("../model-auth.js", () => ({
  ensureAuthProfileStore: vi.fn(() => ({})),
  getApiKeyForModel: vi.fn(async () => ({
    apiKey: "test-key",
    profileId: "test-profile",
    source: "test",
  })),
  resolveAuthProfileOrder: vi.fn(() => []),
}));

vi.mock("../models-config.js", () => ({
  ensureOpenClawModelsJson: vi.fn(async () => {}),
}));

vi.mock("../context-window-guard.js", () => ({
  CONTEXT_WINDOW_HARD_MIN_TOKENS: 1000,
  CONTEXT_WINDOW_WARN_BELOW_TOKENS: 5000,
  evaluateContextWindowGuard: vi.fn(() => ({
    shouldWarn: false,
    shouldBlock: false,
    tokens: 200000,
    source: "model",
  })),
  resolveContextWindowInfo: vi.fn(() => ({
    tokens: 200000,
    source: "model",
  })),
}));

vi.mock("../../process/command-queue.js", () => ({
  enqueueCommandInLane: vi.fn((_lane: string, task: () => unknown) => task()),
}));

vi.mock("../../utils.js", () => ({
  resolveUserPath: vi.fn((p: string) => p),
}));

vi.mock("../../utils/message-channel.js", () => ({
  isMarkdownCapableMessageChannel: vi.fn(() => true),
}));

vi.mock("../agent-paths.js", () => ({
  resolveOpenClawAgentDir: vi.fn(() => "/tmp/agent-dir"),
}));

vi.mock("../auth-profiles.js", () => ({
  markAuthProfileFailure: vi.fn(async () => {}),
  markAuthProfileGood: vi.fn(async () => {}),
  markAuthProfileUsed: vi.fn(async () => {}),
}));

vi.mock("../defaults.js", () => ({
  DEFAULT_CONTEXT_TOKENS: 200000,
  DEFAULT_MODEL: "test-model",
  DEFAULT_PROVIDER: "anthropic",
}));

vi.mock("../failover-error.js", () => ({
  FailoverError: class extends Error {},
  resolveFailoverStatus: vi.fn(),
}));

vi.mock("../usage.js", () => ({
  normalizeUsage: vi.fn(() => undefined),
  hasNonzeroUsage: vi.fn(() => false),
}));

vi.mock("../pi-settings.js", () => ({
  resolveCompactionReserveTokensFloor: vi.fn(() => 20000),
}));

vi.mock("./lanes.js", () => ({
  resolveSessionLane: vi.fn(() => "session-lane"),
  resolveGlobalLane: vi.fn(() => "global-lane"),
}));

vi.mock("./logger.js", () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("./run/payloads.js", () => ({
  buildEmbeddedRunPayloads: vi.fn(() => []),
}));

vi.mock("./tool-result-truncation.js", () => ({
  truncateOversizedToolResultsInSession: vi.fn(async () => ({
    truncated: false,
    truncatedCount: 0,
    reason: "no oversized tool results",
  })),
  sessionLikelyHasOversizedToolResults: vi.fn(() => false),
}));

vi.mock("./utils.js", () => ({
  describeUnknownError: vi.fn((err: unknown) => {
    if (err instanceof Error) {
      return err.message;
    }
    return String(err);
  }),
}));

vi.mock("../pi-embedded-helpers.js", async () => {
  return {
    isCompactionFailureError: vi.fn(() => false),
    isContextOverflowError: vi.fn(() => false),
    isFailoverAssistantError: vi.fn(() => false),
    isFailoverErrorMessage: vi.fn(() => false),
    isAuthAssistantError: vi.fn(() => false),
    isRateLimitAssistantError: vi.fn(() => false),
    isBillingAssistantError: vi.fn(() => false),
    classifyFailoverReason: vi.fn(() => null),
    formatAssistantErrorText: vi.fn(() => ""),
    parseImageSizeError: vi.fn(() => null),
    pickFallbackThinkingLevel: vi.fn(() => null),
    isTimeoutErrorMessage: vi.fn(() => false),
    parseImageDimensionError: vi.fn(() => null),
  };
});

import type { EmbeddedRunAttemptResult } from "./run/types.js";
import { compactEmbeddedPiSessionDirect } from "./compact.js";
import { log } from "./logger.js";
import { runEmbeddedPiAgent } from "./run.js";
import { runEmbeddedAttempt } from "./run/attempt.js";

const mockedRunEmbeddedAttempt = vi.mocked(runEmbeddedAttempt);
const mockedCompactDirect = vi.mocked(compactEmbeddedPiSessionDirect);

function makeAttemptResult(
  overrides: Partial<EmbeddedRunAttemptResult> = {},
): EmbeddedRunAttemptResult {
  return {
    aborted: false,
    timedOut: false,
    promptError: null,
    sessionIdUsed: "test-session",
    assistantTexts: ["Hello!"],
    toolMetas: [],
    lastAssistant: undefined,
    messagesSnapshot: [],
    didSendViaMessagingTool: false,
    messagingToolSentTexts: [],
    messagingToolSentTargets: [],
    cloudCodeAssistFormatError: false,
    ...overrides,
  };
}

const baseParams = {
  sessionId: "test-session",
  sessionKey: "test-key",
  sessionFile: "/tmp/session.json",
  workspaceDir: "/tmp/workspace",
  prompt: "hello",
  timeoutMs: 30000,
  runId: "run-1",
};

describe("threshold compaction safety net (#14702)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("triggers compaction when context exceeds threshold and SDK did not compact", async () => {
    // Simulate a successful turn where context is above threshold (185k > 180k)
    // but the SDK's internal auto-compaction did not fire (compactionCount=0)
    mockedRunEmbeddedAttempt.mockResolvedValueOnce(
      makeAttemptResult({
        compactionCount: 0,
        attemptUsage: {
          input: 100,
          output: 5000,
          cacheRead: 180000,
          cacheWrite: 0,
          total: 185100,
        },
      }),
    );

    mockedCompactDirect.mockResolvedValueOnce({
      ok: true,
      compacted: true,
      result: {
        summary: "Threshold compacted",
        firstKeptEntryId: "entry-10",
      },
    });

    const result = await runEmbeddedPiAgent(baseParams);
    expect(mockedCompactDirect).toHaveBeenCalledTimes(1);
    expect(log.info).toHaveBeenCalledWith(expect.stringContaining("[threshold-compaction]"));
    expect(result.meta?.agentMeta?.compactionCount).toBe(1);
  });

  it("skips compaction when context is below threshold", async () => {
    // Context at 150k — well below the 180k threshold
    mockedRunEmbeddedAttempt.mockResolvedValueOnce(
      makeAttemptResult({
        compactionCount: 0,
        attemptUsage: {
          input: 100,
          output: 3000,
          cacheRead: 147000,
          cacheWrite: 0,
          total: 150100,
        },
      }),
    );

    await runEmbeddedPiAgent(baseParams);
    expect(mockedCompactDirect).not.toHaveBeenCalled();
  });

  it("skips compaction when SDK already compacted", async () => {
    // Context above threshold, but SDK's auto-compaction already fired (compactionCount=1)
    mockedRunEmbeddedAttempt.mockResolvedValueOnce(
      makeAttemptResult({
        compactionCount: 1,
        attemptUsage: {
          input: 100,
          output: 5000,
          cacheRead: 180000,
          cacheWrite: 0,
          total: 185100,
        },
      }),
    );

    await runEmbeddedPiAgent(baseParams);
    expect(mockedCompactDirect).not.toHaveBeenCalled();
  });

  it("skips compaction on aborted runs", async () => {
    mockedRunEmbeddedAttempt.mockResolvedValueOnce(
      makeAttemptResult({
        aborted: true,
        compactionCount: 0,
        attemptUsage: {
          input: 100,
          output: 5000,
          cacheRead: 190000,
          cacheWrite: 0,
          total: 195100,
        },
      }),
    );

    await runEmbeddedPiAgent(baseParams);
    expect(mockedCompactDirect).not.toHaveBeenCalled();
  });

  it("handles compaction failure gracefully", async () => {
    mockedRunEmbeddedAttempt.mockResolvedValueOnce(
      makeAttemptResult({
        compactionCount: 0,
        attemptUsage: {
          input: 100,
          output: 5000,
          cacheRead: 185000,
          cacheWrite: 0,
          total: 190100,
        },
      }),
    );

    mockedCompactDirect.mockResolvedValueOnce({
      ok: false,
      compacted: false,
      reason: "nothing to compact",
    });

    const result = await runEmbeddedPiAgent(baseParams);
    expect(mockedCompactDirect).toHaveBeenCalledTimes(1);
    expect(log.warn).toHaveBeenCalledWith(
      expect.stringContaining("[threshold-compaction] safety-net compaction skipped"),
    );
    // Compaction count should NOT be incremented since compaction didn't actually happen
    expect(result.meta?.agentMeta?.compactionCount).toBeUndefined();
  });
});
