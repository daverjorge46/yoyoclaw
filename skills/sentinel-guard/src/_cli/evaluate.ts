#!/usr/bin/env npx tsx
/**
 * CLI entrypoint for sentinel-guard policy evaluation.
 *
 * Usage:
 *   echo '{"action":"swap","params":{"fromToken":"ETH","toToken":"USDC","amount":"0.01"},"chain":"base","estimatedValueUsd":10}' | \
 *     npx tsx packages/sentinel-guard/src/_cli/evaluate.ts policy.json
 *
 * Output: JSON with policy verdict.
 */

import { readFileSync } from "node:fs";
import { v4 as uuidv4 } from "uuid";
import { PolicyEngine } from "../policy-engine.js";
import { AuditLog } from "../audit-log.js";
import { CircuitBreaker } from "../circuit-breaker.js";
import type { TransactionRequest, PolicyConfig } from "../types.js";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function main(): Promise<void> {
  const policyPath = process.argv[2];
  if (!policyPath) {
    console.error("Usage: echo '{...}' | sentinel-guard-evaluate <policy.json>");
    process.exit(1);
  }

  // Read policy config
  const policyRaw = readFileSync(policyPath, "utf-8");
  const config = JSON.parse(policyRaw) as PolicyConfig;

  // Read transaction request from stdin
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  const inputRaw = Buffer.concat(chunks).toString("utf-8").trim();

  if (!inputRaw) {
    console.error("No transaction request provided on stdin");
    process.exit(1);
  }

  const input = JSON.parse(inputRaw) as Partial<TransactionRequest>;

  // Fill defaults
  const request: TransactionRequest = {
    id: input.id ?? uuidv4(),
    action: input.action ?? "swap",
    params: input.params ?? {},
    chain: input.chain ?? "base",
    reason: input.reason ?? "CLI evaluation",
    requestedAt: input.requestedAt ?? Date.now(),
    estimatedValueUsd: input.estimatedValueUsd ?? 0,
    source: input.source ?? "reasoning",
  };

  // Create ephemeral audit log in temp dir
  const tempDir = mkdtempSync(join(tmpdir(), "sentinel-guard-cli-"));
  const auditLog = new AuditLog(tempDir);
  const breaker = new CircuitBreaker(config.circuitBreakerAutoTripOnConsecutiveFailures);
  const secret = "cli-evaluation-secret";

  const engine = new PolicyEngine(config, auditLog, secret, breaker);
  const verdict = await engine.evaluate(request);

  const output = {
    approved: verdict.approved,
    decidedBy: verdict.decidedBy,
    violations: verdict.violations,
    request: {
      id: request.id,
      action: request.action,
      estimatedValueUsd: request.estimatedValueUsd,
    },
  };

  console.log(JSON.stringify(output, null, 2));
  process.exit(verdict.approved ? 0 : 1);
}

main().catch((err) => {
  console.error("Guard evaluation error:", err);
  process.exit(2);
});
