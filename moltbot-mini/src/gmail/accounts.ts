/**
 * Gmail account management.
 */

import { google, gmail_v1 } from 'googleapis';
import { createOAuth2Client, isAuthenticated } from './auth.js';
import type { GmailAccount, GmailLabel } from './types.js';

/**
 * Get authenticated Gmail API client.
 * Throws if not authenticated.
 */
export function getGmailClient(): gmail_v1.Gmail {
  if (!isAuthenticated()) {
    throw new Error('Gmail not authenticated. Run: moltbot-mini setup');
  }

  const auth = createOAuth2Client();
  if (!auth) {
    throw new Error('Gmail OAuth credentials not configured');
  }

  return google.gmail({ version: 'v1', auth });
}

/**
 * Get Gmail account profile.
 */
export async function getAccount(): Promise<GmailAccount> {
  const gmail = getGmailClient();

  const response = await gmail.users.getProfile({
    userId: 'me',
  });

  return {
    emailAddress: response.data.emailAddress || '',
    messagesTotal: response.data.messagesTotal || 0,
    threadsTotal: response.data.threadsTotal || 0,
    historyId: response.data.historyId || '',
  };
}

/**
 * Get email address for the authenticated account.
 */
export async function getEmailAddress(): Promise<string> {
  const account = await getAccount();
  return account.emailAddress;
}

/**
 * Get unread count for inbox.
 */
export async function getUnreadCount(): Promise<number> {
  const gmail = getGmailClient();

  const response = await gmail.users.labels.get({
    userId: 'me',
    id: 'INBOX',
  });

  return response.data.messagesUnread || 0;
}

/**
 * List all labels.
 */
export async function listLabels(): Promise<GmailLabel[]> {
  const gmail = getGmailClient();

  const response = await gmail.users.labels.list({
    userId: 'me',
  });

  return (response.data.labels || []).map((label) => ({
    id: label.id || '',
    name: label.name || '',
    type: label.type === 'system' ? 'system' : 'user',
    messagesTotal: label.messagesTotal || 0,
    messagesUnread: label.messagesUnread || 0,
  }));
}

/**
 * Get a specific label by ID.
 */
export async function getLabel(labelId: string): Promise<GmailLabel | null> {
  const gmail = getGmailClient();

  try {
    const response = await gmail.users.labels.get({
      userId: 'me',
      id: labelId,
    });

    return {
      id: response.data.id || '',
      name: response.data.name || '',
      type: response.data.type === 'system' ? 'system' : 'user',
      messagesTotal: response.data.messagesTotal || 0,
      messagesUnread: response.data.messagesUnread || 0,
    };
  } catch {
    return null;
  }
}
