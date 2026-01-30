/**
 * Gmail tools for the AI agent.
 *
 * Follows Moltbot pattern: tool definitions separate from execution.
 */

import type { ChatCompletionTool } from 'openai/resources/chat/completions';

/**
 * Gmail tool definitions for OpenAI function calling.
 */
export const GMAIL_TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'gmail_list_messages',
      description: 'List recent emails from inbox or search with a Gmail query. Returns email summaries with IDs.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Gmail search query (e.g., "from:john@example.com", "is:unread", "subject:meeting", "newer_than:1d")',
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of emails to return (default: 10, max: 50)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'gmail_read_message',
      description: 'Read the full content of a specific email by its message ID.',
      parameters: {
        type: 'object',
        properties: {
          messageId: {
            type: 'string',
            description: 'The Gmail message ID to read',
          },
        },
        required: ['messageId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'gmail_send_message',
      description: 'Send a new email or reply to an existing email thread.',
      parameters: {
        type: 'object',
        properties: {
          to: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of recipient email addresses',
          },
          subject: {
            type: 'string',
            description: 'Email subject line',
          },
          body: {
            type: 'string',
            description: 'Email body text (plain text)',
          },
          cc: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of CC recipient email addresses',
          },
          replyToMessageId: {
            type: 'string',
            description: 'Message ID to reply to (for threading)',
          },
          threadId: {
            type: 'string',
            description: 'Thread ID to add reply to',
          },
        },
        required: ['to', 'subject', 'body'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'gmail_archive_message',
      description: 'Archive an email (remove from inbox but keep in All Mail).',
      parameters: {
        type: 'object',
        properties: {
          messageId: {
            type: 'string',
            description: 'The Gmail message ID to archive',
          },
        },
        required: ['messageId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'gmail_trash_message',
      description: 'Move an email to trash.',
      parameters: {
        type: 'object',
        properties: {
          messageId: {
            type: 'string',
            description: 'The Gmail message ID to trash',
          },
        },
        required: ['messageId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'gmail_mark_read',
      description: 'Mark an email as read.',
      parameters: {
        type: 'object',
        properties: {
          messageId: {
            type: 'string',
            description: 'The Gmail message ID to mark as read',
          },
        },
        required: ['messageId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'gmail_mark_unread',
      description: 'Mark an email as unread.',
      parameters: {
        type: 'object',
        properties: {
          messageId: {
            type: 'string',
            description: 'The Gmail message ID to mark as unread',
          },
        },
        required: ['messageId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'gmail_get_unread_count',
      description: 'Get the number of unread emails in the inbox.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'gmail_get_thread',
      description: 'Get all messages in an email thread/conversation.',
      parameters: {
        type: 'object',
        properties: {
          threadId: {
            type: 'string',
            description: 'The Gmail thread ID to retrieve',
          },
        },
        required: ['threadId'],
      },
    },
  },
];

/**
 * Get tool by name.
 */
export function getToolByName(name: string): ChatCompletionTool | undefined {
  return GMAIL_TOOLS.find((tool) => tool.function.name === name);
}

/**
 * Get all tool names.
 */
export function getToolNames(): string[] {
  return GMAIL_TOOLS.map((tool) => tool.function.name);
}
