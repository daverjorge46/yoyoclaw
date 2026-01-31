import { resolveAnnounceTargetFromKey } from "../agents/tools/sessions-send-helpers.js";
import { normalizeChannelId } from "../channels/plugins/index.js";
import type { CliDeps } from "../cli/deps.js";
import { agentCommand } from "../commands/agent.js";
import { loadConfig } from "../config/config.js";
import { resolveMainSessionKeyFromConfig } from "../config/sessions.js";
import { resolveOutboundTarget } from "../infra/outbound/targets.js";
import {
  consumeRestartSentinel,
  formatRestartSentinelMessage,
  summarizeRestartSentinel,
} from "../infra/restart-sentinel.js";
import { enqueueSystemEvent } from "../infra/system-events.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { defaultRuntime } from "../runtime.js";
import { deliveryContextFromSession, mergeDeliveryContext } from "../utils/delivery-context.js";
import { loadSessionEntry } from "./session-utils.js";

const log = createSubsystemLogger("restart-sentinel");

export async function scheduleRestartSentinelWake(params: { deps: CliDeps }) {
  const sentinel = await consumeRestartSentinel();
  if (!sentinel) return;
  const payload = sentinel.payload;
  const sessionKey = payload.sessionKey?.trim();
  const message = formatRestartSentinelMessage(payload);
  const summary = summarizeRestartSentinel(payload);

  // P0: Check if resume prompt is enabled (default: false for backward compat)
  const cfg = loadConfig();
  const resumePromptEnabled = cfg.agents?.defaults?.resumePrompt?.enabled ?? false;

  if (!sessionKey) {
    // P0: Only enqueue system event if resumePrompt enabled
    if (resumePromptEnabled) {
      const mainSessionKey = resolveMainSessionKeyFromConfig();
      enqueueSystemEvent(message, { sessionKey: mainSessionKey });
    } else {
      log.info("Gateway restart complete (no session key, resumePrompt disabled)");
    }
    return;
  }

  // Extract topic/thread ID from sessionKey (supports both :topic: and :thread:)
  // Telegram uses :topic:, other platforms use :thread:
  const topicIndex = sessionKey.lastIndexOf(":topic:");
  const threadIndex = sessionKey.lastIndexOf(":thread:");
  const markerIndex = Math.max(topicIndex, threadIndex);
  const marker = topicIndex > threadIndex ? ":topic:" : ":thread:";

  const baseSessionKey = markerIndex === -1 ? sessionKey : sessionKey.slice(0, markerIndex);
  const threadIdRaw =
    markerIndex === -1 ? undefined : sessionKey.slice(markerIndex + marker.length);
  const sessionThreadId = threadIdRaw?.trim() || undefined;

  const { cfg: sessionCfg, entry } = loadSessionEntry(sessionKey);
  const parsedTarget = resolveAnnounceTargetFromKey(baseSessionKey);

  // Prefer delivery context from sentinel (captured at restart) over session store
  // Handles race condition where store wasn't flushed before restart
  const sentinelContext = payload.deliveryContext;
  let sessionDeliveryContext = deliveryContextFromSession(entry);
  if (!sessionDeliveryContext && markerIndex !== -1 && baseSessionKey) {
    const { entry: baseEntry } = loadSessionEntry(baseSessionKey);
    sessionDeliveryContext = deliveryContextFromSession(baseEntry);
  }

  const origin = mergeDeliveryContext(
    sentinelContext,
    mergeDeliveryContext(sessionDeliveryContext, parsedTarget ?? undefined),
  );

  const channelRaw = origin?.channel;
  const channel = channelRaw ? normalizeChannelId(channelRaw) : null;
  const to = origin?.to;
  if (!channel || !to) {
    if (resumePromptEnabled) {
      enqueueSystemEvent(message, { sessionKey });
    } else {
      log.info(
        `Gateway restart complete (session=${sessionKey}, no channel/to, resumePrompt disabled)`,
      );
    }
    return;
  }

  const resolved = resolveOutboundTarget({
    channel,
    to,
    cfg: sessionCfg,
    accountId: origin?.accountId,
    mode: "implicit",
  });
  if (!resolved.ok) {
    if (resumePromptEnabled) {
      enqueueSystemEvent(message, { sessionKey });
    } else {
      log.info(
        `Gateway restart complete (session=${sessionKey}, outbound resolve failed, resumePrompt disabled)`,
      );
    }
    return;
  }

  const threadId =
    payload.threadId ??
    parsedTarget?.threadId ?? // From resolveAnnounceTargetFromKey (extracts :topic:N)
    sessionThreadId ??
    (origin?.threadId != null ? String(origin.threadId) : undefined);

  // P0: Only deliver restart message if resumePrompt is enabled
  // Default is OFF for backward compatibility (no user-visible restart messages)
  if (!resumePromptEnabled) {
    log.info(`Gateway restart complete (session=${sessionKey}, resumePrompt disabled)`);
    return;
  }

  try {
    await agentCommand(
      {
        message,
        sessionKey,
        to: resolved.to,
        channel,
        deliver: true,
        bestEffortDeliver: true,
        messageChannel: channel,
        threadId,
      },
      defaultRuntime,
      params.deps,
    );
  } catch (err) {
    enqueueSystemEvent(`${summary}\n${String(err)}`, { sessionKey });
  }
}

export function shouldWakeFromRestartSentinel() {
  return !process.env.VITEST && process.env.NODE_ENV !== "test";
}
