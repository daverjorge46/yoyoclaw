/**
 * Automatic Message Indexing Hooks for ruvector Memory Plugin
 *
 * Provides hook handlers for:
 * - message_received: Index incoming user messages
 * - message_sent: Index outgoing bot messages
 * - agent_end: Index agent responses with full context
 *
 * Features debouncing and batching to avoid overwhelming the database.
 */

import type {
  ClawdbotPluginApi,
  PluginHookAgentContext,
  PluginHookAgentEndEvent,
  PluginHookMessageContext,
  PluginHookMessageReceivedEvent,
  PluginHookMessageSentEvent,
} from "clawdbot/plugin-sdk";

import type { RuvectorDB, MessageDocument } from "./db.js";
import type { EmbeddingProvider } from "./embeddings.js";

// ============================================================================
// Types
// ============================================================================

export type IndexableMessage = {
  content: string;
  direction: "inbound" | "outbound";
  channel: string;
  user?: string;
  conversationId?: string;
  sessionKey?: string;
  agentId?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
};

type BatchEntry = {
  message: IndexableMessage;
  resolve: () => void;
  reject: (err: Error) => void;
};

// ============================================================================
// Message Batcher
// ============================================================================

/**
 * Batches messages for efficient bulk indexing.
 * Flushes when batch size is reached or after debounce delay.
 */
export class MessageBatcher {
  private batch: BatchEntry[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private isProcessing = false;
  private destroyed = false;

  constructor(
    private readonly db: RuvectorDB,
    private readonly embeddings: EmbeddingProvider,
    private readonly options: {
      batchSize: number;
      debounceMs: number;
      logger: ClawdbotPluginApi["logger"];
    },
  ) {}

  /**
   * Queue a message for indexing. Returns a promise that resolves when indexed.
   */
  async queue(message: IndexableMessage): Promise<void> {
    if (this.destroyed) {
      throw new Error("Batcher has been destroyed");
    }

    return new Promise<void>((resolve, reject) => {
      this.batch.push({ message, resolve, reject });

      // Flush immediately if batch is full
      if (this.batch.length >= this.options.batchSize) {
        this.flush();
        return;
      }

      // Otherwise, schedule flush after debounce delay
      this.scheduleFlush();
    });
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush();
    }, this.options.debounceMs);
  }

  private async flush(): Promise<void> {
    if (this.batch.length === 0 || this.isProcessing) return;

    // Clear timer if exists
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    // Take current batch and reset
    const toProcess = this.batch.splice(0, this.options.batchSize);
    if (toProcess.length === 0) return;

    this.isProcessing = true;

    try {
      // Generate embeddings for all messages in a single batch API call
      const embeddings = await this.embeddings.embedBatch(
        toProcess.map((entry) => entry.message.content),
      );

      // Build documents for bulk insert
      const documents: MessageDocument[] = toProcess.map((entry, i) => ({
        content: entry.message.content,
        vector: embeddings[i],
        direction: entry.message.direction,
        channel: entry.message.channel,
        user: entry.message.user,
        conversationId: entry.message.conversationId,
        sessionKey: entry.message.sessionKey,
        agentId: entry.message.agentId,
        timestamp: entry.message.timestamp,
        metadata: entry.message.metadata,
      }));

      // Bulk insert
      await this.db.insertBatch(documents);

      // Resolve all promises
      for (const entry of toProcess) {
        entry.resolve();
      }

      this.options.logger.info?.(
        `memory-ruvector: indexed ${toProcess.length} messages`,
      );
    } catch (err) {
      // Reject all promises on error
      const error = err instanceof Error ? err : new Error(String(err));
      for (const entry of toProcess) {
        entry.reject(error);
      }
      this.options.logger.warn(
        `memory-ruvector: batch indexing failed: ${error.message}`,
      );
    } finally {
      this.isProcessing = false;

      // Process remaining batch if any
      if (this.batch.length > 0) {
        this.scheduleFlush();
      }
    }
  }

  /**
   * Force flush any pending messages. Call on shutdown.
   * Waits for any in-progress flush to complete with a timeout.
   */
  async forceFlush(): Promise<void> {
    // Clear any pending timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    // Wait for in-progress flush to complete (with timeout to avoid hanging)
    const maxWaitMs = 30_000;
    const startTime = Date.now();
    while (this.isProcessing && Date.now() - startTime < maxWaitMs) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Flush remaining batches with retry limit
    const maxRetries = 3;
    let retries = 0;
    while (this.batch.length > 0 && retries < maxRetries) {
      const prevLength = this.batch.length;
      await this.flush();
      // If batch length didn't decrease, something is stuck
      if (this.batch.length >= prevLength) {
        retries++;
        await new Promise((resolve) => setTimeout(resolve, 100));
      } else {
        retries = 0;
      }
    }

    if (this.batch.length > 0) {
      this.options.logger.warn(
        `memory-ruvector: forceFlush completed with ${this.batch.length} messages still pending`,
      );
      // Reject remaining entries so callers aren't left hanging
      for (const entry of this.batch) {
        entry.reject(new Error("Batcher shutdown with pending messages"));
      }
      this.batch = [];
    }
  }

  /**
   * Cleanup resources. Call when the plugin is unloaded.
   */
  destroy(): void {
    this.destroyed = true;
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    // Reject any pending entries
    for (const entry of this.batch) {
      entry.reject(new Error("Batcher destroyed"));
    }
    this.batch = [];
  }
}

