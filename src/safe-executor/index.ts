/**
 * Safe Executor Integration for OpenClaw
 */

export {
  validateCommand,
  validateFilePath,
  getTrustLevel,
  createRateLimiter,
  createSafeExecutionContext,
  isBlockedPath,
  isDangerousEnvVar,
  sanitizeEnv,
  isPrivateIP,
  isBlockedHostname,
} from "./validator.js";

export {
  loadSafeExecutorConfig,
  DEFAULT_SAFE_EXECUTOR_CONFIG,
} from "./config.js";

export type {
  CommandValidation,
  PathValidation,
  TrustLevel,
  MessageSource,
  RateLimiterConfig,
  SafeExecutionContext,
} from "./validator.js";

export type { SafeExecutorConfig } from "./config.js";

