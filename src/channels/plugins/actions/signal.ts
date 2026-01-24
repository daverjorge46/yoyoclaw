import { createActionGate, jsonResult, readStringParam } from "../../../agents/tools/common.js";
import { listSignalAccountIds, resolveSignalAccount } from "../../../signal/accounts.js";
import { resolveSignalReactionLevel } from "../../../signal/reaction-level.js";
import { sendReactionSignal, removeReactionSignal } from "../../../signal/send-reactions.js";
import type { ChannelMessageActionAdapter, ChannelMessageActionName } from "../types.js";

const providerId = "signal";

export const signalMessageActions: ChannelMessageActionAdapter = {
  listActions: ({ cfg }) => {
    const accountIds = listSignalAccountIds(cfg);
    if (accountIds.length === 0) return [];

    const hasConfigured = accountIds.some((accountId) => {
      const account = resolveSignalAccount({ cfg, accountId });
      return account.configured;
    });
    if (!hasConfigured) return [];

    const gate = createActionGate(cfg.channels?.signal?.actions);
    const actions = new Set<ChannelMessageActionName>(["send"]);

    if (gate("reactions")) {
      actions.add("react");
    }

    return Array.from(actions);
  },

  handleAction: async ({ action, params, cfg, accountId }) => {
    if (action === "send") {
      throw new Error("Send should be handled by outbound, not actions handler.");
    }

    if (action === "react") {
      // Check reaction level first
      const reactionLevelInfo = resolveSignalReactionLevel({
        cfg,
        accountId: accountId ?? undefined,
      });
      if (!reactionLevelInfo.agentReactionsEnabled) {
        throw new Error(
          `Signal agent reactions disabled (reactionLevel="${reactionLevelInfo.level}"). ` +
            `Set channels.signal.reactionLevel to "minimal" or "extensive" to enable.`,
        );
      }

      // Also check the action gate for backward compatibility
      const isActionEnabled = createActionGate(cfg.channels?.signal?.actions);
      if (!isActionEnabled("reactions")) {
        throw new Error("Signal reactions are disabled via actions.reactions.");
      }

      const recipient =
        readStringParam(params, "recipient") ??
        readStringParam(params, "to", {
          required: true,
          label: "recipient (UUID or phone number)",
        });

      const messageId = readStringParam(params, "messageId", {
        required: true,
        label: "messageId (timestamp)",
      });

      const emoji = readStringParam(params, "emoji", { allowEmpty: true });
      const remove = typeof params.remove === "boolean" ? params.remove : undefined;

      const timestamp = parseInt(messageId, 10);
      if (!Number.isFinite(timestamp)) {
        throw new Error(`Invalid messageId: ${messageId}. Expected numeric timestamp.`);
      }

      if (remove) {
        if (!emoji) throw new Error("Emoji required to remove reaction.");
        await removeReactionSignal(recipient, timestamp, emoji, {
          accountId: accountId ?? undefined,
        });
        return jsonResult({ ok: true, removed: emoji });
      }

      if (!emoji) throw new Error("Emoji required to add reaction.");
      await sendReactionSignal(recipient, timestamp, emoji, { accountId: accountId ?? undefined });
      return jsonResult({ ok: true, added: emoji });
    }

    throw new Error(`Action ${action} not supported for ${providerId}.`);
  },
};
