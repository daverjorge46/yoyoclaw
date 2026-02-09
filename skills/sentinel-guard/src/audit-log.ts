import { appendFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { v4 as uuidv4 } from "uuid";
import type {
  AuditEntry,
  TransactionRequest,
  PolicyViolation,
  ExecutionResult,
} from "./types.js";

type AuditVerdict = AuditEntry["verdict"];

/**
 * Append-only JSONL audit log.
 *
 * Every policy decision — approve, reject, block, execute — is recorded
 * with full context. This log is the forensic record for security review.
 *
 * Format: one JSON object per line (JSONL), human-readable, greppable.
 */
export class AuditLog {
  private readonly logPath: string;

  constructor(logDir: string) {
    mkdirSync(logDir, { recursive: true });

    const date = new Date().toISOString().slice(0, 10);
    this.logPath = resolve(logDir, `audit-${date}.jsonl`);
  }

  /** Record a policy decision. */
  record(
    txRequest: TransactionRequest,
    verdict: AuditVerdict,
    violations: PolicyViolation[],
    executionResult?: ExecutionResult
  ): AuditEntry {
    const entry: AuditEntry = {
      id: uuidv4(),
      txRequest,
      verdict,
      violations,
      timestamp: Date.now(),
      ...(executionResult && { executionResult }),
    };

    this.append(entry);
    return entry;
  }

  /** Record a security event (injection attempt, security violation, etc.). */
  recordSecurityEvent(
    eventType: string,
    input: string,
    details?: string[]
  ): void {
    const event = {
      id: uuidv4(),
      type: "security_event",
      eventType,
      input: input.slice(0, 500),
      details: details ?? [],
      timestamp: Date.now(),
    };
    const line = JSON.stringify(event) + "\n";
    appendFileSync(this.logPath, line, "utf-8");
  }

  /** Get the current log file path. */
  getLogPath(): string {
    return this.logPath;
  }

  /** Read all audit entries from the current log file. Skips non-audit lines (security events). */
  getEntries(): AuditEntry[] {
    if (!existsSync(this.logPath)) return [];

    const content = readFileSync(this.logPath, "utf-8").trim();
    if (!content) return [];

    return content
      .split("\n")
      .map((line: string) => {
        try { return JSON.parse(line) as AuditEntry; } catch { return null; }
      })
      .filter((entry): entry is AuditEntry => entry !== null && entry.verdict !== undefined);
  }

  private append(entry: AuditEntry): void {
    const line = JSON.stringify(entry) + "\n";
    appendFileSync(this.logPath, line, "utf-8");
  }
}
