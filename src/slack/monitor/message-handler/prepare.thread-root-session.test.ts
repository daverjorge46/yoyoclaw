import { describe, expect, it, vi } from "vitest";
import type { SlackMonitorContext } from "../context.js";
import { prepareSlackMessage } from "./prepare.js";

describe("prepareSlackMessage thread root session routing", () => {
  it("routes thread starters (thread_ts == ts) to a thread-scoped sessionKey + historyKey", async () => {
    const ctx = {
      cfg: {
        agents: { defaults: { model: "openai/gpt-4.1", workspace: "/tmp/openclaw" } },
        channels: { slack: {} },
      },
      accountId: "default",
      botToken: "xoxb",
      app: { client: {} },
      runtime: {
        log: vi.fn(),
        error: vi.fn(),
        exit: (code: number): never => {
          throw new Error(`exit ${code}`);
        },
      },
      botUserId: "BOT",
      teamId: "T1",
      apiAppId: "A1",
      historyLimit: 0,
      channelHistories: new Map(),
      sessionScope: "per-sender",
      mainKey: "agent:main:main",
      dmEnabled: true,
      dmPolicy: "open",
      allowFrom: [],
      groupDmEnabled: false,
      groupDmChannels: [],
      defaultRequireMention: true,
      groupPolicy: "open",
      useAccessGroups: false,
      reactionMode: "off",
      reactionAllowlist: [],
      replyToMode: "off",
      threadHistoryScope: "thread",
      threadInheritParent: false,
      slashCommand: { command: "/openclaw", enabled: true },
      textLimit: 2000,
      ackReactionScope: "off",
      mediaMaxBytes: 1000,
      removeAckAfterReply: false,
      logger: { info: vi.fn() },
      markMessageSeen: () => false,
      shouldDropMismatchedSlackEvent: () => false,
      resolveSlackSystemEventSessionKey: () => "agent:main:slack:channel:c1",
      isChannelAllowed: () => true,
      resolveChannelName: async () => ({
        name: "general",
        type: "channel",
      }),
      resolveUserName: async () => ({ name: "Alice" }),
      isSlackThreadActive: () => false,
      setSlackThreadStatus: async () => undefined,
    } satisfies SlackMonitorContext;

    const ts = "1700000000.0001";
    const result = await prepareSlackMessage({
      ctx,
      account: { accountId: "default", config: {} } as never,
      message: {
        type: "message",
        channel: "C1",
        channel_type: "channel",
        text: "<@BOT> start a thread task",
        user: "U1",
        ts,
        thread_ts: ts,
        event_ts: ts,
      } as never,
      opts: { source: "message", wasMentioned: true },
    });

    expect(result).not.toBeNull();
    expect(result?.ctxPayload.SessionKey).toContain(`:thread:${ts}`);
    expect(result?.historyKey).toContain(`:thread:${ts}`);
  });

  it("keeps non-threaded channel messages channel-scoped", async () => {
    const ctx = {
      cfg: {
        agents: { defaults: { model: "openai/gpt-4.1", workspace: "/tmp/openclaw" } },
        channels: { slack: {} },
      },
      accountId: "default",
      botToken: "xoxb",
      app: { client: {} },
      runtime: {
        log: vi.fn(),
        error: vi.fn(),
        exit: (code: number): never => {
          throw new Error(`exit ${code}`);
        },
      },
      botUserId: "BOT",
      teamId: "T1",
      apiAppId: "A1",
      historyLimit: 0,
      channelHistories: new Map(),
      sessionScope: "per-sender",
      mainKey: "agent:main:main",
      dmEnabled: true,
      dmPolicy: "open",
      allowFrom: [],
      groupDmEnabled: false,
      groupDmChannels: [],
      defaultRequireMention: true,
      groupPolicy: "open",
      useAccessGroups: false,
      reactionMode: "off",
      reactionAllowlist: [],
      replyToMode: "off",
      threadHistoryScope: "thread",
      threadInheritParent: false,
      slashCommand: { command: "/openclaw", enabled: true },
      textLimit: 2000,
      ackReactionScope: "off",
      mediaMaxBytes: 1000,
      removeAckAfterReply: false,
      logger: { info: vi.fn() },
      markMessageSeen: () => false,
      shouldDropMismatchedSlackEvent: () => false,
      resolveSlackSystemEventSessionKey: () => "agent:main:slack:channel:c1",
      isChannelAllowed: () => true,
      resolveChannelName: async () => ({
        name: "general",
        type: "channel",
      }),
      resolveUserName: async () => ({ name: "Alice" }),
      isSlackThreadActive: () => false,
      setSlackThreadStatus: async () => undefined,
    } satisfies SlackMonitorContext;

    const result = await prepareSlackMessage({
      ctx,
      account: { accountId: "default", config: {} } as never,
      message: {
        type: "message",
        channel: "C1",
        channel_type: "channel",
        text: "<@BOT> hi",
        user: "U1",
        ts: "1700000000.0002",
        event_ts: "1700000000.0002",
      } as never,
      opts: { source: "message", wasMentioned: true },
    });

    expect(result).not.toBeNull();
    expect(result?.ctxPayload.SessionKey).not.toContain(":thread:");
    expect(result?.historyKey).toBe("C1");
  });
});
