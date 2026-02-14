import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseSystemdShow, patchSystemdUnitVersion, resolveSystemdUserUnitPath } from "./systemd.js";

describe("systemd runtime parsing", () => {
  it("parses active state details", () => {
    const output = [
      "ActiveState=inactive",
      "SubState=dead",
      "MainPID=0",
      "ExecMainStatus=2",
      "ExecMainCode=exited",
    ].join("\n");
    expect(parseSystemdShow(output)).toEqual({
      activeState: "inactive",
      subState: "dead",
      execMainStatus: 2,
      execMainCode: "exited",
    });
  });
});

describe("resolveSystemdUserUnitPath", () => {
  it("uses default service name when OPENCLAW_PROFILE is default", () => {
    const env = { HOME: "/home/test", OPENCLAW_PROFILE: "default" };
    expect(resolveSystemdUserUnitPath(env)).toBe(
      "/home/test/.config/systemd/user/openclaw-gateway.service",
    );
  });

  it("uses default service name when OPENCLAW_PROFILE is unset", () => {
    const env = { HOME: "/home/test" };
    expect(resolveSystemdUserUnitPath(env)).toBe(
      "/home/test/.config/systemd/user/openclaw-gateway.service",
    );
  });

  it("uses profile-specific service name when OPENCLAW_PROFILE is set to a custom value", () => {
    const env = { HOME: "/home/test", OPENCLAW_PROFILE: "jbphoenix" };
    expect(resolveSystemdUserUnitPath(env)).toBe(
      "/home/test/.config/systemd/user/openclaw-gateway-jbphoenix.service",
    );
  });

  it("prefers OPENCLAW_SYSTEMD_UNIT over OPENCLAW_PROFILE", () => {
    const env = {
      HOME: "/home/test",
      OPENCLAW_PROFILE: "jbphoenix",
      OPENCLAW_SYSTEMD_UNIT: "custom-unit",
    };
    expect(resolveSystemdUserUnitPath(env)).toBe(
      "/home/test/.config/systemd/user/custom-unit.service",
    );
  });

  it("handles OPENCLAW_SYSTEMD_UNIT with .service suffix", () => {
    const env = {
      HOME: "/home/test",
      OPENCLAW_SYSTEMD_UNIT: "custom-unit.service",
    };
    expect(resolveSystemdUserUnitPath(env)).toBe(
      "/home/test/.config/systemd/user/custom-unit.service",
    );
  });

  it("trims whitespace from OPENCLAW_SYSTEMD_UNIT", () => {
    const env = {
      HOME: "/home/test",
      OPENCLAW_SYSTEMD_UNIT: "  custom-unit  ",
    };
    expect(resolveSystemdUserUnitPath(env)).toBe(
      "/home/test/.config/systemd/user/custom-unit.service",
    );
  });

  it("handles case-insensitive 'Default' profile", () => {
    const env = { HOME: "/home/test", OPENCLAW_PROFILE: "Default" };
    expect(resolveSystemdUserUnitPath(env)).toBe(
      "/home/test/.config/systemd/user/openclaw-gateway.service",
    );
  });

  it("handles case-insensitive 'DEFAULT' profile", () => {
    const env = { HOME: "/home/test", OPENCLAW_PROFILE: "DEFAULT" };
    expect(resolveSystemdUserUnitPath(env)).toBe(
      "/home/test/.config/systemd/user/openclaw-gateway.service",
    );
  });

  it("trims whitespace from OPENCLAW_PROFILE", () => {
    const env = { HOME: "/home/test", OPENCLAW_PROFILE: "  myprofile  " };
    expect(resolveSystemdUserUnitPath(env)).toBe(
      "/home/test/.config/systemd/user/openclaw-gateway-myprofile.service",
    );
  });
});

vi.mock("node:child_process", () => ({
  execFile: vi.fn((_cmd: string, _args: string[], _opts: unknown, cb?: Function) => {
    if (cb) {
      cb(null, "", "");
    }
  }),
}));

describe("patchSystemdUnitVersion", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join("/tmp", "systemd-patch-test-"));
    await fs.mkdir(path.join(tmpDir, ".config", "systemd", "user"), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  const sampleUnit = [
    "[Unit]",
    "Description=OpenClaw Gateway (v1.0.0)",
    "After=network-online.target",
    "Wants=network-online.target",
    "",
    "[Service]",
    "ExecStart=/usr/bin/node /opt/openclaw/cli.js gateway",
    "Restart=always",
    "RestartSec=5",
    "KillMode=process",
    "Environment=PATH=/usr/bin:/bin",
    "Environment=OPENCLAW_SERVICE_VERSION=1.0.0",
    "Environment=OPENCLAW_GATEWAY_TOKEN=secret",
    "",
    "[Install]",
    "WantedBy=default.target",
    "",
  ].join("\n");

  it("patches Description and OPENCLAW_SERVICE_VERSION when version differs", async () => {
    const unitPath = path.join(tmpDir, ".config", "systemd", "user", "openclaw-gateway.service");
    await fs.writeFile(unitPath, sampleUnit, "utf8");

    const env = { HOME: tmpDir };
    const result = await patchSystemdUnitVersion({ env, version: "2.0.0" });
    expect(result).toBe(true);

    const patched = await fs.readFile(unitPath, "utf8");
    expect(patched).toContain("Description=OpenClaw Gateway (v2.0.0)");
    expect(patched).toContain("Environment=OPENCLAW_SERVICE_VERSION=2.0.0");
  });

  it("returns false when already current", async () => {
    const unitPath = path.join(tmpDir, ".config", "systemd", "user", "openclaw-gateway.service");
    await fs.writeFile(unitPath, sampleUnit, "utf8");

    const env = { HOME: tmpDir };
    const result = await patchSystemdUnitVersion({ env, version: "1.0.0" });
    expect(result).toBe(false);
  });

  it("returns false when unit file doesn't exist", async () => {
    const env = { HOME: tmpDir };
    const result = await patchSystemdUnitVersion({ env, version: "2.0.0" });
    expect(result).toBe(false);
  });

  it("preserves all other lines unchanged", async () => {
    const unitPath = path.join(tmpDir, ".config", "systemd", "user", "openclaw-gateway.service");
    await fs.writeFile(unitPath, sampleUnit, "utf8");

    const env = { HOME: tmpDir };
    await patchSystemdUnitVersion({ env, version: "2.0.0" });

    const patched = await fs.readFile(unitPath, "utf8");
    expect(patched).toContain("ExecStart=/usr/bin/node /opt/openclaw/cli.js gateway");
    expect(patched).toContain("Environment=PATH=/usr/bin:/bin");
    expect(patched).toContain("Environment=OPENCLAW_GATEWAY_TOKEN=secret");
    expect(patched).toContain("Restart=always");
    expect(patched).toContain("RestartSec=5");
    expect(patched).toContain("KillMode=process");
    expect(patched).toContain("WantedBy=default.target");
  });
});
