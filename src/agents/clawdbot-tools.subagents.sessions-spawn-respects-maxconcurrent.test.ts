import { beforeEach, describe, expect, it, vi } from "vitest";

const callGatewayMock = vi.fn();
vi.mock("../gateway/call.js", () => ({
  callGateway: (opts: unknown) => callGatewayMock(opts),
}));

let configOverride: ReturnType<(typeof import("../config/config.js"))["loadConfig"]> = {};

vi.mock("../config/config.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../config/config.js")>();
  return {
    ...actual,
    loadConfig: () => configOverride,
    resolveGatewayPort: () => 18789,
  };
});

import "./test-helpers/fast-core-tools.js";
import { createClawdbotTools } from "./clawdbot-tools.js";
import { addSubagentRunForTests, resetSubagentRegistryForTests } from "./subagent-registry.js";

describe("clawdbot-tools: subagents maxConcurrent", () => {
  beforeEach(() => {
    resetSubagentRegistryForTests();
    callGatewayMock.mockReset();
    configOverride = {
      session: {
        mainKey: "main",
        scope: "per-sender",
      },
    };
  });

  it("sessions_spawn returns rate_limited when at maxConcurrent capacity", async () => {
    configOverride = {
      session: {
        mainKey: "main",
        scope: "per-sender",
      },
      agents: {
        defaults: {
          subagents: {
            maxConcurrent: 2,
          },
        },
      },
    };

    addSubagentRunForTests({
      runId: "run-1",
      childSessionKey: "agent:main:subagent:uuid-1",
      requesterSessionKey: "main",
      requesterDisplayKey: "main",
      task: "task 1",
      cleanup: "keep",
      createdAt: Date.now(),
    });
    addSubagentRunForTests({
      runId: "run-2",
      childSessionKey: "agent:main:subagent:uuid-2",
      requesterSessionKey: "main",
      requesterDisplayKey: "main",
      task: "task 2",
      cleanup: "keep",
      createdAt: Date.now(),
    });

    const tool = createClawdbotTools({
      agentSessionKey: "main",
      agentChannel: "whatsapp",
    }).find((candidate) => candidate.name === "sessions_spawn");
    if (!tool) throw new Error("missing sessions_spawn tool");

    const result = await tool.execute("call1", { task: "new task" });

    expect(result.details).toMatchObject({
      status: "rate_limited",
    });
    expect((result.details as { error?: string }).error).toContain("maxConcurrent");
    expect(callGatewayMock).not.toHaveBeenCalled();
  });

  it("sessions_spawn allows spawn when under maxConcurrent limit", async () => {
    configOverride = {
      session: {
        mainKey: "main",
        scope: "per-sender",
      },
      agents: {
        defaults: {
          subagents: {
            maxConcurrent: 3,
          },
        },
      },
    };

    addSubagentRunForTests({
      runId: "run-1",
      childSessionKey: "agent:main:subagent:uuid-1",
      requesterSessionKey: "main",
      requesterDisplayKey: "main",
      task: "task 1",
      cleanup: "keep",
      createdAt: Date.now(),
    });

    callGatewayMock.mockResolvedValue({ runId: "run-new", status: "accepted" });

    const tool = createClawdbotTools({
      agentSessionKey: "main",
      agentChannel: "whatsapp",
    }).find((candidate) => candidate.name === "sessions_spawn");
    if (!tool) throw new Error("missing sessions_spawn tool");

    const result = await tool.execute("call1", { task: "new task" });

    expect(result.details).toMatchObject({
      status: "accepted",
    });
  });

  it("sessions_spawn allows spawn when completed runs dont count toward limit", async () => {
    configOverride = {
      session: {
        mainKey: "main",
        scope: "per-sender",
      },
      agents: {
        defaults: {
          subagents: {
            maxConcurrent: 1,
          },
        },
      },
    };

    addSubagentRunForTests({
      runId: "run-1",
      childSessionKey: "agent:main:subagent:uuid-1",
      requesterSessionKey: "main",
      requesterDisplayKey: "main",
      task: "task 1",
      cleanup: "keep",
      createdAt: Date.now(),
      endedAt: Date.now(),
    });

    callGatewayMock.mockResolvedValue({ runId: "run-new", status: "accepted" });

    const tool = createClawdbotTools({
      agentSessionKey: "main",
      agentChannel: "whatsapp",
    }).find((candidate) => candidate.name === "sessions_spawn");
    if (!tool) throw new Error("missing sessions_spawn tool");

    const result = await tool.execute("call1", { task: "new task" });

    expect(result.details).toMatchObject({
      status: "accepted",
    });
  });
});
