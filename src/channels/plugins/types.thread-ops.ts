import type { OpenClawConfig } from "../../config/types.js";

/**
 * Platform-specific thread operations.
 *
 * Implemented per channel plugin. Not all channels support all operations.
 * Methods are optional — callers must check for availability.
 */
export type ChannelThreadOperations = {
  /**
   * Create a new thread by posting an initial message.
   * Returns the thread identifier needed for subsequent replies.
   */
  createThread?: (params: {
    /** Channel/group/DM to create thread in */
    to: string;
    /** Platform account ID */
    accountId?: string;
    /** First message (becomes thread root) */
    initialMessage: string;
    cfg: OpenClawConfig;
  }) => Promise<{
    /** Thread identifier for reply routing (e.g., Slack thread_ts) */
    threadId: string;
    /** Root message ID (may equal threadId) */
    threadRootId?: string;
    /** Message ID of the initial post */
    messageId?: string;
  }>;

  /**
   * Validate that a thread exists and is accessible.
   * Used for delivery fallback when a thread may have been deleted/archived.
   */
  validateThread?: (params: {
    /** Channel/group where thread lives */
    to: string;
    /** Platform account ID */
    accountId?: string;
    /** Thread identifier */
    threadId: string;
    cfg: OpenClawConfig;
  }) => Promise<{
    exists: boolean;
    archived?: boolean;
  }>;

  /**
   * Normalize a thread ID to a canonical string form.
   * Most platforms use strings already; this handles edge cases
   * (e.g., Telegram's numeric IDs).
   */
  normalizeThreadId?: (threadId: string | number) => string;
};
