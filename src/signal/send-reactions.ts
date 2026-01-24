/**
 * Signal reactions via signal-cli JSON-RPC API
 */

import { loadConfig } from "../config/config.js";
import { resolveSignalAccount } from "./accounts.js";
import { signalRpcRequest } from "./client.js";

export type SignalReactionOpts = {
  baseUrl?: string;
  account?: string;
  accountId?: string;
  timeoutMs?: number;
};

export type SignalReactionResult = {
  ok: boolean;
  timestamp?: number;
};

function resolveReactionRpcContext(
  opts: SignalReactionOpts,
  accountInfo?: ReturnType<typeof resolveSignalAccount>,
) {
  const hasBaseUrl = Boolean(opts.baseUrl?.trim());
  const hasAccount = Boolean(opts.account?.trim());
  const resolvedAccount =
    accountInfo ||
    (!hasBaseUrl || !hasAccount
      ? resolveSignalAccount({
          cfg: loadConfig(),
          accountId: opts.accountId,
        })
      : undefined);
  const baseUrl = opts.baseUrl?.trim() || resolvedAccount?.baseUrl;
  if (!baseUrl) {
    throw new Error("Signal base URL is required");
  }
  const account = opts.account?.trim() || resolvedAccount?.config.account?.trim();
  return { baseUrl, account };
}

/**
 * Send a Signal reaction to a message
 * @param recipient - UUID or E.164 phone number of the message author
 * @param targetTimestamp - Message ID (timestamp) to react to
 * @param emoji - Emoji to react with
 * @param opts - Optional account/connection overrides
 */
export async function sendReactionSignal(
  recipient: string,
  targetTimestamp: number,
  emoji: string,
  opts: SignalReactionOpts = {},
): Promise<SignalReactionResult> {
  const accountInfo = resolveSignalAccount({
    cfg: loadConfig(),
    accountId: opts.accountId,
  });
  const { baseUrl, account } = resolveReactionRpcContext(opts, accountInfo);

  if (!recipient?.trim()) {
    throw new Error("Recipient is required for Signal reaction");
  }
  if (!Number.isFinite(targetTimestamp) || targetTimestamp <= 0) {
    throw new Error("Valid targetTimestamp is required for Signal reaction");
  }
  if (!emoji?.trim()) {
    throw new Error("Emoji is required for Signal reaction");
  }

  const params: Record<string, unknown> = {
    recipient: recipient.trim(),
    emoji: emoji.trim(),
    targetAuthor: recipient.trim(), // Author of the message being reacted to
    targetTimestamp,
  };
  if (account) params.account = account;

  const result = await signalRpcRequest<{ timestamp?: number }>("sendReaction", params, {
    baseUrl,
    timeoutMs: opts.timeoutMs,
  });

  return {
    ok: true,
    timestamp: result?.timestamp,
  };
}

/**
 * Remove a Signal reaction from a message
 * @param recipient - UUID or E.164 phone number of the message author
 * @param targetTimestamp - Message ID (timestamp) to remove reaction from
 * @param emoji - Emoji to remove
 * @param opts - Optional account/connection overrides
 */
export async function removeReactionSignal(
  recipient: string,
  targetTimestamp: number,
  emoji: string,
  opts: SignalReactionOpts = {},
): Promise<SignalReactionResult> {
  const accountInfo = resolveSignalAccount({
    cfg: loadConfig(),
    accountId: opts.accountId,
  });
  const { baseUrl, account } = resolveReactionRpcContext(opts, accountInfo);

  if (!recipient?.trim()) {
    throw new Error("Recipient is required for Signal reaction removal");
  }
  if (!Number.isFinite(targetTimestamp) || targetTimestamp <= 0) {
    throw new Error("Valid targetTimestamp is required for Signal reaction removal");
  }
  if (!emoji?.trim()) {
    throw new Error("Emoji is required for Signal reaction removal");
  }

  const params: Record<string, unknown> = {
    recipient: recipient.trim(),
    emoji: emoji.trim(),
    targetAuthor: recipient.trim(),
    targetTimestamp,
    remove: true,
  };
  if (account) params.account = account;

  const result = await signalRpcRequest<{ timestamp?: number }>("sendReaction", params, {
    baseUrl,
    timeoutMs: opts.timeoutMs,
  });

  return {
    ok: true,
    timestamp: result?.timestamp,
  };
}
