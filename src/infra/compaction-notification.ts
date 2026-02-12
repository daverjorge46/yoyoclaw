import type { OpenClawConfig } from "../config/config.js";
import type { SessionEntry } from "../config/sessions.js";
import { isDeliverableMessageChannel, normalizeMessageChannel } from "../utils/message-channel.js";
import { resolveSessionDeliveryTarget } from "./outbound/targets.js";

type CompactionNotificationParams = {
  cfg: OpenClawConfig;
  sessionKey: string;
  entry: SessionEntry;
};

/**
 * Sends a brief notification to the user's active channel when context
 * compaction occurs.  This is core UX — the user deserves to know their
 * conversation history is being summarised, just as typing indicators tell
 * them a reply is in progress.
 *
 * Follows the same delivery pattern as session-maintenance-warning.ts.
 */
export async function deliverCompactionNotification(
  params: CompactionNotificationParams,
): Promise<void> {
  // Never deliver in test/vitest.
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return;
  }

  const text = "🧹 Compacting conversation context…";

  const target = resolveSessionDeliveryTarget({
    entry: params.entry,
    requestedChannel: "last",
  });

  if (!target.channel || !target.to) {
    // No deliverable target — silently skip.
    return;
  }

  const channel = normalizeMessageChannel(target.channel) ?? target.channel;
  if (!isDeliverableMessageChannel(channel)) {
    return;
  }

  try {
    const { deliverOutboundPayloads } = await import("./outbound/deliver.js");
    await deliverOutboundPayloads({
      cfg: params.cfg,
      channel,
      to: target.to,
      accountId: target.accountId,
      threadId: target.threadId,
      payloads: [{ text }],
    });
  } catch {
    // Best-effort — never block the compaction itself.
  }
}
