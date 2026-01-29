import { CommandLane } from "./lanes.js";
import { diagnosticLogger as diag, logLaneDequeue, logLaneEnqueue } from "../logging/diagnostic.js";

// Minimal in-process queue to serialize command executions.
// Default lane ("main") preserves the existing behavior. Additional lanes allow
// low-risk parallelism (e.g. cron jobs) without interleaving stdin / logs for
// the main auto-reply workflow.

type QueueEntry = {
  task: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  enqueuedAt: number;
  warnAfterMs: number;
  onWait?: (waitMs: number, queuedAhead: number) => void;
};

type LaneState = {
  lane: string;
  queue: QueueEntry[];
  active: number;
  maxConcurrent: number;
  draining: boolean;
  lastActivityAt: number;
};

const lanes = new Map<string, LaneState>();
const MAX_QUEUE_SIZE = 1000; // Max queued items per lane
const LANE_INACTIVITY_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getLaneState(lane: string): LaneState {
  const existing = lanes.get(lane);
  if (existing) {
    existing.lastActivityAt = Date.now();
    return existing;
  }
  const created: LaneState = {
    lane,
    queue: [],
    active: 0,
    maxConcurrent: 1,
    draining: false,
    lastActivityAt: Date.now(),
  };
  lanes.set(lane, created);
  return created;
}

function drainLane(lane: string) {
  const state = getLaneState(lane);
  if (state.draining) return;
  state.draining = true;

  const pump = () => {
    while (state.active < state.maxConcurrent && state.queue.length > 0) {
      const entry = state.queue.shift() as QueueEntry;
      const waitedMs = Date.now() - entry.enqueuedAt;
      if (waitedMs >= entry.warnAfterMs) {
        entry.onWait?.(waitedMs, state.queue.length);
        diag.warn(
          `lane wait exceeded: lane=${lane} waitedMs=${waitedMs} queueAhead=${state.queue.length}`,
        );
      }
      logLaneDequeue(lane, waitedMs, state.queue.length);
      state.active += 1;
      void (async () => {
        const startTime = Date.now();
        try {
          const result = await entry.task();
          state.active -= 1;
          state.lastActivityAt = Date.now();
          diag.debug(
            `lane task done: lane=${lane} durationMs=${Date.now() - startTime} active=${state.active} queued=${state.queue.length}`,
          );
          pump();
          entry.resolve(result);
        } catch (err) {
          state.active -= 1;
          state.lastActivityAt = Date.now();
          const isProbeLane = lane.startsWith("auth-probe:") || lane.startsWith("session:probe-");
          if (!isProbeLane) {
            diag.error(
              `lane task error: lane=${lane} durationMs=${Date.now() - startTime} error="${String(err)}"`,
            );
          }
          pump();
          entry.reject(err);
        }
      })();
    }
    state.draining = false;
  };

  pump();
}

export function setCommandLaneConcurrency(lane: string, maxConcurrent: number) {
  const cleaned = lane.trim() || CommandLane.Main;
  const state = getLaneState(cleaned);
  state.maxConcurrent = Math.max(1, Math.floor(maxConcurrent));
  drainLane(cleaned);
}

export function enqueueCommandInLane<T>(
  lane: string,
  task: () => Promise<T>,
  opts?: {
    warnAfterMs?: number;
    onWait?: (waitMs: number, queuedAhead: number) => void;
  },
): Promise<T> {
  const cleaned = lane.trim() || CommandLane.Main;
  const warnAfterMs = opts?.warnAfterMs ?? 2_000;
  const state = getLaneState(cleaned);

  // Backpressure: reject if queue is full
  const totalQueued = state.queue.length + state.active;
  if (totalQueued >= MAX_QUEUE_SIZE) {
    const error = new Error(
      `Command queue full: lane=${cleaned} size=${totalQueued} max=${MAX_QUEUE_SIZE}`,
    );
    (error as NodeJS.ErrnoException).code = "QUEUE_FULL";
    diag.error(`[queue] rejected: lane=${cleaned} size=${totalQueued} max=${MAX_QUEUE_SIZE}`);
    return Promise.reject(error);
  }

  return new Promise<T>((resolve, reject) => {
    state.queue.push({
      task: () => task(),
      resolve: (value) => resolve(value as T),
      reject,
      enqueuedAt: Date.now(),
      warnAfterMs,
      onWait: opts?.onWait,
    });
    logLaneEnqueue(cleaned, state.queue.length + state.active);
    drainLane(cleaned);
  });
}

export function enqueueCommand<T>(
  task: () => Promise<T>,
  opts?: {
    warnAfterMs?: number;
    onWait?: (waitMs: number, queuedAhead: number) => void;
  },
): Promise<T> {
  return enqueueCommandInLane(CommandLane.Main, task, opts);
}

export function getQueueSize(lane: string = CommandLane.Main) {
  const resolved = lane.trim() || CommandLane.Main;
  const state = lanes.get(resolved);
  if (!state) return 0;
  return state.queue.length + state.active;
}

export function getTotalQueueSize() {
  let total = 0;
  for (const s of lanes.values()) {
    total += s.queue.length + s.active;
  }
  return total;
}

export function clearCommandLane(lane: string = CommandLane.Main) {
  const cleaned = lane.trim() || CommandLane.Main;
  const state = lanes.get(cleaned);
  if (!state) return 0;
  const removed = state.queue.length;
  state.queue.length = 0;
  return removed;
}

/**
 * Clean up inactive lanes to prevent memory leaks.
 * Removes lanes with no active/queued tasks after LANE_INACTIVITY_TTL_MS.
 * Returns count of lanes removed.
 */
export function cleanupInactiveLanes(): number {
  const now = Date.now();
  let removed = 0;

  for (const [laneId, state] of lanes.entries()) {
    // Skip if lane has active or queued tasks
    if (state.active > 0 || state.queue.length > 0) {
      state.lastActivityAt = now;
      continue;
    }

    // Remove if inactive for too long
    const inactiveMs = now - state.lastActivityAt;
    if (inactiveMs >= LANE_INACTIVITY_TTL_MS) {
      lanes.delete(laneId);
      removed++;
      diag.debug(`[queue] cleaned up inactive lane: ${laneId} (inactive ${inactiveMs}ms)`);
    }
  }

  return removed;
}

/**
 * Start background task to periodically clean up inactive lanes.
 * Returns cleanup function to stop the task.
 */
export function startLaneCleanupTask(): () => void {
  const intervalMs = 60_000; // Run every 60 seconds

  const interval = setInterval(() => {
    const removed = cleanupInactiveLanes();
    if (removed > 0) {
      diag.info(`[queue] cleanup removed ${removed} inactive lanes`);
    }
  }, intervalMs);

  // Don't prevent process exit
  interval.unref();

  return () => {
    clearInterval(interval);
  };
}
