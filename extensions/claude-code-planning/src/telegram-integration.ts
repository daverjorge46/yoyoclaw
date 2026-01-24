/**
 * Telegram Bubble Integration for Claude Code Planning Plugin
 *
 * Phase 2 implementation: Integrates with core bubble-service for
 * Telegram status bubbles with live updates.
 *
 * Architecture Decision: Import core bubble-service directly (Option A)
 * - DRY principle: inherit all race condition fixes
 * - Single source of truth for bubble logic
 * - Same-repo means version coupling is acceptable
 *
 * See README.md Phase 2 section for full design rationale.
 */

import type { SessionState, BlockerInfo } from "./types.js";

/**
 * Telegram integration configuration.
 */
export interface TelegramIntegrationConfig {
  /** Enable Telegram bubble updates */
  enabled: boolean;
  /** Default chat ID for bubble updates */
  chatId?: string;
  /** Default thread/topic ID */
  threadId?: number;
  /** Account ID for multi-account support */
  accountId?: string;
}

/**
 * Telegram integration context passed to callbacks.
 */
export interface TelegramContext {
  chatId: string;
  threadId?: number;
  accountId?: string;
}

/**
 * Logger interface for the integration.
 */
interface Logger {
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

const defaultLogger: Logger = {
  info: (msg) => console.log(`[telegram-integration] ${msg}`),
  warn: (msg) => console.warn(`[telegram-integration] ${msg}`),
  error: (msg) => console.error(`[telegram-integration] ${msg}`),
};

let log: Logger = defaultLogger;

/**
 * Set the logger.
 */
export function setLogger(logger: Logger): void {
  log = logger;
}

// Dynamic imports for core bubble-service (lazy loaded to avoid circular deps)
let bubbleService: typeof import("../../../src/agents/claude-code/bubble-service.js") | null =
  null;

/**
 * Lazy load the core bubble-service.
 */
async function getBubbleService() {
  if (!bubbleService) {
    try {
      bubbleService = await import("../../../src/agents/claude-code/bubble-service.js");
      log.info("Loaded core bubble-service");
    } catch (err) {
      log.error(`Failed to load core bubble-service: ${err}`);
      throw err;
    }
  }
  return bubbleService;
}

/**
 * Create a Telegram bubble for a session.
 */
export async function createBubble(params: {
  sessionId: string;
  chatId: string;
  threadId?: number;
  accountId?: string;
  resumeToken: string;
  state: SessionState;
  workingDir: string;
  dydoCommand?: string;
}): Promise<{ messageId: string } | null> {
  const service = await getBubbleService();

  log.info(`Creating bubble for session ${params.sessionId} in chat ${params.chatId}`);

  return service.createSessionBubble({
    sessionId: params.sessionId,
    chatId: params.chatId,
    threadId: params.threadId,
    accountId: params.accountId,
    resumeToken: params.resumeToken,
    state: params.state,
    workingDir: params.workingDir,
    dydoCommand: params.dydoCommand,
  });
}

/**
 * Update an existing bubble with new state.
 */
export async function updateBubble(params: {
  sessionId: string;
  state: SessionState;
}): Promise<boolean> {
  const service = await getBubbleService();

  return service.updateSessionBubble({
    sessionId: params.sessionId,
    state: params.state,
  });
}

/**
 * Complete a bubble (remove buttons, show final state).
 */
export async function completeBubble(params: {
  sessionId: string;
  state: SessionState;
  completedPhases?: string[];
}): Promise<boolean> {
  const service = await getBubbleService();

  return service.completeSessionBubble({
    sessionId: params.sessionId,
    state: params.state,
    completedPhases: params.completedPhases,
  });
}

/**
 * Record that a question was asked (for hybrid bubble display).
 */
export async function recordQuestion(sessionId: string, question: string): Promise<void> {
  const service = await getBubbleService();
  service.recordCCQuestion(sessionId, question);
}

/**
 * Record that an answer was provided (collapse Q&A in bubble).
 */
export async function recordAnswer(sessionId: string): Promise<void> {
  const service = await getBubbleService();
  service.recordDyDoAnswer(sessionId);
}

/**
 * Send a blocker notification to Telegram.
 */
export async function sendBlockerNotification(params: {
  chatId: string;
  threadId?: number;
  accountId?: string;
  projectName: string;
  resumeToken: string;
  blocker: BlockerInfo;
}): Promise<boolean> {
  try {
    const { sendMessageTelegram } = await import("../../../src/telegram/send.js");

    const msg =
      `⚠️ **Claude Code Session Blocked**\n\n` +
      `**Project:** ${params.projectName}\n` +
      `**Reason:** ${params.blocker.reason}\n\n` +
      `Session has completed but may need attention.\n\n` +
      `\`claude --resume ${params.resumeToken}\``;

    await sendMessageTelegram(params.chatId, msg, {
      accountId: params.accountId,
      messageThreadId: params.threadId,
      disableLinkPreview: true,
    });

    log.info(`Blocker notification sent to chat ${params.chatId}`);
    return true;
  } catch (err) {
    log.error(`Failed to send blocker notification: ${err}`);
    return false;
  }
}

/**
 * Check if a reply is to a bubble (for resume detection).
 */
export async function isReplyToBubble(
  chatId: string | number,
  replyToMessageId: string | number | undefined,
): Promise<{ sessionId: string; resumeToken: string } | undefined> {
  if (!replyToMessageId) return undefined;

  const service = await getBubbleService();
  const result = service.isReplyToBubble(chatId, replyToMessageId);

  if (result) {
    return {
      sessionId: result.sessionId,
      resumeToken: result.bubble.resumeToken,
    };
  }
  return undefined;
}

/**
 * Get bubble by resume token prefix.
 */
export async function getBubbleByToken(
  tokenPrefix: string,
): Promise<{ sessionId: string; resumeToken: string; chatId: string } | undefined> {
  const service = await getBubbleService();
  const result = service.getBubbleByTokenPrefix(tokenPrefix);

  if (result) {
    return {
      sessionId: result.sessionId,
      resumeToken: result.bubble.resumeToken,
      chatId: result.bubble.chatId,
    };
  }
  return undefined;
}

/**
 * Create callbacks for integrating with session manager.
 *
 * Usage:
 * ```typescript
 * const callbacks = createTelegramCallbacks({
 *   chatId: "123456",
 *   threadId: 42,
 * });
 *
 * const tool = createClaudeCodeStartTool({
 *   onStateChange: callbacks.onStateChange,
 *   onBlocker: callbacks.onBlocker,
 * });
 * ```
 */
export function createTelegramCallbacks(config: TelegramContext) {
  return {
    /**
     * Called when session state changes - updates the bubble.
     */
    onStateChange: async (sessionId: string, state: SessionState) => {
      await updateBubble({ sessionId, state });
    },

    /**
     * Called when a blocker is detected - sends notification.
     */
    onBlocker: async (
      sessionId: string,
      blocker: BlockerInfo,
      projectName: string,
      resumeToken: string,
    ): Promise<boolean> => {
      await sendBlockerNotification({
        chatId: config.chatId,
        threadId: config.threadId,
        accountId: config.accountId,
        projectName,
        resumeToken,
        blocker,
      });
      // Return false to let session complete (blocker is recorded)
      return false;
    },
  };
}
