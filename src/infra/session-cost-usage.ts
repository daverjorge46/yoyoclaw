import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

import type { NormalizedUsage, UsageLike } from "../agents/usage.js";
import { normalizeUsage } from "../agents/usage.js";
import type { OpenClawConfig } from "../config/config.js";
import type { SessionEntry } from "../config/sessions/types.js";
import {
  resolveSessionFilePath,
  resolveSessionTranscriptsDirForAgent,
} from "../config/sessions/paths.js";
import { estimateUsageCost, resolveModelCostConfig } from "../utils/usage-format.js";

type ParsedUsageEntry = {
  usage: NormalizedUsage;
  costTotal?: number;
  provider?: string;
  model?: string;
  timestamp?: Date;
};

export type CostUsageTotals = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  totalCost: number;
  missingCostEntries: number;
};

export type CostUsageDailyEntry = CostUsageTotals & {
  date: string;
};

export type CostUsageSummary = {
  updatedAt: number;
  days: number;
  daily: CostUsageDailyEntry[];
  totals: CostUsageTotals;
};

export type SessionCostSummary = CostUsageTotals & {
  sessionId?: string;
  sessionFile?: string;
  lastActivity?: number;
};

const emptyTotals = (): CostUsageTotals => ({
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  totalCost: 0,
  missingCostEntries: 0,
});

const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value !== "number") return undefined;
  if (!Number.isFinite(value)) return undefined;
  return value;
};

const extractCostTotal = (usageRaw?: UsageLike | null): number | undefined => {
  if (!usageRaw || typeof usageRaw !== "object") return undefined;
  const record = usageRaw as Record<string, unknown>;
  const cost = record.cost as Record<string, unknown> | undefined;
  const total = toFiniteNumber(cost?.total);
  if (total === undefined) return undefined;
  if (total < 0) return undefined;
  return total;
};

const parseTimestamp = (entry: Record<string, unknown>): Date | undefined => {
  const raw = entry.timestamp;
  if (typeof raw === "string") {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.valueOf())) return parsed;
  }
  const message = entry.message as Record<string, unknown> | undefined;
  const messageTimestamp = toFiniteNumber(message?.timestamp);
  if (messageTimestamp !== undefined) {
    const parsed = new Date(messageTimestamp);
    if (!Number.isNaN(parsed.valueOf())) return parsed;
  }
  return undefined;
};

const parseUsageEntry = (entry: Record<string, unknown>): ParsedUsageEntry | null => {
  const message = entry.message as Record<string, unknown> | undefined;
  const role = message?.role;
  if (role !== "assistant") return null;

  const usageRaw =
    (message?.usage as UsageLike | undefined) ?? (entry.usage as UsageLike | undefined);
  const usage = normalizeUsage(usageRaw);
  if (!usage) return null;

  const provider =
    (typeof message?.provider === "string" ? message?.provider : undefined) ??
    (typeof entry.provider === "string" ? entry.provider : undefined);
  const model =
    (typeof message?.model === "string" ? message?.model : undefined) ??
    (typeof entry.model === "string" ? entry.model : undefined);

  return {
    usage,
    costTotal: extractCostTotal(usageRaw),
    provider,
    model,
    timestamp: parseTimestamp(entry),
  };
};

const formatDayKey = (date: Date): string =>
  date.toLocaleDateString("en-CA", { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });

const applyUsageTotals = (totals: CostUsageTotals, usage: NormalizedUsage) => {
  totals.input += usage.input ?? 0;
  totals.output += usage.output ?? 0;
  totals.cacheRead += usage.cacheRead ?? 0;
  totals.cacheWrite += usage.cacheWrite ?? 0;
  const totalTokens =
    usage.total ??
    (usage.input ?? 0) + (usage.output ?? 0) + (usage.cacheRead ?? 0) + (usage.cacheWrite ?? 0);
  totals.totalTokens += totalTokens;
};

const applyCostTotal = (totals: CostUsageTotals, costTotal: number | undefined) => {
  if (costTotal === undefined) {
    totals.missingCostEntries += 1;
    return;
  }
  totals.totalCost += costTotal;
};

async function scanUsageFile(params: {
  filePath: string;
  config?: OpenClawConfig;
  onEntry: (entry: ParsedUsageEntry) => void;
}): Promise<void> {
  const fileStream = fs.createReadStream(params.filePath, { encoding: "utf-8" });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      const entry = parseUsageEntry(parsed);
      if (!entry) continue;

      if (entry.costTotal === undefined) {
        const cost = resolveModelCostConfig({
          provider: entry.provider,
          model: entry.model,
          config: params.config,
        });
        entry.costTotal = estimateUsageCost({ usage: entry.usage, cost });
      }

      params.onEntry(entry);
    } catch {
      // Ignore malformed lines
    }
  }
}

