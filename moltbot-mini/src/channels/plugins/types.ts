/**
 * Channel plugin types.
 *
 * Follows Moltbot pattern: extensible channel plugin interface.
 * This minimal version only supports Gmail, but the pattern allows
 * easy addition of more channels in the future.
 */

/**
 * Channel identifier.
 */
export type ChannelId = 'gmail' | string;

/**
 * Channel metadata.
 */
export interface ChannelMeta {
  id: ChannelId;
  name: string;
  description: string;
  icon?: string;
}

/**
 * Channel capabilities.
 */
export interface ChannelCapabilities {
  canSend: boolean;
  canReceive: boolean;
  canSearch: boolean;
  canThread: boolean;
  supportsAttachments: boolean;
  supportsHtml: boolean;
}

/**
 * Channel configuration adapter.
 */
export interface ChannelConfigAdapter {
  isEnabled(): boolean;
  isConfigured(): boolean;
  isAuthenticated(): boolean;
}

/**
 * Channel plugin interface.
 *
 * Minimal interface for now - can be extended with more adapters:
 * - setup?: ChannelSetupAdapter
 * - pairing?: ChannelPairingAdapter
 * - outbound?: ChannelOutboundAdapter
 * - messaging?: ChannelMessagingAdapter
 * - etc.
 */
export interface ChannelPlugin {
  id: ChannelId;
  meta: ChannelMeta;
  capabilities: ChannelCapabilities;
  config: ChannelConfigAdapter;
}
