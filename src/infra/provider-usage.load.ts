import fs from "node:fs/promises";
import path from "node:path";
import type {
  ProviderUsageSnapshot,
  UsageProviderId,
  UsageSummary,
} from "./provider-usage.types.js";
import { resolveStateDir } from "../config/paths.js";
import { resolveFetch } from "./fetch.js";
import { type ProviderAuth, resolveProviderAuths } from "./provider-usage.auth.js";
import {
  fetchAntigravityUsage,
  fetchClaudeUsage,
  fetchCodexUsage,
  fetchCopilotUsage,
  fetchGeminiUsage,
  fetchMinimaxUsage,
  fetchZaiUsage,
} from "./provider-usage.fetch.js";
import {
  DEFAULT_TIMEOUT_MS,
  ignoredErrors,
  PROVIDER_LABELS,
  usageProviders,
  withTimeout,
} from "./provider-usage.shared.js";

const PROVIDER_USAGE_CACHE_TTL_MS = 10 * 60_000;
const PROVIDER_USAGE_CACHE_VERSION = 1;

type UsageSummaryOptions = {
  now?: number;
  timeoutMs?: number;
  providers?: UsageProviderId[];
  auth?: ProviderAuth[];
  agentDir?: string;
  fetch?: typeof fetch;
  stateDir?: string;
  cacheTtlMs?: number;
};

type PersistedProviderUsageCache = {
  version: number;
  entries: Record<string, { updatedAt: number; snapshot: ProviderUsageSnapshot }>;
};

const inFlightByCacheKey = new Map<string, Promise<ProviderUsageSnapshot>>();

function resolveCachePath(stateDir?: string): string {
  const root = stateDir ?? resolveStateDir();
  return path.join(root, "cache", "provider-usage-summary.json");
}

async function loadPersistedCache(cachePath: string): Promise<PersistedProviderUsageCache> {
  try {
    const raw = await fs.readFile(cachePath, "utf8");
    const parsed = JSON.parse(raw) as PersistedProviderUsageCache;
    if (!parsed || parsed.version !== PROVIDER_USAGE_CACHE_VERSION) {
      return { version: PROVIDER_USAGE_CACHE_VERSION, entries: {} };
    }
    return {
      version: PROVIDER_USAGE_CACHE_VERSION,
      entries: parsed.entries && typeof parsed.entries === "object" ? parsed.entries : {},
    };
  } catch {
    return { version: PROVIDER_USAGE_CACHE_VERSION, entries: {} };
  }
}

async function savePersistedCache(
  cachePath: string,
  cache: PersistedProviderUsageCache,
): Promise<void> {
  try {
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, `${JSON.stringify(cache)}\n`, "utf8");
  } catch {
    // Cache persistence is best-effort.
  }
}

function cacheKeyForAuth(auth: ProviderAuth): string {
  const accountKey =
    auth.profileId?.trim() || auth.accountId?.trim() || auth.accountLabel?.trim() || "default";
  return `${auth.provider}:${accountKey}`;
}

function decorateSnapshot(params: {
  snapshot: ProviderUsageSnapshot;
  auth: ProviderAuth;
  updatedAt: number;
  cacheTtlMs: number;
  stale?: boolean;
}): ProviderUsageSnapshot {
  const { snapshot, auth, updatedAt, cacheTtlMs } = params;
  return {
    ...snapshot,
    accountId: snapshot.accountId ?? auth.accountId,
    accountLabel: snapshot.accountLabel ?? auth.accountLabel ?? auth.profileId,
    profileId: snapshot.profileId ?? auth.profileId,
    fetchedAt: updatedAt,
    cacheExpiresAt: updatedAt + cacheTtlMs,
    stale: params.stale ?? false,
  };
}

function buildErrorSnapshot(auth: ProviderAuth, error: string): ProviderUsageSnapshot {
  return {
    provider: auth.provider,
    displayName: PROVIDER_LABELS[auth.provider],
    windows: [],
    error,
  };
}

