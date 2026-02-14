import { dispatchReplyWithBufferedBlockDispatcher } from "openclaw/plugin-sdk";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { nostrPlugin } from "./channel.js";
import { startNostrBus } from "./nostr-bus.js";

// Mock dependencies
vi.mock("./nostr-bus.js", () => ({
  startNostrBus: vi.fn(),
  normalizePubkey: (k: string) => k,
}));

vi.mock("./runtime.js", () => ({
  getNostrRuntime: () => ({
    config: { loadConfig: () => ({}) },
    channel: {
      reply: {
        resolveReply: vi.fn(),
      },
    },
  }),
}));

vi.mock("openclaw/plugin-sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("openclaw/plugin-sdk")>();
  return {
    ...actual,
    dispatchReplyWithBufferedBlockDispatcher: vi.fn(),
  };
});

describe("nostrPlugin dispatch", () => {
  const mockBus = {
    close: vi.fn(),
    sendDm: vi.fn(),
    getMetrics: vi.fn(),
    publishProfile: vi.fn(),
    getProfileState: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (startNostrBus as any).mockResolvedValue(mockBus);
  });

  it("dispatches inbound message using buffered dispatcher", async () => {
    const account = {
      accountId: "acc1",
      publicKey: "pub1",
      privateKey: "priv1",
      relays: ["wss://relay.example.com"],
      configured: true,
      enabled: true,
    };

    const ctx: any = {
      account,
      setStatus: vi.fn(),
      log: {
        info: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
      },
    };

    // Start account to register onMessage callback
    await nostrPlugin.gateway?.startAccount(ctx);

    expect(startNostrBus).toHaveBeenCalled();
    const startCall = (startNostrBus as any).mock.calls[0][0];
    const onMessage = startCall.onMessage;

    // Simulate inbound message
    const sender = "sender1";
    const text = "hello world";
    const replyFn = vi.fn();

    await onMessage(sender, text, replyFn);

    // Verify dispatcher called
    expect(dispatchReplyWithBufferedBlockDispatcher).toHaveBeenCalledTimes(1);
    const dispatchCall = (dispatchReplyWithBufferedBlockDispatcher as any).mock.calls[0][0];

    expect(dispatchCall.ctx).toMatchObject({
      Provider: "nostr",
      AccountId: "acc1",
      Body: "hello world",
      From: "sender1",
      To: "pub1",
      SessionKey: "nostr:acc1:sender1",
      ChatType: "direct",
      SenderId: "sender1",
    });

    // Test deliver callback
    const deliverFn = dispatchCall.dispatcherOptions.deliver;
    await deliverFn({ text: "response text" });
    expect(replyFn).toHaveBeenCalledWith("response text");
  });
});
