import { execSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { existsSync } from "node:fs";

export type DiskSpaceInfo = {
  total: number;
  used: number;
  available: number;
  usagePercent: number;
  path: string;
};

export type DiskSpaceCleanupResult = {
  cleaned: boolean;
  reason?: string;
  freedBytes?: number;
  beforePercent?: number;
  afterPercent?: number;
};

/**
 * Get disk space information for a given path.
 * Cross-platform (macOS, Linux, Windows).
 */
export function getDiskSpace(checkPath: string = "."): DiskSpaceInfo | null {
  try {
    const platform = os.platform();

    if (platform === "win32") {
      // Windows: use wmic or fsutil
      const drive = path.parse(path.resolve(checkPath)).root;
      const output = execSync(
        `wmic logicaldisk where "DeviceID='${drive.replace("\\", "")}'" get Size,FreeSpace /format:csv`,
        {
          encoding: "utf8",
          timeout: 5000,
        },
      );
      const lines = output
        .trim()
        .split("\n")
        .filter((l) => l.trim());
      if (lines.length < 2) return null;
      const parts = lines[1].split(",");
      if (parts.length < 3) return null;
      const available = Number.parseInt(parts[1], 10);
      const total = Number.parseInt(parts[2], 10);
      const used = total - available;
      return {
        total,
        used,
        available,
        usagePercent: (used / total) * 100,
        path: drive,
      };
    }

    // Unix-like (macOS, Linux): use df
    const output = execSync(`df -k "${checkPath}"`, {
      encoding: "utf8",
      timeout: 5000,
    });
    const lines = output.trim().split("\n");
    if (lines.length < 2) return null;

    // Parse df output: Filesystem 1K-blocks Used Available Use% Mounted
    const parts = lines[1].split(/\s+/);
    if (parts.length < 6) return null;

    const total = Number.parseInt(parts[1], 10) * 1024; // KB to bytes
    const used = Number.parseInt(parts[2], 10) * 1024;
    const available = Number.parseInt(parts[3], 10) * 1024;
    const usagePercent = Number.parseFloat(parts[4].replace("%", ""));
    const mountPoint = parts[5];

    return {
      total,
      used,
      available,
      usagePercent,
      path: mountPoint,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Run cache cleanup commands safely.
 * Returns the number of bytes freed (estimate).
 */
function runCleanupCommands(opts?: { aggressive?: boolean }): number {
  let freedBytes = 0;
  const homeDir = os.homedir();
  const openclawDir = path.join(homeDir, ".openclaw");
  const { aggressive = false } = opts || {};

  try {
    // Clean npm cache
    try {
      execSync("npm cache clean --force", { timeout: 30000, stdio: "pipe" });
      freedBytes += 10 * 1024 * 1024 * 1024; // Estimate 10GB
    } catch {
      // Ignore errors
    }

    // Clean yarn cache
    try {
      const yarnCacheDir = path.join(homeDir, "Library", "Caches", "Yarn");
      if (existsSync(yarnCacheDir)) {
        execSync(`rm -rf "${yarnCacheDir}"`, { timeout: 30000, stdio: "pipe" });
        freedBytes += 15 * 1024 * 1024 * 1024; // Estimate 15GB
      }
    } catch {
      // Ignore errors
    }

    // Clean pnpm store
    try {
      execSync("pnpm store prune", { timeout: 30000, stdio: "pipe" });
      freedBytes += 5 * 1024 * 1024 * 1024; // Estimate 5GB
    } catch {
      // Ignore errors - pnpm might not be installed
    }

    // Clean Homebrew cache (macOS only)
    if (os.platform() === "darwin") {
      try {
        execSync("brew cleanup -s", { timeout: 60000, stdio: "pipe" });
        freedBytes += 1 * 1024 * 1024 * 1024; // Estimate 1GB
      } catch {
        // Ignore errors - brew might not be installed
      }
    }

    // Clean OpenClaw browser cache
    const browserCacheDir = path.join(openclawDir, "browser");
    if (existsSync(browserCacheDir)) {
      try {
        execSync(`rm -rf "${browserCacheDir}"/*`, { timeout: 10000, stdio: "pipe" });
        freedBytes += 100 * 1024 * 1024; // Estimate 100MB
      } catch {
        // Ignore errors
      }
    }

    // Clean old OpenClaw session logs (>7 days)
    const agentsDir = path.join(openclawDir, "agents");
    if (existsSync(agentsDir)) {
      try {
        execSync(`find "${agentsDir}" -name "*.jsonl" -mtime +7 -delete`, {
          timeout: 10000,
          stdio: "pipe",
        });
        freedBytes += 50 * 1024 * 1024; // Estimate 50MB
      } catch {
        // Ignore errors
      }
    }

    // Clean old OpenClaw memory snapshots (keep last 10)
    const memoryDir = path.join(openclawDir, "memory");
    if (existsSync(memoryDir)) {
      try {
        execSync(
          `cd "${memoryDir}" && ls -t snapshot-*.json 2>/dev/null | tail -n +11 | xargs rm -f`,
          {
            timeout: 10000,
            stdio: "pipe",
            shell: "/bin/bash",
          },
        );
        freedBytes += 10 * 1024 * 1024; // Estimate 10MB
      } catch {
        // Ignore errors
      }
    }

    // Clean /data volume (Render-specific persistent disk)
    const dataOpenclawDir = "/data/.openclaw";
    if (existsSync(dataOpenclawDir)) {
      try {
        // Clean old session logs from /data
        const dataAgentsDir = path.join(dataOpenclawDir, "agents");
        if (existsSync(dataAgentsDir)) {
          const ageThreshold = aggressive ? 1 : 7; // 1 day if aggressive, 7 days otherwise
          execSync(`find "${dataAgentsDir}" -name "*.jsonl" -mtime +${ageThreshold} -delete`, {
            timeout: 10000,
            stdio: "pipe",
          });
          freedBytes += aggressive ? 100 * 1024 * 1024 : 50 * 1024 * 1024; // Estimate 100MB aggressive, 50MB normal
        }

        // Clean browser cache from /data
        const dataBrowserDir = path.join(dataOpenclawDir, "browser");
        if (existsSync(dataBrowserDir)) {
          execSync(`rm -rf "${dataBrowserDir}"/*`, { timeout: 10000, stdio: "pipe" });
          freedBytes += 100 * 1024 * 1024; // Estimate 100MB
        }

        // Clean old memory snapshots from /data
        const dataMemoryDir = path.join(dataOpenclawDir, "memory");
        if (existsSync(dataMemoryDir)) {
          const keepCount = aggressive ? 3 : 10; // Keep fewer snapshots if aggressive
          execSync(
            `cd "${dataMemoryDir}" && ls -t snapshot-*.json 2>/dev/null | tail -n +${keepCount + 1} | xargs rm -f`,
            {
              timeout: 10000,
              stdio: "pipe",
              shell: "/bin/bash",
            },
          );
          freedBytes += 10 * 1024 * 1024; // Estimate 10MB
        }

        // Clean large workspace files (>100MB, older than threshold)
        const dataWorkspaceDir = "/data/workspace";
        if (existsSync(dataWorkspaceDir) && aggressive) {
          try {
            execSync(
              `find "${dataWorkspaceDir}" -type f -size +100M -mtime +${aggressive ? 1 : 7} -delete`,
              {
                timeout: 30000,
                stdio: "pipe",
              },
            );
            freedBytes += 200 * 1024 * 1024; // Estimate 200MB
          } catch {
            // Ignore errors - workspace might be in use
          }
        }
      } catch {
        // Ignore errors
      }
    }
  } catch {
    // Global catch for any unexpected errors
  }

  return freedBytes;
}

/**
 * Check disk space and automatically clean if usage is above threshold.
 * Returns cleanup result with before/after stats.
 */
export function autoCleanDiskSpace(opts: {
  checkPath?: string;
  thresholdPercent?: number;
  log?: {
    info: (msg: string) => void;
    warn: (msg: string) => void;
  };
}): DiskSpaceCleanupResult {
  const { checkPath = ".", thresholdPercent = 85, log } = opts;

  const before = getDiskSpace(checkPath);
  if (!before) {
    return {
      cleaned: false,
      reason: "unable to determine disk space",
    };
  }

  log?.info(
    `disk space: ${Math.round(before.usagePercent)}% used (${formatBytes(before.available)} available)`,
  );

  if (before.usagePercent < thresholdPercent) {
    return {
      cleaned: false,
      reason: `disk usage below threshold (${Math.round(before.usagePercent)}% < ${thresholdPercent}%)`,
      beforePercent: before.usagePercent,
    };
  }

  log?.warn(
    `disk usage above ${thresholdPercent}% (${Math.round(before.usagePercent)}%), running cleanup...`,
  );

  // Use aggressive cleanup if disk is critically full (>95%)
  const aggressive = before.usagePercent > 95;
  if (aggressive) {
    log?.warn("disk critically full (>95%), using aggressive cleanup...");
  }

  const freedBytes = runCleanupCommands({ aggressive });

  const after = getDiskSpace(checkPath);
  if (!after) {
    return {
      cleaned: true,
      freedBytes,
      beforePercent: before.usagePercent,
      reason: "cleanup completed but unable to verify",
    };
  }

  log?.info(
    `cleanup complete: ${Math.round(after.usagePercent)}% used (freed ${formatBytes(freedBytes)})`,
  );

  return {
    cleaned: true,
    freedBytes,
    beforePercent: before.usagePercent,
    afterPercent: after.usagePercent,
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))}MB`;
  return `${Math.round(bytes / (1024 * 1024 * 1024))}GB`;
}
