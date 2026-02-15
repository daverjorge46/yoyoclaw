import type { Bot } from "grammy";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TelegramMessageContext } from "./bot-message-context.js";

const createTelegramDraftStream = vi.hoisted(() => vi.fn());
const dispatchReplyWithBufferedBlockDispatcher = vi.hoisted(() => vi.fn());
const deliverReplies = vi.hoisted(() => vi.fn());

vi.mock("./draft-stream.js", () => ({
  createTelegramDraftStream,
}));

vi.mock("../auto-reply/reply/provider-dispatcher.js", () => ({
  dispatchReplyWithBufferedBlockDispatcher,
}));

vi.mock("./bot/delivery.js", () => ({
  deliverReplies,
}));

vi.mock("./sticker-cache.js", () => ({
  cacheSticker: vi.fn(),
  describeStickerImage: vi.fn(),
}));

import { dispatchTelegramMessage } from "./bot-message-dispatch.js";

function makeContext(overrides: Partial<TelegramMessageContext> = {}): TelegramMessageContext {
  return {
    ctxPayload: {},
    primaryCtx: { message: { chat: { id: 123, type: "private" } } },
    msg: {
      chat: { id: 123, type: "private" },
      message_id: 456,
      message_thread_id: 777,
    },
    chatId: 123,
    isGroup: false,
    resolvedThreadId: undefined,
    replyThreadId: 777,
    threadSpec: { id: 777, scope: "dm" },
    historyKey: undefined,
    historyLimit: 0,
    groupHistories: new Map(),
    route: { agentId: "default", accountId: "default" },
    skillFilter: undefined,
    sendTyping: vi.fn(),
    sendRecordVoice: vi.fn(),
    ackReactionPromise: null,
    reactionApi: null,
    removeAckAfterReply: false,
    ...overrides,
  };
}

function makeBot() {
  return { api: { sendMessageDraft: vi.fn() } } as unknown as Bot;
}

function makeRuntime() {
  return {
    log: vi.fn(),
    error: vi.fn(),
    exit: () => {
      throw new Error("exit");
    },
  };
}

describe("dispatchTelegramMessage ack reaction removal", () => {
  beforeEach(() => {
    createTelegramDraftStream.mockReset();
    dispatchReplyWithBufferedBlockDispatcher.mockReset();
    deliverReplies.mockReset();
  });

  it("removes ack reaction after block-streamed delivery with no final reply", async () => {
    const reactionApi = vi.fn().mockResolvedValue(true);
    const context = makeContext({
      msg: { chat: { id: 7, type: "supergroup" }, message_id: 99 },
      chatId: 7,
      isGroup: true,
      threadSpec: { id: 1, scope: "topic" },
      removeAckAfterReply: true,
      ackReactionPromise: Promise.resolve(true),
      reactionApi,
    });

    // Simulate block streaming: deliver is called (blocks), but queuedFinal = false
    dispatchReplyWithBufferedBlockDispatcher.mockImplementation(async ({ dispatcherOptions }) => {
      await dispatcherOptions.deliver({ text: "block 1" }, { kind: "block" });
      return { queuedFinal: false };
    });
    deliverReplies.mockResolvedValue({ delivered: true });

    await dispatchTelegramMessage({
      context,
      bot: makeBot(),
      cfg: {},
      runtime: makeRuntime(),
      replyToMode: "first",
      streamMode: "off",
      textLimit: 4096,
      telegramCfg: {},
      opts: { token: "token" },
      resolveBotTopicsEnabled: vi.fn().mockResolvedValue(false),
    });

    // Wait for the fire-and-forget promise chain inside removeAckReactionAfterReply
    await new Promise((r) => setTimeout(r, 10));

    // reactionApi should be called with empty array to clear the reaction
    expect(reactionApi).toHaveBeenCalledWith(7, 99, []);
  });

  it("does not remove ack reaction when nothing was delivered", async () => {
    const reactionApi = vi.fn().mockResolvedValue(true);
    const context = makeContext({
      msg: { chat: { id: 7, type: "supergroup" }, message_id: 99 },
      chatId: 7,
      isGroup: true,
      threadSpec: { id: 1, scope: "topic" },
      removeAckAfterReply: true,
      ackReactionPromise: Promise.resolve(true),
      reactionApi,
    });

    // No delivery, no final
    dispatchReplyWithBufferedBlockDispatcher.mockResolvedValue({ queuedFinal: false });
    deliverReplies.mockResolvedValue({ delivered: false });

    await dispatchTelegramMessage({
      context,
      bot: makeBot(),
      cfg: {},
      runtime: makeRuntime(),
      replyToMode: "first",
      streamMode: "off",
      textLimit: 4096,
      telegramCfg: {},
      opts: { token: "token" },
      resolveBotTopicsEnabled: vi.fn().mockResolvedValue(false),
    });

    await new Promise((r) => setTimeout(r, 10));

    expect(reactionApi).not.toHaveBeenCalled();
  });
});

describe("dispatchTelegramMessage draft streaming", () => {
  beforeEach(() => {
    createTelegramDraftStream.mockReset();
    dispatchReplyWithBufferedBlockDispatcher.mockReset();
    deliverReplies.mockReset();
  });

  it("streams drafts in private threads and forwards thread id", async () => {
    const draftStream = {
      update: vi.fn(),
      flush: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
    };
    createTelegramDraftStream.mockReturnValue(draftStream);
    dispatchReplyWithBufferedBlockDispatcher.mockImplementation(
      async ({ dispatcherOptions, replyOptions }) => {
        await replyOptions?.onPartialReply?.({ text: "Hello" });
        await dispatcherOptions.deliver({ text: "Hello" }, { kind: "final" });
        return { queuedFinal: true };
      },
    );
    deliverReplies.mockResolvedValue({ delivered: true });

    const resolveBotTopicsEnabled = vi.fn().mockResolvedValue(true);
    const context = makeContext();

    const bot = makeBot();
    const runtime = makeRuntime();

    await dispatchTelegramMessage({
      context,
      bot,
      cfg: {},
      runtime,
      replyToMode: "first",
      streamMode: "partial",
      textLimit: 4096,
      telegramCfg: {},
      opts: { token: "token" },
      resolveBotTopicsEnabled,
    });

    expect(resolveBotTopicsEnabled).toHaveBeenCalledWith(context.primaryCtx);
    expect(createTelegramDraftStream).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: 123,
        thread: { id: 777, scope: "dm" },
      }),
    );
    expect(draftStream.update).toHaveBeenCalledWith("Hello");
    expect(deliverReplies).toHaveBeenCalledWith(
      expect.objectContaining({
        thread: { id: 777, scope: "dm" },
      }),
    );
  });
});
