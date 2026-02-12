import { retryAsync } from "../../../infra/retry.js";
import { log } from "../logger.js";

const DEFAULT_RETRY_CONFIG = {
  attempts: 3,
  minDelayMs: 1000,
  maxDelayMs: 60000,
  jitter: 0.2,
};

function isRetryableError(err: unknown): boolean {
  const msg = String(err).toLowerCase();
  return /tpm|rate_limit|429|too many requests|quota exceeded|resource exhausted/i.test(msg);
}

function getRetryAfterMs(err: unknown): number | undefined {
  const match = String(err).match(/retry_after[:\s]*(\d+)/i);
  if (match) {
    return Number(match[1]) * 1000;
  }
  return undefined;
}

export async function runWithPromptRetry<T>(
  fn: () => Promise<T>,
  provider: string,
  modelId: string,
  retryConfig?: typeof DEFAULT_RETRY_CONFIG,
): Promise<T> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };

  return retryAsync(fn, {
    attempts: config.attempts,
    minDelayMs: config.minDelayMs,
    maxDelayMs: config.maxDelayMs,
    jitter: config.jitter,
    shouldRetry: isRetryableError,
    retryAfterMs: getRetryAfterMs,
    onRetry: (info) => {
      log.warn(
        `[prompt-retry] provider=${provider} model=${modelId} ` +
          `attempt=${info.attempt}/${info.maxAttempts} delay=${info.delayMs}ms`,
      );
    },
  });
}

export type PromptRetryConfig = typeof DEFAULT_RETRY_CONFIG;
