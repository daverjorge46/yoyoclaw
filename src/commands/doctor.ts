/**
 * `clawdis doctor` command - diagnose system prerequisites and configuration.
 */

import chalk from "chalk";

import {
  type PrerequisiteResult,
  type PrerequisitesReport,
  runAllPrerequisiteChecks,
} from "../infra/prerequisites.js";
import type { RuntimeEnv } from "../runtime.js";
import { defaultRuntime } from "../runtime.js";

export interface DoctorOptions {
  json?: boolean;
  verbose?: boolean;
}

const STATUS_ICONS: Record<string, string> = {
  ok: chalk.green("✓"),
  warning: chalk.yellow("!"),
  error: chalk.red("✗"),
  skipped: chalk.gray("○"),
};

const STATUS_COLORS: Record<string, (s: string) => string> = {
  ok: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  skipped: chalk.gray,
};

function formatResult(result: PrerequisiteResult, verbose: boolean): string {
  const icon = STATUS_ICONS[result.status] || "?";
  const color = STATUS_COLORS[result.status] || ((s: string) => s);
  const name = chalk.bold(result.name.padEnd(22));
  const message = color(result.message);

  let line = `  ${icon} ${name} ${message}`;

  if (verbose && result.version) {
    line += chalk.gray(` (v${result.version})`);
  }
  if (verbose && result.required) {
    line += chalk.gray(` [requires ${result.required}]`);
  }

  return line;
}

function formatHint(result: PrerequisiteResult): string | null {
  if (!result.hint) return null;
  return chalk.gray(`    └─ ${result.hint}`);
}

function formatSummary(report: PrerequisitesReport): string {
  const { ok, warning, error, skipped } = report.summary;
  const parts: string[] = [];

  if (ok > 0) parts.push(chalk.green(`${ok} passed`));
  if (warning > 0) parts.push(chalk.yellow(`${warning} warnings`));
  if (error > 0) parts.push(chalk.red(`${error} errors`));
  if (skipped > 0) parts.push(chalk.gray(`${skipped} skipped`));

  return parts.join(", ");
}

export async function doctorCommand(
  opts: DoctorOptions = {},
  runtime: RuntimeEnv = defaultRuntime,
): Promise<void> {
  const { json = false, verbose = false } = opts;

  // Run all checks
  const report = await runAllPrerequisiteChecks();

  // JSON output mode
  if (json) {
    runtime.log(JSON.stringify(report, null, 2));
    if (report.hasErrors) {
      runtime.exit(1);
    }
    return;
  }

  // Pretty output
  runtime.log("");
  runtime.log(chalk.bold.cyan("  Clawdis Doctor"));
  runtime.log(chalk.gray("  ─────────────────────────────────────────────"));
  runtime.log("");

  // Group by category
  const categories = new Map<string, PrerequisiteResult[]>();
  for (const result of report.results) {
    const category = getCategoryForResult(result.name);
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category)?.push(result);
  }

  const categoryOrder = ["Runtime", "Tools", "Configuration", "Network"];
  for (const category of categoryOrder) {
    const results = categories.get(category);
    if (!results || results.length === 0) continue;

    runtime.log(chalk.bold(`  ${category}`));

    for (const result of results) {
      runtime.log(formatResult(result, verbose));
      const hint = formatHint(result);
      if (hint && (result.status === "error" || result.status === "warning")) {
        runtime.log(hint);
      }
    }

    runtime.log("");
  }

  // Summary
  runtime.log(chalk.gray("  ─────────────────────────────────────────────"));
  runtime.log(`  ${formatSummary(report)}`);
  runtime.log("");

  // Exit status
  if (report.hasErrors) {
    runtime.log(
      chalk.red(
        "  Some required prerequisites are missing. Please fix them before continuing.",
      ),
    );
    runtime.log("");
    runtime.exit(1);
  } else if (report.hasWarnings) {
    runtime.log(
      chalk.yellow(
        "  Some optional prerequisites are missing. Clawdis will still work.",
      ),
    );
    runtime.log("");
  } else {
    runtime.log(chalk.green("  All systems go!"));
    runtime.log("");
  }
}

function getCategoryForResult(name: string): string {
  const mapping: Record<string, string> = {
    "Node.js": "Runtime",
    pnpm: "Tools",
    Git: "Tools",
    "Clawdis Config": "Configuration",
    "Agent Workspace": "Configuration",
    "WhatsApp Credentials": "Configuration",
    "Telegram Bot Token": "Configuration",
    "Discord Bot Token": "Configuration",
    "Anthropic API Key": "Configuration",
    "Network Connectivity": "Network",
  };
  return mapping[name] || "Other";
}
