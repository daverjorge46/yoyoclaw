import type { ProviderUsageSnapshot, UsageWindow } from "./provider-usage.types.js";
import { fetchJson } from "./provider-usage.fetch.shared.js";
import { clampPercent, PROVIDER_LABELS } from "./provider-usage.shared.js";

type CopilotUsageResponse = {
  quota_snapshots?: {
    premium_interactions?: {
      percent_remaining?: number | null;
      remaining?: number | null;
      limit?: number | null;
      quota?: number | null;
      total?: number | null;
      used?: number | null;
    };
    chat?: {
      percent_remaining?: number | null;
      remaining?: number | null;
      limit?: number | null;
      quota?: number | null;
      total?: number | null;
      used?: number | null;
    };
  };
  copilot_plan?: string;
};

function resolveWindowAbsolute(
  value:
    | {
        remaining?: number | null;
        limit?: number | null;
        quota?: number | null;
        total?: number | null;
        used?: number | null;
      }
    | undefined,
): { remaining?: number; limit?: number } {
  if (!value) {
    return {};
  }
  const remaining = typeof value.remaining === "number" ? value.remaining : undefined;
  const limit =
    typeof value.limit === "number"
      ? value.limit
      : typeof value.quota === "number"
        ? value.quota
        : typeof value.total === "number"
          ? value.total
          : undefined;
  if (remaining != null && limit != null) {
    return { remaining: Math.max(0, remaining), limit: Math.max(0, limit) };
  }
  if (limit != null && typeof value.used === "number") {
    return { remaining: Math.max(0, limit - value.used), limit: Math.max(0, limit) };
  }
  return {};
}

export async function fetchCopilotUsage(
  token: string,
  timeoutMs: number,
  fetchFn: typeof fetch,
): Promise<ProviderUsageSnapshot> {
  const res = await fetchJson(
    "https://api.github.com/copilot_internal/user",
    {
      headers: {
        Authorization: `token ${token}`,
        "Editor-Version": "vscode/1.96.2",
        "User-Agent": "GitHubCopilotChat/0.26.7",
        "X-Github-Api-Version": "2025-04-01",
      },
    },
    timeoutMs,
    fetchFn,
  );

  if (!res.ok) {
    return {
      provider: "github-copilot",
      displayName: PROVIDER_LABELS["github-copilot"],
      windows: [],
      error: `HTTP ${res.status}`,
    };
  }

  const data = (await res.json()) as CopilotUsageResponse;
  const windows: UsageWindow[] = [];

  if (data.quota_snapshots?.premium_interactions) {
    const remaining = data.quota_snapshots.premium_interactions.percent_remaining;
    const absolute = resolveWindowAbsolute(data.quota_snapshots.premium_interactions);
    windows.push({
      label: "Premium",
      usedPercent: clampPercent(100 - (remaining ?? 0)),
      ...absolute,
    });
  }

  if (data.quota_snapshots?.chat) {
    const remaining = data.quota_snapshots.chat.percent_remaining;
    const absolute = resolveWindowAbsolute(data.quota_snapshots.chat);
    windows.push({
      label: "Chat",
      usedPercent: clampPercent(100 - (remaining ?? 0)),
      ...absolute,
    });
  }

  return {
    provider: "github-copilot",
    displayName: PROVIDER_LABELS["github-copilot"],
    windows,
    plan: data.copilot_plan,
  };
}
