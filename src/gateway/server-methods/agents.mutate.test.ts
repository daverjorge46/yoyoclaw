import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  loadConfigReturn: {} as Record<string, unknown>,
  applyAgentConfig: vi.fn((_cfg: unknown, _opts: unknown) => ({})),
  findAgentEntryIndex: vi.fn(() => -1),
  listAgentEntries: vi.fn(() => [] as Array<{ id: string }>),
  pruneAgentConfig: vi.fn(() => ({ config: {}, removedBindings: 0, removedAllow: 0 })),
  writeConfigFile: vi.fn(async () => {}),
  ensureAgentWorkspace: vi.fn(async () => ({})),
  resolveAgentDir: vi.fn(() => "/agents/test-agent"),
  resolveAgentWorkspaceDir: vi.fn(() => "/workspace/test-agent"),
  resolveSessionTranscriptsDirForAgent: vi.fn(() => "/transcripts/test-agent"),
  fsAppendFile: vi.fn(async () => {}),
  fsMkdir: vi.fn(async () => undefined),
  fsAccess: vi.fn(async () => {}),
  movePathToTrash: vi.fn(async () => {}),
}));

vi.mock("../../config/config.js", () => ({
  loadConfig: () => mocks.loadConfigReturn,
  writeConfigFile: mocks.writeConfigFile,
}));

vi.mock("../../commands/agents.config.js", () => ({
  applyAgentConfig: mocks.applyAgentConfig,
  findAgentEntryIndex: mocks.findAgentEntryIndex,
  listAgentEntries: mocks.listAgentEntries,
  pruneAgentConfig: mocks.pruneAgentConfig,
}));

vi.mock("../../agents/agent-scope.js", () => ({
  listAgentIds: () => ["main", "fancy-agent", "test-agent"],
  resolveAgentDir: mocks.resolveAgentDir,
  resolveAgentWorkspaceDir: mocks.resolveAgentWorkspaceDir,
}));

vi.mock("../../agents/workspace.js", async () => {
  const actual = await vi.importActual<typeof import("../../agents/workspace.js")>(
    "../../agents/workspace.js",
  );
  return {
    ...actual,
    ensureAgentWorkspace: mocks.ensureAgentWorkspace,
  };
});

vi.mock("../../config/sessions/paths.js", () => ({
  resolveSessionTranscriptsDirForAgent: mocks.resolveSessionTranscriptsDirForAgent,
}));

vi.mock("../../browser/trash.js", () => ({
  movePathToTrash: mocks.movePathToTrash,
}));

vi.mock("../../utils.js", () => ({
  resolveUserPath: (p: string) => `/resolved${p.startsWith("/") ? "" : "/"}${p}`,
}));

vi.mock("../session-utils.js", () => ({
  listAgentsForGateway: () => ({
    defaultId: "main",
    mainKey: "agent:main:main",
    scope: "global",
    agents: [],
  }),
}));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  const patched = {
    ...actual,
    access: mocks.fsAccess,
    mkdir: mocks.fsMkdir,
    appendFile: mocks.fsAppendFile,
  };
  return { ...patched, default: patched };
});

const { agentsHandlers } = await import("./agents.js");

function makeCall(method: keyof typeof agentsHandlers, params: Record<string, unknown>) {
  const respond = vi.fn();
  const handler = agentsHandlers[method];
  const promise = handler({
    params,
    respond,
    context: {} as never,
    req: { type: "req" as const, id: "1", method },
    client: null,
    isWebchatConnect: () => false,
  });
  return { respond, promise };
}

describe("agents mutate handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadConfigReturn = {};
    mocks.findAgentEntryIndex.mockReturnValue(-1);
    mocks.applyAgentConfig.mockImplementation((_cfg, _opts) => ({}));
  });

  it("agents.create stores emoji/avatar in config identity (does not append IDENTITY.md)", async () => {
    const { respond, promise } = makeCall("agents.create", {
      name: "Fancy Agent",
      workspace: "/tmp/ws",
      emoji: "🤖",
      avatar: "avatars/fancy.png",
    });
    await promise;

    expect(respond).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ ok: true, agentId: "fancy-agent" }),
      undefined,
    );
    expect(mocks.applyAgentConfig).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        agentId: "fancy-agent",
        identity: expect.objectContaining({
          emoji: "🤖",
          avatar: "avatars/fancy.png",
        }),
      }),
    );
    expect(mocks.fsAppendFile).not.toHaveBeenCalled();
  });

  it("agents.update stores avatar in config identity (does not append IDENTITY.md)", async () => {
    mocks.findAgentEntryIndex.mockReturnValue(0);

    const { respond, promise } = makeCall("agents.update", {
      agentId: "test-agent",
      avatar: "avatars/test.png",
    });
    await promise;

    expect(respond).toHaveBeenCalledWith(true, { ok: true, agentId: "test-agent" }, undefined);
    expect(mocks.applyAgentConfig).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        agentId: "test-agent",
        identity: expect.objectContaining({ avatar: "avatars/test.png" }),
      }),
    );
    expect(mocks.fsAppendFile).not.toHaveBeenCalled();
  });
});
