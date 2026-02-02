import type { proto, WAMessage } from "@whiskeysockets/baileys";
import { downloadMediaMessage, normalizeMessageContent } from "@whiskeysockets/baileys";
import type { createWaSocket } from "../session.js";
import { logVerbose, shouldLogVerbose } from "../../globals.js";
import { getChildLogger } from "../../logging/logger.js";

function unwrapMessage(message: proto.IMessage | undefined): proto.IMessage | undefined {
  const normalized = normalizeMessageContent(message);
  return normalized;
}

export async function downloadInboundMedia(
  msg: proto.IWebMessageInfo,
  sock: Awaited<ReturnType<typeof createWaSocket>>,
): Promise<{ buffer: Buffer; mimetype?: string } | undefined> {
  const message = unwrapMessage(msg.message as proto.IMessage | undefined);
  if (!message) {
    return undefined;
  }
  const mimetype =
    message.imageMessage?.mimetype ??
    message.videoMessage?.mimetype ??
    message.documentMessage?.mimetype ??
    message.audioMessage?.mimetype ??
    message.stickerMessage?.mimetype ??
    undefined;
  if (
    !message.imageMessage &&
    !message.videoMessage &&
    !message.documentMessage &&
    !message.audioMessage &&
    !message.stickerMessage
  ) {
    return undefined;
  }

  const logger = getChildLogger({ module: "web-media-download" });
  const messageId = msg.key?.id ?? "unknown";
  const remoteJid = msg.key?.remoteJid ?? "unknown";

  // Retry logic with exponential backoff
  const maxRetries = 3;
  let lastError: Error | unknown = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        if (shouldLogVerbose()) {
          logVerbose(
            `Retrying media download (attempt ${attempt + 1}/${maxRetries}) after ${backoffMs}ms...`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }

      const buffer = await downloadMediaMessage(
        msg as WAMessage,
        "buffer",
        {},
        {
          reuploadRequest: sock.updateMediaMessage,
          logger: sock.logger,
        },
      );

      if (attempt > 0) {
        logger.info(
          { messageId, remoteJid, attempt: attempt + 1 },
          "Media download succeeded after retry",
        );
      }

      return { buffer, mimetype };
    } catch (err) {
      lastError = err;
      if (shouldLogVerbose()) {
        logVerbose(`Media download attempt ${attempt + 1} failed: ${String(err)}`);
      }
    }
  }

  // All retries failed
  const errorMsg = String(lastError);
  logger.error(
    {
      messageId,
      remoteJid,
      mimetype,
      error: errorMsg,
      attempts: maxRetries,
    },
    "Failed to download WhatsApp media attachment after retries",
  );
  logVerbose(`downloadMediaMessage failed permanently: ${errorMsg}`);
  return undefined;
}
