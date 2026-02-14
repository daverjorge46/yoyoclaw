import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { DatabaseSync } from "node:sqlite";
import { createDefaultDeps } from "../../../src/cli/deps.js";
import { agentCommand } from "../../../src/commands/agent.js";
import { defaultRuntime } from "../../../src/runtime.js";

const DEFAULT_QUEUE_DIR = "/home/node/.openclaw/workspace/queues/anti-timeout-orchestrator";
const DB_PATH = path.join(DEFAULT_QUEUE_DIR, "queue.sqlite3");
/**
 * Polling interval when no task is found.
 * Kept low (200ms) to meet the <0.5s latency target.
 * When fs.watch fires, the loop wakes immediately.
 */
const POLL_INTERVAL_MS = 200;
/** Max time a task can stay "running" before being reclaimed (30 min). */
const STALE_TASK_THRESHOLD_S = 1800;
const WORKER_ID = `daemon-node-${process.pid}`;

if (!fs.existsSync(DEFAULT_QUEUE_DIR)) {
  fs.mkdirSync(DEFAULT_QUEUE_DIR, { recursive: true });
}

interface Task {
  id: string;
  created_at: string;
  label: string;
  session: string;
  priority: number;
  timeout_s: number;
  command: string;
  reply_to: string | null;
  chat_id: string | null;
  notes: string;
  status: string;
  attempt: number;
  started_at: string | null;
  finished_at: string | null;
  worker_pid: string | null;
  error: string | null;
}

function getDb(): DatabaseSync {
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA busy_timeout = 10000");
  return db;
}

/** Reset tasks stuck in "running" (e.g. from a crashed worker). */
function recoverStaleTasks(db: DatabaseSync) {
  const cutoff = new Date(Date.now() - STALE_TASK_THRESHOLD_S * 1000).toISOString();
  const info = db
    .prepare(
      `UPDATE tasks
       SET status = 'pending', worker_pid = NULL, started_at = NULL
       WHERE status = 'running' AND started_at < ?`,
    )
    .run(cutoff);
  if (info.changes > 0) {
    console.log(`[${new Date().toISOString()}] Recovered ${info.changes} stale task(s).`);
  }
}

function claimTask(db: DatabaseSync): Task | undefined {
  const now = new Date().toISOString();

  const row = db
    .prepare(
      `SELECT * FROM tasks
       WHERE status='pending'
       ORDER BY priority ASC, created_at ASC, id ASC
       LIMIT 1`,
    )
    .get() as Task | undefined;

  if (!row) return undefined;

  const info = db
    .prepare(
      `UPDATE tasks
       SET status='running', started_at=?, worker_pid=?, attempt=attempt+1, error=NULL
       WHERE id=? AND status='pending'`,
    )
    .run(now, WORKER_ID, row.id);

  if (info.changes !== 1) return undefined;

  return row;
}

function completeTask(
  db: DatabaseSync,
  id: string,
  status: "done" | "failed",
  error: string | null,
) {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE tasks
     SET status=?, finished_at=?, error=?
     WHERE id=?`,
  ).run(status, now, error, id);
}

async function runAgentTask(task: Task) {
  console.log(`[${new Date().toISOString()}] Processing task ${task.id}: ${task.label}`);

  try {
    const args = task.command.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    const messageIdx = args.indexOf("--message");
    const sessionIdx = args.indexOf("--session");

    let message = "";
    if (messageIdx !== -1 && messageIdx + 1 < args.length) {
      message = args[messageIdx + 1].replace(/^"|"$/g, "");
    }

    let sessionKey = "";
    if (sessionIdx !== -1 && sessionIdx + 1 < args.length) {
      sessionKey = args[sessionIdx + 1].replace(/^"|"$/g, "");
    }

    if (!message) {
      throw new Error("Could not parse --message from command");
    }

    await agentCommand(
      {
        message: message,
        sessionKey: sessionKey || undefined,
        verbose: "off",
      },
      defaultRuntime,
      createDefaultDeps(),
    );

    return { status: "done" as const, error: null };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[${new Date().toISOString()}] Task ${task.id} failed:`, err);
    return { status: "failed" as const, error: errMsg };
  }
}

/**
 * Watch the SQLite WAL file for changes — when the queue.py enqueue script
 * writes a new row, the WAL file is modified, triggering an immediate wake-up
 * instead of waiting for the next poll cycle.
 */
function setupFsWatcher(wakeUp: () => void): fs.FSWatcher | null {
  try {
    const watcher = fs.watch(DEFAULT_QUEUE_DIR, (_event, filename) => {
      // Wake on any SQLite file change (main db, WAL, or shm)
      if (
        filename &&
        (filename.endsWith(".sqlite3") || filename.endsWith("-wal") || filename.endsWith("-shm"))
      ) {
        wakeUp();
      }
    });
    console.log(`[${new Date().toISOString()}] Watching ${DEFAULT_QUEUE_DIR} for changes.`);
    return watcher;
  } catch (err) {
    console.warn(
      `[${new Date().toISOString()}] fs.watch not available, falling back to polling only:`,
      err,
    );
    return null;
  }
}

async function main() {
  const db = getDb();
  recoverStaleTasks(db);

  console.log(
    `[${new Date().toISOString()}] Daemon ${WORKER_ID} started (poll=${POLL_INTERVAL_MS}ms).`,
  );

  // Event-driven wake-up: resolve the current sleep promise immediately
  // when a filesystem change is detected.
  let wakeResolver: (() => void) | null = null;
  const wakeUp = () => {
    if (wakeResolver) {
      wakeResolver();
      wakeResolver = null;
    }
  };

  const watcher = setupFsWatcher(wakeUp);

  // Periodic stale-task recovery (every 5 min)
  const staleRecoveryInterval = setInterval(
    () => {
      try {
        recoverStaleTasks(db);
      } catch (err) {
        console.error("Stale recovery error:", err);
      }
    },
    5 * 60 * 1000,
  );

  const shutdown = () => {
    console.log(`[${new Date().toISOString()}] Daemon shutting down...`);
    clearInterval(staleRecoveryInterval);
    watcher?.close();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  while (true) {
    try {
      const task = claimTask(db);
      if (task) {
        const result = await runAgentTask(task);
        completeTask(db, task.id, result.status, result.error);
        // Immediately check for more tasks (no sleep)
        continue;
      }
      // No task found — sleep until woken by fs.watch or timeout
      await new Promise<void>((resolve) => {
        wakeResolver = resolve;
        setTimeout(() => {
          wakeResolver = null;
          resolve();
        }, POLL_INTERVAL_MS);
      });
    } catch (err) {
      console.error("Daemon loop error:", err);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

main().catch((err) => {
  console.error("Fatal daemon error:", err);
  process.exit(1);
});
