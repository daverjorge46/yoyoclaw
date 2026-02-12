/**
 * Health metrics for the Matrix channel plugin.
 * Tracks sync, crypto, room state, and operational counters for OpenClaw health reporting.
 */

export interface MatrixHealthMetrics {
  sync: {
    consecutiveFailures: number;
    lastSuccessAt: number | null;
  };
  crypto: {
    utdQueueDepth: number;
  };
  rooms: {
    joined: number;
    encrypted: number;
  };
  counters: MatrixCounters;
}

/** Operational counters — monotonically increasing since process start. */
export interface MatrixCounters {
  messagesReceived: number;
  messagesSent: number;
  encryptOps: number;
  decryptOps: number;
  decryptFailures: number;
  utdQueued: number;
  utdRecovered: number;
  utdExpired: number;
  mediaSent: number;
  mediaReceived: number;
  rateLimitHits: number;
  keySharingOps: number;
}

const counters: MatrixCounters = {
  messagesReceived: 0,
  messagesSent: 0,
  encryptOps: 0,
  decryptOps: 0,
  decryptFailures: 0,
  utdQueued: 0,
  utdRecovered: 0,
  utdExpired: 0,
  mediaSent: 0,
  mediaReceived: 0,
  rateLimitHits: 0,
  keySharingOps: 0,
};

const metrics: MatrixHealthMetrics = {
  sync: { consecutiveFailures: 0, lastSuccessAt: null },
  crypto: { utdQueueDepth: 0 },
  rooms: { joined: 0, encrypted: 0 },
  counters,
};

export function updateSyncMetrics(consecutiveFailures: number, success: boolean): void {
  metrics.sync.consecutiveFailures = consecutiveFailures;
  if (success) metrics.sync.lastSuccessAt = Date.now();
}

export function updateCryptoMetrics(utdQueueDepth: number): void {
  metrics.crypto.utdQueueDepth = utdQueueDepth;
}

export function updateRoomMetrics(joined: number, encrypted: number): void {
  metrics.rooms.joined = joined;
  metrics.rooms.encrypted = encrypted;
}

/** Increment one or more operational counters. */
export function incrementCounter(name: keyof MatrixCounters, amount = 1): void {
  counters[name] += amount;
}

export function getHealthMetrics(): MatrixHealthMetrics {
  return {
    ...metrics,
    counters: { ...counters },
  };
}
