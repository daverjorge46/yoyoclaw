// Lightweight in-memory queue for human-readable system events that should be
// prefixed to the next prompt. We intentionally avoid persistence to keep
// events ephemeral. Events are session-scoped and require an explicit key.

export type SystemEvent = { text: string; ts: number };

const MAX_EVENTS = 20;
const SESSION_QUEUE_INACTIVITY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

type SessionQueue = {
  queue: SystemEvent[];
  lastText: string | null;
  lastContextKey: string | null;
  lastActivityAt: number;
};

const queues = new Map<string, SessionQueue>();

type SystemEventOptions = {
  sessionKey: string;
  contextKey?: string | null;
};

function requireSessionKey(key?: string | null): string {
  const trimmed = typeof key === "string" ? key.trim() : "";
  if (!trimmed) {
    throw new Error("system events require a sessionKey");
  }
  return trimmed;
}

function normalizeContextKey(key?: string | null): string | null {
  if (!key) return null;
  const trimmed = key.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase();
}

export function isSystemEventContextChanged(
  sessionKey: string,
  contextKey?: string | null,
): boolean {
  const key = requireSessionKey(sessionKey);
  const existing = queues.get(key);
  const normalized = normalizeContextKey(contextKey);
  return normalized !== (existing?.lastContextKey ?? null);
}

export function enqueueSystemEvent(text: string, options: SystemEventOptions) {
  const key = requireSessionKey(options?.sessionKey);
  const entry =
    queues.get(key) ??
    (() => {
      const created: SessionQueue = {
        queue: [],
        lastText: null,
        lastContextKey: null,
        lastActivityAt: Date.now(),
      };
      queues.set(key, created);
      return created;
    })();
  const cleaned = text.trim();
  if (!cleaned) return;
  entry.lastActivityAt = Date.now();
  entry.lastContextKey = normalizeContextKey(options?.contextKey);
  if (entry.lastText === cleaned) return; // skip consecutive duplicates
  entry.lastText = cleaned;
  entry.queue.push({ text: cleaned, ts: Date.now() });
  if (entry.queue.length > MAX_EVENTS) entry.queue.shift();
}

export function drainSystemEventEntries(sessionKey: string): SystemEvent[] {
  const key = requireSessionKey(sessionKey);
  const entry = queues.get(key);
  if (!entry || entry.queue.length === 0) return [];
  entry.lastActivityAt = Date.now();
  const out = entry.queue.slice();
  entry.queue.length = 0;
  entry.lastText = null;
  entry.lastContextKey = null;
  queues.delete(key);
  return out;
}

export function drainSystemEvents(sessionKey: string): string[] {
  return drainSystemEventEntries(sessionKey).map((event) => event.text);
}

export function peekSystemEvents(sessionKey: string): string[] {
  const key = requireSessionKey(sessionKey);
  return queues.get(key)?.queue.map((e) => e.text) ?? [];
}

export function hasSystemEvents(sessionKey: string) {
  const key = requireSessionKey(sessionKey);
  return (queues.get(key)?.queue.length ?? 0) > 0;
}

export function resetSystemEventsForTest() {
  queues.clear();
}

/**
 * Clean up inactive system event queues to prevent memory leaks.
 * Removes sessions with no activity for SESSION_QUEUE_INACTIVITY_TTL_MS.
 * Returns count of sessions removed.
 */
export function cleanupInactiveSystemEventQueues(): number {
  const now = Date.now();
  let removed = 0;

  for (const [sessionKey, queue] of queues.entries()) {
    const inactiveMs = now - queue.lastActivityAt;
    if (inactiveMs >= SESSION_QUEUE_INACTIVITY_TTL_MS) {
      queues.delete(sessionKey);
      removed++;
    }
  }

  return removed;
}

/**
 * Start background task to periodically clean up inactive system event queues.
 * Returns cleanup function to stop the task.
 */
export function startSystemEventsCleanupTask(): () => void {
  const intervalMs = 60 * 60 * 1000; // Run every hour

  const interval = setInterval(() => {
    const removed = cleanupInactiveSystemEventQueues();
    if (removed > 0) {
      console.log(`[system-events] cleanup removed ${removed} inactive session queues`);
    }
  }, intervalMs);

  // Don't prevent process exit
  interval.unref();

  return () => {
    clearInterval(interval);
  };
}
