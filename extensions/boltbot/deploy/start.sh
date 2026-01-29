#!/usr/bin/env bash
set -euo pipefail

# Start Xvfb for headless browser
Xvfb :99 -screen 0 1280x720x24 -nolisten tcp &
XVFB_PID=$!

# Wait for Xvfb
sleep 1

# Start moltbot gateway
exec node dist/cli/index.js gateway run --bind 0.0.0.0 --port 18789
