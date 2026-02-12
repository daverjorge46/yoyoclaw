import { beforeEach, describe, expect, it, vi } from "vitest";

const agentSpy = vi.fn(async () => ({
  runId: "run-main",
  status: "ok",
  result: { payloads: [{ text: "summary" }] },
}));
const sessionsDeleteSpy = vi.fn();
const sessionsPatchSpy = vi.fn();
const _readLatestAssistantReplyMock = vi.fn(async () => "raw subagent reply");

let sessionStore: Record<string, Record<string, unknown>> = {};
let configOverride: ReturnType<(typeof import("../config/config.js"))["loadConfig"]> = {
  session: {
    mainKey: "main",
    scope: "per-sender",
  },
};

vi.mock("../gateway/call.js", () => ({
  callGateway: vi.fn(async (req: unknown) => {
    const typed = req as { method: string; params?: Record<string, unknown> };
    if (typed.method === "agent") {
      return await agentSpy(typed);
    }
    if (typed.method === "sessions.patch") {
      sessionsPatchSpy(typed);
      return {};
    }
    if (typed.method === "sessions.delete") {
      sessionsDeleteSpy(typed);
      return {};
    }
    if (typed.method === "chat.history") {
      return { messages: [] };
    }
    return {};
  }),
}));

vi.mock("../config/config.js", () => ({
  loadConfig: () => configOverride,
  resolveGatewayPort: () => 3000,
  resolveConfigPath: () => "/tmp/test-config.json",
  resolveStateDir: () => "/tmp/test-state",
}));

vi.mock("../config/sessions.js", () => ({
  loadSessionStore: () => sessionStore,
  resolveStorePath: () => "/tmp/test-store.json",
  resolveAgentIdFromSessionKey: (key: string) => {
    const agentPrefix = "agent:";
    if (key.startsWith(agentPrefix)) {
      const parts = key.slice(agentPrefix.length).split(":");
      return parts[0] ?? "main";
    }
    return "main";
  },
  resolveMainSessionKey: () => "agent:main:main",
  resolveAgentMainSessionKey: () => "agent:main:main",
}));

vi.mock("../agents/pi-embedded-runner.js", () => ({
  isEmbeddedPiRunActive: vi.fn(() => false),
  isEmbeddedPiRunStreaming: vi.fn(() => false),
  queueEmbeddedPiMessage: vi.fn(() => false),
  waitForEmbeddedPiRunEnd: vi.fn(async () => true),
}));
vi.mock("../agents/pi-embedded-runner/runs.js", () => ({
  isEmbeddedPiRunActive: vi.fn(() => false),
  isEmbeddedPiRunStreaming: vi.fn(() => false),
  queueEmbeddedPiMessage: vi.fn(() => false),
  waitForEmbeddedPiRunEnd: vi.fn(async () => true),
}));

vi.mock("../agents/tools/agent-step.js", () => ({
  readLatestAssistantReply: vi.fn(async () => "raw subagent reply"),
}));

vi.mock("../auto-reply/reply/queue.js", () => ({
  resolveQueueSettings: () => ({
    mode: "interrupt",
    debounceMs: 500,
    cap: 20,
    dropPolicy: "summarize",
  }),
}));

import { runSubagentAnnounceFlow } from "./subagent-announce.js";

describe("runSubagentAnnounceFlow – empty payloads detection (#14997)", () => {
  beforeEach(() => {
    agentSpy.mockClear();
    sessionsDeleteSpy.mockClear();
    sessionsPatchSpy.mockClear();
    sessionStore = {
      "agent:main:main": {
        sessionId: "main-session",
        updatedAt: Date.now(),
        lastChannel: "telegram",
        lastTo: "123",
      },
    };
    configOverride = {
      session: { mainKey: "main", scope: "per-sender" },
    };
  });

  it("returns true when announce agent delivers payloads", async () => {
    agentSpy.mockResolvedValue({
      runId: "run-main",
      status: "ok",
      result: { payloads: [{ text: "Here is the summary" }] },
    });

    const result = await runSubagentAnnounceFlow({
      childSessionKey: "agent:main:cron:job-1:run:abc",
      childRunId: "job-1:abc",
      requesterSessionKey: "agent:main:main",
      requesterOrigin: { channel: "telegram", to: "123" },
      requesterDisplayKey: "agent:main:main",
      task: "weather check",
      timeoutMs: 30_000,
      cleanup: "keep",
      roundOneReply: "Weather is sunny and warm today",
      waitForCompletion: false,
      outcome: { status: "ok" },
      announceType: "cron job",
    });

    expect(result).toBe(true);
    expect(agentSpy).toHaveBeenCalledTimes(1);
  });

  it("returns false when announce agent produces empty payloads (NO_REPLY)", async () => {
    agentSpy.mockResolvedValue({
      runId: "run-main",
      status: "ok",
      result: { payloads: [] },
    });

    const result = await runSubagentAnnounceFlow({
      childSessionKey: "agent:main:cron:job-1:run:abc",
      childRunId: "job-1:abc",
      requesterSessionKey: "agent:main:main",
      requesterOrigin: { channel: "telegram", to: "123" },
      requesterDisplayKey: "agent:main:main",
      task: "weather check",
      timeoutMs: 30_000,
      cleanup: "keep",
      roundOneReply: "Weather is sunny and warm today",
      waitForCompletion: false,
      outcome: { status: "ok" },
      announceType: "cron job",
    });

    expect(result).toBe(false);
    expect(agentSpy).toHaveBeenCalledTimes(1);
  });

  it("returns true when response has no result field (legacy/unknown format)", async () => {
    agentSpy.mockResolvedValue({
      runId: "run-main",
      status: "ok",
    });

    const result = await runSubagentAnnounceFlow({
      childSessionKey: "agent:main:cron:job-1:run:abc",
      childRunId: "job-1:abc",
      requesterSessionKey: "agent:main:main",
      requesterOrigin: { channel: "telegram", to: "123" },
      requesterDisplayKey: "agent:main:main",
      task: "weather check",
      timeoutMs: 30_000,
      cleanup: "keep",
      roundOneReply: "Weather is sunny",
      waitForCompletion: false,
      outcome: { status: "ok" },
      announceType: "cron job",
    });

    expect(result).toBe(true);
  });
});
