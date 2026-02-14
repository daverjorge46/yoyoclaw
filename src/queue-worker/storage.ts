import fs from "node:fs/promises";
import path from "node:path";
import { resolveStateDir } from "../config/paths.js";

export type QueueState = {
  offset: number;
  lastId: number;
};

export type QueuePaths = {
  queueDir: string;
  dataPath: string;
  statePath: string;
  tempPath: string;
};

export function resolveQueuePaths(options: { queueName: string; stateDir?: string }): QueuePaths {
  const stateDir = options.stateDir ?? resolveStateDir();
  const queueDir = path.join(stateDir, "queue-worker", options.queueName);
  return {
    queueDir,
    dataPath: path.join(queueDir, "queue.jsonl"),
    statePath: path.join(queueDir, "state.json"),
    tempPath: path.join(queueDir, "queue.jsonl.tmp"),
  };
}

export async function ensureQueueDir(queueDir: string) {
  await fs.mkdir(queueDir, { recursive: true, mode: 0o700 });
}

export async function loadQueueState(statePath: string): Promise<QueueState> {
  try {
    const raw = await fs.readFile(statePath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<QueueState>;
    const offset = Number.isFinite(parsed.offset) ? Number(parsed.offset) : 0;
    const lastId = Number.isFinite(parsed.lastId) ? Number(parsed.lastId) : 0;
    return {
      offset: Math.max(0, Math.floor(offset)),
      lastId: Math.max(0, Math.floor(lastId)),
    };
  } catch {
    return { offset: 0, lastId: 0 };
  }
}

export async function saveQueueState(statePath: string, state: QueueState) {
  const dir = path.dirname(statePath);
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  const payload = `${JSON.stringify(state, null, 2)}\n`;
  await writeFileAtomic(statePath, payload, 0o600);
}

async function writeFileAtomic(pathname: string, contents: string, mode: number) {
  const dir = path.dirname(pathname);
  const tempPath = path.join(dir, `${path.basename(pathname)}.tmp-${Date.now()}`);
  await fs.writeFile(tempPath, contents, { mode });
  await fs.rename(tempPath, pathname);
}
