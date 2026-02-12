import { describe, expect, it, vi, beforeEach } from "vitest";
import { resetSystemEventsForTest, drainSystemEvents } from "../../../infra/system-events.js";

// Capture the onError callback from the dispatcher so we can invoke it.
let capturedOnError: ((err: unknown, info: { kind: string }) => void) | undefined;

vi.mock("../../../auto-reply/reply/provider-dispatcher.js", () => ({
  dispatchReplyWithBufferedBlockDispatcher: vi.fn(
    async (params: {
      ctx: unknown;
      dispatcherOptions: { onError: (err: unknown, info: { kind: string }) => void };
    }) => {
      capturedOnError = params.dispatcherOptions.onError;
      return { queuedFinal: false };
    },
  ),
}));

import { processMessage } from "./process-message.js";

function callProcessMessage() {
  return processMessage({
    // oxlint-disable-next-line typescript/no-explicit-any
    cfg: { messages: {} } as any,
    msg: {
      id: "msg1",
      from: "+15550001111",
      to: "+15550002222",
      chatType: "dm",
      body: "hello",
      senderName: "Bob",
      senderJid: "bob@s.whatsapp.net",
      senderE164: "+15550001111",
      groupParticipants: [],
      // oxlint-disable-next-line typescript/no-explicit-any
    } as any,
    route: {
      agentId: "main",
      accountId: "default",
      sessionKey: "agent:main:whatsapp:dm:15550001111",
      mainSessionKey: "agent:main",
      // oxlint-disable-next-line typescript/no-explicit-any
    } as any,
    groupHistoryKey: "+15550001111",
    groupHistories: new Map(),
    groupMemberNames: new Map(),
    connectionId: "conn-1",
    verbose: false,
    maxMediaBytes: 1,
    // oxlint-disable-next-line typescript/no-explicit-any
    replyResolver: (async () => undefined) as any,
    // oxlint-disable-next-line typescript/no-explicit-any
    replyLogger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} } as any,
    backgroundTasks: new Set(),
    rememberSentText: () => {},
    echoHas: () => false,
    echoForget: () => {},
    buildCombinedEchoKey: () => "echo-key",
    // oxlint-disable-next-line typescript/no-explicit-any
  } as any);
}

describe("process-message delivery failure surfacing (#14827)", () => {
  beforeEach(() => {
    capturedOnError = undefined;
    resetSystemEventsForTest();
  });

  it("enqueues a system event when onError is called for a final reply", async () => {
    await callProcessMessage();
    expect(capturedOnError).toBeDefined();

    // Simulate a delivery failure
    capturedOnError!(new Error("connection closed"), { kind: "final" });

    const events = drainSystemEvents("agent:main:whatsapp:dm:15550001111");
    expect(events).toHaveLength(1);
    expect(events[0]).toContain("WhatsApp delivery failure");
    expect(events[0]).toContain("+15550001111");
    expect(events[0]).toContain("connection closed");
  });

  it("enqueues a system event for tool update failures", async () => {
    await callProcessMessage();
    expect(capturedOnError).toBeDefined();

    capturedOnError!(new Error("socket reset"), { kind: "tool" });

    const events = drainSystemEvents("agent:main:whatsapp:dm:15550001111");
    expect(events).toHaveLength(1);
    expect(events[0]).toContain("tool update");
    expect(events[0]).toContain("socket reset");
  });

  it("enqueues a system event for block update failures", async () => {
    await callProcessMessage();
    expect(capturedOnError).toBeDefined();

    capturedOnError!(new Error("disconnect"), { kind: "block" });

    const events = drainSystemEvents("agent:main:whatsapp:dm:15550001111");
    expect(events).toHaveLength(1);
    expect(events[0]).toContain("block update");
  });
});
