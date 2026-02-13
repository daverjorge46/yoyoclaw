import type { ChannelThreadOperations } from "openclaw/plugin-sdk";
import { getSlackRuntime } from "./runtime.js";

export const slackThreadOps: ChannelThreadOperations = {
  async createThread(params) {
    const send = getSlackRuntime().channel.slack.sendMessageSlack;
    const result = await send(params.to, params.initialMessage, {
      accountId: params.accountId ?? undefined,
    });
    return {
      threadId: result.messageId,
      threadRootId: result.messageId,
      messageId: result.messageId,
    };
  },

  normalizeThreadId(threadId) {
    return String(threadId);
  },
};
