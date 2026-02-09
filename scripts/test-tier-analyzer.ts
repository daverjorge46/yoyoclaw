/**
 * Test Speed Tier Analyzer
 *
 * Analyzes test files and classifies them into speed tiers:
 * - Fast (<100ms): Pure unit tests, utility functions, simple transformations
 * - Medium (100ms-1s): Tests with mocks, moderate I/O, setup/teardown
 * - Slow (>1s): E2E tests, network calls, complex integrations
 *
 * Usage: npx tsx scripts/test-tier-analyzer.ts [--output <path>] [--verbose]
 */

import fs from "node:fs";
import path from "node:path";

interface TierClassification {
  file: string;
  tier: "fast" | "medium" | "slow";
  reason: string;
}

interface TierReport {
  generated: string;
  summary: {
    fast: number;
    medium: number;
    slow: number;
    total: number;
  };
  files: TierClassification[];
}

// Patterns that indicate slow tests
const SLOW_PATTERNS = {
  filePatterns: [
    /\.e2e\.test\.ts$/,
    /\.live\.test\.ts$/,
    /\.integration\.test\.ts$/,
    /\.browser\.test\.ts$/,
  ],
  contentPatterns: [
    /testTimeout:\s*(\d+)/,
    /setTimeout\s*\(\s*[^,]+,\s*(\d{4,})/,
    /\.waitFor\s*\(/,
    /retry\s*\(\s*\d+/,
    /spawn\s*\(/,
    /exec\s*\(/,
    /fork\s*\(/,
  ],
  directories: ["test/", "gateway/"],
};

// Patterns that indicate medium tests
const MEDIUM_PATTERNS = {
  contentPatterns: [
    /vi\.useFakeTimers/,
    /jest\.useFakeTimers/,
    /beforeAll\s*\(/,
    /afterAll\s*\(/,
    /fs\.(read|write|mkdir|rm)/,
    /createTempDir/,
    /withIsolatedTestHome/,
    /mock[A-Z]/,
    /\.mock\./,
  ],
  directories: ["extensions/"],
};

function classifyTestFile(filePath: string, content: string): TierClassification {
  const relativePath = filePath.replace(process.cwd() + "/", "");

  // Check for slow patterns in file name
  for (const pattern of SLOW_PATTERNS.filePatterns) {
    if (pattern.test(relativePath)) {
      return {
        file: relativePath,
        tier: "slow",
        reason: `File pattern: ${pattern.source}`,
      };
    }
  }

  // Check for slow directories
  for (const dir of SLOW_PATTERNS.directories) {
    if (relativePath.startsWith(dir) && !relativePath.includes("/utils/")) {
      // Check if it has slow content patterns
      for (const pattern of SLOW_PATTERNS.contentPatterns) {
        if (pattern.test(content)) {
          return {
            file: relativePath,
            tier: "slow",
            reason: `Slow pattern in ${dir}: ${pattern.source}`,
          };
        }
      }
    }
  }

  // Check for slow content patterns
  for (const pattern of SLOW_PATTERNS.contentPatterns) {
    const match = pattern.exec(content);
    if (match) {
      // Special check for timeout values
      if (pattern.source.includes("testTimeout") || pattern.source.includes("setTimeout")) {
        const timeout = parseInt(match[1] || "0", 10);
        if (timeout >= 5000) {
          return {
            file: relativePath,
            tier: "slow",
            reason: `High timeout: ${timeout}ms`,
          };
        }
      } else if (
        pattern.source.includes("spawn") ||
        pattern.source.includes("exec") ||
        pattern.source.includes("fork")
      ) {
        return {
          file: relativePath,
          tier: "slow",
          reason: `Process spawning: ${pattern.source}`,
        };
      }
    }
  }

  // Check for medium patterns in directories
  for (const dir of MEDIUM_PATTERNS.directories) {
    if (relativePath.startsWith(dir)) {
      return {
        file: relativePath,
        tier: "medium",
        reason: `Extension test in ${dir}`,
      };
    }
  }

  // Check for medium content patterns
  for (const pattern of MEDIUM_PATTERNS.contentPatterns) {
    if (pattern.test(content)) {
      return {
        file: relativePath,
        tier: "medium",
        reason: `Medium pattern: ${pattern.source}`,
      };
    }
  }

  // Default to fast
  return {
    file: relativePath,
    tier: "fast",
    reason: "Default: pure unit test",
  };
}

function findTestFiles(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") {
        continue;
      }
      findTestFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith(".test.ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

function analyzeTests(): TierReport {
  const cwd = process.cwd();
  const testFiles: string[] = [];

  // Find test files in src/, extensions/, and test/
  const searchDirs = ["src", "extensions", "test"].filter((d) => fs.existsSync(path.join(cwd, d)));

  for (const dir of searchDirs) {
    findTestFiles(path.join(cwd, dir), testFiles);
  }

  const classifications: TierClassification[] = [];

  for (const file of testFiles) {
    const content = fs.readFileSync(file, "utf-8");
    const classification = classifyTestFile(file, content);
    classifications.push(classification);
  }

  // Sort by tier and file path
  const tierOrder = { fast: 0, medium: 1, slow: 2 };
  classifications.sort((a, b) => {
    const tierDiff = tierOrder[a.tier] - tierOrder[b.tier];
    if (tierDiff !== 0) {
      return tierDiff;
    }
    return a.file.localeCompare(b.file);
  });

  const summary = {
    fast: classifications.filter((c) => c.tier === "fast").length,
    medium: classifications.filter((c) => c.tier === "medium").length,
    slow: classifications.filter((c) => c.tier === "slow").length,
    total: classifications.length,
  };

  return {
    generated: new Date().toISOString(),
    summary,
    files: classifications,
  };
}

// Main execution
const args = process.argv.slice(2);
const verbose = args.includes("--verbose");
const outputIdx = args.indexOf("--output");
const outputPath = outputIdx !== -1 ? args[outputIdx + 1] : null;

const report = analyzeTests();

console.log("\n📊 Test Speed Tier Analysis");
console.log("=".repeat(40));
console.log(`Fast (<100ms):   ${report.summary.fast} tests`);
console.log(`Medium (100ms-1s): ${report.summary.medium} tests`);
console.log(`Slow (>1s):      ${report.summary.slow} tests`);
console.log(`Total:           ${report.summary.total} tests`);
console.log("=".repeat(40));

if (verbose) {
  console.log("\n📁 Detailed Classification:");
  for (const c of report.files) {
    const tierIcon = c.tier === "fast" ? "🟢" : c.tier === "medium" ? "🟡" : "🔴";
    console.log(`${tierIcon} [${c.tier.toUpperCase().padEnd(6)}] ${c.file}`);
    if (c.reason !== "Default: pure unit test") {
      console.log(`   └─ ${c.reason}`);
    }
  }
}

if (outputPath) {
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\n✅ Report saved to: ${outputPath}`);
}
