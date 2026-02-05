/**
 * SQLite client for OpenClaw metrics storage.
 * Used as fallback when PostgreSQL is not available.
 * Uses Node.js built-in sqlite module.
 */

import path from "node:path";
import { resolveStateDir } from "../../config/paths.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import { requireNodeSqlite } from "../../memory/sqlite.js";

const log = createSubsystemLogger("database/sqlite");

let db: InstanceType<typeof import("node:sqlite").DatabaseSync> | null = null;

/**
 * Get the SQLite database path.
 */
export function getSqlitePath(): string {
  const stateDir = resolveStateDir(process.env);
  return path.join(stateDir, "openclaw.db");
}

/**
 * Get or create the SQLite database connection.
 */
export function getSqliteDatabase() {
  if (db) {
    return db;
  }

  const sqlite = requireNodeSqlite();
  const dbPath = getSqlitePath();
  db = new sqlite.DatabaseSync(dbPath);

  // Enable WAL mode for better concurrent access
  db.exec("PRAGMA journal_mode=WAL");
  db.exec("PRAGMA synchronous=NORMAL");

  return db;
}

/**
 * Close the SQLite database connection.
 */
export function closeSqliteDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Check if SQLite is available and working.
 */
export function isSqliteAvailable(): boolean {
  try {
    const database = getSqliteDatabase();
    const result = database.prepare("SELECT 1 as test").get() as { test: number };
    return result?.test === 1;
  } catch (err) {
    log.warn(`SQLite not available: ${String(err)}`);
    return false;
  }
}

/**
 * Run SQLite migrations for llm_usage table.
 */
export function runSqliteMigrations(): void {
  const database = getSqliteDatabase();

  // Create migrations table
  database.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Check applied migrations
  const applied = database.prepare("SELECT name FROM migrations").all() as { name: string }[];
  const appliedNames = new Set(applied.map((m) => m.name));

  // Migration: Create llm_usage table
  if (!appliedNames.has("001_create_llm_usage")) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS llm_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        time TEXT NOT NULL DEFAULT (datetime('now')),
        provider_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        agent_id TEXT,
        session_id TEXT,
        input_tokens INTEGER NOT NULL,
        output_tokens INTEGER NOT NULL,
        cache_read_tokens INTEGER DEFAULT 0,
        cache_write_tokens INTEGER DEFAULT 0,
        cost_usd REAL,
        duration_ms INTEGER
      )
    `);

    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_usage_time ON llm_usage (time DESC)
    `);
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_usage_provider ON llm_usage (provider_id, time DESC)
    `);
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_usage_model ON llm_usage (model_id, time DESC)
    `);
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_usage_agent ON llm_usage (agent_id, time DESC)
    `);

    database.prepare("INSERT INTO migrations (name) VALUES (?)").run("001_create_llm_usage");
    log.info("SQLite migration applied: 001_create_llm_usage");
  }
}

/**
 * Record usage to SQLite.
 */
export function recordSqliteUsage(entry: {
  time: Date;
  providerId: string;
  modelId: string;
  agentId?: string | null;
  sessionId?: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  costUsd?: number | null;
  durationMs?: number | null;
}): boolean {
  try {
    const database = getSqliteDatabase();
    const stmt = database.prepare(`
      INSERT INTO llm_usage (
        time, provider_id, model_id, agent_id, session_id,
        input_tokens, output_tokens, cache_read_tokens, cache_write_tokens,
        cost_usd, duration_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      entry.time.toISOString(),
      entry.providerId,
      entry.modelId,
      entry.agentId ?? null,
      entry.sessionId ?? null,
      entry.inputTokens,
      entry.outputTokens,
      entry.cacheReadTokens ?? 0,
      entry.cacheWriteTokens ?? 0,
      entry.costUsd ?? null,
      entry.durationMs ?? null,
    );

    return true;
  } catch (err) {
    log.warn(`Failed to record SQLite usage: ${String(err)}`);
    return false;
  }
}

/**
 * Query usage from SQLite.
 */
export function querySqliteUsage(params: {
  startTime?: Date;
  providerId?: string;
  modelId?: string;
  agentId?: string;
}): Array<{
  providerId: string;
  modelId: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalCost: number;
  lastUsed: string | null;
}> {
  try {
    const database = getSqliteDatabase();

    let query = `
      SELECT
        provider_id,
        model_id,
        COUNT(*) as requests,
        SUM(input_tokens) as input_tokens,
        SUM(output_tokens) as output_tokens,
        COALESCE(SUM(cache_read_tokens), 0) as cache_read_tokens,
        COALESCE(SUM(cache_write_tokens), 0) as cache_write_tokens,
        COALESCE(SUM(cost_usd), 0) as total_cost,
        MAX(time) as last_used
      FROM llm_usage
      WHERE 1=1
    `;

    const values: (string | number | null)[] = [];

    if (params.startTime) {
      query += " AND time >= ?";
      values.push(params.startTime.toISOString());
    }
    if (params.providerId) {
      query += " AND provider_id = ?";
      values.push(params.providerId);
    }
    if (params.modelId) {
      query += " AND model_id = ?";
      values.push(params.modelId);
    }
    if (params.agentId) {
      query += " AND agent_id = ?";
      values.push(params.agentId);
    }

    query += " GROUP BY provider_id, model_id ORDER BY total_cost DESC, requests DESC";

    const stmt = database.prepare(query);
    const rows = stmt.all(...values) as Array<{
      provider_id: string;
      model_id: string;
      requests: number;
      input_tokens: number;
      output_tokens: number;
      cache_read_tokens: number;
      cache_write_tokens: number;
      total_cost: number;
      last_used: string | null;
    }>;

    return rows.map((row) => ({
      providerId: row.provider_id,
      modelId: row.model_id,
      requests: row.requests,
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
      cacheReadTokens: row.cache_read_tokens,
      cacheWriteTokens: row.cache_write_tokens,
      totalCost: row.total_cost,
      lastUsed: row.last_used,
    }));
  } catch (err) {
    log.warn(`Failed to query SQLite usage: ${String(err)}`);
    return [];
  }
}
