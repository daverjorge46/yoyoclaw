/**
 * Gmail tool execution.
 *
 * Follows Moltbot pattern: execution logic separate from definitions.
 */

import * as gmail from '../gmail/index.js';
import type { ToolResult } from './types.js';

/**
 * Execute a Gmail tool call.
 */
export async function executeGmailTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  try {
    const output = await executeToolInternal(toolName, args);
    return { success: true, output };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      output: `Error: ${message}`,
      error: message,
    };
  }
}

/**
 * Internal tool execution dispatcher.
 */
async function executeToolInternal(
  toolName: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case 'gmail_list_messages': {
      const query = args.query as string | undefined;
      const maxResults = Math.min((args.maxResults as number) || 10, 50);

      const result = await gmail.listMessages({ query, maxResults });

      if (result.messages.length === 0) {
        return 'No emails found matching your criteria.';
      }

      const summaries = result.messages.map((email, i) => {
        const date = email.date.toLocaleDateString();
        const time = email.date.toLocaleTimeString();
        const unread = email.isUnread ? '[UNREAD] ' : '';
        return `${i + 1}. ${unread}From: ${email.from}
   Subject: ${email.subject}
   Date: ${date} ${time}
   ID: ${email.id}
   Thread: ${email.threadId}
   Preview: ${email.snippet.slice(0, 100)}...`;
      });

      return `Found ${result.messages.length} emails:\n\n${summaries.join('\n\n')}`;
    }

    case 'gmail_read_message': {
      const messageId = args.messageId as string;
      const email = await gmail.getMessage(messageId);

      return `From: ${email.from}
To: ${email.to.join(', ')}
${email.cc?.length ? `Cc: ${email.cc.join(', ')}\n` : ''}Subject: ${email.subject}
Date: ${email.date.toLocaleString()}
Status: ${email.isUnread ? 'Unread' : 'Read'}
Message ID: ${email.id}
Thread ID: ${email.threadId}

--- Body ---
${email.body}`;
    }

    case 'gmail_send_message': {
      const draft: gmail.EmailDraft = {
        to: args.to as string[],
        subject: args.subject as string,
        body: args.body as string,
        cc: args.cc as string[] | undefined,
        inReplyTo: args.replyToMessageId as string | undefined,
        threadId: args.threadId as string | undefined,
      };

      const result = await gmail.sendMessage(draft);
      return `Email sent successfully.\nMessage ID: ${result.messageId}\nThread ID: ${result.threadId}`;
    }

    case 'gmail_archive_message': {
      const messageId = args.messageId as string;
      await gmail.archiveMessage(messageId);
      return `Email ${messageId} has been archived (removed from inbox).`;
    }

    case 'gmail_trash_message': {
      const messageId = args.messageId as string;
      await gmail.trashMessage(messageId);
      return `Email ${messageId} has been moved to trash.`;
    }

    case 'gmail_mark_read': {
      const messageId = args.messageId as string;
      await gmail.markAsRead(messageId);
      return `Email ${messageId} marked as read.`;
    }

    case 'gmail_mark_unread': {
      const messageId = args.messageId as string;
      await gmail.markAsUnread(messageId);
      return `Email ${messageId} marked as unread.`;
    }

    case 'gmail_get_unread_count': {
      const count = await gmail.getUnreadCount();
      return `You have ${count} unread email${count !== 1 ? 's' : ''} in your inbox.`;
    }

    case 'gmail_get_thread': {
      const threadId = args.threadId as string;
      const messages = await gmail.getThread(threadId);

      if (messages.length === 0) {
        return 'Thread not found or contains no messages.';
      }

      const formatted = messages.map((email, i) => {
        return `--- Message ${i + 1} of ${messages.length} ---
From: ${email.from}
Date: ${email.date.toLocaleString()}
${email.isUnread ? '[UNREAD]\n' : ''}
${email.body}`;
      });

      return `Thread contains ${messages.length} message${messages.length !== 1 ? 's' : ''}:\n\n${formatted.join('\n\n')}`;
    }

    default:
      return `Unknown tool: ${toolName}`;
  }
}
