import type { ClawdbotConfig, RuntimeEnv, HistoryEntry } from "openclaw/plugin-sdk";
import * as Lark from "@larksuiteoapi/node-sdk";
import type { ResolvedFeishuAccount } from "./types.js";
import { resolveFeishuAccount, listEnabledFeishuAccounts } from "./accounts.js";
import { handleFeishuMessage, type FeishuMessageEvent, type FeishuBotAddedEvent } from "./bot.js";
import { createFeishuWSClient, createEventDispatcher } from "./client.js";
import { probeFeishu } from "./probe.js";

export type MonitorFeishuOpts = {
  config?: ClawdbotConfig;
  runtime?: RuntimeEnv;
  abortSignal?: AbortSignal;
  accountId?: string;
};

// Per-account WebSocket clients and bot info
const wsClients = new Map<string, Lark.WSClient>();
const botOpenIds = new Map<string, string>();

/**
 * Maximum allowed age for an incoming message (based on create_time vs Date.now()).
 * Messages older than this are treated as stale replays and dropped.
 *
 * Covers all reconnect/replay scenarios:
 * - Machine sleep/hibernate (DevBox, laptop lid close, etc.)
 * - Lark SDK silent auto-reconnect
 * - Watchdog-triggered restart
 *
 * 2 minutes is generous; real-time delivery is normally sub-second.
 */
const MAX_MESSAGE_AGE_MS = 2 * 60 * 1000;

/**
 * Watchdog: track last event time per account and restart WSClient
 * if no events arrive within WATCHDOG_TIMEOUT_MS.
 * Works around a deadlock in the Lark SDK's reconnect logic where
 * isConnecting gets stuck at true when pullConnectConfig() throws.
 */
const WATCHDOG_INTERVAL_MS = 60 * 60 * 1000; // check every 1 hour
const WATCHDOG_TIMEOUT_MS = 60 * 60 * 1000; // restart if no events for 1 hour
const lastEventAt = new Map<string, number>();

function touchLastEvent(accountId: string): void {
  lastEventAt.set(accountId, Date.now());
}

