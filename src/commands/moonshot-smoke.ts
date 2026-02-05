/**
 * CLI command for Moonshot (Kimi) smoke test.
 *
 * Usage:
 *   moltbot moonshot:smoke          # Run smoke test with defaults
 *   moltbot moonshot:smoke --json   # Output as JSON
 */
import type { RuntimeEnv } from "../runtime.js";
import {
  runAllSmokeTests,
  runPingTest,
  type SmokeTestConfig,
  type SmokeTestResult,
} from "../agents/moonshot/smoke.js";

export type MoonshotSmokeCommandOptions = {
  /** Specific test to run. Currently only "ping" is supported. */
  test?: string;
  /** Output as JSON */
  json?: boolean;
  /** Base URL override */
  baseUrl?: string;
  /** API key override (defaults to MOONSHOT_API_KEY env var) */
  apiKey?: string;
  /** Model to use for tests */
  model?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
};

function formatTestResult(result: SmokeTestResult, json: boolean): string {
  if (json) {
    return JSON.stringify(result, null, 2);
  }

  const status = result.passed ? "✓ PASS" : "✗ FAIL";
  const lines = [`${status} ${result.name} (${result.durationMs}ms)`, `  ${result.message}`];

  if (result.details && !result.passed) {
    lines.push(`  Details: ${JSON.stringify(result.details, null, 2).split("\n").join("\n  ")}`);
  }

  return lines.join("\n");
}

function formatAllResults(results: SmokeTestResult[], json: boolean): string {
  if (json) {
    return JSON.stringify(results, null, 2);
  }

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const summary = `\nSummary: ${passed}/${total} tests passed`;

  return results.map((r) => formatTestResult(r, false)).join("\n\n") + summary;
}

export async function moonshotSmokeCommand(
  opts: MoonshotSmokeCommandOptions,
  runtime: RuntimeEnv,
): Promise<void> {
  const config: SmokeTestConfig = {
    baseUrl: opts.baseUrl,
    apiKey: opts.apiKey,
    model: opts.model,
    timeout: opts.timeout,
  };

  const json = opts.json ?? false;

  try {
    let results: SmokeTestResult[];

    switch (opts.test) {
      case "ping":
      case undefined:
        // Run ping test (currently the only test)
        results = [await runPingTest(config)];
        break;
      default:
        // Run all tests
        results = await runAllSmokeTests(config);
    }

    runtime.log(formatAllResults(results, json));

    // Exit with error code if any test failed
    const allPassed = results.every((r) => r.passed);
    if (!allPassed) {
      runtime.exit(1);
    }
  } catch (err) {
    if (json) {
      runtime.error(JSON.stringify({ error: String(err) }));
    } else {
      runtime.error(`Smoke test error: ${err instanceof Error ? err.message : String(err)}`);
    }
    runtime.exit(1);
  }
}
