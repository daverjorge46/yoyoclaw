import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CronService } from "./service.js";
import { loadCronStore } from "./store.js";

const noopLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

async function makeStorePath() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-cron-state-"));
  return {
    dir,
    storePath: path.join(dir, "cron", "jobs.json"),
    cleanup: async () => {
      await fs.rm(dir, { recursive: true, force: true });
    },
  };
}

describe("cron jobs with missing state field (#10437)", () => {
  beforeEach(() => {
    noopLogger.debug.mockClear();
    noopLogger.info.mockClear();
    noopLogger.warn.mockClear();
    noopLogger.error.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("list does not crash when a stored job has no state field", async () => {
    const store = await makeStorePath();
    const jobWithoutState = {
      id: "job-no-state",
      name: "Missing state",
      enabled: true,
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
      schedule: { kind: "every", everyMs: 60_000 },
      sessionTarget: "isolated",
      wakeMode: "next-heartbeat",
      payload: { kind: "agentTurn", message: "test" },
      // state field intentionally omitted
    };
    await fs.mkdir(path.dirname(store.storePath), { recursive: true });
    await fs.writeFile(
      store.storePath,
      JSON.stringify({ version: 1, jobs: [jobWithoutState] }, null, 2),
    );

    const cron = new CronService({
      storePath: store.storePath,
      cronEnabled: true,
      log: noopLogger,
      enqueueSystemEvent: vi.fn(),
      requestHeartbeatNow: vi.fn(),
      runIsolatedAgentJob: vi.fn(async () => ({ status: "ok" as const })),
    });

    await cron.start();

    const jobs = await cron.list();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].state).toBeDefined();
    expect(typeof jobs[0].state.nextRunAtMs).toBe("number");

    cron.stop();
    await store.cleanup();
  });

  it("add succeeds when existing jobs have no state field", async () => {
    const store = await makeStorePath();
    const jobWithoutState = {
      id: "job-no-state-2",
      name: "Missing state 2",
      enabled: true,
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
      schedule: { kind: "every", everyMs: 120_000 },
      sessionTarget: "isolated",
      wakeMode: "next-heartbeat",
      payload: { kind: "agentTurn", message: "existing" },
    };
    await fs.mkdir(path.dirname(store.storePath), { recursive: true });
    await fs.writeFile(
      store.storePath,
      JSON.stringify({ version: 1, jobs: [jobWithoutState] }, null, 2),
    );

    const cron = new CronService({
      storePath: store.storePath,
      cronEnabled: true,
      log: noopLogger,
      enqueueSystemEvent: vi.fn(),
      requestHeartbeatNow: vi.fn(),
      runIsolatedAgentJob: vi.fn(async () => ({ status: "ok" as const })),
    });

    await cron.start();

    const newJob = await cron.add({
      name: "new job",
      enabled: true,
      schedule: { kind: "every", everyMs: 60_000 },
      sessionTarget: "isolated",
      wakeMode: "next-heartbeat",
      payload: { kind: "agentTurn", message: "new" },
    });

    expect(newJob.state).toBeDefined();
    expect(typeof newJob.state.nextRunAtMs).toBe("number");

    const jobs = await cron.list();
    expect(jobs).toHaveLength(2);
    for (const job of jobs) {
      expect(job.state).toBeDefined();
    }

    cron.stop();

    const persisted = await loadCronStore(store.storePath);
    for (const job of persisted.jobs) {
      expect((job as Record<string, unknown>).state).toBeDefined();
    }

    await store.cleanup();
  });
});
