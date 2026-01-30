/**
 * CLI dependency injection.
 *
 * Follows Moltbot pattern: createDefaultDeps() for testability.
 */

import type { Config } from '../config/index.js';
import { loadConfig } from '../config/index.js';

/**
 * CLI dependencies interface.
 */
export interface CliDeps {
  config: Config;
  output: OutputHandler;
}

/**
 * Output handler interface.
 */
export interface OutputHandler {
  log: (message: string) => void;
  error: (message: string) => void;
  warn: (message: string) => void;
  info: (message: string) => void;
}

/**
 * Default output handler using console.
 */
const defaultOutput: OutputHandler = {
  log: (message) => console.log(message),
  error: (message) => console.error(message),
  warn: (message) => console.warn(message),
  info: (message) => console.info(message),
};

/**
 * Create default dependencies.
 */
export function createDefaultDeps(): CliDeps {
  return {
    config: loadConfig(),
    output: defaultOutput,
  };
}

/**
 * Create dependencies with custom config.
 */
export function createDepsWithConfig(config: Config): CliDeps {
  return {
    config,
    output: defaultOutput,
  };
}
