import fs from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CliDeps } from "../cli/deps.js";
import type { OpenClawConfig } from "../config/config.js";
import type { CronJob } from "./types.js";
import { withTempHome as withTempHomeBase } from "../../test/helpers/temp-home.js";
import { telegramOutbound } from "../channels/plugins/outbound/telegram.js";
import { setActivePluginRegistry } from "../plugins/runtime.js";
import { createOutboundTestPlugin, createTestRegistry } from "../test-utils/channel-plugins.js";

vi.mock("../agents/pi-embedded.js", () => ({
  abortEmbeddedPiRun: vi.fn().mockReturnValue(false),
  runEmbeddedPiAgent: vi.fn(),
  resolveEmbeddedSessionLane: (key: string) => `session:${key.trim() || "main"}`,
}));
vi.mock("../agents/model-catalog.js", () => ({
  loadModelCatalog: vi.fn(),
}));
vi.mock("../agents/subagent-announce.js", () => ({
  runSubagentAnnounceFlow: vi.fn(),
}));

import { loadModelCatalog } from "../agents/model-catalog.js";
import { runEmbeddedPiAgent } from "../agents/pi-embedded.js";
import { runSubagentAnnounceFlow } from "../agents/subagent-announce.js";
import { runCronIsolatedAgentTurn } from "./isolated-agent.js";

async function withTempHome<T>(fn: (home: string) => Promise<T>): Promise<T> {
  return withTempHomeBase(fn, { prefix: "openclaw-cron-" });
}

async function writeSessionStore(home: string) {
  const dir = path.join(home, ".openclaw", "sessions");
  await fs.mkdir(dir, { recursive: true });
  const storePath = path.join(dir, "sessions.json");
  await fs.writeFile(
    storePath,
    JSON.stringify(
      {
        "agent:main:main": {
          sessionId: "main-session",
          updatedAt: Date.now(),
          lastChannel: "telegram",
          lastTo: "123",
        },
      },
      null,
      2,
    ),
    "utf-8",
  );
  return storePath;
}

function makeCfg(
  home: string,
  storePath: string,
  overrides: Partial<OpenClawConfig> = {},
): OpenClawConfig {
  const base: OpenClawConfig = {
    agents: {
      defaults: {
        model: "anthropic/claude-opus-4-5",
        workspace: path.join(home, "openclaw"),
      },
    },
    session: { store: storePath, mainKey: "main" },
  } as OpenClawConfig;
  return { ...base, ...overrides };
}

function makeJob(payload: CronJob["payload"]): CronJob {
  const now = Date.now();
  return {
    id: "job-1",
    name: "job-1",
    enabled: true,
    createdAtMs: now,
    updatedAtMs: now,
    schedule: { kind: "every", everyMs: 60_000 },
    sessionTarget: "isolated",
    wakeMode: "now",
    payload,
    state: {},
  };
}

