/**
 * Reconnection loop with exponential backoff.
 *
 * Calls `connectFn` in a while loop. On normal resolve (connection closed),
 * the backoff resets. On thrown error (connection failed), the backoff doubles.
 * The loop exits when `abortSignal` fires.
 */
export async function runWithReconnect(
  connectFn: () => Promise<void>,
  opts: {
    abortSignal?: AbortSignal;
    onError?: (err: unknown) => void;
    onReconnect?: (delayMs: number) => void;
    initialDelayMs?: number;
    maxDelayMs?: number;
  } = {},
): Promise<void> {
  const { initialDelayMs = 2000, maxDelayMs = 60_000 } = opts;
  let retryDelay = initialDelayMs;

  while (!opts.abortSignal?.aborted) {
    try {
      await connectFn();
      retryDelay = initialDelayMs;
    } catch (err) {
      opts.onError?.(err);
      retryDelay = Math.min(retryDelay * 2, maxDelayMs);
    }
    if (opts.abortSignal?.aborted) {
      return;
    }
    opts.onReconnect?.(retryDelay);
    await new Promise((r) => setTimeout(r, retryDelay));
  }
}