async function fetchUsageForAuth(params: {
  auth: ProviderAuth;
  timeoutMs: number;
  fetchFn: typeof fetch;
}): Promise<ProviderUsageSnapshot> {
  const { auth, timeoutMs, fetchFn } = params;
  switch (auth.provider) {
    case "anthropic":
      return await fetchClaudeUsage(auth.token, timeoutMs, fetchFn);
    case "github-copilot":
      return await fetchCopilotUsage(auth.token, timeoutMs, fetchFn);
    case "google-antigravity":
      return await fetchAntigravityUsage(auth.token, timeoutMs, fetchFn);
    case "google-gemini-cli":
      return await fetchGeminiUsage(auth.token, timeoutMs, fetchFn, auth.provider);
    case "openai-codex":
      return await fetchCodexUsage(auth.token, auth.accountId, timeoutMs, fetchFn);
    case "minimax":
      return await fetchMinimaxUsage(auth.token, timeoutMs, fetchFn);
    case "xiaomi":
      return {
        provider: "xiaomi",
        displayName: PROVIDER_LABELS.xiaomi,
        windows: [],
      };
    case "zai":
      return await fetchZaiUsage(auth.token, timeoutMs, fetchFn);
    default:
      return buildErrorSnapshot(auth, "Unsupported provider");
  }
}

export async function loadProviderUsageSummary(
  opts: UsageSummaryOptions = {},
): Promise<UsageSummary> {
  const now = opts.now ?? Date.now();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const cacheTtlMs = opts.cacheTtlMs ?? PROVIDER_USAGE_CACHE_TTL_MS;
  const fetchFn = resolveFetch(opts.fetch);
  if (!fetchFn) {
    throw new Error("fetch is not available");
  }

  const auths = await resolveProviderAuths({
    providers: opts.providers ?? usageProviders,
    auth: opts.auth,
    agentDir: opts.agentDir,
  });
  if (auths.length === 0) {
    return { updatedAt: now, providers: [] };
  }

  const usePersistentCache = !opts.auth || Boolean(opts.stateDir);
  const cachePath = resolveCachePath(opts.stateDir);
  const cache = usePersistentCache
    ? await loadPersistedCache(cachePath)
    : { version: PROVIDER_USAGE_CACHE_VERSION, entries: {} };
  let didMutateCache = false;

  const tasks = auths.map(async (auth) => {
    const key = cacheKeyForAuth(auth);
    const cached = cache.entries[key];
    const cacheFresh =
      cached?.snapshot?.provider === auth.provider &&
      typeof cached.updatedAt === "number" &&
      now - cached.updatedAt < cacheTtlMs;

    if (cacheFresh && cached.snapshot) {
      return decorateSnapshot({
        snapshot: cached.snapshot,
        auth,
        updatedAt: cached.updatedAt,
        cacheTtlMs,
      });
    }

    const existingInFlight = inFlightByCacheKey.get(key);
    if (existingInFlight) {
      return await existingInFlight;
    }

    let task: Promise<ProviderUsageSnapshot>;
    task = (async (): Promise<ProviderUsageSnapshot> => {
      const fetched = await withTimeout(
        fetchUsageForAuth({ auth, timeoutMs, fetchFn }),
        timeoutMs + 1000,
        buildErrorSnapshot(auth, "Timeout"),
      );

      if (fetched.error && cached?.snapshot) {
        return decorateSnapshot({
          snapshot: cached.snapshot,
          auth,
          updatedAt: cached.updatedAt,
          cacheTtlMs,
          stale: true,
        });
      }

      const decorated = decorateSnapshot({
        snapshot: fetched,
        auth,
        updatedAt: now,
        cacheTtlMs,
      });
      cache.entries[key] = {
        updatedAt: now,
        snapshot: decorated,
      };
      didMutateCache = true;
      return decorated;
    })().finally(() => {
      const current = inFlightByCacheKey.get(key);
      if (current === task) {
        inFlightByCacheKey.delete(key);
      }
    });

    inFlightByCacheKey.set(key, task);
    return await task;
  });

  const snapshots = await Promise.all(tasks);
  if (usePersistentCache && didMutateCache) {
    await savePersistedCache(cachePath, cache);
  }

  const providers = snapshots.filter((entry) => {
    if (entry.windows.length > 0) {
      return true;
    }
    if (!entry.error) {
      return true;
    }
    return !ignoredErrors.has(entry.error);
  });

  return { updatedAt: now, providers };
}
