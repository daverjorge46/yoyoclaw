import { intro as clackIntro, outro as clackOutro } from "@clack/prompts";
import fs from "node:fs";
import type { RuntimeEnv } from "../runtime.js";
import { formatCliCommand } from "../cli/command-format.js";
import { loadConfig, CONFIG_PATH } from "../config/config.js";
import { resolveOpenClawPackageRoot } from "../infra/openclaw-root.js";
import { defaultRuntime } from "../runtime.js";
import { note } from "../terminal/note.js";
import { stylePromptTitle } from "../terminal/prompt-style.js";

const intro = (message: string) => clackIntro(stylePromptTitle(message) ?? message);
const outro = (message: string) => clackOutro(stylePromptTitle(message) ?? message);

export interface CheckOptions {
  /** Run without interactive prompts */
  nonInteractive?: boolean;
  /** Output results as JSON */
  json?: boolean;
}

export interface CheckResult {
  /** Overall check passed */
  ok: boolean;
  /** Individual check results */
  checks: CheckItemResult[];
}

export interface CheckItemResult {
  /** Check identifier */
  id: string;
  /** Human-readable check name */
  name: string;
  /** Check passed */
  ok: boolean;
  /** Optional message */
  message?: string;
}

/**
 * Run all installation checks
 */
async function runInstallationChecks(): Promise<CheckResult> {
  const checks: CheckItemResult[] = [];

  // Check 1: Config file exists
  const configExists = fs.existsSync(CONFIG_PATH);
  checks.push({
    id: "config-exists",
    name: "Configuration file exists",
    ok: configExists,
    message: configExists
      ? undefined
      : `Run ${formatCliCommand("openclaw setup")} to create a config file`,
  });

  // Check 2: Config is valid (if exists)
  let configValid = false;
  if (configExists) {
    try {
      const cfg = loadConfig();
      configValid = cfg !== null && typeof cfg === "object";
    } catch {
      configValid = false;
    }
  }
  checks.push({
    id: "config-valid",
    name: "Configuration is valid",
    ok: configValid,
    message: configValid ? undefined : "Configuration file has errors",
  });

  // Check 3: Gateway mode is configured
  let gatewayModeConfigured = false;
  if (configValid) {
    try {
      const cfg = loadConfig();
      gatewayModeConfigured = cfg.gateway?.mode === "local" || cfg.gateway?.mode === "remote";
    } catch {
      gatewayModeConfigured = false;
    }
  }
  checks.push({
    id: "gateway-mode",
    name: "Gateway mode is configured",
    ok: gatewayModeConfigured,
    message: gatewayModeConfigured
      ? undefined
      : `Run ${formatCliCommand("openclaw config set gateway.mode local")} or configure via ${formatCliCommand("openclaw configure")}`,
  });

  // Check 4: Package root is accessible
  let packageRootAccessible = false;
  try {
    const root = await resolveOpenClawPackageRoot({
      moduleUrl: import.meta.url,
      argv1: process.argv[1],
      cwd: process.cwd(),
    });
    packageRootAccessible = root !== null && fs.existsSync(root);
  } catch {
    packageRootAccessible = false;
  }
  checks.push({
    id: "package-root",
    name: "OpenClaw installation is accessible",
    ok: packageRootAccessible,
    message: packageRootAccessible ? undefined : "Installation may be corrupted",
  });

  const allOk = checks.every((c) => c.ok);

  return {
    ok: allOk,
    checks,
  };
}

/**
 * Format check results for terminal output
 */
function formatCheckResults(result: CheckResult): string[] {
  const lines: string[] = [];

  for (const check of result.checks) {
    const status = check.ok ? "✓" : "✗";
    lines.push(`${status} ${check.name}`);
    if (check.message) {
      lines.push(`  → ${check.message}`);
    }
  }

  lines.push("");
  lines.push(result.ok ? "All checks passed!" : "Some checks failed.");

  return lines;
}

/**
 * Main check command implementation
 */
export async function checkCommand(
  runtime: RuntimeEnv = defaultRuntime,
  options: CheckOptions = {},
): Promise<void> {
  if (!options.json) {
    intro("OpenClaw Installation Check");
  }

  const result = await runInstallationChecks();

  if (options.json) {
    runtime.log(JSON.stringify(result, null, 2));
  } else {
    for (const line of formatCheckResults(result)) {
      if (line === "") {
        runtime.log("");
      } else if (line.startsWith("✓")) {
        runtime.log(line);
      } else if (line.startsWith("✗")) {
        runtime.error(line);
      } else if (line.startsWith("  →")) {
        note(line.slice(4), "Fix");
      } else if (line.includes("passed")) {
        runtime.log(line);
      } else {
        runtime.log(line);
      }
    }

    outro(result.ok ? "Installation looks good!" : "Installation check complete");
  }

  if (!result.ok && options.nonInteractive) {
    process.exitCode = 1;
  }
}
