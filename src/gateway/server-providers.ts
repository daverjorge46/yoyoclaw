import {
  runtimeForLogger,
  createSubsystemLogger,
} from "../logging.js";
import { shouldLogVerbose } from "../globals.js";

import type { ClawdisConfig, loadConfig } from "../config/config.js";
import {
  probeDiscord,
  type DiscordProbe,
} from "../discord/probe.js";
import {
  monitorDiscordProvider,
  sendMessageDiscord,
} from "../discord/index.js";
import {
  probeSignal,
} from "../signal/index.js";
import {
  type SignalProbe,
} from "../signal/probe.js";
import {
  monitorSignalProvider,
  sendMessageSignal,
} from "../signal/index.js";
import {
  probeIMessage,
} from "../imessage/index.js";
import {
  type IMessageProbe,
} from "../imessage/probe.js";
import {
  monitorIMessageProvider,
  sendMessageIMessage,
} from "../imessage/index.js";
import {
  probeTelegram,
  type TelegramProbe,
} from "../telegram/probe.js";
import {
  sendMessageTelegram,
} from "../telegram/send.js";
import { monitorTelegramProvider } from "../telegram/monitor.js";
import { resolveTelegramToken } from "../telegram/token.js";
import {
  monitorWebProvider,
} from "../web/auto-reply.js";
import {
  webAuthExists,
  readWebSelfId,
} from "../web/session.js";

export type SubsystemLogger = ReturnType<typeof createSubsystemLogger>;
import type { RuntimeEnv } from "../runtime.js";

export type WebProviderStatus = {
  running: boolean;
  connected: boolean;
  reconnectAttempts: number;
  lastConnectedAt?: number | null;
  lastDisconnect?: {
    at: number;
    status?: number;
    error?: string;
    loggedOut?: boolean;
  } | null;
  lastMessageAt?: number | null;
  lastEventAt?: number | null;
  lastError?: string | null;
};

export type TelegramProviderStatus = {
  running: boolean;
  lastStartAt?: number | null;
  lastStopAt?: number | null;
  lastError?: string | null;
  mode?: "webhook" | "polling" | null;
};

export type DiscordProviderStatus = {
  running: boolean;
  lastStartAt?: number | null;
  lastStopAt?: number | null;
  lastError?: string | null;
};

export type SignalProviderStatus = {
  running: boolean;
  lastStartAt?: number | null;
  lastStopAt?: number | null;
  lastError?: string | null;
  baseUrl?: string | null;
};

export type IMessageProviderStatus = {
  running: boolean;
  lastStartAt?: number | null;
  lastStopAt?: number | null;
  lastError?: string | null;
  cliPath?: string | null;
  dbPath?: string | null;
};

export type ProviderStatusSnapshot = {
  whatsapp: WebProviderStatus;
  telegram: TelegramProviderStatus;
  discord: DiscordProviderStatus;
  signal: SignalProviderStatus;
  imessage: IMessageProviderStatus;
};

export type CreateProviderManagerDeps = {
  loadConfig: typeof loadConfig;
  logWhatsApp: SubsystemLogger;
  logTelegram: SubsystemLogger;
  logDiscord: SubsystemLogger;
  logSignal: SubsystemLogger;
  logIMessage: SubsystemLogger;
  whatsappRuntimeEnv: RuntimeEnv;
  telegramRuntimeEnv: RuntimeEnv;
  discordRuntimeEnv: RuntimeEnv;
  signalRuntimeEnv: RuntimeEnv;
  imessageRuntimeEnv: RuntimeEnv;
};

type ProviderManager = {
  getRuntimeSnapshot: () => ProviderStatusSnapshot;
  startProviders: () => Promise<void>;
  startWhatsAppProvider: () => Promise<void>;
  stopWhatsAppProvider: () => Promise<void>;
  startTelegramProvider: () => Promise<void>;
  stopTelegramProvider: () => Promise<void>;
  startDiscordProvider: () => Promise<void>;
  stopDiscordProvider: () => Promise<void>;
  startSignalProvider: () => Promise<void>;
  stopSignalProvider: () => Promise<void>;
  startIMessageProvider: () => Promise<void>;
  stopIMessageProvider: () => Promise<void>;
  markWhatsAppLoggedOut: (cleared: boolean) => void;
};

