/**
 * Setup command registration.
 */

import type { Command } from 'commander';
import { promptText, promptConfirm } from '../prompt.js';
import { initializeStateDir } from '../../config/index.js';
import {
  hasOpenAIKey,
  setOpenAIKey,
  hasGmailOAuth,
  setGmailOAuth,
  hasGmailTokens,
} from '../../infra/credentials.js';
import { getAuthUrl, exchangeCodeForTokens } from '../../gmail/auth.js';

/**
 * Register setup commands.
 */
export function registerSetupCommands(program: Command): void {
  program
    .command('setup')
    .description('Interactive setup wizard for OpenAI and Gmail')
    .action(runSetup);

  // Config subcommands
  const configCmd = program
    .command('config')
    .description('Configuration management');

  configCmd
    .command('set-openai-key <key>')
    .description('Set OpenAI API key')
    .action(setOpenAIApiKey);

  configCmd
    .command('set-gmail-oauth')
    .description('Set Gmail OAuth credentials interactively')
    .action(setGmailOAuthInteractive);
}

/**
 * Run interactive setup wizard.
 */
async function runSetup(): Promise<void> {
  console.log('\n🔧 Moltbot Mini Setup\n');
  console.log('This wizard will help you configure OpenAI and Gmail.\n');

  initializeStateDir();

  // Step 1: OpenAI
  await setupOpenAI();

  // Step 2: Gmail OAuth
  await setupGmailOAuth();

  // Step 3: Gmail Authentication
  if (hasGmailOAuth() && !hasGmailTokens()) {
    await setupGmailAuth();
  }

  console.log('\n✅ Setup complete!\n');
  console.log('Run `moltbot-mini status` to verify configuration.');
  console.log('Run `moltbot-mini chat` to start chatting with your email assistant.\n');
}

/**
 * Setup OpenAI API key.
 */
async function setupOpenAI(): Promise<void> {
  console.log('Step 1: OpenAI Configuration');
  console.log('----------------------------');

  if (hasOpenAIKey()) {
    const change = await promptConfirm('OpenAI API key is already configured. Change it?', false);
    if (!change) {
      console.log('Keeping existing OpenAI key.\n');
      return;
    }
  }

  console.log('\nGet your API key from: https://platform.openai.com/api-keys\n');

  const key = await promptText('Enter your OpenAI API key: ');

  if (!key) {
    console.log('Skipped.\n');
    return;
  }

  if (!key.startsWith('sk-')) {
    console.log('⚠️  Warning: Key does not start with "sk-". Saving anyway.\n');
  }

  setOpenAIKey(key);
  console.log('✅ OpenAI API key saved.\n');
}

/**
 * Setup Gmail OAuth credentials.
 */
async function setupGmailOAuth(): Promise<void> {
  console.log('Step 2: Gmail OAuth Credentials');
  console.log('-------------------------------');

  if (hasGmailOAuth()) {
    const change = await promptConfirm('Gmail OAuth is already configured. Change it?', false);
    if (!change) {
      console.log('Keeping existing Gmail OAuth credentials.\n');
      return;
    }
  }

  console.log('\nTo set up Gmail access, you need OAuth credentials from Google Cloud Console:');
  console.log('1. Go to https://console.cloud.google.com/apis/credentials');
  console.log('2. Create a project (or select existing)');
  console.log('3. Enable the Gmail API');
  console.log('4. Create OAuth 2.0 Client ID (choose "Desktop app")');
  console.log('5. Note the Client ID and Client Secret\n');

  const clientId = await promptText('Enter Client ID: ');
  if (!clientId) {
    console.log('Skipped.\n');
    return;
  }

  const clientSecret = await promptText('Enter Client Secret: ');
  if (!clientSecret) {
    console.log('Skipped.\n');
    return;
  }

  setGmailOAuth({
    clientId,
    clientSecret,
    redirectUri: 'http://localhost',
  });

  console.log('✅ Gmail OAuth credentials saved.\n');
}

/**
 * Setup Gmail authentication (exchange code for tokens).
 */
async function setupGmailAuth(): Promise<void> {
  console.log('Step 3: Gmail Authentication');
  console.log('----------------------------');

  const authUrl = getAuthUrl();
  if (!authUrl) {
    console.log('❌ Gmail OAuth not configured. Cannot authenticate.\n');
    return;
  }

  console.log('\nOpen this URL in your browser to authorize access:\n');
  console.log(authUrl);
  console.log('\nAfter authorizing, you will be redirected to a URL like:');
  console.log('http://localhost/?code=XXXXXX&scope=...');
  console.log('\nCopy the "code" parameter value from that URL.\n');

  const code = await promptText('Enter the authorization code: ');

  if (!code) {
    console.log('Skipped.\n');
    return;
  }

  const success = await exchangeCodeForTokens(code);

  if (success) {
    console.log('✅ Gmail authenticated successfully!\n');
  } else {
    console.log('❌ Failed to authenticate. Please try again.\n');
  }
}

/**
 * Set OpenAI API key directly.
 */
async function setOpenAIApiKey(key: string): Promise<void> {
  if (!key.startsWith('sk-')) {
    console.log('⚠️  Warning: Key does not start with "sk-". Saving anyway.');
  }

  setOpenAIKey(key);
  console.log('✅ OpenAI API key saved.');
}

/**
 * Set Gmail OAuth credentials interactively.
 */
async function setGmailOAuthInteractive(): Promise<void> {
  await setupGmailOAuth();
}
