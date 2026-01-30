/**
 * Status command registration.
 */

import type { Command } from 'commander';
import { loadConfig } from '../../config/index.js';
import { hasOpenAIKey, hasGmailOAuth, hasGmailTokens } from '../../infra/credentials.js';
import { runSecurityAudit, formatAuditResults } from '../../infra/security-audit.js';
import { isAuthenticated } from '../../gmail/auth.js';
import { getEmailAddress, getUnreadCount } from '../../gmail/accounts.js';

/**
 * Register status commands.
 */
export function registerStatusCommands(program: Command): void {
  program
    .command('status')
    .description('Show configuration and connection status')
    .option('--verbose', 'Show detailed information')
    .action(showStatus);

  program
    .command('security')
    .description('Run security audit on credentials and config')
    .action(runSecurityAuditCommand);
}

/**
 * Show status.
 */
async function showStatus(options: { verbose?: boolean }): Promise<void> {
  console.log('\n📊 Moltbot Mini Status\n');

  // Security quick check
  const audit = runSecurityAudit();
  if (!audit.secure) {
    console.log('⚠️  Security issues detected. Run: moltbot-mini security\n');
  }

  // OpenAI Status
  console.log('OpenAI:');
  if (hasOpenAIKey()) {
    console.log('  ✅ API key configured');
  } else {
    console.log('  ❌ API key not configured');
  }

  // Gmail Status
  console.log('\nGmail:');
  if (hasGmailOAuth()) {
    console.log('  ✅ OAuth credentials configured');
  } else {
    console.log('  ❌ OAuth credentials not configured');
  }

  if (hasGmailTokens()) {
    console.log('  ✅ Authentication tokens present');
  } else {
    console.log('  ❌ Not authenticated');
  }

  if (isAuthenticated()) {
    try {
      const email = await getEmailAddress();
      const unread = await getUnreadCount();
      console.log(`  📧 Account: ${email}`);
      console.log(`  📬 Unread: ${unread} emails`);
    } catch {
      console.log('  ⚠️  Could not fetch account info');
    }
  }

  // Config
  if (options.verbose) {
    const config = loadConfig();
    console.log('\nConfiguration:');
    console.log(`  Model: ${config.openai.model}`);
    console.log(`  Max tokens: ${config.openai.maxTokens}`);
    console.log(`  Temperature: ${config.openai.temperature}`);
    console.log(`  Max history: ${config.agent.maxHistoryLength} messages`);
    console.log(`  Agent name: ${config.agent.name}`);
  }

  console.log('');
}

/**
 * Run security audit command.
 */
async function runSecurityAuditCommand(): Promise<void> {
  console.log('\n🔒 Security Audit\n');

  const result = runSecurityAudit();
  console.log(formatAuditResults(result));

  if (result.secure) {
    console.log('\n✅ No critical security issues found.\n');
  } else {
    console.log('\n⚠️  Please address the security issues above.\n');
    process.exit(1);
  }
}
