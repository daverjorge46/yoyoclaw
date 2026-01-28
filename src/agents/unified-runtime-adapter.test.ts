import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type { AgentRuntimeKind, AgentRuntimeResult } from "./agent-runtime.js";
import type { RuntimeSlot, UnifiedRuntimeConfig } from "./unified-runtime-adapter.js";

// Mock dependencies
vi.mock("./failover-error.js", () => ({
  coerceToFailoverError: vi.fn((err) => {
    if (err?.name === "FailoverError") return err;
    return null;
  }),
  describeFailoverError: vi.fn((err) => ({
    message: err instanceof Error ? err.message : String(err),
    reason: err?.reason ?? "rate_limit",
    status: err?.status ?? 429,
    code: err?.code,
  })),
  isFailoverError: vi.fn((err) => err?.name === "FailoverError"),
  isTimeoutError: vi.fn(() => false),
}));

vi.mock("./auth-profiles.js", () => ({
  ensureAuthProfileStore: vi.fn(() => ({
    profiles: {},
    cooldowns: new Map(),
  })),
  isProfileInCooldown: vi.fn(() => false),
  markAuthProfileCooldown: vi.fn(),
  resolveAuthProfileOrder: vi.fn(() => []),
}));

vi.mock("../logging/subsystem.js", () => ({
  createSubsystemLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import { runWithUnifiedFallback, isRuntimeSlotAvailable } from "./unified-runtime-adapter.js";
import {
  isProfileInCooldown,
  markAuthProfileCooldown,
  resolveAuthProfileOrder,
} from "./auth-profiles.js";
import { coerceToFailoverError, isFailoverError } from "./failover-error.js";

describe("unified-runtime-adapter", () => {
  const successResult: AgentRuntimeResult = {
    payloads: [{ text: "Success" }],
    meta: { durationMs: 100 },
  };

  const createConfig = (overrides?: Partial<UnifiedRuntimeConfig>): UnifiedRuntimeConfig => ({
    primaryRuntime: "pi",
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isProfileInCooldown).mockReturnValue(false);
    vi.mocked(resolveAuthProfileOrder).mockReturnValue([]);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("runWithUnifiedFallback", () => {
    describe("basic execution", () => {
      it("executes run function with primary runtime", async () => {
        const runFn = vi.fn().mockResolvedValue(successResult);

        const result = await runWithUnifiedFallback({
          config: createConfig(),
          run: runFn,
        });

        expect(runFn).toHaveBeenCalledWith(
          expect.objectContaining({
            runtime: "pi",
            provider: "anthropic",
            model: "claude-sonnet-4-20250514",
          }),
        );
        expect(result.runtime).toBe("pi");
        expect(result.result).toBe(successResult);
      });

      it("returns result with correct structure", async () => {
        const runFn = vi.fn().mockResolvedValue(successResult);

        const result = await runWithUnifiedFallback({
          config: createConfig(),
          run: runFn,
        });

        expect(result).toMatchObject({
          result: successResult,
          runtime: "pi",
          provider: "anthropic",
          model: "claude-sonnet-4-20250514",
          attempts: [],
        });
      });
    });

    describe("runtime failover", () => {
      it("fails over to fallback runtime when primary fails", async () => {
        const failoverError = Object.assign(new Error("Rate limit"), {
          name: "FailoverError",
          reason: "rate_limit",
        });
        vi.mocked(isFailoverError).mockReturnValue(true);
        vi.mocked(coerceToFailoverError).mockReturnValue(failoverError as any);

        const runFn = vi
          .fn()
          .mockImplementation(async ({ runtime }: { runtime: AgentRuntimeKind }) => {
            if (runtime === "ccsdk") throw failoverError;
            return successResult;
          });

        const result = await runWithUnifiedFallback({
          config: createConfig({
            primaryRuntime: "ccsdk",
            fallbackRuntimes: [{ runtime: "pi" }],
          }),
          run: runFn,
        });

        expect(result.runtime).toBe("pi");
        expect(result.attempts.length).toBe(1);
        expect(result.attempts[0].runtime).toBe("ccsdk");
      });

      it("tries all fallback runtimes in order", async () => {
        const failoverError = Object.assign(new Error("Failed"), {
          name: "FailoverError",
          reason: "rate_limit",
        });
        vi.mocked(isFailoverError).mockReturnValue(true);
        vi.mocked(coerceToFailoverError).mockReturnValue(failoverError as any);

        const runtimeOrder: AgentRuntimeKind[] = [];
        let successOnThird = false;

        const runFn = vi
          .fn()
          .mockImplementation(async ({ runtime }: { runtime: AgentRuntimeKind }) => {
            runtimeOrder.push(runtime);
            if (runtimeOrder.length < 3) throw failoverError;
            successOnThird = true;
            return successResult;
          });

        await runWithUnifiedFallback({
          config: createConfig({
            primaryRuntime: "ccsdk",
            fallbackRuntimes: [
              { runtime: "pi", provider: "openai" },
              { runtime: "pi", provider: "google" },
            ],
          }),
          run: runFn,
        });

        expect(runtimeOrder).toEqual(["ccsdk", "pi", "pi"]);
        expect(successOnThird).toBe(true);
      });

      it("throws when all runtimes fail", async () => {
        const failoverError = Object.assign(new Error("All failed"), {
          name: "FailoverError",
          reason: "rate_limit",
        });
        vi.mocked(isFailoverError).mockReturnValue(true);
        vi.mocked(coerceToFailoverError).mockReturnValue(failoverError as any);

        const runFn = vi.fn().mockRejectedValue(failoverError);

        await expect(
          runWithUnifiedFallback({
            config: createConfig({
              primaryRuntime: "ccsdk",
              fallbackRuntimes: [{ runtime: "pi" }],
            }),
            run: runFn,
          }),
        ).rejects.toThrow();
      });

      it("does not deduplicate distinct slot configurations", async () => {
        const attempts: string[] = [];
        const failoverError = Object.assign(new Error("Failed"), {
          name: "FailoverError",
          reason: "rate_limit",
        });
        vi.mocked(isFailoverError).mockReturnValue(true);
        vi.mocked(coerceToFailoverError).mockReturnValue(failoverError as any);

        const runFn = vi
          .fn()
          .mockImplementation(
            async ({ runtime, provider }: { runtime: AgentRuntimeKind; provider: string }) => {
              const key = `${runtime}:${provider}`;
              attempts.push(key);
              // Fail first attempt, succeed on second distinct slot
              if (attempts.length < 2) throw failoverError;
              return successResult;
            },
          );

        // Two different providers for Pi - these should NOT be deduplicated
        const result = await runWithUnifiedFallback({
          config: createConfig({
            primaryRuntime: "pi",
            provider: "anthropic",
            fallbackRuntimes: [{ runtime: "pi", provider: "openai" }],
          }),
          run: runFn,
        });

        // Both distinct slots should have been attempted
        expect(attempts).toContain("pi:anthropic");
        expect(attempts).toContain("pi:openai");
        expect(attempts.length).toBe(2);
        // Should have succeeded on second slot
        expect(result.provider).toBe("openai");
      });
    });

    describe("profile rotation", () => {
      it("rotates through profiles on rate limit errors", async () => {
        vi.mocked(resolveAuthProfileOrder).mockReturnValue(["profile-1", "profile-2", "profile-3"]);

        const failoverError = Object.assign(new Error("Rate limit"), {
          name: "FailoverError",
          reason: "rate_limit",
        });
        vi.mocked(isFailoverError).mockReturnValue(true);
        vi.mocked(coerceToFailoverError).mockReturnValue(failoverError as any);

        const profilesAttempted: (string | undefined)[] = [];
        let attemptCount = 0;

        const runFn = vi.fn().mockImplementation(async ({ profileId }: { profileId?: string }) => {
          profilesAttempted.push(profileId);
          attemptCount++;
          if (attemptCount < 3) throw failoverError;
          return successResult;
        });

        await runWithUnifiedFallback({
          config: createConfig({ authProfiles: ["profile-1", "profile-2", "profile-3"] }),
          run: runFn,
        });

        expect(profilesAttempted).toEqual(["profile-1", "profile-2", "profile-3"]);
      });

      it("marks profile as cooled down on auth error", async () => {
        vi.mocked(resolveAuthProfileOrder).mockReturnValue(["profile-1"]);

        const authError = Object.assign(new Error("Auth failed"), {
          name: "FailoverError",
          reason: "auth",
        });
        vi.mocked(isFailoverError).mockReturnValue(true);
        vi.mocked(coerceToFailoverError).mockReturnValue(authError as any);

        let attemptCount = 0;
        const runFn = vi.fn().mockImplementation(async () => {
          attemptCount++;
          if (attemptCount === 1) throw authError;
          return successResult;
        });

        // Use CCSDK as fallback (different runtime) to avoid deduplication
        await runWithUnifiedFallback({
          config: createConfig({
            primaryRuntime: "pi",
            authProfiles: ["profile-1"],
            fallbackRuntimes: [{ runtime: "ccsdk" }],
          }),
          cfg: {} as any,
          run: runFn,
        });

        expect(markAuthProfileCooldown).toHaveBeenCalledWith(
          expect.objectContaining({
            profileId: "profile-1",
          }),
        );
      });

      it("marks profile as cooled down on billing error", async () => {
        vi.mocked(resolveAuthProfileOrder).mockReturnValue(["profile-1"]);

        const billingError = Object.assign(new Error("Billing error"), {
          name: "FailoverError",
          reason: "billing",
        });
        vi.mocked(isFailoverError).mockReturnValue(true);
        vi.mocked(coerceToFailoverError).mockReturnValue(billingError as any);

        let attemptCount = 0;
        const runFn = vi.fn().mockImplementation(async () => {
          attemptCount++;
          if (attemptCount === 1) throw billingError;
          return successResult;
        });

        // Use CCSDK as fallback (different runtime) to avoid deduplication
        await runWithUnifiedFallback({
          config: createConfig({
            primaryRuntime: "pi",
            authProfiles: ["profile-1"],
            fallbackRuntimes: [{ runtime: "ccsdk" }],
          }),
          cfg: {} as any,
          run: runFn,
        });

        expect(markAuthProfileCooldown).toHaveBeenCalled();
      });

      it("skips slots when all profiles are in cooldown", async () => {
        // Return profiles only for CCSDK/anthropic, empty for Pi/openai
        vi.mocked(resolveAuthProfileOrder).mockImplementation(({ provider }) => {
          return provider === "anthropic" ? ["profile-1", "profile-2"] : [];
        });
        // All anthropic profiles are in cooldown
        vi.mocked(isProfileInCooldown).mockReturnValue(true);

        const runFn = vi.fn().mockResolvedValue(successResult);

        const result = await runWithUnifiedFallback({
          config: createConfig({
            primaryRuntime: "ccsdk",
            provider: "anthropic",
            // Pi with openai has no profiles, so no cooldown check
            fallbackRuntimes: [{ runtime: "pi", provider: "openai" }],
          }),
          cfg: {} as any,
          run: runFn,
        });

        // First slot (ccsdk/anthropic) skipped due to cooldown, second (pi/openai) succeeded
        expect(result.attempts.some((a) => a.reason === "rate_limit")).toBe(true);
        expect(result.runtime).toBe("pi");
        expect(result.provider).toBe("openai");
      });
    });

    describe("error handling", () => {
      it("rethrows AbortError immediately", async () => {
        const abortError = new Error("Aborted");
        abortError.name = "AbortError";

        const runFn = vi.fn().mockRejectedValue(abortError);

        await expect(
          runWithUnifiedFallback({
            config: createConfig(),
            run: runFn,
          }),
        ).rejects.toThrow("Aborted");
      });

      it("rethrows non-failover errors", async () => {
        const genericError = new Error("Unexpected error");
        vi.mocked(isFailoverError).mockReturnValue(false);
        vi.mocked(coerceToFailoverError).mockReturnValue(null);

        const runFn = vi.fn().mockRejectedValue(genericError);

        await expect(
          runWithUnifiedFallback({
            config: createConfig(),
            run: runFn,
          }),
        ).rejects.toThrow("Unexpected error");
      });

      it("calls onError callback for each failed attempt", async () => {
        const failoverError = Object.assign(new Error("Failed"), {
          name: "FailoverError",
          reason: "rate_limit",
        });
        vi.mocked(isFailoverError).mockReturnValue(true);
        vi.mocked(coerceToFailoverError).mockReturnValue(failoverError as any);

        const onError = vi.fn();
        let attemptCount = 0;

        const runFn = vi.fn().mockImplementation(async () => {
          attemptCount++;
          if (attemptCount < 2) throw failoverError;
          return successResult;
        });

        // Use CCSDK as fallback (different runtime) to have 2 distinct slots
        await runWithUnifiedFallback({
          config: createConfig({
            primaryRuntime: "pi",
            fallbackRuntimes: [{ runtime: "ccsdk" }],
          }),
          run: runFn,
          onError,
        });

        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            runtime: "pi",
            error: failoverError,
            attempt: 1,
          }),
        );
      });

      it("includes error summary when all attempts fail", async () => {
        const failoverError = Object.assign(new Error("Failed"), {
          name: "FailoverError",
          reason: "rate_limit",
        });
        vi.mocked(isFailoverError).mockReturnValue(true);
        vi.mocked(coerceToFailoverError).mockReturnValue(failoverError as any);

        const runFn = vi.fn().mockRejectedValue(failoverError);

        // Use CCSDK as fallback (different runtime) to have 2 distinct slots
        // With 2+ attempts, the error summary format is used instead of rethrowing original
        await expect(
          runWithUnifiedFallback({
            config: createConfig({
              primaryRuntime: "pi",
              fallbackRuntimes: [{ runtime: "ccsdk" }],
            }),
            run: runFn,
          }),
        ).rejects.toThrow(/All runtimes failed/);
      });
    });

    describe("single attempt behavior", () => {
      it("throws original error when only one attempt fails", async () => {
        const failoverError = Object.assign(new Error("Single failure"), {
          name: "FailoverError",
          reason: "rate_limit",
        });
        vi.mocked(isFailoverError).mockReturnValue(true);
        vi.mocked(coerceToFailoverError).mockReturnValue(failoverError as any);

        const runFn = vi.fn().mockRejectedValue(failoverError);

        await expect(
          runWithUnifiedFallback({
            config: createConfig(), // No fallbacks
            run: runFn,
          }),
        ).rejects.toThrow("Single failure");
      });
    });
  });

  describe("isRuntimeSlotAvailable", () => {
    it("returns true when no profiles are configured", () => {
      vi.mocked(resolveAuthProfileOrder).mockReturnValue([]);

      const slot: RuntimeSlot = { runtime: "pi" };
      const result = isRuntimeSlotAvailable({
        slot,
        config: createConfig(),
      });

      expect(result).toBe(true);
    });

    it("returns true when at least one profile is not in cooldown", () => {
      vi.mocked(resolveAuthProfileOrder).mockReturnValue(["profile-1", "profile-2"]);
      vi.mocked(isProfileInCooldown).mockImplementation((_, id) => id === "profile-1");

      const slot: RuntimeSlot = { runtime: "pi" };
      const result = isRuntimeSlotAvailable({
        slot,
        config: createConfig({ authProfiles: ["profile-1", "profile-2"] }),
        cfg: {} as any,
      });

      expect(result).toBe(true);
    });

    it("returns false when all profiles are in cooldown", () => {
      vi.mocked(resolveAuthProfileOrder).mockReturnValue(["profile-1", "profile-2"]);
      vi.mocked(isProfileInCooldown).mockReturnValue(true);

      const slot: RuntimeSlot = { runtime: "pi" };
      const result = isRuntimeSlotAvailable({
        slot,
        config: createConfig({ authProfiles: ["profile-1", "profile-2"] }),
        cfg: {} as any,
      });

      expect(result).toBe(false);
    });
  });
});
