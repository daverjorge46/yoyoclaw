import fsPromises from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

// Simple health stats
type HealthStats = {
  successes: number;
  failures: number;
  consecutiveFailures: number;
  lastFailure?: number;
  lastSuccess?: number;
  avgLatency?: number; // moving average
};

type HealthStore = Record<string, HealthStats>;

function resolveHealthFile(): string {
  const base = process.env.OPENCLAW_HOME || path.join(homedir(), ".openclaw");
  return path.join(base, "health-stats.json");
}

export class HealthManager {
  private static instance: HealthManager;
  private stats: HealthStore = {};
  private saveTimer: NodeJS.Timeout | null = null;
  private healthFile: string;

  private constructor() {
    this.healthFile = resolveHealthFile();
    this.load().catch((err) => {
      console.error("[HealthManager] Unexpected error during load:", err);
    });
  }

  static getInstance(): HealthManager {
    if (!HealthManager.instance) {
      HealthManager.instance = new HealthManager();
    }
    return HealthManager.instance;
  }

  private async load() {
    try {
      // Check existence first to avoid throw on missing file (optional, but cleaner)
      try {
        await fsPromises.access(this.healthFile);
      } catch {
        return; // File doesn't exist, start fresh
      }

      const data = await fsPromises.readFile(this.healthFile, "utf-8");
      this.stats = JSON.parse(data);
    } catch (err) {
      console.error("[HealthManager] Failed to load health stats:", err);
    }
  }

  private save() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = setTimeout(async () => {
      try {
        await fsPromises.mkdir(path.dirname(this.healthFile), { recursive: true });
        await fsPromises.writeFile(this.healthFile, JSON.stringify(this.stats, null, 2));
      } catch (err) {
        console.error("[HealthManager] Failed to save health stats:", err);
      } finally {
        this.saveTimer = null;
      }
    }, 5000); // Debounce 5s
  }

  private getKey(provider: string, model: string): string {
    return `${provider}:${model}`;
  }

  recordSuccess(provider: string, model: string, latencyMs: number) {
    const key = this.getKey(provider, model);
    if (!this.stats[key]) {
      this.stats[key] = { successes: 0, failures: 0, consecutiveFailures: 0 };
    }
    const s = this.stats[key];
    s.successes++;
    s.consecutiveFailures = 0;
    s.lastSuccess = Date.now();

    // Simple moving average for latency
    if (s.avgLatency === undefined) {
      s.avgLatency = latencyMs;
    } else {
      s.avgLatency = s.avgLatency * 0.9 + latencyMs * 0.1;
    }

    this.save();
  }

  recordFailure(provider: string, model: string) {
    const key = this.getKey(provider, model);
    if (!this.stats[key]) {
      this.stats[key] = { successes: 0, failures: 0, consecutiveFailures: 0 };
    }
    const s = this.stats[key];
    s.failures++;
    s.consecutiveFailures++;
    s.lastFailure = Date.now();
    this.save();
  }

  getScore(provider: string, model: string): number {
    const key = this.getKey(provider, model);
    const s = this.stats[key];
    if (!s) {
      return 100; // Default score
    }

    // Penalize consecutive failures
    let score = 100;
    let effectiveFailures = s.consecutiveFailures;

    // Check for recovery based on time (without mutating state)
    if (s.lastFailure) {
      const minutesSinceFailure = (Date.now() - s.lastFailure) / 60000;
      if (minutesSinceFailure > 60) {
        // Full recovery after 1 hour of silence
        effectiveFailures = 0;
      } else {
        // Decay effective failures: 1 recovered every 5 minutes
        const recovery = Math.floor(minutesSinceFailure / 5);
        effectiveFailures = Math.max(0, effectiveFailures - recovery);
      }
    }

    score -= effectiveFailures * 20;

    // Bonus for high success rate / low latency could go here

    return Math.max(0, score);
  }

  sortCandidates(
    candidates: { provider: string; model: string }[],
  ): { provider: string; model: string }[] {
    return candidates.toSorted((a, b) => {
      const scoreA = this.getScore(a.provider, a.model);
      const scoreB = this.getScore(b.provider, b.model);
      return scoreB - scoreA; // Descending score
    });
  }
}