describe("runCronIsolatedAgentTurn – announce fallback (#14997)", () => {
  beforeEach(() => {
    vi.mocked(runEmbeddedPiAgent).mockReset();
    vi.mocked(loadModelCatalog).mockResolvedValue([]);
    vi.mocked(runSubagentAnnounceFlow).mockReset().mockResolvedValue(true);
    setActivePluginRegistry(
      createTestRegistry([
        {
          pluginId: "telegram",
          plugin: createOutboundTestPlugin({ id: "telegram", outbound: telegramOutbound }),
          source: "test",
        },
      ]),
    );
  });

  it("falls back to direct delivery when announce flow returns false", async () => {
    await withTempHome(async (home) => {
      const storePath = await writeSessionStore(home);
      const deps: CliDeps = {
        sendMessageWhatsApp: vi.fn(),
        sendMessageTelegram: vi.fn().mockResolvedValue({
          messageId: "t1",
          chatId: "123",
        }),
        sendMessageDiscord: vi.fn(),
        sendMessageSignal: vi.fn(),
        sendMessageIMessage: vi.fn(),
      };
      vi.mocked(runEmbeddedPiAgent).mockResolvedValue({
        payloads: [{ text: "Weather report: sunny and warm" }],
        meta: {
          durationMs: 5,
          agentMeta: { sessionId: "s", provider: "p", model: "m" },
        },
      });
      // Announce flow fails (e.g. announce agent responded with NO_REPLY)
      vi.mocked(runSubagentAnnounceFlow).mockResolvedValue(false);

      const res = await runCronIsolatedAgentTurn({
        cfg: makeCfg(home, storePath, {
          channels: { telegram: { botToken: "t-1" } },
        }),
        deps,
        job: {
          ...makeJob({ kind: "agentTurn", message: "check weather" }),
          delivery: { mode: "announce", channel: "telegram", to: "123" },
        },
        message: "check weather",
        sessionKey: "cron:job-1",
        lane: "cron",
      });

      expect(res.status).toBe("ok");
      // Announce was attempted first
      expect(runSubagentAnnounceFlow).toHaveBeenCalledTimes(1);
      // Fallback direct delivery should have been called
      expect(deps.sendMessageTelegram).toHaveBeenCalledTimes(1);
      const call = vi.mocked(deps.sendMessageTelegram).mock.calls[0];
      // sendMessageTelegram receives (opts) where opts contains chatId
      expect(call).toBeDefined();
    });
  });

  it("returns error when announce fails and no delivery target for fallback", async () => {
    await withTempHome(async (home) => {
      const storePath = await writeSessionStore(home);
      // Write a session store without lastTo so delivery target is missing
      await fs.writeFile(
        storePath,
        JSON.stringify(
          {
            "agent:main:main": {
              sessionId: "main-session",
              updatedAt: Date.now(),
              lastChannel: "telegram",
              lastTo: "",
            },
          },
          null,
          2,
        ),
        "utf-8",
      );
      const deps: CliDeps = {
        sendMessageWhatsApp: vi.fn(),
        sendMessageTelegram: vi.fn(),
        sendMessageDiscord: vi.fn(),
        sendMessageSignal: vi.fn(),
        sendMessageIMessage: vi.fn(),
      };
      vi.mocked(runEmbeddedPiAgent).mockResolvedValue({
        payloads: [{ text: "Weather report: sunny" }],
        meta: {
          durationMs: 5,
          agentMeta: { sessionId: "s", provider: "p", model: "m" },
        },
      });
      vi.mocked(runSubagentAnnounceFlow).mockResolvedValue(false);

      const res = await runCronIsolatedAgentTurn({
        cfg: makeCfg(home, storePath, {
          channels: { telegram: { botToken: "t-1" } },
        }),
        deps,
        job: {
          ...makeJob({ kind: "agentTurn", message: "check weather" }),
          delivery: { mode: "announce", channel: "telegram" },
        },
        message: "check weather",
        sessionKey: "cron:job-1",
        lane: "cron",
      });

      // Without a delivery target, should report error
      expect(res.status).toBe("error");
      expect(res.error).toBe("cron delivery target is missing");
      expect(deps.sendMessageTelegram).not.toHaveBeenCalled();
    });
  });

  it("succeeds with best-effort when announce fails and no delivery target", async () => {
    await withTempHome(async (home) => {
      const storePath = await writeSessionStore(home);
      await fs.writeFile(
        storePath,
        JSON.stringify(
          {
            "agent:main:main": {
              sessionId: "main-session",
              updatedAt: Date.now(),
              lastChannel: "telegram",
              lastTo: "",
            },
          },
          null,
          2,
        ),
        "utf-8",
      );
      const deps: CliDeps = {
        sendMessageWhatsApp: vi.fn(),
        sendMessageTelegram: vi.fn(),
        sendMessageDiscord: vi.fn(),
        sendMessageSignal: vi.fn(),
        sendMessageIMessage: vi.fn(),
      };
      vi.mocked(runEmbeddedPiAgent).mockResolvedValue({
        payloads: [{ text: "Weather report: sunny" }],
        meta: {
          durationMs: 5,
          agentMeta: { sessionId: "s", provider: "p", model: "m" },
        },
      });
      vi.mocked(runSubagentAnnounceFlow).mockResolvedValue(false);

      const res = await runCronIsolatedAgentTurn({
        cfg: makeCfg(home, storePath, {
          channels: { telegram: { botToken: "t-1" } },
        }),
        deps,
        job: {
          ...makeJob({ kind: "agentTurn", message: "check weather" }),
          delivery: {
            mode: "announce",
            channel: "telegram",
            bestEffort: true,
          },
        },
        message: "check weather",
        sessionKey: "cron:job-1",
        lane: "cron",
      });

      expect(res.status).toBe("ok");
      expect(deps.sendMessageTelegram).not.toHaveBeenCalled();
    });
  });

  it("does not fall back when announce flow succeeds", async () => {
    await withTempHome(async (home) => {
      const storePath = await writeSessionStore(home);
      const deps: CliDeps = {
        sendMessageWhatsApp: vi.fn(),
        sendMessageTelegram: vi.fn(),
        sendMessageDiscord: vi.fn(),
        sendMessageSignal: vi.fn(),
        sendMessageIMessage: vi.fn(),
      };
      vi.mocked(runEmbeddedPiAgent).mockResolvedValue({
        payloads: [{ text: "Weather report: sunny and warm" }],
        meta: {
          durationMs: 5,
          agentMeta: { sessionId: "s", provider: "p", model: "m" },
        },
      });
      // Announce flow succeeds
      vi.mocked(runSubagentAnnounceFlow).mockResolvedValue(true);

      const res = await runCronIsolatedAgentTurn({
        cfg: makeCfg(home, storePath, {
          channels: { telegram: { botToken: "t-1" } },
        }),
        deps,
        job: {
          ...makeJob({ kind: "agentTurn", message: "check weather" }),
          delivery: { mode: "announce", channel: "telegram", to: "123" },
        },
        message: "check weather",
        sessionKey: "cron:job-1",
        lane: "cron",
      });

      expect(res.status).toBe("ok");
      expect(runSubagentAnnounceFlow).toHaveBeenCalledTimes(1);
      // No fallback direct delivery
      expect(deps.sendMessageTelegram).not.toHaveBeenCalled();
    });
  });
});
