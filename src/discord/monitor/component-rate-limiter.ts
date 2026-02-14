/**
 * Sliding window rate limiter for Discord component interactions (CWE-770).
 */

export type RateLimitedComponentType = "button" | "selectMenu";

export type ComponentRateLimitConfig = {
  enabled?: boolean;
  maxInteractions?: number;
  windowMs?: number;
  rateLimitMessage?: string;
};

const DEFAULTS = {
  enabled: true,
  maxInteractions: 5,
  windowMs: 10_000,
  cleanupIntervalMs: 60_000,
  rateLimitMessage: "You're interacting too quickly. Please wait a moment.",
} as const;

export class ComponentInteractionRateLimiter {
  private static instance: ComponentInteractionRateLimiter | null = null;

  private readonly records = new Map<string, number[]>();
  private readonly enabled: boolean;
  private readonly maxInteractions: number;
  private readonly windowMs: number;
  readonly rateLimitMessage: string;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: ComponentRateLimitConfig = {}) {
    this.enabled = config.enabled ?? DEFAULTS.enabled;
    this.maxInteractions = config.maxInteractions ?? DEFAULTS.maxInteractions;
    this.windowMs = config.windowMs ?? DEFAULTS.windowMs;
    this.rateLimitMessage = config.rateLimitMessage ?? DEFAULTS.rateLimitMessage;

    if (this.enabled) {
      this.cleanupTimer = setInterval(() => this.cleanup(), DEFAULTS.cleanupIntervalMs);
      this.cleanupTimer.unref?.();
    }
  }

  static initialize(config: ComponentRateLimitConfig): void {
    ComponentInteractionRateLimiter.instance?.dispose();
    ComponentInteractionRateLimiter.instance = new ComponentInteractionRateLimiter(config);
  }

  static getInstanceOrNull(): ComponentInteractionRateLimiter | null {
    return ComponentInteractionRateLimiter.instance;
  }

  /** Returns true if the interaction is allowed, false if rate-limited. */
  checkAndRecord(
    userId: string,
    channelId: string,
    componentType: RateLimitedComponentType,
  ): boolean {
    if (!this.enabled) {
      return true;
    }

    const key = `${userId}:${channelId}:${componentType}`;
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let timestamps = this.records.get(key);
    if (timestamps) {
      timestamps = timestamps.filter((ts) => ts > windowStart);
    } else {
      timestamps = [];
    }

    if (timestamps.length >= this.maxInteractions) {
      this.records.set(key, timestamps);
      return false;
    }

    timestamps.push(now);
    this.records.set(key, timestamps);
    return true;
  }

  private cleanup(): void {
    const cutoff = Date.now() - this.windowMs;
    for (const [key, timestamps] of this.records) {
      const valid = timestamps.filter((ts) => ts > cutoff);
      if (valid.length === 0) {
        this.records.delete(key);
      } else {
        this.records.set(key, valid);
      }
    }
  }

  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.records.clear();
    if (ComponentInteractionRateLimiter.instance === this) {
      ComponentInteractionRateLimiter.instance = null;
    }
  }
}
