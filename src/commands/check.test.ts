import { describe, it, expect } from "vitest";
import type { RuntimeEnv } from "../runtime.js";
import { checkCommand } from "./check.js";

describe("check command", () => {
  it("should run installation checks and return results", async () => {
    const logs: string[] = [];
    const errors: string[] = [];

    const mockRuntime: RuntimeEnv = {
      log: (msg: string) => logs.push(msg),
      error: (msg: string) => errors.push(msg),
      debug: () => {},
      warn: () => {},
      exit: (_code?: number) => {},
      channelLog: () => {},
    };

    await checkCommand(mockRuntime, { json: true });

    // Should output JSON results
    expect(logs.length).toBe(1);
    const result = JSON.parse(logs[0]);
    expect(typeof result.ok).toBe("boolean");
    expect(Array.isArray(result.checks)).toBe(true);
    expect(result.checks.length).toBeGreaterThan(0);

    // Should have expected check IDs
    const checkIds = result.checks.map((c: { id: string }) => c.id);
    expect(checkIds).toContain("config-exists");
    expect(checkIds).toContain("config-valid");
    expect(checkIds).toContain("gateway-mode");
    expect(checkIds).toContain("package-root");
  });

  it("should output JSON when json option is true", async () => {
    const logs: string[] = [];

    const mockRuntime: RuntimeEnv = {
      log: (msg: string) => logs.push(msg),
      error: () => {},
      debug: () => {},
      warn: () => {},
      exit: () => {},
      channelLog: () => {},
    };

    await checkCommand(mockRuntime, { json: true });

    expect(logs.length).toBe(1);
    const result = JSON.parse(logs[0]);
    expect(typeof result.ok).toBe("boolean");
    expect(Array.isArray(result.checks)).toBe(true);
  });

  it("should handle non-interactive mode", async () => {
    const logs: string[] = [];

    const mockRuntime: RuntimeEnv = {
      log: (msg: string) => logs.push(msg),
      error: () => {},
      debug: () => {},
      warn: () => {},
      exit: () => {},
      channelLog: () => {},
    };

    await checkCommand(mockRuntime, { json: true, nonInteractive: true });

    // Should still output results
    expect(logs.length).toBe(1);
    const result = JSON.parse(logs[0]);
    expect(typeof result.ok).toBe("boolean");
  });
});