export async function loadCostUsageSummary(params?: {
  days?: number;
  config?: OpenClawConfig;
  agentId?: string;
}): Promise<CostUsageSummary> {
  const days = Math.max(1, Math.floor(params?.days ?? 30));
  const now = new Date();
  const since = new Date(now);
  since.setDate(since.getDate() - (days - 1));
  const sinceTime = since.getTime();

  const dailyMap = new Map<string, CostUsageTotals>();
  const totals = emptyTotals();

  const sessionsDir = resolveSessionTranscriptsDirForAgent(params?.agentId);
  const entries = await fs.promises.readdir(sessionsDir, { withFileTypes: true }).catch(() => []);
  const files = (
    await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".jsonl"))
        .map(async (entry) => {
          const filePath = path.join(sessionsDir, entry.name);
          const stats = await fs.promises.stat(filePath).catch(() => null);
          if (!stats) return null;
          if (stats.mtimeMs < sinceTime) return null;
          return filePath;
        }),
    )
  ).filter((filePath): filePath is string => Boolean(filePath));

  for (const filePath of files) {
    await scanUsageFile({
      filePath,
      config: params?.config,
      onEntry: (entry) => {
        const ts = entry.timestamp?.getTime();
        if (!ts || ts < sinceTime) return;
        const dayKey = formatDayKey(entry.timestamp ?? now);
        const bucket = dailyMap.get(dayKey) ?? emptyTotals();
        applyUsageTotals(bucket, entry.usage);
        applyCostTotal(bucket, entry.costTotal);
        dailyMap.set(dayKey, bucket);

        applyUsageTotals(totals, entry.usage);
        applyCostTotal(totals, entry.costTotal);
      },
    });
  }

  const daily = Array.from(dailyMap.entries())
    .map(([date, bucket]) => ({ date, ...bucket }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    updatedAt: Date.now(),
    days,
    daily,
    totals,
  };
}

export async function loadSessionCostSummary(params: {
  sessionId?: string;
  sessionEntry?: SessionEntry;
  sessionFile?: string;
  config?: OpenClawConfig;
}): Promise<SessionCostSummary | null> {
  const sessionFile =
    params.sessionFile ??
    (params.sessionId ? resolveSessionFilePath(params.sessionId, params.sessionEntry) : undefined);
  if (!sessionFile || !fs.existsSync(sessionFile)) return null;

  const totals = emptyTotals();
  let lastActivity: number | undefined;

  await scanUsageFile({
    filePath: sessionFile,
    config: params.config,
    onEntry: (entry) => {
      applyUsageTotals(totals, entry.usage);
      applyCostTotal(totals, entry.costTotal);
      const ts = entry.timestamp?.getTime();
      if (ts && (!lastActivity || ts > lastActivity)) {
        lastActivity = ts;
      }
    },
  });

  return {
    sessionId: params.sessionId,
    sessionFile,
    lastActivity,
    ...totals,
  };
}

// --- Period aggregation ---

export type AggregationPeriod = "daily" | "weekly" | "monthly";

export type PeriodAggregation = CostUsageTotals & {
  period: AggregationPeriod;
  periodKey: string;
};

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00"); // noon to avoid DST edge cases
  const dayOfWeek = d.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday-based week
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const day = String(monday.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7); // YYYY-MM
}

export function aggregateByPeriod(
  daily: CostUsageDailyEntry[],
  period: AggregationPeriod,
): PeriodAggregation[] {
  if (period === "daily") {
    return daily.map((d) => ({ ...d, period, periodKey: d.date }));
  }

  const buckets = new Map<string, CostUsageTotals>();
  for (const entry of daily) {
    const key = period === "weekly" ? getWeekKey(entry.date) : getMonthKey(entry.date);
    const bucket = buckets.get(key) ?? emptyTotals();
    bucket.input += entry.input;
    bucket.output += entry.output;
    bucket.cacheRead += entry.cacheRead;
    bucket.cacheWrite += entry.cacheWrite;
    bucket.totalTokens += entry.totalTokens;
    bucket.totalCost += entry.totalCost;
    bucket.missingCostEntries += entry.missingCostEntries;
    buckets.set(key, bucket);
  }

  return Array.from(buckets.entries())
    .map(([periodKey, totals]) => ({ ...totals, period, periodKey }))
    .sort((a, b) => a.periodKey.localeCompare(b.periodKey));
}

// --- Cost threshold checks ---

export type CostLimitsConfig = {
  daily?: number;
  weekly?: number;
  monthly?: number;
};

export type CostThresholdResult = {
  period: AggregationPeriod;
  currentCost: number;
  limit: number;
  percentage: number;
  exceeded: boolean;
};

export function checkCostThresholds(params: {
  summary: CostUsageSummary;
  limits: CostLimitsConfig;
}): CostThresholdResult[] {
  const results: CostThresholdResult[] = [];
  const { summary, limits } = params;

  if (limits.daily !== undefined && limits.daily > 0) {
    const today = formatDayKey(new Date());
    const todayEntry = summary.daily.find((d) => d.date === today);
    const currentCost = todayEntry?.totalCost ?? 0;
    const percentage = (currentCost / limits.daily) * 100;
    results.push({
      period: "daily",
      currentCost,
      limit: limits.daily,
      percentage,
      exceeded: currentCost >= limits.daily,
    });
  }

  if (limits.weekly !== undefined && limits.weekly > 0) {
    const weeklyAgg = aggregateByPeriod(summary.daily, "weekly");
    const latest = weeklyAgg.at(-1);
    const currentCost = latest?.totalCost ?? 0;
    const percentage = (currentCost / limits.weekly) * 100;
    results.push({
      period: "weekly",
      currentCost,
      limit: limits.weekly,
      percentage,
      exceeded: currentCost >= limits.weekly,
    });
  }

  if (limits.monthly !== undefined && limits.monthly > 0) {
    const monthlyAgg = aggregateByPeriod(summary.daily, "monthly");
    const latest = monthlyAgg.at(-1);
    const currentCost = latest?.totalCost ?? 0;
    const percentage = (currentCost / limits.monthly) * 100;
    results.push({
      period: "monthly",
      currentCost,
      limit: limits.monthly,
      percentage,
      exceeded: currentCost >= limits.monthly,
    });
  }

  return results;
}
