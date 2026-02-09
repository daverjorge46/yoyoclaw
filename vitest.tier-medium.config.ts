/**
 * Vitest configuration for Medium tier tests (100ms - 1s)
 *
 * These tests have moderate complexity:
 * - Tests with mocking (fake timers, spies)
 * - Tests with file I/O
 * - Extension tests
 * - Tests with moderate setup/teardown
 *
 * Run with: pnpm test:medium
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
    name: "medium",
    testTimeout: 30_000,
    hookTimeout: 30_000,
    include: [
      // Extension tests
      "extensions/**/*.test.ts",
      // Gateway tests (not e2e/live)
      "src/gateway/**/*.test.ts",
      // Specific medium-complexity tests from src/
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
    exclude: [
      ...baseExclude,
      // Exclude slow tests by pattern
      "**/*.e2e.test.ts",
      "**/*.live.test.ts",
      "**/*.integration.test.ts",
      "**/*.browser.test.ts",
    ],
  },
});
