export type UsageWindow = {
  label: string;
  usedPercent: number;
  resetAt?: number;
  remaining?: number;
  limit?: number;
};

export type ProviderUsageSnapshot = {
  provider: UsageProviderId;
  displayName: string;
  windows: UsageWindow[];
  plan?: string;
  error?: string;
  accountId?: string;
  accountLabel?: string;
  profileId?: string;
  fetchedAt?: number;
  cacheExpiresAt?: number;
  stale?: boolean;
};

export type UsageSummary = {
  updatedAt: number;
  providers: ProviderUsageSnapshot[];
};

export type UsageProviderId =
  | "anthropic"
  | "github-copilot"
  | "google-gemini-cli"
  | "google-antigravity"
  | "minimax"
  | "openai-codex"
  | "xiaomi"
  | "zai";
