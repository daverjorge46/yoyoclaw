import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const callGatewayMock = vi.fn();
vi.mock("../gateway/call.js", () => ({
  callGateway: (opts: unknown) => callGatewayMock(opts),
}));

let configOverride: ReturnType<(typeof import("../config/config.js"))["loadConfig"]> = {
  session: {
    mainKey: "main",
    scope: "per-sender",
  },
};

vi.mock("../config/config.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../config/config.js")>();
  return {
    ...actual,
    loadConfig: () => configOverride,
    resolveGatewayPort: () => 18789,
  };
});

let agentWorkspaceDirOverride: string | undefined;
vi.mock("../agents/agent-scope.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../agents/agent-scope.js")>();
  return {
    ...actual,
    resolveAgentWorkspaceDir: (...args: Parameters<typeof actual.resolveAgentWorkspaceDir>) => {
      if (agentWorkspaceDirOverride) {
        return agentWorkspaceDirOverride;
      }
      return actual.resolveAgentWorkspaceDir(...args);
    },
  };
});

import "./test-helpers/fast-core-tools.js";
import { createOpenClawTools } from "./openclaw-tools.js";
import { resetSubagentRegistryForTests } from "./subagent-registry.js";

let tmpDir: string;

describe("openclaw-tools: subagents agent definitions", () => {
  beforeEach(() => {
    configOverride = {
      session: {
        mainKey: "main",
        scope: "per-sender",
      },
    };
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-def-spawn-"));
    agentWorkspaceDirOverride = tmpDir;
  });

  afterEach(() => {
    agentWorkspaceDirOverride = undefined;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("sessions_spawn resolves agent definition and applies model", async () => {
    resetSubagentRegistryForTests();
    callGatewayMock.mockReset();

    // Create agent definition
    const agentsDir = path.join(tmpDir, "agents");
    fs.mkdirSync(agentsDir, { recursive: true });
    fs.writeFileSync(
      path.join(agentsDir, "explorer.md"),
      [
        "---",
        "name: explorer",
        'description: "Read-only codebase exploration"',
        "model: google/gemini-2.5-flash",
        "tools:",
        "  allow:",
        "    - read",
        "    - web_search",
        "---",
        "",
        "You are a code explorer. Find relevant code patterns.",
      ].join("\n"),
      "utf-8",
    );

    let capturedModel: string | undefined;
    let capturedSystemPrompt: string | undefined;
    callGatewayMock.mockImplementation(async (opts: unknown) => {
      const request = opts as { method?: string; params?: Record<string, unknown> };
      if (request.method === "sessions.patch") {
        capturedModel = request.params?.model as string;
        return {};
      }
      if (request.method === "agent") {
        capturedSystemPrompt = request.params?.extraSystemPrompt as string;
        return { runId: "run-def-1", status: "accepted", acceptedAt: 6000 };
      }
      if (request.method === "agent.wait") {
        return { status: "timeout" };
      }
      return {};
    });

    const tool = createOpenClawTools({
      agentSessionKey: "main",
      agentChannel: "whatsapp",
    }).find((c) => c.name === "sessions_spawn");
    if (!tool) {
      throw new Error("missing sessions_spawn tool");
    }

    const result = await tool.execute("call-def-1", {
      task: "Find error handling patterns",
      agent: "explorer",
    });

    expect(result.details).toMatchObject({
      status: "accepted",
      agentDefinition: "explorer",
    });
    // Model from definition should be applied
    expect(capturedModel).toBe("google/gemini-2.5-flash");
    // System prompt should include agent definition content
    expect(capturedSystemPrompt).toContain("Agent: explorer");
    expect(capturedSystemPrompt).toContain("code explorer");
  });

  it("sessions_spawn returns error for unknown agent definition", async () => {
    resetSubagentRegistryForTests();
    callGatewayMock.mockReset();

    const tool = createOpenClawTools({
      agentSessionKey: "main",
      agentChannel: "whatsapp",
    }).find((c) => c.name === "sessions_spawn");
    if (!tool) {
      throw new Error("missing sessions_spawn tool");
    }

    const result = await tool.execute("call-def-2", {
      task: "Do something",
      agent: "nonexistent",
    });

    expect(result.details).toMatchObject({
      status: "error",
    });
    expect((result.details as { error?: string }).error).toContain("not found");
  });

  it("explicit model override takes precedence over agent definition model", async () => {
    resetSubagentRegistryForTests();
    callGatewayMock.mockReset();

    const agentsDir = path.join(tmpDir, "agents");
    fs.mkdirSync(agentsDir, { recursive: true });
    fs.writeFileSync(
      path.join(agentsDir, "explorer.md"),
      [
        "---",
        "name: explorer",
        "model: google/gemini-2.5-flash",
        "---",
        "",
        "Explorer agent.",
      ].join("\n"),
      "utf-8",
    );

    let capturedModel: string | undefined;
    callGatewayMock.mockImplementation(async (opts: unknown) => {
      const request = opts as { method?: string; params?: Record<string, unknown> };
      if (request.method === "sessions.patch") {
        capturedModel = request.params?.model as string;
        return {};
      }
      if (request.method === "agent") {
        return { runId: "run-def-3", status: "accepted", acceptedAt: 6100 };
      }
      if (request.method === "agent.wait") {
        return { status: "timeout" };
      }
      return {};
    });

    const tool = createOpenClawTools({
      agentSessionKey: "main",
      agentChannel: "whatsapp",
    }).find((c) => c.name === "sessions_spawn");
    if (!tool) {
      throw new Error("missing sessions_spawn tool");
    }

    await tool.execute("call-def-3", {
      task: "Do something",
      agent: "explorer",
      model: "anthropic/claude-sonnet-4-20250514",
    });

    // Explicit model should win
    expect(capturedModel).toBe("anthropic/claude-sonnet-4-20250514");
  });
});
