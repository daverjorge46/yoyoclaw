#!/usr/bin/env bash
# sentinel-guard: Evaluate a transaction request against a policy config
# Usage: echo '{"action":"swap",...}' | ./guard-evaluate.sh policy.json
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [ $# -lt 1 ]; then
  echo "Usage: echo '{...}' | ./guard-evaluate.sh <policy.json>" >&2
  exit 1
fi

npx tsx "$SCRIPT_DIR/src/_cli/evaluate.ts" "$1"
