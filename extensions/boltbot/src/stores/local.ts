import Database from "better-sqlite3";
import type { ActionReceipt, ReceiptStore } from "../receipt-store.js";

export class LocalReceiptStore implements ReceiptStore {
  private db: Database.Database;

  constructor(dbPath = "boltbot-receipts.db") {
    this.db = new Database(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS receipts (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        session_key TEXT,
        tier TEXT NOT NULL,
        tool_name TEXT NOT NULL,
        arguments_hash TEXT NOT NULL,
        result_hash TEXT NOT NULL,
        success INTEGER NOT NULL,
        duration_ms INTEGER,
        anomalies TEXT,
        da_commitment TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
  }

  async put(receipt: ActionReceipt): Promise<void> {
    this.db.prepare(`
      INSERT OR REPLACE INTO receipts
      (id, timestamp, session_key, tier, tool_name, arguments_hash, result_hash, success, duration_ms, anomalies, da_commitment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      receipt.id, receipt.timestamp, receipt.sessionKey, receipt.tier,
      receipt.toolName, receipt.argumentsHash, receipt.resultHash,
      receipt.success ? 1 : 0, receipt.durationMs,
      JSON.stringify(receipt.anomalies), receipt.daCommitment ?? null,
    );
  }

  async get(id: string): Promise<ActionReceipt | null> {
    const row = this.db.prepare("SELECT * FROM receipts WHERE id = ?").get(id) as any;
    return row ? rowToReceipt(row) : null;
  }

  async list(opts: { limit: number; offset: number }): Promise<ActionReceipt[]> {
    const rows = this.db.prepare(
      "SELECT * FROM receipts ORDER BY timestamp DESC LIMIT ? OFFSET ?",
    ).all(opts.limit, opts.offset) as any[];
    return rows.map(rowToReceipt);
  }

  async stats() {
    const total = (this.db.prepare("SELECT COUNT(*) as c FROM receipts").get() as any).c;
    const byTier = Object.fromEntries(
      (this.db.prepare("SELECT tier, COUNT(*) as c FROM receipts GROUP BY tier").all() as any[])
        .map((r: any) => [r.tier, r.c]),
    );
    const anomalyCount = (this.db.prepare(
      "SELECT COUNT(*) as c FROM receipts WHERE anomalies != '[]'",
    ).get() as any).c;
    return { total, byTier, anomalyCount };
  }
}

function rowToReceipt(row: any): ActionReceipt {
  return {
    id: row.id,
    timestamp: row.timestamp,
    sessionKey: row.session_key,
    tier: row.tier,
    toolName: row.tool_name,
    argumentsHash: row.arguments_hash,
    resultHash: row.result_hash,
    success: row.success === 1,
    durationMs: row.duration_ms,
    anomalies: JSON.parse(row.anomalies ?? "[]"),
    daCommitment: row.da_commitment ?? undefined,
  };
}
