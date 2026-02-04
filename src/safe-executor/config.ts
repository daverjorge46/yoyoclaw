/**
 * Safe Executor Configuration
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export type SafeExecutorConfig = {
  enabled: boolean;
  selfIds: string[];
  workdir: string;
  trustLevelOverrides?: Record<string, string>;
  rateLimiting?: {
    maxRequestsPerMinute?: number;
    maxConcurrent?: number;
    cooldownMs?: number;
  };
  allowedCommands?: string[];
  additionalBlockedPatterns?: string[];
};

export const DEFAULT_SAFE_EXECUTOR_CONFIG: SafeExecutorConfig = {
  enabled: false,
  selfIds: [],
  workdir: process.cwd(),
  rateLimiting: {
    maxRequestsPerMinute: 10,
    maxConcurrent: 2,
    cooldownMs: 30000,
  },
};

const CONFIG_PATH = path.join(os.homedir(), '.openclaw', 'safe-executor.json');

export function loadSafeExecutorConfig(): SafeExecutorConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SAFE_EXECUTOR_CONFIG, ...parsed };
    }
  } catch {
    // Ignore errors, use defaults
  }
  return DEFAULT_SAFE_EXECUTOR_CONFIG;
}
