/**
 * Agent type definitions.
 */

import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

/**
 * Tool execution result.
 */
export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
}

/**
 * Conversation message.
 */
export type ConversationMessage = ChatCompletionMessageParam;

/**
 * Conversation state.
 */
export interface ConversationState {
  messages: ConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Agent run options.
 */
export interface RunOptions {
  /** Reset conversation before running */
  reset?: boolean;
  /** Maximum tokens for response */
  maxTokens?: number;
  /** Temperature for response */
  temperature?: number;
}

/**
 * Agent run result.
 */
export interface RunResult {
  response: string;
  toolCalls: number;
  tokensUsed?: number;
}
