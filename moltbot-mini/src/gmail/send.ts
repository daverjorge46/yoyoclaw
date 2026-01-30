/**
 * Gmail message sending.
 *
 * Similar to Telegram's send.ts - handles outbound message delivery.
 */

import { getGmailClient } from './accounts.js';
import type { EmailDraft, SendResult } from './types.js';

/**
 * Build RFC 2822 formatted email.
 */
function buildRawEmail(draft: EmailDraft): string {
  const lines: string[] = [];

  // Headers
  lines.push(`To: ${draft.to.join(', ')}`);
  if (draft.cc?.length) {
    lines.push(`Cc: ${draft.cc.join(', ')}`);
  }
  lines.push(`Subject: ${draft.subject}`);

  // Reply headers
  if (draft.inReplyTo) {
    lines.push(`In-Reply-To: ${draft.inReplyTo}`);
    lines.push(`References: ${draft.inReplyTo}`);
  }

  // Content type
  lines.push('Content-Type: text/plain; charset=utf-8');
  lines.push('MIME-Version: 1.0');

  // Empty line before body
  lines.push('');

  // Body
  lines.push(draft.body);

  return lines.join('\r\n');
}

/**
 * Encode email for Gmail API.
 */
function encodeEmail(raw: string): string {
  return Buffer.from(raw).toString('base64url');
}

/**
 * Send an email.
 */
export async function sendMessage(draft: EmailDraft): Promise<SendResult> {
  const gmail = getGmailClient();

  const raw = buildRawEmail(draft);
  const encoded = encodeEmail(raw);

  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encoded,
      threadId: draft.threadId,
    },
  });

  return {
    messageId: response.data.id || '',
    threadId: response.data.threadId || '',
  };
}

/**
 * Send a reply to an existing message.
 */
export async function sendReply(
  originalMessageId: string,
  threadId: string,
  body: string,
  to: string[],
  subject?: string
): Promise<SendResult> {
  return sendMessage({
    to,
    subject: subject || 'Re: ',
    body,
    inReplyTo: originalMessageId,
    threadId,
  });
}

/**
 * Create a draft (not sent).
 */
export async function createDraft(draft: EmailDraft): Promise<string> {
  const gmail = getGmailClient();

  const raw = buildRawEmail(draft);
  const encoded = encodeEmail(raw);

  const response = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: {
      message: {
        raw: encoded,
        threadId: draft.threadId,
      },
    },
  });

  return response.data.id || '';
}

/**
 * Send a draft.
 */
export async function sendDraft(draftId: string): Promise<SendResult> {
  const gmail = getGmailClient();

  const response = await gmail.users.drafts.send({
    userId: 'me',
    requestBody: {
      id: draftId,
    },
  });

  return {
    messageId: response.data.id || '',
    threadId: response.data.threadId || '',
  };
}

/**
 * Delete a draft.
 */
export async function deleteDraft(draftId: string): Promise<void> {
  const gmail = getGmailClient();

  await gmail.users.drafts.delete({
    userId: 'me',
    id: draftId,
  });
}

/**
 * List drafts.
 */
export async function listDrafts(maxResults = 20): Promise<Array<{ id: string; messageId: string }>> {
  const gmail = getGmailClient();

  const response = await gmail.users.drafts.list({
    userId: 'me',
    maxResults,
  });

  return (response.data.drafts || []).map((draft) => ({
    id: draft.id || '',
    messageId: draft.message?.id || '',
  }));
}