export function createProviderManager(deps: CreateProviderManagerDeps): ProviderManager {
  const {
    loadConfig,
    logWhatsApp,
    logTelegram,
    logDiscord,
    logSignal,
    logIMessage,
    whatsappRuntimeEnv,
    telegramRuntimeEnv,
    discordRuntimeEnv,
    signalRuntimeEnv,
    imessageRuntimeEnv,
  } = deps;

  // Use RuntimeEnv objects directly since they are already converted
  const whatsappRuntime = whatsappRuntimeEnv;
  const telegramRuntime = telegramRuntimeEnv;
  const discordRuntime = discordRuntimeEnv;
  const signalRuntime = signalRuntimeEnv;
  const imessageRuntime = imessageRuntimeEnv;

  // Format error utility
  const formatError = (err: unknown): string => {
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    const statusValue = (err as { status?: unknown })?.status;
    const codeValue = (err as { code?: unknown })?.code;
    const statusText =
      typeof statusValue === "string" || typeof statusValue === "number"
        ? String(statusValue)
        : undefined;
    const codeText =
      typeof codeValue === "string" || typeof codeValue === "number"
        ? String(codeValue)
        : undefined;
    if (statusText || codeText) {
      return `status=${statusText ?? "unknown"} code=${codeText ?? "unknown"}`;
    }
    return JSON.stringify(err, null, 2);
  };

  // WhatsApp provider state
  let whatsappAbort: AbortController | null = null;
  let whatsappTask: Promise<unknown> | null = null;
  let whatsappStatus: WebProviderStatus = {
    running: false,
    connected: false,
    reconnectAttempts: 0,
    lastConnectedAt: null,
    lastDisconnect: null,
    lastMessageAt: null,
    lastEventAt: null,
    lastError: null,
  };

  const updateWhatsAppStatus = (next: WebProviderStatus) => {
    whatsappStatus = next;
  };

  // Telegram provider state
  let telegramAbort: AbortController | null = null;
  let telegramTask: Promise<unknown> | null = null;
  let telegramStatus: TelegramProviderStatus = {
    running: false,
    lastStartAt: null,
    lastStopAt: null,
    lastError: null,
    mode: null,
  };

  // Discord provider state
  let discordAbort: AbortController | null = null;
  let discordTask: Promise<unknown> | null = null;
  let discordStatus: DiscordProviderStatus = {
    running: false,
    lastStartAt: null,
    lastStopAt: null,
    lastError: null,
  };

  // Signal provider state
  let signalAbort: AbortController | null = null;
  let signalTask: Promise<unknown> | null = null;
  let signalStatus: SignalProviderStatus = {
    running: false,
    lastStartAt: null,
    lastStopAt: null,
    lastError: null,
    baseUrl: null,
  };

  // iMessage provider state
  let imessageAbort: AbortController | null = null;
  let imessageTask: Promise<unknown> | null = null;
  let imessageStatus: IMessageProviderStatus = {
    running: false,
    lastStartAt: null,
    lastStopAt: null,
    lastError: null,
    cliPath: null,
    dbPath: null,
  };

  // WhatsApp provider methods
  const startWhatsAppProvider = async () => {
    if (whatsappTask) return;
    const cfg = loadConfig();
    if (cfg.web?.enabled === false) {
      whatsappStatus = {
        ...whatsappStatus,
        running: false,
        connected: false,
        lastError: "disabled",
      };
      logWhatsApp.info("skipping provider start (web.enabled=false)");
      return;
    }
    if (!(await webAuthExists())) {
      whatsappStatus = {
        ...whatsappStatus,
        running: false,
        connected: false,
        lastError: "not linked",
      };
      logWhatsApp.info("skipping provider start (no linked session)");
      return;
    }
    const { e164, jid } = readWebSelfId();
    const identity = e164 ? e164 : jid ? `jid ${jid}` : "unknown";
    logWhatsApp.info(`starting provider (${identity})`);
    whatsappAbort = new AbortController();
    whatsappStatus = {
      ...whatsappStatus,
      running: true,
      connected: false,
      lastError: null,
    };
    const task = monitorWebProvider(
      shouldLogVerbose(),
      undefined,
      true,
      undefined,
      whatsappRuntime,
      whatsappAbort.signal,
      { statusSink: updateWhatsAppStatus },
    )
      .catch(() => {
        // Empty catch to satisfy type checker
      })
      .finally(() => {
        whatsappAbort = null;
        whatsappTask = null;
        whatsappStatus = {
          ...whatsappStatus,
          running: false,
          connected: false,
        };
      });
    whatsappTask = task;
  };

  const stopWhatsAppProvider = async () => {
    if (!whatsappAbort && !whatsappTask) return;
    whatsappAbort?.abort();
    try {
      await whatsappTask;
    } catch {
      // ignore
    }
    whatsappAbort = null;
    whatsappTask = null;
    whatsappStatus = {
      ...whatsappStatus,
      running: false,
      connected: false,
    };
  };

  // Telegram provider methods
  const startTelegramProvider = async () => {
    if (telegramTask) return;
    const cfg = loadConfig();
    if (cfg.telegram?.enabled === false) {
      telegramStatus = {
        ...telegramStatus,
        running: false,
        lastError: "disabled",
      };
      logTelegram.info("skipping provider start (telegram.enabled=false)");
      return;
    }
    const { token: telegramToken } = resolveTelegramToken(cfg, {
      logMissingFile: (message) => logTelegram.warn(message),
    });
    if (!telegramToken.trim()) {
      telegramStatus = {
        ...telegramStatus,
        running: false,
        lastError: "not configured",
      };
      logTelegram.info(
        "skipping provider start (no TELEGRAM_BOT_TOKEN/telegram config)",
      );
      return;
    }
    let telegramBotLabel = "";
    try {
      const probe = await probeTelegram(
        telegramToken.trim(),
        2500,
        (cfg.telegram as any)?.proxy,
      );
      const username = probe.ok ? (probe.bot as any)?.username?.trim() : null;
      if (username) telegramBotLabel = ` (@${username})`;
    } catch (err) {
      if (shouldLogVerbose()) {
        logTelegram.debug(`bot probe failed: ${String(err)}`);
      }
    }
    logTelegram.info(`starting provider${telegramBotLabel}`);
    telegramAbort = new AbortController();
    telegramStatus = {
      ...telegramStatus,
      running: true,
      lastStartAt: Date.now(),
      lastError: null,
      mode: cfg.telegram?.webhookUrl ? "webhook" : "polling",
    };
    const task = monitorTelegramProvider({
      token: telegramToken.trim(),
      runtime: telegramRuntime,
      abortSignal: telegramAbort.signal,
      useWebhook: Boolean(cfg.telegram?.webhookUrl),
      webhookUrl: cfg.telegram?.webhookUrl,
      webhookSecret: cfg.telegram?.webhookSecret,
      webhookPath: cfg.telegram?.webhookPath,
    })
      .catch(() => {})
      .finally(() => {
        telegramAbort = null;
        telegramTask = null;
        telegramStatus = {
          ...telegramStatus,
          running: false,
          lastStopAt: Date.now(),
        };
      });
    telegramTask = task;
  };

  const stopTelegramProvider = async () => {
    if (!telegramAbort && !telegramTask) return;
    telegramAbort?.abort();
    try {
      await telegramTask;
    } catch {
      // ignore
    }
    telegramAbort = null;
    telegramTask = null;
    telegramStatus = {
      ...telegramStatus,
      running: false,
      lastStopAt: Date.now(),
    };
  };

  // Discord provider methods
  const startDiscordProvider = async () => {
    if (discordTask) return;
    const cfg = loadConfig();
    if (cfg.discord?.enabled === false) {
      discordStatus = {
        ...discordStatus,
        running: false,
        lastError: "disabled",
      };
      logDiscord.info("skipping provider start (discord.enabled=false)");
      return;
    }
    const discordToken =
      process.env.DISCORD_BOT_TOKEN ?? (cfg.discord as any)?.token ?? "";
    if (!discordToken.trim()) {
      discordStatus = {
        ...discordStatus,
        running: false,
        lastError: "not configured",
      };
      logDiscord.info("skipping provider start (no DISCORD_BOT_TOKEN/config)");
      return;
    }
    let discordBotLabel = "";
    try {
      const probe = await probeDiscord(discordToken.trim(), 2500);
      const username = probe.ok ? (probe.bot as any)?.username?.trim() : null;
      if (username) discordBotLabel = ` (@${username})`;
    } catch (err) {
      if (shouldLogVerbose()) {
        logDiscord.debug(`bot probe failed: ${String(err)}`);
      }
    }
    logDiscord.info(`starting provider${discordBotLabel}`);
    discordAbort = new AbortController();
    discordStatus = {
      ...discordStatus,
      running: true,
      lastStartAt: Date.now(),
      lastError: null,
    };
    const task = monitorDiscordProvider({
      token: discordToken.trim(),
      runtime: discordRuntime,
      abortSignal: discordAbort.signal,
      mediaMaxMb: (cfg.discord as any)?.mediaMaxMb,
    })
      .catch(() => {})
      .finally(() => {
        discordAbort = null;
        discordTask = null;
        discordStatus = {
          ...discordStatus,
          running: false,
          lastStopAt: Date.now(),
        };
      });
    discordTask = task;
  };

  const stopDiscordProvider = async () => {
    if (!discordAbort && !discordTask) return;
    discordAbort?.abort();
    try {
      await discordTask;
    } catch {
      // ignore
    }
    discordAbort = null;
    discordTask = null;
    discordStatus = {
      ...discordStatus,
      running: false,
      lastStopAt: Date.now(),
    };
  };

  // Signal provider methods
  const startSignalProvider = async () => {
    if (signalTask) return;
    const cfg = loadConfig();
    if (cfg.signal?.enabled === false) {
      signalStatus = {
        ...signalStatus,
        running: false,
        lastError: "disabled",
      };
      logSignal.info("skipping provider start (signal.enabled=false)");
      return;
    }
    const signalBaseUrl =
      process.env.SIGNAL_BASE_URL ?? (cfg.signal as any)?.baseUrl ?? "";
    if (!signalBaseUrl.trim()) {
      signalStatus = {
        ...signalStatus,
        running: false,
        lastError: "not configured",
      };
      logSignal.info("skipping provider start (no SIGNAL_BASE_URL/config)");
      return;
    }
    let signalLabel = "";
    try {
      const probe = await probeSignal(signalBaseUrl.trim(), 2500);
      const number = probe.ok ? (probe as any).number?.trim() : null;
      if (number) signalLabel = ` (${number})`;
    } catch (err) {
      if (shouldLogVerbose()) {
        logSignal.debug(`phone number probe failed: ${String(err)}`);
      }
    }
    logSignal.info(`starting provider${signalLabel}`);
    signalAbort = new AbortController();
    signalStatus = {
      ...signalStatus,
      running: true,
      lastStartAt: Date.now(),
      lastError: null,
      baseUrl: signalBaseUrl.trim(),
    };
    const task = monitorSignalProvider({
      baseUrl: signalBaseUrl.trim(),
      ignoreStories: (cfg.signal as any)?.ignoreStories,
      sendReadReceipts: (cfg.signal as any)?.sendReadReceipts,
      allowFrom: (cfg.signal as any)?.allowFrom,
      mediaMaxMb: (cfg.signal as any)?.mediaMaxMb,
      runtime: signalRuntime,
      abortSignal: signalAbort.signal,
    })
      .catch(() => {})
      .finally(() => {
        signalAbort = null;
        signalTask = null;
        signalStatus = {
          ...signalStatus,
          running: false,
          lastStopAt: Date.now(),
        };
      });
    signalTask = task;
  };

  const stopSignalProvider = async () => {
    if (!signalAbort && !signalTask) return;
    signalAbort?.abort();
    try {
      await signalTask;
    } catch {
      // ignore
    }
    signalAbort = null;
    signalTask = null;
    signalStatus = {
      ...signalStatus,
      running: false,
      lastStopAt: Date.now(),
    };
  };

  // iMessage provider methods
  const startIMessageProvider = async () => {
    if (imessageTask) return;
    const cfg = loadConfig();
    if (!cfg.imessage) {
      imessageStatus = {
        ...imessageStatus,
        running: false,
        lastError: "not configured",
      };
      logIMessage.info("skipping provider start (imessage not configured)");
      return;
    }
    if (cfg.imessage?.enabled === false) {
      imessageStatus = {
        ...imessageStatus,
        running: false,
        lastError: "disabled",
      };
      logIMessage.info("skipping provider start (imessage.enabled=false)");
      return;
    }
    const cliPath = cfg.imessage?.cliPath?.trim() || "imsg";
    const dbPath = cfg.imessage?.dbPath?.trim();
    logIMessage.info(
      `starting provider (${cliPath}${dbPath ? ` db=${dbPath}` : ""})`,
    );
    imessageAbort = new AbortController();
    imessageStatus = {
      ...imessageStatus,
      running: true,
      lastStartAt: Date.now(),
      lastError: null,
      cliPath,
      dbPath: dbPath ?? null,
    };
    const task = monitorIMessageProvider({
      cliPath,
      dbPath,
      allowFrom: cfg.imessage?.allowFrom,
      includeAttachments: cfg.imessage?.includeAttachments,
      mediaMaxMb: cfg.imessage?.mediaMaxMb,
      runtime: imessageRuntime,
      abortSignal: imessageAbort.signal,
    })
      .catch(() => {})
      .finally(() => {
        imessageAbort = null;
        imessageTask = null;
        imessageStatus = {
          ...imessageStatus,
          running: false,
          lastStopAt: Date.now(),
        };
      });
    imessageTask = task;
  };

  const stopIMessageProvider = async () => {
    if (!imessageAbort && !imessageTask) return;
    imessageAbort?.abort();
    try {
      await imessageTask;
    } catch {
      // ignore
    }
    imessageAbort = null;
    imessageTask = null;
    imessageStatus = {
      ...imessageStatus,
      running: false,
      lastStopAt: Date.now(),
    };
  };

  const startProviders = async () => {
    await startWhatsAppProvider();
    await startDiscordProvider();
    await startTelegramProvider();
    await startSignalProvider();
    await startIMessageProvider();
  };

  const getRuntimeSnapshot = (): ProviderStatusSnapshot => {
    return {
      whatsapp: { ...whatsappStatus },
      telegram: { ...telegramStatus },
      discord: { ...discordStatus },
      signal: { ...signalStatus },
      imessage: { ...imessageStatus },
    };
  };

  const markWhatsAppLoggedOut = (cleared: boolean) => {
    if (cleared) {
      whatsappStatus = {
        ...whatsappStatus,
        running: false,
        connected: false,
        lastError: "not linked",
      };
    }
  };

  return {
    getRuntimeSnapshot,
    startProviders,
    startWhatsAppProvider,
    stopWhatsAppProvider,
    startTelegramProvider,
    stopTelegramProvider,
    startDiscordProvider,
    stopDiscordProvider,
    startSignalProvider,
    stopSignalProvider,
    startIMessageProvider,
    stopIMessageProvider,
    markWhatsAppLoggedOut,
  };
}
