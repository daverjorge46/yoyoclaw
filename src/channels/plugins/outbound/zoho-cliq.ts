import { chunkText } from "../../../auto-reply/chunk.js";
import { DEFAULT_ACCOUNT_ID } from "../../../routing/session-key.js";
import { sendMessageZohoCliq } from "../../../zoho-cliq/send.js";
import type { ChannelOutboundAdapter } from "../types.js";

export const zohoCliqOutbound: ChannelOutboundAdapter = {
  deliveryMode: "direct",
  chunker: chunkText,
  textChunkLimit: 4000,
  resolveTarget: ({ to }) => {
    const trimmed = to?.trim();
    if (!trimmed) {
      return {
        ok: false,
        error: new Error(
          "Delivering to Zoho Cliq requires --to <channelOrChatId>",
        ),
      };
    }
    return { ok: true, to: trimmed };
  },
  sendText: async ({ to, text, accountId, deps }) => {
    const send = (deps as any)?.sendZohoCliq ?? sendMessageZohoCliq;
    const resolvedAccountId = accountId ?? DEFAULT_ACCOUNT_ID;
    const result = await send(to, text, {
      accountId: resolvedAccountId,
    });
    return { channel: "zoho-cliq", ...result };
  },
  sendMedia: async ({ to, text, mediaUrl, accountId, deps }) => {
    const send = (deps as any)?.sendZohoCliq ?? sendMessageZohoCliq;
    const resolvedAccountId = accountId ?? DEFAULT_ACCOUNT_ID;
    const result = await send(to, text, {
      accountId: resolvedAccountId,
      mediaUrl,
    });
    return { channel: "zoho-cliq", ...result };
  },
};
