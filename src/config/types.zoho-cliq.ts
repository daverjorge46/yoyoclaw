import type { OutboundRetryConfig } from "./types.base.js";

export type ZohoCliqWebhookConfig = {
  /** Port for the webhook server. Default: same as main or specific. */
  port?: number;
  /** Path for the webhook endpoint. Default: /zoho/webhook. */
  path?: string;
  /** Secret key for validating incoming webhook signatures (if applicable). */
  secret?: string;
};

export type ZohoCliqAccountConfig = {
  /** Optional display name for this account. */
  name?: string;
  /** If false, do not start this Zoho Cliq account. Default: true. */
  enabled?: boolean;
  /** OAuth Client ID. */
  clientId?: string;
  /** OAuth Client Secret. */
  clientSecret?: string;
  /** OAuth Refresh Token. */
  refreshToken?: string;
  /** Data Center (US, EU, IN, AU, JP, CN). Default: US. */
  dc?: "US" | "EU" | "IN" | "AU" | "JP" | "CN" | "SA" | "UK" | "CA";
  /** Webhook configuration. */
  webhook?: ZohoCliqWebhookConfig;
  /** Direct message access policy (default: pairing). */
  dmPolicy?: "pairing" | "allowlist" | "open" | "disabled";
  /** Allowlist for DM senders (ZUIDs or emails). */
  allowFrom?: Array<string>;
  /** Outbound text chunk size (chars). Default: 1000. */
  textChunkLimit?: number;
  /** Retry policy for outbound API calls. */
  retry?: OutboundRetryConfig;
};

export type ZohoCliqConfig = {
  /** Optional per-account Configuration. */
  accounts?: Record<string, ZohoCliqAccountConfig>;
} & ZohoCliqAccountConfig;
