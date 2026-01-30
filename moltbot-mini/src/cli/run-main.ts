/**
 * CLI entry point.
 *
 * Follows Moltbot pattern: run-main.ts handles initialization and execution.
 */

import { initializeStateDir } from '../config/index.js';
import { buildProgram } from './program.js';

/**
 * Run the CLI.
 */
export async function runMain(): Promise<void> {
  // Initialize state directory
  initializeStateDir();

  // Build and execute program
  const program = buildProgram();

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    }
    process.exit(1);
  }
}

/**
 * Run if executed directly.
 */
if (process.argv[1]?.endsWith('run-main.js') || process.argv[1]?.endsWith('run-main.ts')) {
  runMain();
}
