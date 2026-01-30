/**
 * Chat command registration.
 */

import { createInterface } from 'node:readline';
import type { Command } from 'commander';
import { hasOpenAIKey } from '../../infra/credentials.js';
import { isAuthenticated } from '../../gmail/auth.js';
import { run, resetConversation, getConversationLength } from '../../agents/openai-runner.js';

/**
 * Register chat commands.
 */
export function registerChatCommands(program: Command): void {
  program
    .command('chat')
    .description('Start interactive chat with the email assistant')
    .action(interactiveChat);

  program
    .command('ask <message>')
    .description('Ask the assistant a single question')
    .option('--no-reset', 'Keep conversation history')
    .action(askQuestion);

  // Alias for quick questions
  program
    .command('message <text>')
    .description('Send a message to the assistant (alias for ask)')
    .option('--no-reset', 'Keep conversation history')
    .action(askQuestion);
}

/**
 * Check prerequisites for chat.
 */
function checkPrerequisites(): boolean {
  if (!hasOpenAIKey()) {
    console.log('❌ OpenAI API key not configured.');
    console.log('Run: moltbot-mini setup');
    return false;
  }

  if (!isAuthenticated()) {
    console.log('❌ Gmail not authenticated.');
    console.log('Run: moltbot-mini gmail auth');
    return false;
  }

  return true;
}

/**
 * Interactive chat mode.
 */
async function interactiveChat(): Promise<void> {
  if (!checkPrerequisites()) {
    return;
  }

  console.log('\n🤖 Email Assistant\n');
  console.log('Commands:');
  console.log('  /reset  - Reset conversation');
  console.log('  /status - Show conversation status');
  console.log('  /help   - Show commands');
  console.log('  /quit   - Exit chat\n');

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const promptUser = (): void => {
    rl.question('You: ', async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        promptUser();
        return;
      }

      // Handle slash commands
      if (trimmed.startsWith('/')) {
        const cmd = trimmed.toLowerCase();

        if (cmd === '/quit' || cmd === '/exit' || cmd === '/q') {
          console.log('\nGoodbye!\n');
          rl.close();
          return;
        }

        if (cmd === '/reset') {
          resetConversation();
          console.log('\n✅ Conversation reset.\n');
          promptUser();
          return;
        }

        if (cmd === '/status') {
          const len = getConversationLength();
          console.log(`\nConversation: ${len} messages\n`);
          promptUser();
          return;
        }

        if (cmd === '/help') {
          console.log('\nCommands:');
          console.log('  /reset  - Reset conversation');
          console.log('  /status - Show conversation status');
          console.log('  /help   - Show commands');
          console.log('  /quit   - Exit chat\n');
          promptUser();
          return;
        }

        console.log('\nUnknown command. Type /help for available commands.\n');
        promptUser();
        return;
      }

      // Process message
      try {
        const result = await run(trimmed);
        console.log(`\nAssistant: ${result.response}\n`);

        if (result.toolCalls > 0) {
          console.log(`  (Used ${result.toolCalls} tool${result.toolCalls > 1 ? 's' : ''})\n`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.log(`\n❌ Error: ${message}\n`);
      }

      promptUser();
    });
  };

  promptUser();
}

/**
 * Ask a single question.
 */
async function askQuestion(
  message: string,
  options: { reset?: boolean }
): Promise<void> {
  if (!checkPrerequisites()) {
    process.exit(1);
  }

  try {
    const shouldReset = options.reset !== false;
    const result = await run(message, { reset: shouldReset });
    console.log(result.response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}
