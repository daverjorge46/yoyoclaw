#!/usr/bin/env node

/**
 * scripts/message-lint.mjs (legacy wrapper)
 *
 * This script is kept for backward compatibility, but the canonical implementation
 * now lives in: scripts/external-message-lint.ts (Bun).
 *
 * Why: we previously had multiple message linters that drifted. This wrapper
 * delegates to external-message-lint to keep rules consistent.
 *
 * Usage (legacy):
 *   node scripts/message-lint.mjs --file /path/to/message.txt
 *   node scripts/message-lint.mjs --text "Outcome: ..."
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";

function usage() {
  // Keep stderr output terse + pasteable.
  // (Avoid Markdown headings / fenced code blocks.)
  // eslint-disable-next-line no-console
  console.error(
    "Usage:\n  node scripts/message-lint.mjs --file <path>\n  node scripts/message-lint.mjs --text <string>",
  );
  process.exit(2);
}

const args = process.argv.slice(2);
let filePath;
let textArg;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--file") {
    filePath = args[i + 1];
    i++;
  } else if (a === "--text") {
    textArg = args[i + 1];
    i++;
  } else if (a === "--help" || a === "-h") {
    usage();
  }
}

if (!filePath && !textArg) {
  usage();
}

let msg = "";
if (filePath) {
  if (!fs.existsSync(filePath)) {
    // eslint-disable-next-line no-console
    console.error(`message-lint: file not found: ${filePath}`);
    process.exit(2);
  }
  msg = fs.readFileSync(filePath, "utf8");
} else {
  msg = String(textArg ?? "");
}

// Delegate to the canonical linter.
const proc = spawnSync(
  "bun",
  ["scripts/external-message-lint.ts", "--json"],
  {
    input: msg,
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  },
);

if (proc.error) {
  // eslint-disable-next-line no-console
  console.error(
    "message-lint: failed to run Bun. Install Bun or run the canonical linter directly:\n" +
      "  bun scripts/external-message-lint.ts\n" +
      String(proc.error?.message ?? proc.error),
  );
  process.exit(2);
}

const stdout = String(proc.stdout ?? "").trim();
let parsed;
try {
  parsed = stdout ? JSON.parse(stdout) : undefined;
} catch (err) {
  // eslint-disable-next-line no-console
  console.error(
    "message-lint: could not parse external-message-lint JSON output.\n" +
      "Run directly for diagnostics:\n" +
      "  bun scripts/external-message-lint.ts\n" +
      String(err?.stack ?? err),
  );
  process.exit(2);
}

const issues = Array.isArray(parsed?.issues) ? parsed.issues : [];
if (issues.length === 0) {
  // Legacy behavior.
  // eslint-disable-next-line no-console
  console.log("OK");
  process.exit(0);
}

let hasError = false;
for (const it of issues) {
  const level = String(it?.level ?? "warn");
  const code = String(it?.code ?? "unknown");
  const message = String(it?.message ?? "").trim();
  if (level === "error") hasError = true;
  const prefix = level.toUpperCase();
  // Legacy-ish output: LEVEL: code: message
  // eslint-disable-next-line no-console
  console.log(`${prefix}: ${code}: ${message}`);
}

process.exit(hasError ? 1 : 0);
