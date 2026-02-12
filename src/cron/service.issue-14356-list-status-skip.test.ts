import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CronService } from "./service.js";

const noopLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

async function makeStorePath() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-cron-"));
  return {
    storePath: path.join(dir, "cron", "jobs.json"),
    cleanup: async () => {
      await fs.rm(dir, { recursive: true, force: true });
    },
  };
}

describe("issue #14356 — list()/status() must not skip due jobs", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-12T12:00:00.000Z"));
    noopLogger.debug.mockClear();
    noopLogger.info.mockClear();
    noopLogger.warn.mockClear();
    noopLogger.error.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("list() must not advance a past-due nextRunAtMs without executing the job", async () => {
    const store = await makeStorePath();
    const runIsolatedAgentJob = vi.fn(async () => ({
      status: "ok" as const,
      summary: "done",
    }));

    const cron = new CronService({
      storePath: store.storePath,
      cronEnabled: true,
      log: noopLogger,
      enqueueSystemEvent: vi.fn(),
      requestHeartbeatNow: vi.fn(),
      runIsolatedAgentJob,
    });

    await cron.start();

    const job = await cron.add({
      name: "isolated every-5m",
      enabled: true,
      schedule: { kind: "every", everyMs: 5 * 60_000 },
      sessionTarget: "isolated",
      wakeMode: "now",
      payload: { kind: "agentTurn", message: "Test" },
      delivery: { mode: "none" },
    });

    const firstDueAt = job.state.nextRunAtMs!;
    expect(firstDueAt).toBe(Date.parse("2026-02-12T12:00:00.000Z") + 5 * 60_000);

    // Advance time 1 second past the due time.
    vi.setSystemTime(new Date(firstDueAt + 1000));

    // Simulate a client calling list() BEFORE the timer fires
    // (e.g. a TUI refresh or WebSocket poll).
    const jobsBefore = await cron.list({ includeDisabled: true });
    const jobBefore = jobsBefore.find((j) => j.id === job.id)!;

    // nextRunAtMs must NOT have been advanced — the job has not been
    // executed yet. Advancing it here would silently skip the run.
    expect(jobBefore.state.nextRunAtMs).toBe(firstDueAt);

    cron.stop();
    await store.cleanup();
  });

  it("status() must not advance a past-due nextRunAtMs without executing the job", async () => {
    const store = await makeStorePath();
    const runIsolatedAgentJob = vi.fn(async () => ({
      status: "ok" as const,
      summary: "done",
    }));

    const cron = new CronService({
      storePath: store.storePath,
      cronEnabled: true,
      log: noopLogger,
      enqueueSystemEvent: vi.fn(),
      requestHeartbeatNow: vi.fn(),
      runIsolatedAgentJob,
    });

    await cron.start();

    const job = await cron.add({
      name: "isolated cron-expr",
      enabled: true,
      schedule: { kind: "cron", expr: "*/30 * * * *", tz: "UTC" },
      sessionTarget: "isolated",
      wakeMode: "now",
      payload: { kind: "agentTurn", message: "Test" },
      delivery: { mode: "none" },
    });

    const firstDueAt = job.state.nextRunAtMs!;

    // Advance past due.
    vi.setSystemTime(new Date(firstDueAt + 1000));

    // Status poll — must not advance nextRunAtMs.
    await cron.status();

    const jobs = await cron.list({ includeDisabled: true });
    const j = jobs.find((j) => j.id === job.id)!;
    expect(j.state.nextRunAtMs).toBe(firstDueAt);

    cron.stop();
    await store.cleanup();
  });

  it("job fires after repeated list() polls around the due time", async () => {
    const store = await makeStorePath();
    const runIsolatedAgentJob = vi.fn(async () => ({
      status: "ok" as const,
      summary: "done",
    }));

    const cron = new CronService({
      storePath: store.storePath,
      cronEnabled: true,
      log: noopLogger,
      enqueueSystemEvent: vi.fn(),
      requestHeartbeatNow: vi.fn(),
      runIsolatedAgentJob,
    });

    await cron.start();

    const job = await cron.add({
      name: "isolated every-5m",
      enabled: true,
      schedule: { kind: "every", everyMs: 5 * 60_000 },
      sessionTarget: "isolated",
      wakeMode: "now",
      payload: { kind: "agentTurn", message: "Test" },
      delivery: { mode: "none" },
    });

    const firstDueAt = job.state.nextRunAtMs!;

    // Advance past due.
    vi.setSystemTime(new Date(firstDueAt + 1000));

    // Simulate repeated list() polls (TUI, WebSocket, CLI, etc.)
    for (let i = 0; i < 10; i++) {
      await cron.list();
    }

    // Now let the timer fire and execute the job.
    let fired = false;
    for (let i = 0; i < 30; i++) {
      await vi.runOnlyPendingTimersAsync();
      const jobs = await cron.list({ includeDisabled: true });
      const j = jobs.find((j) => j.id === job.id);
      if (j?.state.lastStatus === "ok") {
        fired = true;
        break;
      }
    }

    expect(fired).toBe(true);
    expect(runIsolatedAgentJob).toHaveBeenCalledTimes(1);

    cron.stop();
    await store.cleanup();
  });
});
