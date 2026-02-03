import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const execFileMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
  execFile: execFileMock,
}));

import {
  checkSystemdUserEnvPreflight,
  checkSystemdUserServiceAvailable,
  isSystemdUserServiceAvailable,
} from "./systemd.js";

describe("systemd availability", () => {
  const originalXdgRuntimeDir = process.env.XDG_RUNTIME_DIR;
  const originalDbusAddress = process.env.DBUS_SESSION_BUS_ADDRESS;

  beforeEach(() => {
    execFileMock.mockReset();
    // Set required env vars for tests that need systemctl to work
    process.env.XDG_RUNTIME_DIR = "/run/user/1000";
    process.env.DBUS_SESSION_BUS_ADDRESS = "unix:path=/run/user/1000/bus";
  });

  afterEach(() => {
    // Restore original values
    if (originalXdgRuntimeDir !== undefined) {
      process.env.XDG_RUNTIME_DIR = originalXdgRuntimeDir;
    } else {
      delete process.env.XDG_RUNTIME_DIR;
    }
    if (originalDbusAddress !== undefined) {
      process.env.DBUS_SESSION_BUS_ADDRESS = originalDbusAddress;
    } else {
      delete process.env.DBUS_SESSION_BUS_ADDRESS;
    }
  });

  it("returns true when systemctl --user succeeds", async () => {
    execFileMock.mockImplementation((_cmd, _args, _opts, cb) => {
      cb(null, "", "");
    });
    await expect(isSystemdUserServiceAvailable()).resolves.toBe(true);
  });

  it("returns false when systemd user bus is unavailable", async () => {
    execFileMock.mockImplementation((_cmd, _args, _opts, cb) => {
      const err = new Error("Failed to connect to bus") as Error & {
        stderr?: string;
        code?: number;
      };
      err.stderr = "Failed to connect to bus";
      err.code = 1;
      cb(err, "", "");
    });
    await expect(isSystemdUserServiceAvailable()).resolves.toBe(false);
  });

  it("returns false when XDG_RUNTIME_DIR is missing", async () => {
    delete process.env.XDG_RUNTIME_DIR;
    const result = await checkSystemdUserServiceAvailable();
    expect(result.available).toBe(false);
    expect(result.missingEnvVars).toContain("XDG_RUNTIME_DIR");
  });

  it("returns false when DBUS_SESSION_BUS_ADDRESS is missing", async () => {
    delete process.env.DBUS_SESSION_BUS_ADDRESS;
    const result = await checkSystemdUserServiceAvailable();
    expect(result.available).toBe(false);
    expect(result.missingEnvVars).toContain("DBUS_SESSION_BUS_ADDRESS");
  });

  it("checkSystemdUserEnvPreflight detects missing XDG_RUNTIME_DIR", () => {
    const result = checkSystemdUserEnvPreflight({ DBUS_SESSION_BUS_ADDRESS: "unix:path=/tmp/bus" });
    expect(result.ok).toBe(false);
    expect(result.missing).toContain("XDG_RUNTIME_DIR");
  });

  it("checkSystemdUserEnvPreflight detects missing DBUS_SESSION_BUS_ADDRESS", () => {
    const result = checkSystemdUserEnvPreflight({ XDG_RUNTIME_DIR: "/run/user/1000" });
    expect(result.ok).toBe(false);
    expect(result.missing).toContain("DBUS_SESSION_BUS_ADDRESS");
  });

  it("checkSystemdUserEnvPreflight passes when both vars are set", () => {
    const result = checkSystemdUserEnvPreflight({
      XDG_RUNTIME_DIR: "/run/user/1000",
      DBUS_SESSION_BUS_ADDRESS: "unix:path=/run/user/1000/bus",
    });
    expect(result.ok).toBe(true);
    expect(result.missing).toHaveLength(0);
  });
});
