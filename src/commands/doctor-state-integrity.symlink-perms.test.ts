import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Skip on Windows — symlinks work differently and the issue is Linux/macOS only
const isWindows = process.platform === "win32";

// Capture note() calls
const noteCalls: string[] = [];
vi.mock("../terminal/note.js", () => ({
  note: (msg: string) => {
    noteCalls.push(msg);
  },
}));

describe("noteStateIntegrity: symlink config permissions (#11307)", () => {
  let tempDir: string;
  let stateDir: string;
  let configTarget: string;
  let configSymlink: string;
  const prevEnv: Record<string, string | undefined> = {};

  beforeAll(async () => {
    if (isWindows) {
      return;
    }
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "openclaw-doctor-symlink-"));
    stateDir = path.join(tempDir, ".openclaw");
    await fsp.mkdir(stateDir, { recursive: true, mode: 0o700 });

    // Create target file with world-readable perms (like nix store)
    configTarget = path.join(tempDir, "openclaw-target.json");
    await fsp.writeFile(configTarget, '{"gateway":{"mode":"local"}}\n', "utf-8");
    await fsp.chmod(configTarget, 0o644);

    // Create symlink to it (simulates nix-managed config)
    configSymlink = path.join(stateDir, "openclaw.json");
    await fsp.symlink(configTarget, configSymlink);

    // Create required subdirectories so the function doesn't warn about missing dirs
    for (const sub of ["sessions", "store", "oauth", "agents"]) {
      await fsp.mkdir(path.join(stateDir, sub), { recursive: true, mode: 0o700 });
    }

    prevEnv.OPENCLAW_STATE_DIR = process.env.OPENCLAW_STATE_DIR;
    prevEnv.HOME = process.env.HOME;
    process.env.OPENCLAW_STATE_DIR = stateDir;
    process.env.HOME = tempDir;
  });

  afterAll(async () => {
    if (isWindows) {
      return;
    }
    if (prevEnv.OPENCLAW_STATE_DIR === undefined) {
      delete process.env.OPENCLAW_STATE_DIR;
    } else {
      process.env.OPENCLAW_STATE_DIR = prevEnv.OPENCLAW_STATE_DIR;
    }
    if (prevEnv.HOME === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevEnv.HOME;
    }
    if (tempDir) {
      await fsp.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("does not warn about world-readable permissions on symlinked config", async () => {
    if (isWindows) {
      return;
    }
    // Verify the symlink exists and target is world-readable (the #11307 scenario)
    const lstat = fs.lstatSync(configSymlink);
    expect(lstat.isSymbolicLink()).toBe(true);
    const stat = fs.statSync(configSymlink);
    expect((stat.mode & 0o044) !== 0).toBe(true);

    noteCalls.length = 0;
    const { noteStateIntegrity } = await import("./doctor-state-integrity.js");

    const prompter = {
      confirmSkipInNonInteractive: async () => false,
    };

    await noteStateIntegrity({ gateway: { mode: "local" } }, prompter, configSymlink);

    // No note() call should contain the chmod 600 warning for a symlinked config
    const permWarning = noteCalls.find(
      (msg) => msg.includes("group/world readable") || msg.includes("Recommend chmod 600"),
    );
    expect(permWarning).toBeUndefined();
  });
});
