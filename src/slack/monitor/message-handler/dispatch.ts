import type { PreparedSlackMessage } from "./types.js";
import { resolveHumanDelayConfig } from "../../../agents/identity.js";
import { dispatchInboundMessage } from "../../../auto-reply/dispatch.js";
import { clearHistoryEntriesIfEnabled } from "../../../auto-reply/reply/history.js";
import { createReplyDispatcherWithTyping } from "../../../auto-reply/reply/reply-dispatcher.js";
import { removeAckReactionAfterReply } from "../../../channels/ack-reactions.js";
import { logAckFailure, logTypingFailure } from "../../../channels/logging.js";
import { createReplyPrefixOptions } from "../../../channels/reply-prefix.js";
import { createTypingCallbacks } from "../../../channels/typing.js";
import { resolveStorePath, updateLastRoute } from "../../../config/sessions.js";
import { danger, logVerbose, shouldLogVerbose } from "../../../globals.js";
import { removeSlackReaction } from "../../actions.js";
import { resolveSlackThreadTargets } from "../../threading.js";
import { createSlackReplyDeliveryPlan, deliverReplies } from "../replies.js";

export async function dispatchPreparedSlackMessage(prepared: PreparedSlackMessage) {
  const { ctx, account, message, route } = prepared;
  const cfg = ctx.cfg;
  const runtime = ctx.runtime;

  // Prevent routing loops: if this message was sent by our own bot via the message tool
  // and the target session matches the origin session, skip dispatching.
  // This allows agent-to-agent communication while preventing a session from receiving
  // its own messages back.
  if (prepared.messageOrigin) {
    const normalizedOriginSession = prepared.messageOrigin.sessionKey.toLowerCase();
    const normalizedRouteSession = route.sessionKey.toLowerCase();
    if (normalizedOriginSession === normalizedRouteSession) {
      logVerbose(
        `slack: skipping dispatch for session ${route.sessionKey} (origin matches route, preventing loop)`,
      );
      // Still record the session and clear history, but don't dispatch to the agent
      if (prepared.isRoomish) {
        clearHistoryEntriesIfEnabled({
          historyMap: ctx.channelHistories,
          historyKey: prepared.historyKey,
          limit: ctx.historyLimit,
        });
      }
      return;
    }
    logVerbose(
      `slack: routing message from session ${prepared.messageOrigin.sessionKey} to session ${route.sessionKey} (agent-to-agent)`,
    );
  }

  if (prepared.isDirectMessage) {
    const sessionCfg = cfg.session;
    const storePath = resolveStorePath(sessionCfg?.store, {
      agentId: route.agentId,
    });
    await updateLastRoute({
      storePath,
      sessionKey: route.mainSessionKey,
      deliveryContext: {
        channel: "slack",
        to: `user:${message.user}`,
        accountId: route.accountId,
      },
      ctx: prepared.ctxPayload,
    });
  }

  const { statusThreadTs } = resolveSlackThreadTargets({
    message,
    replyToMode: ctx.replyToMode,
  });

  const messageTs = message.ts ?? message.event_ts;
  const incomingThreadTs = message.thread_ts;
  let didSetStatus = false;

  // Shared mutable ref for "replyToMode=first". Both tool + auto-reply flows
  // mark this to ensure only the first reply is threaded.
  const hasRepliedRef = { value: false };
  const replyPlan = createSlackReplyDeliveryPlan({
    replyToMode: ctx.replyToMode,
    incomingThreadTs,
    messageTs,
    hasRepliedRef,
  });

  const typingTarget = statusThreadTs ? `${message.channel}/${statusThreadTs}` : message.channel;
  const typingCallbacks = createTypingCallbacks({
    start: async () => {
      didSetStatus = true;
      await ctx.setSlackThreadStatus({
        channelId: message.channel,
        threadTs: statusThreadTs,
        status: "is typing...",
      });
    },
    stop: async () => {
      if (!didSetStatus) {
        return;
      }
      didSetStatus = false;
      await ctx.setSlackThreadStatus({
        channelId: message.channel,
        threadTs: statusThreadTs,
        status: "",
      });
    },
    onStartError: (err) => {
      logTypingFailure({
        log: (message) => runtime.error?.(danger(message)),
        channel: "slack",
        action: "start",
        target: typingTarget,
        error: err,
      });
    },
    onStopError: (err) => {
      logTypingFailure({
        log: (message) => runtime.error?.(danger(message)),
        channel: "slack",
        action: "stop",
        target: typingTarget,
        error: err,
      });
    },
  });

  const { onModelSelected, ...prefixOptions } = createReplyPrefixOptions({
    cfg,
    agentId: route.agentId,
    channel: "slack",
    accountId: route.accountId,
  });

  const { dispatcher, replyOptions, markDispatchIdle } = createReplyDispatcherWithTyping({
    ...prefixOptions,
    humanDelay: resolveHumanDelayConfig(cfg, route.agentId),
    deliver: async (payload) => {
      const replyThreadTs = replyPlan.nextThreadTs();
      await deliverReplies({
        replies: [payload],
        target: prepared.replyTarget,
        token: ctx.botToken,
        accountId: account.accountId,
        runtime,
        textLimit: ctx.textLimit,
        replyThreadTs,
      });
      replyPlan.markSent();
    },
    onError: (err, info) => {
      runtime.error?.(danger(`slack ${info.kind} reply failed: ${String(err)}`));
      typingCallbacks.onIdle?.();
    },
    onReplyStart: typingCallbacks.onReplyStart,
    onIdle: typingCallbacks.onIdle,
  });

  const { queuedFinal, counts } = await dispatchInboundMessage({
    ctx: prepared.ctxPayload,
    cfg,
    dispatcher,
    replyOptions: {
      ...replyOptions,
      skillFilter: prepared.channelConfig?.skills,
      hasRepliedRef,
      disableBlockStreaming:
        typeof account.config.blockStreaming === "boolean"
          ? !account.config.blockStreaming
          : undefined,
      onModelSelected,
    },
  });
  markDispatchIdle();

  const anyReplyDelivered = queuedFinal || (counts.block ?? 0) > 0 || (counts.final ?? 0) > 0;

  if (!anyReplyDelivered) {
    if (prepared.isRoomish) {
      clearHistoryEntriesIfEnabled({
        historyMap: ctx.channelHistories,
        historyKey: prepared.historyKey,
        limit: ctx.historyLimit,
      });
    }
    return;
  }

  if (shouldLogVerbose()) {
    const finalCount = counts.final;
    logVerbose(
      `slack: delivered ${finalCount} reply${finalCount === 1 ? "" : "ies"} to ${prepared.replyTarget}`,
    );
  }

  removeAckReactionAfterReply({
    removeAfterReply: ctx.removeAckAfterReply,
    ackReactionPromise: prepared.ackReactionPromise,
    ackReactionValue: prepared.ackReactionValue,
    remove: () =>
      removeSlackReaction(
        message.channel,
        prepared.ackReactionMessageTs ?? "",
        prepared.ackReactionValue,
        {
          token: ctx.botToken,
          client: ctx.app.client,
        },
      ),
    onError: (err) => {
      logAckFailure({
        log: logVerbose,
        channel: "slack",
        target: `${message.channel}/${message.ts}`,
        error: err,
      });
    },
  });

  if (prepared.isRoomish) {
    clearHistoryEntriesIfEnabled({
      historyMap: ctx.channelHistories,
      historyKey: prepared.historyKey,
      limit: ctx.historyLimit,
    });
  }
}
