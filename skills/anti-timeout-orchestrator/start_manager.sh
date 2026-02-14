#!/bin/bash
# Start the Prefork Manager for the Anti-Timeout Orchestrator
# This replaces the old shell-based run_queue.sh loop.

set -e

# Ensure we are in the root
cd "$(dirname "$0")/../.."

echo "Starting Anti-Timeout Manager..."

# We use bun to run the TS file directly.
# If bun is not available, we might need ts-node or tsx.
# Assuming this environment (dev container) has bun or tsx.

if command -v bun &> /dev/null; then
  EXEC="bun"
elif command -v npx &> /dev/null; then
  # Try tsx via npx if bun is missing
  EXEC="npx tsx"
else
  echo "Error: neither bun nor npx found. Cannot run TS manager."
  exit 1
fi

# Run the manager
# We use exec to replace the shell process
exec $EXEC skills/anti-timeout-orchestrator/src/manager.ts
