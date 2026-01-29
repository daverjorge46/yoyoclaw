import fs from "node:fs";
import path from "node:path";
import os from "node:os";

/**
 * SECURITY: Audit Logging Module
 *
 * Provides structured, append-only audit logging for security-relevant events.
 * Logs are stored in JSONL format for easy parsing and analysis.
 *
 * Events logged:
 * - Session lifecycle (start, end, auth failures)
 * - Tool invocations (especially exec, gateway, elevated)
 * - Command execution (with dangerous command detection results)
 * - Pairing events (requests, approvals, rejections)
 * - Configuration changes
 */

export type AuditEventType =
  | "session.start"
  | "session.end"
  | "session.auth_failure"
  | "tool.invoke"
  | "tool.denied"
  | "exec.run"
  | "exec.blocked"
  | "exec.elevated"
  | "pairing.request"
  | "pairing.approved"
  | "pairing.rejected"
  | "pairing.expired"
  | "config.loaded"
  | "config.changed"
  | "secret.detected"
  | "dangerous_command.blocked";

export interface AuditLogEntry {
  timestamp: string;
  event: AuditEventType;
  sessionKey?: string;
  agentId?: string;
  channel?: string;
  userId?: string;
  details: Record<string, unknown>;
}

interface AuditLogConfig {
  enabled: boolean;
  logDir: string;
  maxFileSizeMb: number;
  retentionDays: number;
}

const DEFAULT_CONFIG: AuditLogConfig = {
  enabled: true,
  logDir: path.join(os.homedir(), ".clawdbot", "audit"),
  maxFileSizeMb: 10,
  retentionDays: 90,
};

let currentConfig: AuditLogConfig = { ...DEFAULT_CONFIG };

/**
 * Configure the audit logger.
 */
export function configureAuditLog(config: Partial<AuditLogConfig>): void {
  currentConfig = { ...currentConfig, ...config };
  if (currentConfig.enabled) {
    ensureLogDir();
  }
}

/**
 * Ensure the audit log directory exists with proper permissions.
 */
function ensureLogDir(): void {
  const logDir = currentConfig.logDir;
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true, mode: 0o700 });
  }
  // Ensure directory has restrictive permissions
  try {
    fs.chmodSync(logDir, 0o700);
  } catch {
    // Best effort
  }
}

/**
 * Get the current log file path (rotated daily).
 */
function getCurrentLogPath(): string {
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return path.join(currentConfig.logDir, `audit-${date}.jsonl`);
}

/**
 * Write an audit log entry.
 */
function writeLogEntry(entry: AuditLogEntry): void {
  if (!currentConfig.enabled) return;

  try {
    ensureLogDir();
    const logPath = getCurrentLogPath();
    const line = JSON.stringify(entry) + "\n";

    // Append-only write with restrictive permissions
    fs.appendFileSync(logPath, line, { mode: 0o600 });
  } catch (err) {
    // Audit logging should never crash the application
    // Log to stderr as fallback
    console.error("[audit-log] Failed to write entry:", err);
  }
}

/**
 * Log a session start event.
 */
export function logSessionStart(params: {
  sessionKey: string;
  agentId?: string;
  channel?: string;
  userId?: string;
  model?: string;
}): void {
  writeLogEntry({
    timestamp: new Date().toISOString(),
    event: "session.start",
    sessionKey: params.sessionKey,
    agentId: params.agentId,
    channel: params.channel,
    userId: params.userId,
    details: {
      model: params.model,
    },
  });
}

/**
 * Log a session end event.
 */
export function logSessionEnd(params: {
  sessionKey: string;
  agentId?: string;
  reason?: string;
  durationMs?: number;
}): void {
  writeLogEntry({
    timestamp: new Date().toISOString(),
    event: "session.end",
    sessionKey: params.sessionKey,
    agentId: params.agentId,
    details: {
      reason: params.reason,
      durationMs: params.durationMs,
    },
  });
}

/**
 * Log an authentication failure.
 */
export function logAuthFailure(params: {
  sessionKey?: string;
  channel?: string;
  userId?: string;
  reason: string;
  ip?: string;
}): void {
  writeLogEntry({
    timestamp: new Date().toISOString(),
    event: "session.auth_failure",
    sessionKey: params.sessionKey,
    channel: params.channel,
    userId: params.userId,
    details: {
      reason: params.reason,
      ip: params.ip,
    },
  });
}

/**
 * Log a tool invocation.
 */
