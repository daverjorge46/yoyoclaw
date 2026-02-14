/**
 * Cache for tracking the originating session of Slack messages sent via the message tool.
 * This enables routing bot messages to other bound agent sessions while preventing loops.
 */

type MessageOrigin = {
  sessionKey: string;
  agentId: string;
  timestamp: number;
};

// Map of channelId:messageTs -> MessageOrigin
const originCache = new Map<string, MessageOrigin>();

// TTL in milliseconds (5 minutes)
const CACHE_TTL_MS = 5 * 60 * 1000;

function buildKey(channelId: string, messageTs: string): string {
  return `${channelId}:${messageTs}`;
}

/**
 * Record the originating session for a Slack message.
 * Called when sending a message via the message tool.
 */
export function recordMessageOrigin(params: {
  channelId: string;
  messageTs: string;
  sessionKey: string;
  agentId: string;
}): void {
  const key = buildKey(params.channelId, params.messageTs);
  originCache.set(key, {
    sessionKey: params.sessionKey,
    agentId: params.agentId,
    timestamp: Date.now(),
  });
}

/**
 * Look up the originating session for a Slack message.
 * Returns undefined if not found or expired.
 */
export function lookupMessageOrigin(params: {
  channelId: string;
  messageTs: string;
}): { sessionKey: string; agentId: string } | undefined {
  const key = buildKey(params.channelId, params.messageTs);
  const origin = originCache.get(key);
  if (!origin) {
    return undefined;
  }
  // Check TTL
  if (Date.now() - origin.timestamp > CACHE_TTL_MS) {
    originCache.delete(key);
    return undefined;
  }
  return {
    sessionKey: origin.sessionKey,
    agentId: origin.agentId,
  };
}

/**
 * Clean up expired entries from the cache.
 * Call periodically to prevent memory leaks.
 */
export function pruneMessageOriginCache(): void {
  const now = Date.now();
  for (const [key, origin] of originCache.entries()) {
    if (now - origin.timestamp > CACHE_TTL_MS) {
      originCache.delete(key);
    }
  }
}
