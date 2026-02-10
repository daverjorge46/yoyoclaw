import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runConfigBackup } from "./backup-config.js";

describe("runConfigBackup", () => {
  let tmpDir: string;
  let configPath: string;
  let backupDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "backup-config-test-"));
    configPath = path.join(tmpDir, "config.json5");
    backupDir = path.join(tmpDir, "backups");
    await fs.writeFile(configPath, '{ "agents": { "list": [] } }');
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("creates a backup file on first run", async () => {
    const result = await runConfigBackup({ configPath, backupDir });
    expect(result.backed).toBe(true);

    const files = await fs.readdir(backupDir);
    expect(files.length).toBe(1);
    expect(files[0]).toMatch(/^config-backup-.*\.json5$/);
  });

  it("skips backup when config is unchanged", async () => {
    await runConfigBackup({ configPath, backupDir });
    const result = await runConfigBackup({ configPath, backupDir });
    expect(result.backed).toBe(false);
    expect(result.reason).toBe("unchanged");

    const files = await fs.readdir(backupDir);
    expect(files.length).toBe(1);
  });

  it("creates new backup when config changes", async () => {
    await runConfigBackup({ configPath, backupDir });
    await fs.writeFile(configPath, '{ "agents": { "list": ["new"] } }');
    const result = await runConfigBackup({ configPath, backupDir });
    expect(result.backed).toBe(true);

    const files = await fs.readdir(backupDir);
    expect(files.length).toBe(2);
  });

  it("returns error when config file missing", async () => {
    const result = await runConfigBackup({
      configPath: path.join(tmpDir, "missing.json5"),
      backupDir,
    });
    expect(result.backed).toBe(false);
    expect(result.reason).toMatch(/not found/);
  });

  it("prunes backups older than retention period", async () => {
    // Create a backup, then artificially age it
    await runConfigBackup({ configPath, backupDir });
    const files = await fs.readdir(backupDir);
    const oldFile = path.join(backupDir, files[0]);
    // Set mtime to 40 days ago
    const oldTime = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    await fs.utimes(oldFile, oldTime, oldTime);

    // Change config and run again with 30-day retention
    await fs.writeFile(configPath, '{ "changed": true }');
    const result = await runConfigBackup({ configPath, backupDir, retentionDays: 30 });
    expect(result.backed).toBe(true);
    expect(result.pruned).toBe(1);

    const remaining = await fs.readdir(backupDir);
    expect(remaining.length).toBe(1);
  });
});