export function logToolInvoke(params: {
  sessionKey?: string;
  agentId?: string;
  toolName: string;
  toolCallId?: string;
  args?: Record<string, unknown>;
  sensitive?: boolean;
}): void {
  // For sensitive tools, redact arguments
  const safeArgs = params.sensitive ? { redacted: true } : params.args;

  writeLogEntry({
    timestamp: new Date().toISOString(),
    event: "tool.invoke",
    sessionKey: params.sessionKey,
    agentId: params.agentId,
    details: {
      toolName: params.toolName,
      toolCallId: params.toolCallId,
      args: safeArgs,
    },
  });
}

/**
 * Log a denied tool invocation.
 */
export function logToolDenied(params: {
  sessionKey?: string;
  agentId?: string;
  toolName: string;
  reason: string;
}): void {
  writeLogEntry({
    timestamp: new Date().toISOString(),
    event: "tool.denied",
    sessionKey: params.sessionKey,
    agentId: params.agentId,
    details: {
      toolName: params.toolName,
      reason: params.reason,
    },
  });
}

/**
 * Log a command execution.
 */
export function logExecRun(params: {
  sessionKey?: string;
  agentId?: string;
  command: string;
  host: "sandbox" | "gateway" | "node";
  elevated?: boolean;
  workdir?: string;
}): void {
  // Truncate very long commands
  const truncatedCommand =
    params.command.length > 500 ? params.command.slice(0, 500) + "..." : params.command;

  writeLogEntry({
    timestamp: new Date().toISOString(),
    event: params.elevated ? "exec.elevated" : "exec.run",
    sessionKey: params.sessionKey,
    agentId: params.agentId,
    details: {
      command: truncatedCommand,
      host: params.host,
      elevated: params.elevated,
      workdir: params.workdir,
    },
  });
}

/**
 * Log a blocked dangerous command.
 */
export function logDangerousCommandBlocked(params: {
  sessionKey?: string;
  agentId?: string;
  command: string;
  reason: string;
  severity: string;
}): void {
  writeLogEntry({
    timestamp: new Date().toISOString(),
    event: "dangerous_command.blocked",
    sessionKey: params.sessionKey,
    agentId: params.agentId,
    details: {
      command: params.command.slice(0, 500),
      reason: params.reason,
      severity: params.severity,
    },
  });
}

/**
 * Log a pairing event.
 */
export function logPairingEvent(params: {
  event: "pairing.request" | "pairing.approved" | "pairing.rejected" | "pairing.expired";
  channel?: string;
  userId?: string;
  pairingCode?: string;
  nodeId?: string;
  reason?: string;
}): void {
  writeLogEntry({
    timestamp: new Date().toISOString(),
    event: params.event,
    channel: params.channel,
    userId: params.userId,
    details: {
      pairingCode: params.pairingCode ? "***" : undefined, // Redact actual code
      nodeId: params.nodeId,
      reason: params.reason,
    },
  });
}

/**
 * Log configuration changes.
 */
export function logConfigChange(params: {
  action: "loaded" | "changed";
  configPath?: string;
  changedKeys?: string[];
}): void {
  writeLogEntry({
    timestamp: new Date().toISOString(),
    event: params.action === "loaded" ? "config.loaded" : "config.changed",
    details: {
      configPath: params.configPath,
      changedKeys: params.changedKeys,
    },
  });
}

/**
 * Log when secrets are detected in files (from secret-guard).
 */
export function logSecretDetected(params: {
  source: string;
  path: string;
  action: "blocked" | "warned";
}): void {
  writeLogEntry({
    timestamp: new Date().toISOString(),
    event: "secret.detected",
    details: {
      source: params.source,
      path: params.path,
      action: params.action,
    },
  });
}

/**
 * Clean up old audit log files based on retention policy.
 */
export async function cleanupOldLogs(): Promise<number> {
  if (!currentConfig.enabled) return 0;

  const logDir = currentConfig.logDir;
  if (!fs.existsSync(logDir)) return 0;

  const now = Date.now();
  const maxAgeMs = currentConfig.retentionDays * 24 * 60 * 60 * 1000;
  let removed = 0;

  try {
    const files = fs.readdirSync(logDir);
    for (const file of files) {
      if (!file.startsWith("audit-") || !file.endsWith(".jsonl")) continue;

      const filePath = path.join(logDir, file);
      const stats = fs.statSync(filePath);
      const age = now - stats.mtimeMs;

      if (age > maxAgeMs) {
        fs.unlinkSync(filePath);
        removed += 1;
      }
    }
  } catch {
    // Best effort cleanup
  }

  return removed;
}
