#!/usr/bin/env bash
# model-router: Route a query to the appropriate model tier
# Usage: echo "text" | ./route-query.sh  OR  ./route-query.sh "text"
#        ./route-query.sh --preset general "text"
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [ $# -gt 0 ]; then
  npx tsx "$SCRIPT_DIR/src/_cli/route.ts" "$@"
else
  npx tsx "$SCRIPT_DIR/src/_cli/route.ts"
fi
