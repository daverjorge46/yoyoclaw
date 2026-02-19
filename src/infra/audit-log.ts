/**
 * Append-only JSON-lines audit log for Yoyo Claw.
 *
 * Records security-relevant events to a local file.
 * Events: gateway.start, gateway.stop, auth.success, auth.failed,
 *         command.exec, config.write, agent.message, skill.invoke
 *
 * Each line is a self-contained JSON object with ISO-8601 timestamp.
 */

import fs from "node:fs";
import path from "node:path";
import { resolveStateDir } from "../config/paths.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuditEventType =
  | "gateway.start"
  | "gateway.stop"
  | "auth.success"
  | "auth.failed"
  | "auth.rate_limited"
  | "command.exec"
  | "command.blocked"
  | "config.write"
  | "config.read"
  | "agent.message"
  | "skill.invoke"
  | "skill.blocked"
  | "session.create"
  | "session.delete";

export interface AuditEntry {
  ts: string;
  event: AuditEventType;
  /** Source IP or identifier */
  source?: string;
  /** Additional context */
  detail?: Record<string, unknown>;
}

export interface AuditLogger {
  log(event: AuditEventType, source?: string, detail?: Record<string, unknown>): void;
  dispose(): void;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

const AUDIT_FILENAME = "audit.log";
const MAX_AUDIT_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

function resolveAuditPath(): string {
  return path.join(resolveStateDir(), AUDIT_FILENAME);
}

/**
 * Rotate audit log if it exceeds the size limit.
 * Keeps one rotated copy (.1) alongside the active log.
 */
function rotateIfNeeded(filePath: string): void {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > MAX_AUDIT_SIZE_BYTES) {
      const rotated = `${filePath}.1`;
      // Remove old rotation if exists
      try {
        fs.unlinkSync(rotated);
      } catch {
        // ignore
      }
      fs.renameSync(filePath, rotated);
    }
  } catch {
    // File doesn't exist yet — that's fine
  }
}

/**
 * Create a file-backed audit logger.
 *
 * Writes are buffered and flushed periodically to reduce I/O.
 */
export function createAuditLogger(): AuditLogger {
  const auditPath = resolveAuditPath();
  const dir = path.dirname(auditPath);

  // Ensure directory exists
  fs.mkdirSync(dir, { recursive: true });

  // Rotate if needed
  rotateIfNeeded(auditPath);

  // Open file in append mode
  let fd: number | null = null;
  try {
    fd = fs.openSync(auditPath, "a", 0o600);
  } catch {
    // If we can't open the audit log, degrade gracefully
    console.warn(`[audit-log] Could not open ${auditPath} — audit logging disabled`);
  }

  // Buffer for batched writes
  let buffer: string[] = [];
  const FLUSH_INTERVAL_MS = 5_000;

  function flush(): void {
    if (fd === null || buffer.length === 0) {
      return;
    }
    const data = buffer.join("");
    buffer = [];
    try {
      fs.writeSync(fd, data);
    } catch {
      // Silently drop if write fails
    }
  }

  const flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
  if (flushTimer.unref) {
    flushTimer.unref();
  }

  function log(event: AuditEventType, source?: string, detail?: Record<string, unknown>): void {
    const entry: AuditEntry = {
      ts: new Date().toISOString(),
      event,
      ...(source ? { source } : {}),
      ...(detail && Object.keys(detail).length > 0 ? { detail } : {}),
    };
    buffer.push(JSON.stringify(entry) + "\n");

    // Auto-flush if buffer gets large
    if (buffer.length >= 50) {
      flush();
    }
  }

  function dispose(): void {
    clearInterval(flushTimer);
    flush();
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch {
        // ignore
      }
      fd = null;
    }
  }

  return { log, dispose };
}

// ---------------------------------------------------------------------------
// Singleton (lazy)
// ---------------------------------------------------------------------------

let _globalLogger: AuditLogger | null = null;

export function getAuditLogger(): AuditLogger {
  if (!_globalLogger) {
    _globalLogger = createAuditLogger();
  }
  return _globalLogger;
}

export function disposeAuditLogger(): void {
  _globalLogger?.dispose();
  _globalLogger = null;
}
