#!/usr/bin/env npx tsx
/**
 * CLI entrypoint for model-router.
 *
 * Usage:
 *   echo "What is my ETH balance?" | npx tsx packages/model-router/src/_cli/route.ts
 *   npx tsx packages/model-router/src/_cli/route.ts "swap 0.01 ETH to USDC"
 *   npx tsx packages/model-router/src/_cli/route.ts --preset general "help me write code"
 *
 * Output: JSON with routing decision.
 */

import { ModelRouter } from "../router.js";
import { FINANCIAL_PRESET } from "../presets/financial.js";
import { GENERAL_PRESET } from "../presets/general.js";
import type { ModelMap } from "../types.js";

const DEFAULT_MODEL_MAP: ModelMap = {
  fast: "claude-haiku-4-5-20251001",
  standard: "claude-sonnet-4-5-20250929",
  advanced: "claude-sonnet-4-5-20250929",
  critical: "claude-opus-4-6",
};

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let preset = "financial";
  const textArgs: string[] = [];

  // Parse args
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--preset" && args[i + 1]) {
      preset = args[i + 1]!;
      i++; // skip next
    } else {
      textArgs.push(args[i]!);
    }
  }

  let input: string;

  if (textArgs.length > 0) {
    input = textArgs.join(" ");
  } else {
    // Read from stdin
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk as Buffer);
    }
    input = Buffer.concat(chunks).toString("utf-8").trim();
  }

  if (!input) {
    console.error("Usage: echo 'text' | model-router-route [--preset financial|general]");
    process.exit(1);
  }

  const routingPreset = preset === "general" ? GENERAL_PRESET : FINANCIAL_PRESET;
  const router = new ModelRouter(routingPreset, DEFAULT_MODEL_MAP);
  const result = router.route(input);

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error("Router error:", err);
  process.exit(2);
});
