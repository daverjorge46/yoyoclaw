import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tests for the autoDiscoverAgents feature in sessions_spawn.
 *
 * The auto-discover logic adds all agent ids from `agents.list[]`
 * to the spawn allowlist when `subagents.autoDiscoverAgents` is true.
 */

// Mock loadConfig to control agent list
const mockLoadConfig = vi.fn();
vi.mock("../../config/config.js", () => ({
  loadConfig: () => mockLoadConfig(),
}));

// Mock resolveAgentConfig
const mockResolveAgentConfig = vi.fn();
vi.mock("../agent-scope.js", () => ({
  resolveAgentConfig: (...args: unknown[]) => mockResolveAgentConfig(...args),
}));

// Mock gateway calls
vi.mock("../../gateway/call.js", () => ({
  callGateway: vi.fn().mockResolvedValue({ runId: "test-run-id" }),
}));

// Mock subagent registry
vi.mock("../subagent-registry.js", () => ({
  registerSubagentRun: vi.fn(),
}));

// Mock session helpers
vi.mock("./sessions-helpers.js", () => ({
  resolveDisplaySessionKey: () => "display-key",
  resolveInternalSessionKey: () => "agent:main:session:test",
  resolveMainSessionAlias: () => ({
    mainKey: "agent:main:session:main",
    alias: "agent:main:session:main",
  }),
}));

// Mock routing
vi.mock("../../routing/session-key.js", () => ({
  isSubagentSessionKey: () => false,
  normalizeAgentId: (id: string) => id.toLowerCase().replace(/[^a-z0-9-]/g, ""),
  parseAgentSessionKey: () => ({ agentId: "main" }),
}));

// Mock other deps
vi.mock("../subagent-announce.js", () => ({
  buildSubagentSystemPrompt: () => "test prompt",
}));
vi.mock("../lanes.js", () => ({
  AGENT_LANE_SUBAGENT: "subagent",
}));
vi.mock("../../auto-reply/thinking.js", () => ({
  formatThinkingLevels: () => "off, low, medium, high",
  normalizeThinkLevel: (v: string) => v,
}));
vi.mock("../../utils/delivery-context.js", () => ({
  normalizeDeliveryContext: (v: unknown) => v,
}));
vi.mock("../schema/typebox.js", () => ({
  optionalStringEnum: () => ({}),
}));

describe("sessions_spawn autoDiscoverAgents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows spawning a discovered agent when autoDiscoverAgents is true", async () => {
    mockLoadConfig.mockReturnValue({
      agents: {
        defaults: {
          subagents: { autoDiscoverAgents: true },
        },
        list: [{ id: "main" }, { id: "researcher" }, { id: "writer" }],
      },
    });

    mockResolveAgentConfig.mockReturnValue({
      subagents: {
        allowAgents: [], // empty explicit list
        // autoDiscoverAgents not set per-agent, falls back to defaults
      },
    });

    const { createSessionsSpawnTool } = await import("./sessions-spawn-tool.js");
    const tool = createSessionsSpawnTool({
      agentSessionKey: "agent:main:session:test",
    });

    const result = await tool.execute("call-1", {
      task: "Research something",
      agentId: "researcher",
    });

    const parsed = JSON.parse(result as string);
    expect(parsed.status).toBe("accepted");
  });

  it("blocks spawning when autoDiscoverAgents is false and agent not in allowlist", async () => {
    mockLoadConfig.mockReturnValue({
      agents: {
        defaults: {
          subagents: { autoDiscoverAgents: false },
        },
        list: [{ id: "main" }, { id: "researcher" }],
      },
    });

    mockResolveAgentConfig.mockReturnValue({
      subagents: {
        allowAgents: [],
      },
    });

    const { createSessionsSpawnTool } = await import("./sessions-spawn-tool.js");
    const tool = createSessionsSpawnTool({
      agentSessionKey: "agent:main:session:test",
    });

    const result = await tool.execute("call-2", {
      task: "Research something",
      agentId: "researcher",
    });

    const parsed = JSON.parse(result as string);
    expect(parsed.status).toBe("forbidden");
  });
});
