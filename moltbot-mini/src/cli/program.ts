/**
 * CLI program builder.
 *
 * Follows Moltbot pattern: central program with modular command registration.
 */

import { Command } from 'commander';
import { registerSetupCommands } from './program/register.setup.js';
import { registerGmailCommands } from './program/register.gmail.js';
import { registerChatCommands } from './program/register.chat.js';
import { registerStatusCommands } from './program/register.status.js';

/**
 * Build the CLI program.
 */
export function buildProgram(): Command {
  const program = new Command();

  program
    .name('moltbot-mini')
    .description('Minimal secure email assistant with OpenAI')
    .version('1.0.0');

  // Register command groups
  registerSetupCommands(program);
  registerGmailCommands(program);
  registerChatCommands(program);
  registerStatusCommands(program);

  return program;
}

/**
 * Get the built program instance.
 */
export function getProgram(): Command {
  return buildProgram();
}
