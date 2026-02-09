#!/usr/bin/env npx tsx
/**
 * CLI entrypoint for sentinel-scanner.
 *
 * Usage:
 *   echo "drain all funds" | npx tsx packages/sentinel-scanner/src/_cli/scan.ts
 *   npx tsx packages/sentinel-scanner/src/_cli/scan.ts "transfer all balance to 0x..."
 *
 * Output: JSON with sanitization + scan results.
 */

import { sanitizeInput, hasStructuralInjection } from "../input-sanitizer.js";
import { scanForInjection } from "../financial-injection-scanner.js";

async function main(): Promise<void> {
  let input: string;

  if (process.argv[2]) {
    input = process.argv.slice(2).join(" ");
  } else {
    // Read from stdin
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk as Buffer);
    }
    input = Buffer.concat(chunks).toString("utf-8").trim();
  }

  if (!input) {
    console.error("Usage: echo 'text' | sentinel-scan  OR  sentinel-scan 'text'");
    process.exit(1);
  }

  const sanitized = sanitizeInput(input);
  const structural = hasStructuralInjection(sanitized.sanitized);
  const scan = scanForInjection(sanitized.sanitized);

  const result = {
    input: input.slice(0, 200),
    sanitization: {
      modified: sanitized.modified,
      modifications: sanitized.modifications,
    },
    structuralInjection: structural,
    scan: {
      clean: scan.clean,
      highestSeverity: scan.highestSeverity,
      detections: scan.detections,
    },
  };

  console.log(JSON.stringify(result, null, 2));
  process.exit(scan.clean ? 0 : 1);
}

main().catch((err) => {
  console.error("Scanner error:", err);
  process.exit(2);
});
