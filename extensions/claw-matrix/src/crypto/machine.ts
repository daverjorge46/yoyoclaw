// @matrix-org/matrix-sdk-crypto-nodejs types
// userId/deviceId MUST be wrapped types, NOT plain strings
import { OlmMachine, UserId, DeviceId } from "@matrix-org/matrix-sdk-crypto-nodejs";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// SINGLETON: multi-account requires refactoring this to per-account state
let _machine: OlmMachine | null = null;

/**
 * Crypto store path — uses claw-matrix/ NOT matrix/ to avoid collision with old plugin.
 */
export function getCryptoStorePath(
  homeserver: string,
  userId: string,
  accessToken: string,
): string {
  const serverKey = homeserver.replace(/^https?:\/\//, "").replace(/[/:]/g, "_");
  const userKey = userId.replace(/[/:]/g, "_");
  const tokenHash = crypto.createHash("sha256").update(accessToken).digest("hex");
  return path.join(
    os.homedir(),
    ".openclaw/claw-matrix/accounts/default",
    `${serverKey}__${userKey}`,
    tokenHash,
    "crypto",
  );
}

/**
 * Initialize OlmMachine with SQLite store.
 * Retries 3 times with 500ms delay for stale locks.
 */
export async function initCryptoMachine(
  userId: string,
  deviceId: string,
  storePath: string,
): Promise<OlmMachine> {
  // Ensure store directory exists
  fs.mkdirSync(storePath, { recursive: true, mode: 0o700 });

  // Remove stale lock files
  const lockPath = path.join(storePath, "matrix-sdk-crypto.sqlite3-lock");
  if (fs.existsSync(lockPath)) {
    try {
      fs.unlinkSync(lockPath);
    } catch {
      // Ignore — may be held by another process
    }
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const machine = await OlmMachine.initialize(
        new UserId(userId),
        new DeviceId(deviceId),
        storePath,
      );
      _machine = machine;
      return machine;
    } catch (err) {
      lastError = err;
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }

  throw lastError;
}

/**
 * Get the current OlmMachine instance.
 */
export function getMachine(): OlmMachine {
  if (!_machine) throw new Error("OlmMachine not initialized");
  return _machine;
}

/**
 * Wrap a promise with a timeout. Rejects with a descriptive error if the
 * operation doesn't complete within the given time. Used for FFI calls
 * (OlmMachine) that may hang if the Rust runtime stalls.
 */
export function withCryptoTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Crypto operation timed out: ${label} (${timeoutMs}ms)`)),
      timeoutMs,
    );
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export const CRYPTO_TIMEOUT_MS = 30_000;

let _closing: Promise<void> | null = null;

/**
 * Close the OlmMachine gracefully to prevent Tokio FFI panic.
 * Call this before process exit or on abortSignal.
 *
 * Guarded: concurrent calls return the same promise (prevents double-close race).
 */
export async function closeMachine(): Promise<void> {
  if (_closing) return _closing;
  if (!_machine) return;

  _closing = (async () => {
    try {
      _machine?.close();
    } catch {
      // Suppress close errors — may already be closed
    }
    _machine = null;
    _closing = null;
  })();

  return _closing;
}
