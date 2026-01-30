/**
 * OpenAI agent runner.
 *
 * Handles conversation management and tool execution loop.
 * Similar to Moltbot's pi-embedded-runner pattern.
 */

import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { getOpenAIKey } from '../infra/credentials.js';
import { loadConfig } from '../config/index.js';
import { GMAIL_TOOLS } from './gmail-tools.js';
import { executeGmailTool } from './gmail-tools.execute.js';
import type { ConversationState, RunOptions, RunResult } from './types.js';

/**
 * Conversation state storage.
 */
let conversationState: ConversationState = {
  messages: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Create OpenAI client.
 */
function createClient(): OpenAI {
  const apiKey = getOpenAIKey();

  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Run: moltbot-mini setup');
  }

  return new OpenAI({ apiKey });
}

/**
 * Get system prompt from config.
 */
function getSystemPrompt(): string {
  const config = loadConfig();
  return config.openai.systemPrompt;
}

/**
 * Reset conversation state.
 */
export function resetConversation(): void {
  conversationState = {
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Get current conversation length.
 */
export function getConversationLength(): number {
  return conversationState.messages.length;
}

/**
 * Get conversation state (for debugging/export).
 */
export function getConversationState(): ConversationState {
  return { ...conversationState };
}

/**
 * Run the agent with a user message.
 */
export async function run(userMessage: string, options: RunOptions = {}): Promise<RunResult> {
  if (options.reset) {
    resetConversation();
  }

  const client = createClient();
  const config = loadConfig();

  // Add user message to history
  conversationState.messages.push({
    role: 'user',
    content: userMessage,
  });
  conversationState.updatedAt = new Date();

  // Trim history if too long
  const maxHistory = config.agent.maxHistoryLength * 2;
  if (conversationState.messages.length > maxHistory) {
    conversationState.messages = conversationState.messages.slice(-maxHistory);
  }

  // Build messages with system prompt
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: getSystemPrompt() },
    ...conversationState.messages,
  ];

  // Call OpenAI
  let response = await client.chat.completions.create({
    model: config.openai.model,
    max_tokens: options.maxTokens || config.openai.maxTokens,
    temperature: options.temperature ?? config.openai.temperature,
    messages,
    tools: GMAIL_TOOLS,
    tool_choice: 'auto',
  });

  let assistantMessage = response.choices[0]?.message;
  let toolCallCount = 0;

  // Tool execution loop
  while (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
    // Add assistant message with tool calls
    conversationState.messages.push({
      role: 'assistant',
      content: assistantMessage.content,
      tool_calls: assistantMessage.tool_calls,
    });

    // Execute tools
    const toolResults: ChatCompletionMessageParam[] = [];

    for (const toolCall of assistantMessage.tool_calls) {
      const args = JSON.parse(toolCall.function.arguments || '{}');
      toolCallCount++;

      // Log tool call for visibility
      console.log(`  [Tool: ${toolCall.function.name}]`);

      const result = await executeGmailTool(toolCall.function.name, args);

      toolResults.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result.output,
      });
    }

    // Add tool results
    conversationState.messages.push(...toolResults);

    // Get next response
    const nextMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: getSystemPrompt() },
      ...conversationState.messages,
    ];

    response = await client.chat.completions.create({
      model: config.openai.model,
      max_tokens: options.maxTokens || config.openai.maxTokens,
      temperature: options.temperature ?? config.openai.temperature,
      messages: nextMessages,
      tools: GMAIL_TOOLS,
      tool_choice: 'auto',
    });

    assistantMessage = response.choices[0]?.message;
  }

  // Get final response
  const finalResponse = assistantMessage?.content || 'I was unable to generate a response.';

  // Add to history
  conversationState.messages.push({
    role: 'assistant',
    content: finalResponse,
  });
  conversationState.updatedAt = new Date();

  return {
    response: finalResponse,
    toolCalls: toolCallCount,
    tokensUsed: response.usage?.total_tokens,
  };
}

/**
 * Single-turn query (resets conversation).
 */
export async function query(userMessage: string, options: RunOptions = {}): Promise<RunResult> {
  return run(userMessage, { ...options, reset: true });
}
