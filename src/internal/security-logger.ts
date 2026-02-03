/**
 * Security Event Logger for Agent Firewall
 *
 * Logs security-relevant events to an append-only JSONL file.
 * Used by firewall components to track blocked operations.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const DEFAULT_LOG_DIR = path.join(os.homedir(), ".clawdbot", "security-logs");

export interface SecurityEvent {
  type: string;
  source: string;
  timestamp: string;
  blocked: boolean;
  details?: Record<string, unknown>;
}

let logDir = DEFAULT_LOG_DIR;

export function setSecurityLogDir(dir: string): void {
  logDir = dir;
}

function ensureLogDir(): void {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

function getLogPath(): string {
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return path.join(logDir, `security_events_${date}.jsonl`);
}

/**
 * Log a security event to the append-only security log.
 * Each entry is a single JSON line for easy parsing.
 */
export function logSecurityEvent(event: Omit<SecurityEvent, "timestamp">): void {
  try {
    ensureLogDir();
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };
    const entry = JSON.stringify(fullEvent) + "\n";
    fs.appendFileSync(getLogPath(), entry, { flag: "a" });
  } catch (err) {
    // Security logging should not crash the application
    console.error("[FIREWALL] Failed to write security event:", err);
  }
}

/**
 * Log types for common firewall events
 */
export const SecurityEventTypes = {
  // Phase 1: Soul-evil neutralization
  SOUL_SWAP_BLOCKED: "SOUL_SWAP_BLOCKED",
  CONFIG_ACCESS_BLOCKED: "CONFIG_ACCESS_BLOCKED",
  UNAUTHORIZED_HOOK_CALL: "UNAUTHORIZED_HOOK_CALL",
  DIRECT_FILE_ACCESS_BLOCKED: "DIRECT_FILE_ACCESS_BLOCKED",
  INTEGRITY_CHECK_FAILED: "INTEGRITY_CHECK_FAILED",

  // Phase 2: Internal Config API
  CONFIG_API_REQUEST: "CONFIG_API_REQUEST",
  CONFIG_API_AUTH_SUCCESS: "CONFIG_API_AUTH_SUCCESS",
  CONFIG_API_AUTH_FAILURE: "CONFIG_API_AUTH_FAILURE",
  CONFIG_API_HASH_MISMATCH: "CONFIG_API_HASH_MISMATCH",
  CONFIG_API_NON_TAILSCALE: "CONFIG_API_NON_TAILSCALE",

  // Phase 2: WriteGate consent
  WRITEGATE_CONSENT_GRANTED: "WRITEGATE_CONSENT_GRANTED",
  WRITEGATE_CONSENT_DENIED: "WRITEGATE_CONSENT_DENIED",
} as const;

export type SecurityEventType = (typeof SecurityEventTypes)[keyof typeof SecurityEventTypes];
