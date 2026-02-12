import { afterEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import { startHeartbeatRunner } from "./heartbeat-runner.js";
import { requestHeartbeatNow } from "./heartbeat-wake.js";

describe("startHeartbeatRunner", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("updates scheduling when config changes without restart", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));

    const runSpy = vi.fn().mockResolvedValue({ status: "ran", durationMs: 1 });

    const runner = startHeartbeatRunner({
      cfg: {
        agents: { defaults: { heartbeat: { every: "30m" } } },
      } as OpenClawConfig,
      runOnce: runSpy,
    });

    await vi.advanceTimersByTimeAsync(30 * 60_000 + 1_000);

    expect(runSpy).toHaveBeenCalledTimes(1);
    expect(runSpy.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ agentId: "main", reason: "interval" }),
    );

    runner.updateConfig({
      agents: {
        defaults: { heartbeat: { every: "30m" } },
        list: [
          { id: "main", heartbeat: { every: "10m" } },
          { id: "ops", heartbeat: { every: "15m" } },
        ],
      },
    } as OpenClawConfig);

    await vi.advanceTimersByTimeAsync(10 * 60_000 + 1_000);

    expect(runSpy).toHaveBeenCalledTimes(2);
    expect(runSpy.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({ agentId: "main", heartbeat: { every: "10m" } }),
    );

    await vi.advanceTimersByTimeAsync(5 * 60_000 + 1_000);

    expect(runSpy).toHaveBeenCalledTimes(3);
    expect(runSpy.mock.calls[2]?.[0]).toEqual(
      expect.objectContaining({ agentId: "ops", heartbeat: { every: "15m" } }),
    );

    runner.stop();
  });

  it("non-interval triggers respect per-agent intervals (#14986)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));

    const runSpy = vi.fn().mockResolvedValue({ status: "ran", durationMs: 1 });

    const runner = startHeartbeatRunner({
      cfg: {
        agents: {
          defaults: { heartbeat: { every: "30m" } },
          list: [
            { id: "main", heartbeat: { every: "30m" } },
            { id: "secondary", heartbeat: { every: "4h" } },
          ],
        },
      } as OpenClawConfig,
      runOnce: runSpy,
    });

    // Advance past main's first interval
    await vi.advanceTimersByTimeAsync(31 * 60_000);

    // Only main should have fired
    expect(runSpy).toHaveBeenCalledTimes(1);
    expect(runSpy.mock.calls[0]?.[0]).toEqual(expect.objectContaining({ agentId: "main" }));

    // Trigger a non-interval wake (e.g. exec-event).
    // Before the fix, this would run ALL agents regardless of their interval.
    runSpy.mockClear();
    requestHeartbeatNow({ reason: "exec-event" });
    await vi.advanceTimersByTimeAsync(1_000);

    // Only the default (main) agent should fire; secondary is NOT due.
    const mainCalls = runSpy.mock.calls.filter((call) => call[0]?.agentId === "main");
    const secondaryCalls = runSpy.mock.calls.filter((call) => call[0]?.agentId === "secondary");
    expect(mainCalls.length).toBe(1);
    expect(secondaryCalls.length).toBe(0);

    runner.stop();
  });

  it("secondary agent fires only after its own interval elapses", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));

    const runSpy = vi.fn().mockResolvedValue({ status: "ran", durationMs: 1 });

    const runner = startHeartbeatRunner({
      cfg: {
        agents: {
          defaults: { heartbeat: { every: "30m" } },
          list: [
            { id: "main", heartbeat: { every: "30m" } },
            { id: "secondary", heartbeat: { every: "2h" } },
          ],
        },
      } as OpenClawConfig,
      runOnce: runSpy,
    });

    // Advance ~91 minutes - main should fire 3 times, secondary 0 times
    await vi.advanceTimersByTimeAsync(91 * 60_000);

    const mainCalls = runSpy.mock.calls.filter((call) => call[0]?.agentId === "main");
    const secondaryCalls = runSpy.mock.calls.filter((call) => call[0]?.agentId === "secondary");
    expect(mainCalls.length).toBe(3);
    expect(secondaryCalls.length).toBe(0);

    // Advance to 2h+ total - secondary should now fire exactly once
    await vi.advanceTimersByTimeAsync(30 * 60_000);

    const secondaryCallsAfter = runSpy.mock.calls.filter(
      (call) => call[0]?.agentId === "secondary",
    );
    expect(secondaryCallsAfter.length).toBe(1);

    runner.stop();
  });
});
