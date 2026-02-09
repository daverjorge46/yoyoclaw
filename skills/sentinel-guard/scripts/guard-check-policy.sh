#!/usr/bin/env bash
# sentinel-guard: Validate and summarize a policy configuration
# Usage: ./guard-check-policy.sh policy.json
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: ./guard-check-policy.sh <policy.json>" >&2
  exit 1
fi

POLICY_FILE="$1"

if [ ! -f "$POLICY_FILE" ]; then
  echo "Error: Policy file not found: $POLICY_FILE" >&2
  exit 1
fi

# Validate JSON and extract summary
node -e "
  const fs = require('fs');
  const config = JSON.parse(fs.readFileSync('$POLICY_FILE', 'utf-8'));
  const summary = {
    version: config.version,
    maxPerTransactionUsd: config.maxPerTransactionUsd,
    maxDailyUsd: config.maxDailyUsd,
    maxTransactionsPerHour: config.maxTransactionsPerHour,
    maxTransactionsPerDay: config.maxTransactionsPerDay,
    cooldownSeconds: config.cooldownSeconds,
    hitlThresholdUsd: config.hitlThresholdUsd,
    allowlistedTokens: config.allowlistedTokens?.length ?? 0,
    allowlistedContracts: config.allowlistedContracts?.length ?? 0,
    blockedActions: config.blockedActions ?? [],
    circuitBreakerThreshold: config.circuitBreakerAutoTripOnConsecutiveFailures,
  };
  console.log(JSON.stringify(summary, null, 2));
"
