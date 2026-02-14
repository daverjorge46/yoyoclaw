import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExecApprovalsResolved } from "../infra/exec-approvals.js";
import { sanitizeBinaryOutput } from "./shell-utils.js";

const isWin = process.platform === "win32";

vi.mock("../infra/shell-env.js", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../infra/shell-env.js")>();
  return {
    ...mod,
    getShellPathFromLoginShell: vi.fn(() => "/custom/bin:/opt/bin"),
    resolveShellEnvFallbackTimeoutMs: vi.fn(() => 1234),
  };
});

vi.mock("../infra/exec-approvals.js", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../infra/exec-approvals.js")>();
  const approvals: ExecApprovalsResolved = {
    path: "/tmp/exec-approvals.json",
    socketPath: "/tmp/exec-approvals.sock",
    token: "token",
    defaults: {
      security: "full",
      ask: "off",
      askFallback: "full",
      autoAllowSkills: false,
    },
    agent: {
      security: "full",
      ask: "off",
      askFallback: "full",
      autoAllowSkills: false,
    },
    allowlist: [],
    file: {
      version: 1,
      socket: { path: "/tmp/exec-approvals.sock", token: "token" },
      defaults: {
        security: "full",
        ask: "off",
        askFallback: "full",
        autoAllowSkills: false,
      },
      agents: {},
    },
  };
  return { ...mod, resolveExecApprovals: () => approvals };
});

const normalizeText = (value?: string) =>
  sanitizeBinaryOutput(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

const normalizePathEntries = (value?: string) =>
  normalizeText(value)
    .split(/[:\s]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

describe("exec PATH login shell merge", () => {
  const originalPath = process.env.PATH;

  afterEach(() => {
    process.env.PATH = originalPath;
  });

  it("merges login-shell PATH for host=gateway", async () => {
    if (isWin) {
      return;
    }
    process.env.PATH = "/usr/bin";

    const { createExecTool } = await import("./bash-tools.exec.js");
    const { getShellPathFromLoginShell } = await import("../infra/shell-env.js");
    const shellPathMock = vi.mocked(getShellPathFromLoginShell);
    shellPathMock.mockClear();
    shellPathMock.mockReturnValue("/custom/bin:/opt/bin");

    const tool = createExecTool({ host: "gateway", security: "full", ask: "off" });
    const result = await tool.execute("call1", { command: "echo $PATH" });
    const entries = normalizePathEntries(result.content.find((c) => c.type === "text")?.text);

    expect(entries).toEqual(["/custom/bin", "/opt/bin", "/usr/bin"]);
    expect(shellPathMock).toHaveBeenCalledTimes(1);
  });

  it("silently drops env.PATH (not in allowlist) on host execution", async () => {
    if (isWin) {
      return;
    }
    process.env.PATH = "/usr/bin";

    const { createExecTool } = await import("./bash-tools.exec.js");

    const tool = createExecTool({ host: "gateway", security: "full", ask: "off" });

    // PATH is not in the allowlist, so it is silently filtered out and the command succeeds
    const result = await tool.execute("call1", {
      command: "echo $PATH",
      env: { PATH: "/explicit/bin" },
    });
    const text = normalizeText(result.content.find((c) => c.type === "text")?.text);
    // The explicit PATH should NOT appear in the output
    expect(text).not.toContain("/explicit/bin");
  });
});

describe("exec host env validation", () => {
  it("silently drops dangerous env vars (not in allowlist) on host execution", async () => {
    const { createExecTool } = await import("./bash-tools.exec.js");
    const tool = createExecTool({ host: "gateway", security: "full", ask: "off" });

    // LD_DEBUG is not in the allowlist, so it is silently filtered out
    const result = await tool.execute("call1", {
      command: "echo ok",
      env: { LD_DEBUG: "1" },
    });
    const text = normalizeText(result.content.find((c) => c.type === "text")?.text);
    expect(text).toContain("ok");
  });
});
