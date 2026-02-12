import crypto from "node:crypto";
import type { SessionEntry } from "../../config/sessions.js";
import type { ReplyPayload } from "../types.js";
import { createInternalHookEvent, triggerInternalHook } from "../../hooks/internal-hooks.js";
import { defaultRuntime } from "../../runtime.js";

/**
 * Safely clone a value using structuredClone, returning undefined if cloning fails.
 * Used for best-effort hook context where entries may contain non-cloneable values.
 */
export function safeClone<T>(value: T): T | undefined {
  try {
    return structuredClone(value);
  } catch {
    return undefined;
  }
}

/**
 * Generate a stable, non-PII fallback session key for non-persisted flows.
 * Uses SHA-256 hash of From/To/AccountId/ThreadId to prevent collisions.
 */
export function resolveHookFallbackKey(ctx: {
  Provider?: string | null;
  From?: string | null;
  To?: string | null;
  AccountId?: string | null;
  MessageThreadId?: string | number | null;
}): string {
  return `command:${ctx.Provider || "unknown"}:${crypto
    .createHash("sha256")
    .update(`${ctx.From || ""}:${ctx.To || ""}:${ctx.AccountId || ""}:${ctx.MessageThreadId || ""}`)
    .digest("hex")
    .slice(0, 16)}`;
}

/**
 * Extract assistant output text from reply payloads for hook context.
 * Normalizes text, media URLs, and multi-media into a single string.
 */
export function extractAssistantOutput(payloads: ReplyPayload[]): string {
  const parts: string[] = [];
  for (const p of payloads) {
    if (p.text) {
      parts.push(p.text);
    } else if (p.mediaUrl) {
      parts.push(`[media: ${p.mediaUrl}]`);
    } else if (p.mediaUrls && p.mediaUrls.length > 0) {
      parts.push(`[media: ${p.mediaUrls.join(", ")}]`);
    }
  }
  return parts.join("\n");
}

/**
 * Emit a session:compaction lifecycle hook.
 * Handles sessionKey guard and error logging internally; returns [] on skip or failure.
 */
export async function emitCompactionHook(params: {
  sessionKey?: string;
  sessionId: string;
  trigger: string;
  compactionCount?: number;
  contextTokensUsed?: number;
}): Promise<string[]> {
  if (!params.sessionKey) {
    return [];
  }
  try {
    const context: Record<string, unknown> = {
      sessionId: params.sessionId,
      trigger: params.trigger,
    };
    if (typeof params.compactionCount === "number") {
      context.compactionCount = params.compactionCount;
    }
    if (params.contextTokensUsed !== undefined) {
      context.contextTokensUsed = params.contextTokensUsed;
    }
    const hookEvent = createInternalHookEvent("session", "compaction", params.sessionKey, context);
    await triggerInternalHook(hookEvent);
    return hookEvent.messages;
  } catch (err) {
    defaultRuntime.error(`session:compaction hook failed: ${String(err)}`);
    return [];
  }
}

/**
 * Emit session:end and session:reset lifecycle hooks as a pair.
 * Clones entries internally for best-effort hook context.
 */
export async function emitSessionEndAndReset(params: {
  sessionKey: string;
  oldEntry: SessionEntry;
  newEntry: SessionEntry;
  newSessionId: string;
  reason: string;
  reasonDetails?: Record<string, unknown>;
}): Promise<string[]> {
  const messages: string[] = [];
  const clonedOldEntry = safeClone(params.oldEntry);
  const clonedNewEntry = safeClone(params.newEntry);

  try {
    const endEvent = createInternalHookEvent("session", "end", params.sessionKey, {
      sessionId: params.oldEntry.sessionId,
      sessionEntry: clonedOldEntry,
      newSessionEntry: clonedNewEntry,
      reason: params.reason,
      ...params.reasonDetails,
    });
    await triggerInternalHook(endEvent);
    messages.push(...endEvent.messages);
  } catch (err) {
    defaultRuntime.error(`session:end hook failed: ${String(err)}`);
  }

  try {
    const resetEvent = createInternalHookEvent("session", "reset", params.sessionKey, {
      oldSessionId: params.oldEntry.sessionId,
      newSessionId: params.newSessionId,
      previousSessionEntry: clonedOldEntry,
      sessionEntry: clonedNewEntry,
      reason: params.reason,
      ...params.reasonDetails,
    });
    await triggerInternalHook(resetEvent);
    messages.push(...resetEvent.messages);
  } catch (err) {
    defaultRuntime.error(`session:reset hook failed: ${String(err)}`);
  }

  return messages;
}
