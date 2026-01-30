#!/usr/bin/env node
/**
 * Moltbot Mini - Minimal secure email assistant with OpenAI
 *
 * Entry point that follows Moltbot's architecture patterns:
 * - Modular CLI with register.*.ts pattern
 * - Secure credential storage (0o600 permissions)
 * - Zod-validated configuration
 * - Channel plugin architecture
 * - Separated tool definitions and execution
 */

import { runMain } from './cli/run-main.js';

// Run the CLI
runMain().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
