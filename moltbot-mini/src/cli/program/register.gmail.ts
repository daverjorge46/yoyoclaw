/**
 * Gmail command registration.
 */

import type { Command } from 'commander';
import { promptText } from '../prompt.js';
import { hasGmailOAuth } from '../../infra/credentials.js';
import {
  isAuthenticated,
  getAuthUrl,
  exchangeCodeForTokens,
  revokeAccess,
} from '../../gmail/auth.js';
import { getEmailAddress, getUnreadCount, listLabels } from '../../gmail/accounts.js';
import { listMessages, getMessage } from '../../gmail/monitor.js';

/**
 * Register Gmail commands.
 */
export function registerGmailCommands(program: Command): void {
  const gmailCmd = program
    .command('gmail')
    .description('Gmail management commands');

  gmailCmd
    .command('auth')
    .description('Authenticate with Gmail')
    .action(authenticateGmail);

  gmailCmd
    .command('logout')
    .description('Revoke Gmail access and clear tokens')
    .action(logoutGmail);

  gmailCmd
    .command('list')
    .description('List recent emails')
    .option('-n, --count <number>', 'Number of emails to show', '10')
    .option('-q, --query <query>', 'Gmail search query')
    .action(listEmails);

  gmailCmd
    .command('read <messageId>')
    .description('Read a specific email')
    .action(readEmail);

  gmailCmd
    .command('labels')
    .description('List Gmail labels')
    .action(showLabels);

  gmailCmd
    .command('status')
    .description('Show Gmail account status')
    .action(showGmailStatus);
}

/**
 * Authenticate with Gmail.
 */
async function authenticateGmail(): Promise<void> {
  if (!hasGmailOAuth()) {
    console.log('❌ Gmail OAuth credentials not configured.');
    console.log('Run: moltbot-mini setup');
    return;
  }

  if (isAuthenticated()) {
    console.log('✅ Already authenticated with Gmail.');
    const email = await getEmailAddress();
    console.log(`   Account: ${email}`);
    return;
  }

  const authUrl = getAuthUrl();
  if (!authUrl) {
    console.log('❌ Failed to generate auth URL.');
    return;
  }

  console.log('\nOpen this URL in your browser:\n');
  console.log(authUrl);
  console.log('\nAfter authorizing, copy the "code" parameter from the redirect URL.\n');

  const code = await promptText('Enter authorization code: ');

  if (!code) {
    console.log('Cancelled.');
    return;
  }

  const success = await exchangeCodeForTokens(code);

  if (success) {
    console.log('✅ Gmail authenticated successfully!');
    const email = await getEmailAddress();
    console.log(`   Account: ${email}`);
  } else {
    console.log('❌ Authentication failed.');
  }
}

/**
 * Logout from Gmail.
 */
async function logoutGmail(): Promise<void> {
  await revokeAccess();
  console.log('✅ Gmail access revoked.');
}

/**
 * List recent emails.
 */
async function listEmails(options: { count: string; query?: string }): Promise<void> {
  if (!isAuthenticated()) {
    console.log('❌ Gmail not authenticated. Run: moltbot-mini gmail auth');
    return;
  }

  try {
    const count = parseInt(options.count, 10) || 10;
    const result = await listMessages({
      maxResults: count,
      query: options.query,
    });

    if (result.messages.length === 0) {
      console.log('\nNo emails found.');
      return;
    }

    console.log(`\n📧 Emails (${result.messages.length}):\n`);

    result.messages.forEach((email, i) => {
      const date = email.date.toLocaleDateString();
      const unread = email.isUnread ? '📬' : '📭';
      console.log(`${unread} ${i + 1}. ${email.subject}`);
      console.log(`   From: ${email.from}`);
      console.log(`   Date: ${date}`);
      console.log(`   ID: ${email.id}`);
      console.log('');
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Error: ${message}`);
  }
}

/**
 * Read a specific email.
 */
async function readEmail(messageId: string): Promise<void> {
  if (!isAuthenticated()) {
    console.log('❌ Gmail not authenticated. Run: moltbot-mini gmail auth');
    return;
  }

  try {
    const email = await getMessage(messageId);

    console.log('\n' + '='.repeat(60));
    console.log(`From: ${email.from}`);
    console.log(`To: ${email.to.join(', ')}`);
    if (email.cc?.length) {
      console.log(`Cc: ${email.cc.join(', ')}`);
    }
    console.log(`Subject: ${email.subject}`);
    console.log(`Date: ${email.date.toLocaleString()}`);
    console.log(`Status: ${email.isUnread ? 'Unread' : 'Read'}`);
    console.log('='.repeat(60));
    console.log('\n' + email.body + '\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Error: ${message}`);
  }
}

/**
 * Show Gmail labels.
 */
async function showLabels(): Promise<void> {
  if (!isAuthenticated()) {
    console.log('❌ Gmail not authenticated. Run: moltbot-mini gmail auth');
    return;
  }

  try {
    const labels = await listLabels();

    console.log('\n📁 Labels:\n');

    const systemLabels = labels.filter((l) => l.type === 'system');
    const userLabels = labels.filter((l) => l.type === 'user');

    console.log('System Labels:');
    systemLabels.forEach((label) => {
      const unread = label.messagesUnread > 0 ? ` (${label.messagesUnread} unread)` : '';
      console.log(`  ${label.name}${unread}`);
    });

    if (userLabels.length > 0) {
      console.log('\nUser Labels:');
      userLabels.forEach((label) => {
        const unread = label.messagesUnread > 0 ? ` (${label.messagesUnread} unread)` : '';
        console.log(`  ${label.name}${unread}`);
      });
    }

    console.log('');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Error: ${message}`);
  }
}

/**
 * Show Gmail account status.
 */
async function showGmailStatus(): Promise<void> {
  if (!isAuthenticated()) {
    console.log('❌ Gmail not authenticated. Run: moltbot-mini gmail auth');
    return;
  }

  try {
    const email = await getEmailAddress();
    const unread = await getUnreadCount();

    console.log('\n📧 Gmail Status\n');
    console.log(`  Account: ${email}`);
    console.log(`  Unread:  ${unread} emails`);
    console.log('');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Error: ${message}`);
  }
}
