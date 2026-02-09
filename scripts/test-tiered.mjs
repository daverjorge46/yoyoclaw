/**
 * Tiered Test Runner
 *
 * Runs tests by speed tier with optimized parallelism:
 * - Fast tier: High parallelism (runs first, fail-fast)
 * - Medium tier: Moderate parallelism
 * - Slow tier: Low parallelism (runs last)
 *
 * Usage:
 *   node scripts/test-tiered.mjs           # Run all tiers
 *   node scripts/test-tiered.mjs --fast    # Run only fast tier
 *   node scripts/test-tiered.mjs --medium  # Run only medium tier
 *   node scripts/test-tiered.mjs --slow    # Run only slow tier
 *   node scripts/test-tiered.mjs --fast --medium  # Run fast and medium
 *
 * Environment variables:
 *   OPENCLAW_TEST_WORKERS: Override max workers per tier
 *   OPENCLAW_TEST_FAIL_FAST: Stop on first tier failure (default: true)
 */

import { spawn } from "node:child_process";
import os from "node:os";

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const TIERS = {
  fast: {
    name: "fast",
    config: "vitest.tier-fast.config.ts",
    icon: "🟢",
    // Fast tests benefit most from parallelism
    defaultWorkers: (cpus) => Math.max(4, Math.min(16, cpus)),
  },
  medium: {
    name: "medium",
    config: "vitest.tier-medium.config.ts",
    icon: "🟡",
    // Medium tests need moderate parallelism
    defaultWorkers: (cpus) => Math.max(2, Math.min(8, Math.floor(cpus / 2))),
  },
  slow: {
    name: "slow",
    config: "vitest.tier-slow.config.ts",
    icon: "🔴",
    // Slow tests need low parallelism to avoid resource contention
    defaultWorkers: () => 2,
  },
};

const children = new Set();
const args = new Set(process.argv.slice(2));
const cpuCount = os.cpus().length;

// Parse arguments
const selectedTiers = [];
if (args.has("--fast")) {
  selectedTiers.push("fast");
}
if (args.has("--medium")) {
  selectedTiers.push("medium");
}
if (args.has("--slow")) {
  selectedTiers.push("slow");
}

// Default to all tiers if none specified
const tiersToRun = selectedTiers.length > 0 ? selectedTiers : ["fast", "medium", "slow"];

const _isCI = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
const failFast = process.env.OPENCLAW_TEST_FAIL_FAST !== "false";
const overrideWorkers = Number.parseInt(process.env.OPENCLAW_TEST_WORKERS ?? "", 10);
const hasOverride = Number.isFinite(overrideWorkers) && overrideWorkers > 0;

const WARNING_SUPPRESSION_FLAGS = [
  "--disable-warning=ExperimentalWarning",
  "--disable-warning=DEP0040",
  "--disable-warning=DEP0060",
];

const runTier = (tierName) =>
  new Promise((resolve) => {
    const tier = TIERS[tierName];
    const workers = hasOverride ? overrideWorkers : tier.defaultWorkers(cpuCount);

    console.log(
      `\n${tier.icon} Running ${tier.name.toUpperCase()} tier tests (workers: ${workers})...\n`,
    );

    const vitestArgs = ["vitest", "run", "--config", tier.config, "--maxWorkers", String(workers)];

    const nodeOptions = process.env.NODE_OPTIONS ?? "";
    const nextNodeOptions = WARNING_SUPPRESSION_FLAGS.reduce(
      (acc, flag) => (acc.includes(flag) ? acc : `${acc} ${flag}`.trim()),
      nodeOptions,
    );

    const child = spawn(pnpm, vitestArgs, {
      stdio: "inherit",
      env: {
        ...process.env,
        VITEST_TIER: tierName,
        NODE_OPTIONS: nextNodeOptions,
      },
      shell: process.platform === "win32",
    });

    children.add(child);

    child.on("exit", (code, signal) => {
      children.delete(child);
      resolve({
        tier: tierName,
        code: code ?? (signal ? 1 : 0),
      });
    });
  });

const shutdown = (signal) => {
  for (const child of children) {
    child.kill(signal);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Run tiers in sequence for better resource management
console.log("🧪 OpenClaw Tiered Test Runner");
console.log("=".repeat(40));
console.log(`Tiers to run: ${tiersToRun.map((t) => TIERS[t].icon + " " + t).join(", ")}`);
console.log(`Fail fast: ${failFast}`);
console.log(`CPU cores: ${cpuCount}`);
console.log("=".repeat(40));

const startTime = Date.now();
const results = [];

for (const tierName of tiersToRun) {
  const result = await runTier(tierName);
  results.push(result);

  if (result.code !== 0 && failFast) {
    console.log(
      `\n❌ ${TIERS[tierName].icon} ${tierName.toUpperCase()} tier failed (exit code: ${result.code})`,
    );
    console.log("Stopping due to fail-fast mode.\n");
    process.exit(result.code);
  }
}

const duration = ((Date.now() - startTime) / 1000).toFixed(1);

// Print summary
console.log("\n" + "=".repeat(40));
console.log("📊 Test Results Summary");
console.log("=".repeat(40));

let hasFailures = false;
for (const result of results) {
  const tier = TIERS[result.tier];
  const status = result.code === 0 ? "✅ PASS" : "❌ FAIL";
  console.log(`${tier.icon} ${result.tier.toUpperCase().padEnd(8)} ${status}`);
  if (result.code !== 0) {
    hasFailures = true;
  }
}

console.log("=".repeat(40));
console.log(`Total time: ${duration}s`);
console.log("");

process.exit(hasFailures ? 1 : 0);