async function fetchBotOpenId(account: ResolvedFeishuAccount): Promise<string | undefined> {
  try {
    const result = await probeFeishu(account);
    return result.ok ? result.botOpenId : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Monitor a single Feishu account.
 */
async function monitorSingleAccount(params: {
  cfg: ClawdbotConfig;
  account: ResolvedFeishuAccount;
  runtime?: RuntimeEnv;
  abortSignal?: AbortSignal;
}): Promise<void> {
  const { cfg, account, runtime, abortSignal } = params;
  const { accountId } = account;
  const log = runtime?.log ?? console.log;
  const error = runtime?.error ?? console.error;

  const connectionMode = account.config.connectionMode ?? "websocket";
  if (connectionMode !== "websocket") {
    log(`feishu[${accountId}]: webhook mode not implemented in monitor`);
    return;
  }

  // Helper: create WSClient, register events, and start
  const startConnection = async (): Promise<Lark.WSClient> => {
    // Fetch bot open_id
    const botOpenId = await fetchBotOpenId(account);
    botOpenIds.set(accountId, botOpenId ?? "");
    log(`feishu[${accountId}]: bot open_id resolved: ${botOpenId ?? "unknown"}`);

    log(`feishu[${accountId}]: starting WebSocket connection...`);

    const wsClient = createFeishuWSClient(account);
    wsClients.set(accountId, wsClient);

    const chatHistories = new Map<string, HistoryEntry[]>();
    const eventDispatcher = createEventDispatcher(account);

    // Mark connection start as the first event
    touchLastEvent(accountId);

    eventDispatcher.register({
      "im.message.receive_v1": async (data) => {
        touchLastEvent(accountId);
        try {
          const event = data as unknown as FeishuMessageEvent;

          // Drop stale messages replayed after reconnect (e.g. machine sleep,
          // Lark SDK auto-reconnect, watchdog restart). If create_time is too
          // far in the past, the message was queued server-side and delivered
          // late — executing it now could run old commands like /new and wipe
          // the current session.
          const msgCreateMs = parseInt(event.message.create_time, 10);
          const ageMs = Date.now() - msgCreateMs;
          if (msgCreateMs > 0 && ageMs > MAX_MESSAGE_AGE_MS) {
            const ageS = Math.round(ageMs / 1000);
            log(
              `feishu[${accountId}]: dropping stale message ${event.message.message_id} ` +
                `(age=${ageS}s, threshold=${MAX_MESSAGE_AGE_MS / 1000}s)`,
            );
            return;
          }

          await handleFeishuMessage({
            cfg,
            event,
            botOpenId: botOpenIds.get(accountId),
            runtime,
            chatHistories,
            accountId,
          });
        } catch (err) {
          error(`feishu[${accountId}]: error handling message: ${String(err)}`);
        }
      },
      "im.message.message_read_v1": async () => {
        touchLastEvent(accountId);
        // Ignore read receipts
      },
      "im.chat.member.bot.added_v1": async (data) => {
        touchLastEvent(accountId);
        try {
          const event = data as unknown as FeishuBotAddedEvent;
          log(`feishu[${accountId}]: bot added to chat ${event.chat_id}`);
        } catch (err) {
          error(`feishu[${accountId}]: error handling bot added event: ${String(err)}`);
        }
      },
      "im.chat.member.bot.deleted_v1": async (data) => {
        touchLastEvent(accountId);
        try {
          const event = data as unknown as { chat_id: string };
          log(`feishu[${accountId}]: bot removed from chat ${event.chat_id}`);
        } catch (err) {
          error(`feishu[${accountId}]: error handling bot removed event: ${String(err)}`);
        }
      },
    });

    void wsClient.start({ eventDispatcher });
    log(`feishu[${accountId}]: WebSocket client started`);
    return wsClient;
  };

  // Start initial connection
  let currentClient = await startConnection();

  return new Promise<void>((resolve) => {
    let watchdogTimer: ReturnType<typeof setInterval> | undefined;

    const cleanup = () => {
      if (watchdogTimer) {
        clearInterval(watchdogTimer);
        watchdogTimer = undefined;
      }
      wsClients.delete(accountId);
      botOpenIds.delete(accountId);
      lastEventAt.delete(accountId);
    };

    const handleAbort = () => {
      log(`feishu[${accountId}]: abort signal received, stopping`);
      cleanup();
      resolve();
    };

    if (abortSignal?.aborted) {
      cleanup();
      resolve();
      return;
    }

    abortSignal?.addEventListener("abort", handleAbort, { once: true });

    // Watchdog: periodically verify the connection is alive via API probe.
    // Works around the Lark SDK deadlock where isConnecting gets stuck.
    watchdogTimer = setInterval(async () => {
      if (abortSignal?.aborted) return;

      const last = lastEventAt.get(accountId) ?? 0;
      const silenceMs = Date.now() - last;

      if (silenceMs < WATCHDOG_TIMEOUT_MS) return;

      // Double-check with an API probe before restarting
      log(`feishu[${accountId}]: watchdog: no events for ${Math.round(silenceMs / 1000)}s, probing...`);
      try {
        const probe = await probeFeishu(account);
        if (!probe.ok) {
          log(`feishu[${accountId}]: watchdog: probe failed (${probe.error}), skipping restart`);
          // Probe failed → API credentials/network issue, not a WS problem.
          // Reset timer to avoid restart-loop.
          touchLastEvent(accountId);
          return;
        }
      } catch {
        log(`feishu[${accountId}]: watchdog: probe threw, skipping restart`);
        touchLastEvent(accountId);
        return;
      }

      // Probe OK but no events → WS is dead. Restart.
      log(`feishu[${accountId}]: watchdog: connection appears dead, restarting WebSocket...`);
      try {
        // Terminate old client
        const oldClient = wsClients.get(accountId);
        if (oldClient) {
          // WSClient doesn't expose a clean stop(); terminate underlying WS
          // by deleting from our map (SDK may keep retrying; new client takes over)
          wsClients.delete(accountId);
        }
        currentClient = await startConnection();
        log(`feishu[${accountId}]: watchdog: WebSocket reconnected successfully`);
      } catch (err) {
        error(`feishu[${accountId}]: watchdog: restart failed: ${String(err)}`);
        // Reset timer so we try again next interval
        touchLastEvent(accountId);
      }
    }, WATCHDOG_INTERVAL_MS);
  });
}

/**
 * Main entry: start monitoring for all enabled accounts.
 */
export async function monitorFeishuProvider(opts: MonitorFeishuOpts = {}): Promise<void> {
  const cfg = opts.config;
  if (!cfg) {
    throw new Error("Config is required for Feishu monitor");
  }

  const log = opts.runtime?.log ?? console.log;

  // If accountId is specified, only monitor that account
  if (opts.accountId) {
    const account = resolveFeishuAccount({ cfg, accountId: opts.accountId });
    if (!account.enabled || !account.configured) {
      throw new Error(`Feishu account "${opts.accountId}" not configured or disabled`);
    }
    return monitorSingleAccount({
      cfg,
      account,
      runtime: opts.runtime,
      abortSignal: opts.abortSignal,
    });
  }

  // Otherwise, start all enabled accounts
  const accounts = listEnabledFeishuAccounts(cfg);
  if (accounts.length === 0) {
    throw new Error("No enabled Feishu accounts configured");
  }

  log(
    `feishu: starting ${accounts.length} account(s): ${accounts.map((a) => a.accountId).join(", ")}`,
  );

  // Start all accounts in parallel
  await Promise.all(
    accounts.map((account) =>
      monitorSingleAccount({
        cfg,
        account,
        runtime: opts.runtime,
        abortSignal: opts.abortSignal,
      }),
    ),
  );
}

/**
 * Stop monitoring for a specific account or all accounts.
 */
export function stopFeishuMonitor(accountId?: string): void {
  if (accountId) {
    wsClients.delete(accountId);
    botOpenIds.delete(accountId);
    lastEventAt.delete(accountId);
  } else {
    wsClients.clear();
    botOpenIds.clear();
    lastEventAt.clear();
  }
}
