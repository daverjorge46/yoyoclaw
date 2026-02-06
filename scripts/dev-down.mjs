#!/usr/bin/env node
/**
 * Kill Moltbot dev gateway processes bound to port 19001.
 *
 * SAFETY: Only kills processes whose command line matches Moltbot gateway dev signatures.
 * Will NOT kill unrelated processes that happen to use port 19001.
 *
 * Usage:
 *   pnpm dev:down
 *
 * Cross-platform (macOS, Linux).
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PORT = 19001;

/**
 * Find repo root by locating package.json with name "moltbot".
 */
function findRepoRoot(startDir = process.cwd()) {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    const pkgPath = path.join(dir, "package.json");
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      if (pkg.name === "moltbot") {
        return dir;
      }
    } catch {
      // Continue searching
    }
    dir = path.dirname(dir);
  }
  return null;
}

/**
 * Get command line for a PID (macOS/Linux).
 */
function getCommandLine(pid) {
  try {
    // macOS/Linux: ps -p <PID> -o command=
    const output = execSync(`ps -p ${pid} -o command= 2>/dev/null`, { encoding: "utf-8" });
    return output.trim();
  } catch {
    return "";
  }
}

/**
 * Check if a command line matches Moltbot gateway dev process.
 * Returns { match: boolean, reason: string }
 */
function isMoltbotGatewayDev(cmdLine, repoRoot) {
  if (!cmdLine) {
    return { match: false, reason: "empty command line" };
  }

  const lowerCmd = cmdLine.toLowerCase();

  // Signature A: contains "scripts/run-node.mjs" AND "gateway"
  if (cmdLine.includes("scripts/run-node.mjs") && lowerCmd.includes("gateway")) {
    return { match: true, reason: "run-node.mjs gateway" };
  }

  // Signature B: contains "--dev" AND "gateway"
  if (lowerCmd.includes("--dev") && lowerCmd.includes("gateway")) {
    return { match: true, reason: "--dev gateway" };
  }

  // Signature C: contains repo root path AND "gateway"
  if (repoRoot && cmdLine.includes(repoRoot) && lowerCmd.includes("gateway")) {
    return { match: true, reason: "repo path + gateway" };
  }

  // Signature D: moltbot-gateway binary (the compiled name)
  if (cmdLine.includes("moltbot-gateway") || cmdLine.includes("moltbot gateway")) {
    return { match: true, reason: "moltbot-gateway binary" };
  }

  return { match: false, reason: "no gateway signature" };
}

function findPidsOnPort(port) {
  try {
    // macOS/Linux: lsof -i :PORT -t
    const output = execSync(`lsof -i :${port} -t 2>/dev/null`, { encoding: "utf-8" });
    return output.trim().split("\n").filter(Boolean).map((s) => parseInt(s, 10));
  } catch {
    return [];
  }
}

function killPid(pid) {
  try {
    process.kill(pid, "SIGTERM");
    console.log(`[dev-down] Sent SIGTERM to PID ${pid}`);
    return true;
  } catch (err) {
    if (err.code === "ESRCH") {
      // Process already dead
      return true;
    }
    console.error(`[dev-down] Failed to kill PID ${pid}: ${err.message}`);
    return false;
  }
}

// Main
const repoRoot = findRepoRoot();
const pids = findPidsOnPort(PORT);

if (pids.length === 0) {
  console.log(`[dev-down] No processes found on port ${PORT}`);
  process.exit(0);
}

console.log(`[dev-down] Found ${pids.length} process(es) on port ${PORT}: ${pids.join(", ")}`);

// Filter PIDs by command line signature
const toKill = [];
const skipped = [];

for (const pid of pids) {
  const cmdLine = getCommandLine(pid);
  const { match, reason } = isMoltbotGatewayDev(cmdLine, repoRoot);

  if (match) {
    toKill.push({ pid, cmdLine, reason });
  } else {
    skipped.push({ pid, cmdLine, reason });
  }
}

// Report skipped PIDs
for (const { pid, cmdLine, reason } of skipped) {
  const truncCmd = cmdLine.length > 80 ? cmdLine.slice(0, 77) + "..." : cmdLine;
  console.log(`[dev-down] SKIP PID ${pid} (${reason}): ${truncCmd || "(no cmd)"}`);
}

// Fail-closed: if nothing matched, refuse to kill and exit nonzero
if (toKill.length === 0) {
  console.error(`[dev-down] No Moltbot gateway processes found. Refusing to kill ${pids.length} unrelated process(es).`);
  console.error(`[dev-down] If you need to free port ${PORT}, manually inspect and kill the process.`);
  process.exit(1);
}

// Kill only matched PIDs
console.log(`[dev-down] Killing ${toKill.length} Moltbot gateway process(es)...`);
for (const { pid, reason } of toKill) {
  console.log(`[dev-down] PID ${pid} (${reason})`);
  killPid(pid);
}

console.log("[dev-down] Done (SIGTERM sent; processes may take a moment to exit)");
