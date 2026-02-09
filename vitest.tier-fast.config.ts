/**
 * Vitest configuration for Fast tier tests (<100ms)
 *
 * These are pure unit tests with minimal setup/teardown:
 * - Utility function tests
 * - Data transformation tests
 * - Simple logic tests
 * - No I/O, no mocking of timers, no process spawning
 *
 * Run with: pnpm test:fast
 */
import { defineConfig } from "vitest/config";
import baseConfig from "./vitest.config.ts";

const baseTest =
  (baseConfig as { test?: { exclude?: string[]; setupFiles?: string[] } }).test ?? {};
const baseExclude = baseTest.exclude ?? [];

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseTest,
    name: "fast",
    testTimeout: 10_000,
    hookTimeout: 10_000,
    include: ["src/**/*.test.ts"],
    exclude: [
      ...baseExclude,
      // Exclude slow tests by pattern
      "**/*.e2e.test.ts",
      "**/*.live.test.ts",
      "**/*.integration.test.ts",
      "**/*.browser.test.ts",
      // Exclude extensions (medium tier)
      "extensions/**",
      // Exclude gateway (separate tier)
      "src/gateway/**",
      // Exclude test/ directory (mixed slow tests)
      "test/**",
      // Exclude tests with process spawning or high timeouts (identified by analyzer)
      "src/agents/bash-tools.exec.background-abort.test.ts",
      "src/agents/pi-embedded-utils.test.ts",
      "src/agents/pi-extensions/compaction-safeguard.test.ts",
      "src/agents/skills-install.test.ts",
      "src/canvas-host/server.test.ts",
      "src/cron/job-runner.test.ts",
      "src/hooks/hooks-install.test.ts",
      "src/media-understanding/providers/deepgram/audio.test.ts",
      "src/gateway/live-image-probe.test.ts",
    ],
  },
});
