import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock all heavy dependencies so we can test sendWithRetry in isolation.
vi.mock("../../globals.js", () => ({
  logVerbose: vi.fn(),
  shouldLogVerbose: () => false,
}));
vi.mock("../../markdown/tables.js", () => ({
  convertMarkdownTables: (t: string) => t,
}));
vi.mock("../../markdown/whatsapp.js", () => ({
  markdownToWhatsApp: (t: string) => t,
}));
vi.mock("../../auto-reply/chunk.js", () => ({
  chunkMarkdownTextWithMode: (t: string) => (t ? [t] : []),
}));
vi.mock("../media.js", () => ({
  loadWebMedia: vi.fn(),
}));
vi.mock("../reconnect.js", () => ({
  newConnectionId: () => "conn-test",
}));
vi.mock("../session.js", () => ({
  formatError: (e: unknown) => (e instanceof Error ? e.message : String(e)),
}));
vi.mock("./loggers.js", () => ({
  whatsappOutboundLog: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));
// Mock sleep to resolve instantly so retry tests don't wait.
vi.mock("../../utils.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../utils.js")>();
  return {
    ...actual,
    sleep: vi.fn().mockResolvedValue(undefined),
  };
});

import { sleep } from "../../utils.js";
import { deliverWebReply } from "./deliver-reply.js";

const mockedSleep = vi.mocked(sleep);

function makeMsg(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: "msg-1",
    from: "+15550001111",
    to: "+15550002222",
    reply: vi.fn().mockResolvedValue(undefined),
    sendMedia: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeParams(overrides?: Record<string, unknown>) {
  return {
    replyResult: { text: "hello" },
    msg: makeMsg(),
    maxMediaBytes: 10_000_000,
    textLimit: 4096,
    replyLogger: { info: vi.fn(), warn: vi.fn() },
    ...overrides,
  };
}

describe("deliverWebReply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends a simple text reply", async () => {
    const params = makeParams();
    // oxlint-disable-next-line typescript/no-explicit-any
    await deliverWebReply(params as any);
    expect(params.msg.reply).toHaveBeenCalledWith("hello");
  });

  it("retries on transient disconnect errors up to 5 times by default", async () => {
    const msg = makeMsg({
      reply: vi
        .fn()
        .mockRejectedValueOnce(new Error("connection closed"))
        .mockRejectedValueOnce(new Error("socket reset"))
        .mockRejectedValueOnce(new Error("connection reset"))
        .mockRejectedValueOnce(new Error("disconnect"))
        .mockResolvedValueOnce(undefined),
    });
    const params = makeParams({ msg });
    // oxlint-disable-next-line typescript/no-explicit-any
    await deliverWebReply(params as any);
    // Should have been called 5 times (4 failures + 1 success)
    expect(msg.reply).toHaveBeenCalledTimes(5);
  });

  it("fails after exhausting all 5 retry attempts", async () => {
    const msg = makeMsg({
      reply: vi.fn().mockRejectedValue(new Error("connection closed")),
    });
    const params = makeParams({ msg });
    // oxlint-disable-next-line typescript/no-explicit-any
    await expect(deliverWebReply(params as any)).rejects.toThrow("connection closed");
    expect(msg.reply).toHaveBeenCalledTimes(5);
  });

  it("does not retry on non-transient errors", async () => {
    const msg = makeMsg({
      reply: vi.fn().mockRejectedValue(new Error("permission denied")),
    });
    const params = makeParams({ msg });
    // oxlint-disable-next-line typescript/no-explicit-any
    await expect(deliverWebReply(params as any)).rejects.toThrow("permission denied");
    // Should fail on first attempt without retrying
    expect(msg.reply).toHaveBeenCalledTimes(1);
  });

  it("uses 1000ms * attempt backoff intervals", async () => {
    const msg = makeMsg({
      reply: vi
        .fn()
        .mockRejectedValueOnce(new Error("connection closed"))
        .mockRejectedValueOnce(new Error("connection closed"))
        .mockResolvedValueOnce(undefined),
    });
    const params = makeParams({ msg });
    // oxlint-disable-next-line typescript/no-explicit-any
    await deliverWebReply(params as any);
    expect(msg.reply).toHaveBeenCalledTimes(3);
    // Verify backoff: 1000*1=1000ms, 1000*2=2000ms
    expect(mockedSleep).toHaveBeenCalledTimes(2);
    expect(mockedSleep).toHaveBeenNthCalledWith(1, 1000);
    expect(mockedSleep).toHaveBeenNthCalledWith(2, 2000);
  });
});
