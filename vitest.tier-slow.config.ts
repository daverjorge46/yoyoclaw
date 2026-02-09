/**
 * Vitest configuration for Slow tier tests (>1s)
 *
 * These tests are resource-intensive:
 * - E2E tests
 * - Integration tests
 * - Browser tests
 * - Tests with network calls
 * - Tests with process spawning
 *
 * Run with: pnpm test:slow
 *
 * Note: Live tests are excluded here as they require real API keys.
 * Run live tests separately with: pnpm test:live
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
    name: "slow",
    testTimeout: 120_000,
    hookTimeout: 120_000,
    // Reduce parallelism for slow tests to avoid resource contention
    maxWorkers: 2,
    include: [
      // E2E tests
      "**/*.e2e.test.ts",
      // Integration tests
      "**/*.integration.test.ts",
      // Browser tests
      "**/*.browser.test.ts",
      // Test directory (contains mixed e2e tests)
      "test/**/*.test.ts",
    ],
    exclude: [
      ...baseExclude,
      // Exclude live tests (require real API keys)
      "**/*.live.test.ts",
    ],
  },
});
