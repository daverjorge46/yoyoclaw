/**
 * Auto-capture lifecycle hook — queues conversations for AI extraction
 * on agent_end events.
 *
 * Pattern follows memory-lancedb's agent_end handler but instead of
 * regex-based capture, we queue the full conversation for batch AI extraction.
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { ExtractionQueue } from "../extraction/queue.js";
import type { SmartMemoryConfig } from "../config.js";

/**
 * Register the auto-capture hook on agent_end events.
 *
 * On agent_end:
 *   1. Extract text content from event.messages
 *   2. Skip very short exchanges (< 3 messages)
 *   3. Skip if messages contain <relevant-memories> injection
 *   4. Concatenate user+assistant messages into conversation text
 *   5. Add to extraction queue with sessionKey and timestamp
 */
export function registerAutoCapture(
  api: OpenClawPluginApi,
  queue: ExtractionQueue,
  cfg: SmartMemoryConfig,
): void {
  api.on("agent_end", async (event) => {
    // Only capture successful sessions with messages
    if (!event.success || !event.messages || event.messages.length === 0) {
      return;
    }

    try {
      // Extract text content from messages (handling unknown[] type)
      // Same pattern as memory-lancedb
      const texts: Array<{ role: string; text: string }> = [];

      for (const msg of event.messages) {
        if (!msg || typeof msg !== "object") continue;
        const msgObj = msg as Record<string, unknown>;

        // Only process user and assistant messages
        const role = msgObj.role;
        if (role !== "user" && role !== "assistant") continue;

        const content = msgObj.content;

        // Handle string content directly
        if (typeof content === "string") {
          texts.push({ role: role as string, text: content });
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
              texts.push({
                role: role as string,
                text: (block as Record<string, unknown>).text as string,
              });
            }
          }
        }
      }

      // Skip very short exchanges (< minConversationLength messages)
      const minLen = cfg.extraction.minConversationLength;
      if (texts.length < minLen) {
        return;
      }

      // Skip if messages contain <relevant-memories> injection (avoid recursive capture)
      const hasMemoryInjection = texts.some((t) =>
        t.text.includes("<relevant-memories>"),
      );
      if (hasMemoryInjection) {
        // Filter out memory injection blocks from capture but don't skip entirely
        // Actually, we should just filter them out from the conversation text
      }

      // Concatenate user+assistant messages into conversation text
      const conversationMessages = texts
        .filter((t) => !t.text.includes("<relevant-memories>") && !t.text.includes("<core-memory>"))
        .map((t) => `${t.role === "user" ? "Human" : "Assistant"}: ${t.text}`);

      if (conversationMessages.length < minLen) {
        return;
      }

      const conversationText = conversationMessages.join("\n\n");

      // Skip very short conversations (less than 100 chars of actual content)
      if (conversationText.length < 100) {
        return;
      }

      // Generate a session key from the event or timestamp
      const sessionKey = (event as Record<string, unknown>).sessionId as string
        ?? `session-${Date.now()}`;

      // Add to extraction queue
      await queue.enqueue({
        sessionKey,
        messages: conversationMessages,
        timestamp: Date.now(),
      });

      api.logger.info(
        `memory-smart: queued conversation for extraction (${conversationMessages.length} messages, session: ${sessionKey.slice(0, 16)}...)`,
      );
    } catch (err) {
      api.logger.warn(`memory-smart: auto-capture failed: ${String(err)}`);
    }
  });
}
