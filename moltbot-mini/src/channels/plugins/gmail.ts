/**
 * Gmail channel plugin.
 *
 * Implements the ChannelPlugin interface for Gmail.
 */

import type { ChannelPlugin, ChannelMeta, ChannelCapabilities, ChannelConfigAdapter } from './types.js';
import { loadConfig } from '../../config/index.js';
import { hasGmailOAuth, hasGmailTokens } from '../../infra/credentials.js';

/**
 * Gmail channel metadata.
 */
const GMAIL_META: ChannelMeta = {
  id: 'gmail',
  name: 'Gmail',
  description: 'Google Gmail email service',
  icon: '📧',
};

/**
 * Gmail capabilities.
 */
const GMAIL_CAPABILITIES: ChannelCapabilities = {
  canSend: true,
  canReceive: true,
  canSearch: true,
  canThread: true,
  supportsAttachments: true,
  supportsHtml: true,
};

/**
 * Gmail config adapter.
 */
const gmailConfigAdapter: ChannelConfigAdapter = {
  isEnabled(): boolean {
    const config = loadConfig();
    return config.gmail.enabled;
  },

  isConfigured(): boolean {
    return hasGmailOAuth();
  },

  isAuthenticated(): boolean {
    return hasGmailOAuth() && hasGmailTokens();
  },
};

/**
 * Gmail channel plugin.
 */
export const gmailPlugin: ChannelPlugin = {
  id: 'gmail',
  meta: GMAIL_META,
  capabilities: GMAIL_CAPABILITIES,
  config: gmailConfigAdapter,
};

/**
 * Get the Gmail plugin.
 */
export function getGmailPlugin(): ChannelPlugin {
  return gmailPlugin;
}
