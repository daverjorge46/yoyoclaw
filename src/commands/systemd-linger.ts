/**
 * Systemd lingering is not applicable on FreeBSD.
 * FreeBSD rc.d services run independently of user sessions via daemon(8).
 * These stubs exist for import compatibility.
 */
import type { RuntimeEnv } from "../runtime.js";

export type LingerPrompter = {
  confirm?: (params: { message: string; initialValue?: boolean }) => Promise<boolean>;
  note: (message: string, title?: string) => Promise<void> | void;
};

export async function ensureSystemdUserLingerInteractive(_params: {
  runtime: RuntimeEnv;
  prompter?: LingerPrompter;
  env?: NodeJS.ProcessEnv;
  title?: string;
  reason?: string;
  prompt?: boolean;
  requireConfirm?: boolean;
}): Promise<void> {
  // No-op on FreeBSD — rc.d services persist across sessions natively.
}

export async function ensureSystemdUserLingerNonInteractive(_params: {
  runtime: RuntimeEnv;
  env?: NodeJS.ProcessEnv;
}): Promise<void> {
  // No-op on FreeBSD.
}
