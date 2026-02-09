#!/usr/bin/env bash
# sentinel-scanner: Scan text for prompt injection attacks
# Usage: echo "text" | ./scan-input.sh  OR  ./scan-input.sh "text"
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [ $# -gt 0 ]; then
  echo "$*" | npx tsx "$SCRIPT_DIR/src/_cli/scan.ts"
else
  npx tsx "$SCRIPT_DIR/src/_cli/scan.ts"
fi