// ============================================================================
// Content Filters
// ============================================================================

const MIN_CONTENT_LENGTH = 5;
const MAX_CONTENT_LENGTH = 8000;

/**
 * Determine if content should be indexed.
 * Filters out very short messages, system markers, and injected context.
 */
function shouldIndex(content: string): boolean {
  if (!content || typeof content !== "string") return false;

  const trimmed = content.trim();

  // Skip too short or too long
  if (trimmed.length < MIN_CONTENT_LENGTH || trimmed.length > MAX_CONTENT_LENGTH) {
    return false;
  }

  // Skip system-generated/injected content markers
  if (trimmed.includes("<relevant-memories>")) return false;
  if (trimmed.includes("<system>")) return false;
  // Skip XML/HTML-like documents that start with a tag and have matching close tags
  // But allow messages that merely contain some HTML tags
  if (trimmed.startsWith("<") && /^<[a-zA-Z][^>]*>[\s\S]*<\/[a-zA-Z]+>\s*$/.test(trimmed)) return false;

  // Skip control commands
  if (trimmed.startsWith("/")) return false;

  // Skip likely empty or whitespace-only
  if (/^\s*$/.test(trimmed)) return false;

  return true;
}

/**
 * Clean content for embedding (remove excessive whitespace, etc.)
 */
function cleanContent(content: string): string {
  return content
    .trim()
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ");
}

// ============================================================================
// Hook Registration
// ============================================================================

export type HooksConfig = {
  enabled: boolean;
  indexInbound: boolean;
  indexOutbound: boolean;
  indexAgentResponses: boolean;
  batchSize: number;
  debounceMs: number;
};

export const defaultHooksConfig: HooksConfig = {
  enabled: true,
  indexInbound: true,
  indexOutbound: true,
  indexAgentResponses: true,
  batchSize: 10,
  debounceMs: 500,
};

/**
 * Register message indexing hooks with the plugin API.
 */
