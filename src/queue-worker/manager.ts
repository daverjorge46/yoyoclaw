import fs from "node:fs/promises";
import {
  ensureQueueDir,
  loadQueueState,
  resolveQueuePaths,
  saveQueueState,
  type QueuePaths,
  type QueueState,
} from "./storage.js";

export type QueueEntry<T> = {
  id: string;
  ts: number;
  payload: T;
  offset: number;
  nextOffset: number;
};

export type QueueManagerOptions = {
  queueName: string;
  stateDir?: string;
  maxBytesBeforeCompact?: number;
};

const DEFAULT_MAX_COMPACT_BYTES = 5 * 1024 * 1024;

export class PersistentQueueManager<T> {
  private readonly paths: QueuePaths;
  private readonly maxBytesBeforeCompact: number;
  private ready = false;
  private state: QueueState = { offset: 0, lastId: 0 };

  constructor(options: QueueManagerOptions) {
    this.paths = resolveQueuePaths(options);
    this.maxBytesBeforeCompact = Math.max(
      1024,
      Math.floor(options.maxBytesBeforeCompact ?? DEFAULT_MAX_COMPACT_BYTES),
    );
  }

  private async ensureReady() {
    if (this.ready) {
      return;
    }
    await ensureQueueDir(this.paths.queueDir);
    this.state = await loadQueueState(this.paths.statePath);
    this.ready = true;
  }

  async enqueue(payload: T): Promise<QueueEntry<T>> {
    await this.ensureReady();
    const id = String(this.state.lastId + 1);
    const entry = {
      id,
      ts: Date.now(),
      payload,
    };
    const line = `${JSON.stringify(entry)}\n`;
    await fs.appendFile(this.paths.dataPath, line, { encoding: "utf-8", mode: 0o600 });
    this.state.lastId += 1;
    await saveQueueState(this.paths.statePath, this.state);
    return { ...entry, offset: -1, nextOffset: -1 };
  }

  async readBatch(limit: number): Promise<QueueEntry<T>[]> {
    await this.ensureReady();
    if (limit <= 0) {
      return [];
    }

    let data: Buffer;
    try {
      data = await fs.readFile(this.paths.dataPath);
    } catch {
      return [];
    }

    if (this.state.offset >= data.length) {
      return [];
    }

    const entries: QueueEntry<T>[] = [];
    let cursor = this.state.offset;
    while (cursor < data.length && entries.length < limit) {
      const newlineIndex = data.indexOf(10, cursor);
      if (newlineIndex === -1) {
        break;
      }
      const lineBuffer = data.subarray(cursor, newlineIndex);
      const lineOffset = cursor;
      cursor = newlineIndex + 1;
      if (lineBuffer.length === 0) {
        continue;
      }
      try {
        const parsed = JSON.parse(lineBuffer.toString("utf-8")) as {
          id: string;
          ts: number;
          payload: T;
        };
        entries.push({
          id: parsed.id,
          ts: parsed.ts,
          payload: parsed.payload,
          offset: lineOffset,
          nextOffset: cursor,
        });
      } catch {
        // Skip malformed lines; advance offset to avoid being stuck.
        this.state.offset = cursor;
        await saveQueueState(this.paths.statePath, this.state);
      }
    }

    return entries;
  }

  async commitOffset(offset: number) {
    await this.ensureReady();
    if (!Number.isFinite(offset) || offset <= this.state.offset) {
      return;
    }
    this.state.offset = Math.max(0, Math.floor(offset));
    await saveQueueState(this.paths.statePath, this.state);
    await this.compactIfNeeded();
  }

  async getQueueSize(): Promise<number> {
    await this.ensureReady();
    try {
      const data = await fs.readFile(this.paths.dataPath);
      if (this.state.offset >= data.length) {
        return 0;
      }
      const tail = data.subarray(this.state.offset).toString("utf-8");
      return tail.split("\n").filter((line) => line.trim().length > 0).length;
    } catch {
      return 0;
    }
  }

  private async compactIfNeeded() {
    if (this.state.offset <= 0) {
      return;
    }
    let stat;
    try {
      stat = await fs.stat(this.paths.dataPath);
    } catch {
      return;
    }
    const size = stat.size;
    if (this.state.offset >= size) {
      await fs.truncate(this.paths.dataPath, 0);
      this.state.offset = 0;
      await saveQueueState(this.paths.statePath, this.state);
      return;
    }
    if (this.state.offset < this.maxBytesBeforeCompact && this.state.offset < size / 2) {
      return;
    }

    const data = await fs.readFile(this.paths.dataPath);
    const remaining = data.subarray(this.state.offset);
    await fs.writeFile(this.paths.tempPath, remaining, { mode: 0o600 });
    await fs.rename(this.paths.tempPath, this.paths.dataPath);
    this.state.offset = 0;
    await saveQueueState(this.paths.statePath, this.state);
  }
}
