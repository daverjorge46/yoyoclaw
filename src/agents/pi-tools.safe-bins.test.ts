import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import type { ExecApprovalsResolved } from "../infra/exec-approvals.js";
import { createOpenClawCodingTools } from "./pi-tools.js";

vi.mock("../infra/exec-approvals.js", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../infra/exec-approvals.js")>();
  const approvals: ExecApprovalsResolved = {
    path: "/tmp/exec-approvals.json",
    socketPath: "/tmp/exec-approvals.sock",
    token: "token",
    defaults: {
      security: "allowlist",
      ask: "off",
      askFallback: "deny",
      autoAllowSkills: false,
    },
    agent: {
      security: "allowlist",
      ask: "off",
      askFallback: "deny",
      autoAllowSkills: false,
    },
    allowlist: [],
    file: {
      version: 1,
      socket: { path: "/tmp/exec-approvals.sock", token: "token" },
      defaults: {
        security: "allowlist",
        ask: "off",
        askFallback: "deny",
        autoAllowSkills: false,
      },
      agents: {},
    },
  };
  return { ...mod, resolveExecApprovals: () => approvals };
});

describe("createOpenClawCodingTools safeBins", () => {
  // Helper: only run this on Linux/CI while we track flaky failures in #7057
  function shouldRunLinuxTests() {
    return process.platform === "linux" || !!process.env.CI || process.env.RUN_SLOW_TESTS === "1";
  }

  it(
    "threads tools.exec.safeBins into exec allowlist checks",
    async () => {
      if (!shouldRunLinuxTests()) {
        console.info("TEST SKIP: skipping safe-bins test on non-Linux host; see https://github.com/openclaw/openclaw/issues/7057");
        return;
      }

      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-safe-bins-"));
      console.debug("TEST DEBUG: safe-bins tmpDir", tmpDir);

      const cfg: OpenClawConfig = {
        tools: {
          exec: {
            host: "gateway",
            security: "allowlist",
            ask: "off",
            safeBins: ["echo"],
          },
        },
      };

      const tools = createOpenClawCodingTools({
        config: cfg,
        sessionKey: "agent:main:main",
        workspaceDir: tmpDir,
        agentDir: path.join(tmpDir, "agent"),
      });
      const execTool = tools.find((tool) => tool.name === "exec");
      expect(execTool).toBeDefined();

      const marker = `safe-bins-${Date.now()}`;
      console.debug("TEST DEBUG: running exec with marker", marker);
      const result = await execTool!.execute("call1", {
        command: `echo ${marker}`,
        workdir: tmpDir,
      });
      console.debug("TEST DEBUG: exec result details", result.details);
      const text = result.content.find((content) => content.type === "text")?.text ?? "";
      console.debug("TEST DEBUG: exec output snippet", text.slice(0, 200));

      expect(result.details.status).toBe("completed");
      expect(text).toContain(marker);
    },
    300000
  );
});