export function registerHooks(
  api: ClawdbotPluginApi,
  db: RuvectorDB,
  embeddings: EmbeddingProvider,
  config: HooksConfig,
): { batcher: MessageBatcher | null } {
  if (!config.enabled) {
    api.logger.info?.("memory-ruvector: hooks disabled by config");
    return { batcher: null };
  }

  const batcher = new MessageBatcher(db, embeddings, {
    batchSize: config.batchSize,
    debounceMs: config.debounceMs,
    logger: api.logger,
  });

  // -------------------------------------------------------------------------
  // message_received hook - Index incoming user messages
  // -------------------------------------------------------------------------
  if (config.indexInbound) {
    api.on(
      "message_received",
      async (
        event: PluginHookMessageReceivedEvent,
        ctx: PluginHookMessageContext,
      ) => {
        try {
          if (!shouldIndex(event.content)) return;

          const message: IndexableMessage = {
            content: cleanContent(event.content),
            direction: "inbound",
            channel: ctx.channelId,
            user: event.from,
            conversationId: ctx.conversationId,
            timestamp: event.timestamp ?? Date.now(),
            metadata: event.metadata,
          };

          // Queue for batched indexing (fire and forget, don't block message handling)
          batcher.queue(message).catch((err) => {
            api.logger.warn(
              `memory-ruvector: failed to index received message: ${String(err)}`,
            );
          });
        } catch (err) {
          api.logger.warn(
            `memory-ruvector: message_received hook error: ${String(err)}`,
          );
        }
      },
      { priority: 100 }, // Low priority, run after core handlers
    );

    api.logger.info?.("memory-ruvector: registered message_received hook");
  }

  // -------------------------------------------------------------------------
  // message_sent hook - Index outgoing bot messages
  // -------------------------------------------------------------------------
  if (config.indexOutbound) {
    api.on(
      "message_sent",
      async (
        event: PluginHookMessageSentEvent,
        ctx: PluginHookMessageContext,
      ) => {
        try {
          // Only index successful sends
          if (!event.success) return;
          if (!shouldIndex(event.content)) return;

          const message: IndexableMessage = {
            content: cleanContent(event.content),
            direction: "outbound",
            channel: ctx.channelId,
            user: event.to,
            conversationId: ctx.conversationId,
            timestamp: Date.now(),
          };

          // Queue for batched indexing
          batcher.queue(message).catch((err) => {
            api.logger.warn(
              `memory-ruvector: failed to index sent message: ${String(err)}`,
            );
          });
        } catch (err) {
          api.logger.warn(
            `memory-ruvector: message_sent hook error: ${String(err)}`,
          );
        }
      },
      { priority: 100 },
    );

    api.logger.info?.("memory-ruvector: registered message_sent hook");
  }

  // -------------------------------------------------------------------------
  // agent_end hook - Index agent responses with full context
  // -------------------------------------------------------------------------
  if (config.indexAgentResponses) {
    api.on(
      "agent_end",
      async (
        event: PluginHookAgentEndEvent,
        ctx: PluginHookAgentContext,
      ) => {
        try {
          // Only index successful agent runs
          if (!event.success) return;
          if (!event.messages || event.messages.length === 0) return;

          // Extract text content from messages
          const textsToIndex: Array<{
            content: string;
            direction: "inbound" | "outbound";
          }> = [];

          for (const msg of event.messages) {
            if (!msg || typeof msg !== "object") continue;
            const msgObj = msg as Record<string, unknown>;

            const role = msgObj.role;
            // Only process user (inbound) and assistant (outbound) messages
            if (role !== "user" && role !== "assistant") continue;

            const direction: "inbound" | "outbound" =
              role === "user" ? "inbound" : "outbound";
            const content = msgObj.content;

            // Handle string content
            if (typeof content === "string") {
              if (shouldIndex(content)) {
                textsToIndex.push({ content: cleanContent(content), direction });
              }
              continue;
            }

            // Handle array content (content blocks)
            if (Array.isArray(content)) {
              for (const block of content) {
                if (
                  block &&
                  typeof block === "object" &&
                  "type" in block &&
                  (block as Record<string, unknown>).type === "text" &&
                  "text" in block &&
                  typeof (block as Record<string, unknown>).text === "string"
                ) {
                  const text = (block as Record<string, unknown>).text as string;
                  if (shouldIndex(text)) {
                    textsToIndex.push({ content: cleanContent(text), direction });
                  }
                }
              }
            }
          }

          // Limit to most recent messages to avoid overwhelming on long sessions
          const toIndex = textsToIndex.slice(-10);

          // Queue all for batched indexing
          const promises = toIndex.map((item) => {
            const message: IndexableMessage = {
              content: item.content,
              direction: item.direction,
              channel: ctx.messageProvider ?? "unknown",
              sessionKey: ctx.sessionKey,
              agentId: ctx.agentId,
              timestamp: Date.now(),
            };
            return batcher.queue(message);
          });

          // Wait for all to be queued (not necessarily indexed)
          await Promise.allSettled(promises);
        } catch (err) {
          api.logger.warn(
            `memory-ruvector: agent_end hook error: ${String(err)}`,
          );
        }
      },
      { priority: 100 },
    );

    api.logger.info?.("memory-ruvector: registered agent_end hook");
  }

  return { batcher };
}
