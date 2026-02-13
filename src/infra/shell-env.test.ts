import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadShellEnvFallback,
  resolveShellEnvFallbackTimeoutMs,
  shouldEnableShellEnvFallback,
} from "./shell-env.js";

describe("resolveShell Windows fallback (#15586)", () => {
  const originalProcess = globalThis.process;

  afterEach(() => {
    vi.stubGlobal("process", originalProcess);
  });

  it("uses COMSPEC on win32 when SHELL is absent", () => {
    vi.stubGlobal("process", { ...originalProcess, platform: "win32" });
    const env: NodeJS.ProcessEnv = { COMSPEC: "C:\\Windows\\System32\\cmd.exe" };
    const exec = vi.fn(() => Buffer.from(""));
    loadShellEnvFallback({
      enabled: true,
      env,
      expectedKeys: ["SOME_KEY"],
      exec: exec as unknown as Parameters<typeof loadShellEnvFallback>[0]["exec"],
      logger: { warn: vi.fn() },
    });
    expect(exec).toHaveBeenCalledTimes(1);
    expect(exec.mock.calls[0][0]).toBe("C:\\Windows\\System32\\cmd.exe");
  });

  it("falls back to cmd.exe on win32 when both SHELL and COMSPEC are absent", () => {
    vi.stubGlobal("process", { ...originalProcess, platform: "win32" });
    const env: NodeJS.ProcessEnv = {};
    const exec = vi.fn(() => Buffer.from(""));
    loadShellEnvFallback({
      enabled: true,
      env,
      expectedKeys: ["SOME_KEY"],
      exec: exec as unknown as Parameters<typeof loadShellEnvFallback>[0]["exec"],
      logger: { warn: vi.fn() },
    });
    expect(exec).toHaveBeenCalledTimes(1);
    expect(exec.mock.calls[0][0]).toBe("cmd.exe");
  });

  it("falls back to /bin/sh on non-Windows when SHELL is absent", () => {
    const env: NodeJS.ProcessEnv = {};
    const exec = vi.fn(() => Buffer.from(""));
    loadShellEnvFallback({
      enabled: true,
      env,
      expectedKeys: ["SOME_KEY"],
      exec: exec as unknown as Parameters<typeof loadShellEnvFallback>[0]["exec"],
      logger: { warn: vi.fn() },
    });
    expect(exec).toHaveBeenCalledTimes(1);
    expect(exec.mock.calls[0][0]).toBe("/bin/sh");
  });

  it("prefers SHELL over platform fallback", () => {
    vi.stubGlobal("process", { ...originalProcess, platform: "win32" });
    const env: NodeJS.ProcessEnv = {
      SHELL: "/usr/bin/bash",
      COMSPEC: "C:\\Windows\\System32\\cmd.exe",
    };
    const exec = vi.fn(() => Buffer.from(""));
    loadShellEnvFallback({
      enabled: true,
      env,
      expectedKeys: ["SOME_KEY"],
      exec: exec as unknown as Parameters<typeof loadShellEnvFallback>[0]["exec"],
      logger: { warn: vi.fn() },
    });
    expect(exec).toHaveBeenCalledTimes(1);
    expect(exec.mock.calls[0][0]).toBe("/usr/bin/bash");
  });
});

describe("shell env fallback", () => {
  it("is disabled by default", () => {
    expect(shouldEnableShellEnvFallback({} as NodeJS.ProcessEnv)).toBe(false);
    expect(shouldEnableShellEnvFallback({ OPENCLAW_LOAD_SHELL_ENV: "0" })).toBe(false);
    expect(shouldEnableShellEnvFallback({ OPENCLAW_LOAD_SHELL_ENV: "1" })).toBe(true);
  });

  it("resolves timeout from env with default fallback", () => {
    expect(resolveShellEnvFallbackTimeoutMs({} as NodeJS.ProcessEnv)).toBe(15000);
    expect(resolveShellEnvFallbackTimeoutMs({ OPENCLAW_SHELL_ENV_TIMEOUT_MS: "42" })).toBe(42);
    expect(
      resolveShellEnvFallbackTimeoutMs({
        OPENCLAW_SHELL_ENV_TIMEOUT_MS: "nope",
      }),
    ).toBe(15000);
  });

  it("skips when already has an expected key", () => {
    const env: NodeJS.ProcessEnv = { OPENAI_API_KEY: "set" };
    const exec = vi.fn(() => Buffer.from(""));

    const res = loadShellEnvFallback({
      enabled: true,
      env,
      expectedKeys: ["OPENAI_API_KEY", "DISCORD_BOT_TOKEN"],
      exec: exec as unknown as Parameters<typeof loadShellEnvFallback>[0]["exec"],
    });

    expect(res.ok).toBe(true);
    expect(res.applied).toEqual([]);
    expect(res.ok && res.skippedReason).toBe("already-has-keys");
    expect(exec).not.toHaveBeenCalled();
  });

  it("imports expected keys without overriding existing env", () => {
    const env: NodeJS.ProcessEnv = {};
    const exec = vi.fn(() => Buffer.from("OPENAI_API_KEY=from-shell\0DISCORD_BOT_TOKEN=discord\0"));

    const res1 = loadShellEnvFallback({
      enabled: true,
      env,
      expectedKeys: ["OPENAI_API_KEY", "DISCORD_BOT_TOKEN"],
      exec: exec as unknown as Parameters<typeof loadShellEnvFallback>[0]["exec"],
    });

    expect(res1.ok).toBe(true);
    expect(env.OPENAI_API_KEY).toBe("from-shell");
    expect(env.DISCORD_BOT_TOKEN).toBe("discord");
    expect(exec).toHaveBeenCalledTimes(1);

    env.OPENAI_API_KEY = "from-parent";
    const exec2 = vi.fn(() =>
      Buffer.from("OPENAI_API_KEY=from-shell\0DISCORD_BOT_TOKEN=discord2\0"),
    );
    const res2 = loadShellEnvFallback({
      enabled: true,
      env,
      expectedKeys: ["OPENAI_API_KEY", "DISCORD_BOT_TOKEN"],
      exec: exec2 as unknown as Parameters<typeof loadShellEnvFallback>[0]["exec"],
    });

    expect(res2.ok).toBe(true);
    expect(env.OPENAI_API_KEY).toBe("from-parent");
    expect(env.DISCORD_BOT_TOKEN).toBe("discord");
    expect(exec2).not.toHaveBeenCalled();
  });
});
