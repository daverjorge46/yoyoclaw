import type { ChannelId } from "../channels/plugins/types.js";

/**
 * CLI-specific configuration for the `openclaw agent` command.
 */
export type CliConfig = {
  agent?: CliAgentConfig;
};

/**
 * Default settings for the `openclaw agent` CLI command.
 * Allows single-user setups to avoid specifying --channel and --reply-to every time.
 */
export type CliAgentConfig = {
  /** Default --deliver behavior (default: false). */
  defaultDeliver?: boolean;
  /** Default --channel value (e.g., "telegram", "slack"). */
  defaultChannel?: ChannelId;
  /** Default --reply-to value (E.164 for WhatsApp, chat id for Telegram, etc.). */
  defaultTo?: string;
  /** Default --reply-account value. */
  defaultAccountId?: string;
};
