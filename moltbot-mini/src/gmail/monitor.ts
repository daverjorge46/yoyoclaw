/**
 * Gmail message monitoring and reading.
 *
 * Similar to Telegram's bot.ts - handles inbound message processing.
 */

import type { gmail_v1 } from 'googleapis';
import { getGmailClient } from './accounts.js';
import type { EmailMessage, EmailSearchResult } from './types.js';

/**
 * Parse email headers.
 */
function getHeader(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string {
  const header = headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase());
  return header?.value || '';
}

/**
 * Decode base64url encoded content.
 */
function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Extract email body from message parts.
 */
function extractBody(payload: gmail_v1.Schema$MessagePart): { text: string; html?: string } {
  let text = '';
  let html: string | undefined;

  function processPart(part: gmail_v1.Schema$MessagePart): void {
    if (part.body?.data) {
      const content = decodeBase64Url(part.body.data);
      if (part.mimeType === 'text/plain') {
        text = content;
      } else if (part.mimeType === 'text/html') {
        html = content;
      }
    }
    if (part.parts) {
      part.parts.forEach(processPart);
    }
  }

  processPart(payload);

  // Fallback: extract text from HTML if no plain text
  if (!text && html) {
    text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  return { text, html };
}

/**
 * Parse Gmail API message to our EmailMessage type.
 */
export function parseMessage(msg: gmail_v1.Schema$Message): EmailMessage {
  const headers = msg.payload?.headers || [];
  const body = extractBody(msg.payload || {});

  return {
    id: msg.id || '',
    threadId: msg.threadId || '',
    from: getHeader(headers, 'From'),
    to: getHeader(headers, 'To').split(',').map((s) => s.trim()).filter(Boolean),
    cc: getHeader(headers, 'Cc').split(',').map((s) => s.trim()).filter(Boolean) || undefined,
    subject: getHeader(headers, 'Subject'),
    body: body.text,
    bodyHtml: body.html,
    date: new Date(parseInt(msg.internalDate || '0', 10)),
    labels: msg.labelIds || [],
    isUnread: (msg.labelIds || []).includes('UNREAD'),
    snippet: msg.snippet || '',
  };
}

/**
 * List emails with optional filters.
 */
export async function listMessages(options: {
  maxResults?: number;
  labelIds?: string[];
  query?: string;
  pageToken?: string;
}): Promise<EmailSearchResult> {
  const gmail = getGmailClient();

  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults: options.maxResults || 20,
    labelIds: options.labelIds,
    q: options.query,
    pageToken: options.pageToken,
  });

  const messages: EmailMessage[] = [];

  if (response.data.messages) {
    for (const msg of response.data.messages) {
      if (msg.id) {
        const fullMsg = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full',
        });
        messages.push(parseMessage(fullMsg.data));
      }
    }
  }

  return {
    messages,
    nextPageToken: response.data.nextPageToken || undefined,
    totalEstimate: response.data.resultSizeEstimate || 0,
  };
}

/**
 * Get a single email by ID.
 */
export async function getMessage(messageId: string): Promise<EmailMessage> {
  const gmail = getGmailClient();

  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  return parseMessage(response.data);
}

/**
 * Search emails with query.
 */
export async function searchMessages(query: string, maxResults = 20): Promise<EmailSearchResult> {
  return listMessages({ query, maxResults });
}

/**
 * Get messages in a thread.
 */
export async function getThread(threadId: string): Promise<EmailMessage[]> {
  const gmail = getGmailClient();

  const response = await gmail.users.threads.get({
    userId: 'me',
    id: threadId,
    format: 'full',
  });

  return (response.data.messages || []).map(parseMessage);
}

/**
 * Mark message as read.
 */
export async function markAsRead(messageId: string): Promise<void> {
  const gmail = getGmailClient();

  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      removeLabelIds: ['UNREAD'],
    },
  });
}

/**
 * Mark message as unread.
 */
export async function markAsUnread(messageId: string): Promise<void> {
  const gmail = getGmailClient();

  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      addLabelIds: ['UNREAD'],
    },
  });
}

/**
 * Archive message (remove from inbox).
 */
export async function archiveMessage(messageId: string): Promise<void> {
  const gmail = getGmailClient();

  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      removeLabelIds: ['INBOX'],
    },
  });
}

/**
 * Move message to trash.
 */
export async function trashMessage(messageId: string): Promise<void> {
  const gmail = getGmailClient();

  await gmail.users.messages.trash({
    userId: 'me',
    id: messageId,
  });
}

/**
 * Add labels to message.
 */
export async function addLabels(messageId: string, labelIds: string[]): Promise<void> {
  const gmail = getGmailClient();

  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      addLabelIds: labelIds,
    },
  });
}

/**
 * Remove labels from message.
 */
export async function removeLabels(messageId: string, labelIds: string[]): Promise<void> {
  const gmail = getGmailClient();

  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      removeLabelIds: labelIds,
    },
  });
}
