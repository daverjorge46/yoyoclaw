#!/bin/bash
# Phala Cloud CVM entrypoint - auto-configures Redpill provider on first boot

set -e

CONFIG_DIR="${CLAWDBOT_STATE_DIR:-/data/.clawdbot}"
CONFIG_FILE="$CONFIG_DIR/clawdbot.json"

# Create state directory if it doesn't exist
mkdir -p "$CONFIG_DIR"

# Build gateway auth arguments
GATEWAY_AUTH_ARGS=""
if [ "${GATEWAY_AUTH:-off}" = "token" ]; then
  if [ -z "$GATEWAY_TOKEN" ]; then
    # Generate a random token if not provided
    GATEWAY_TOKEN=$(head -c 32 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 32)
    echo "Generated gateway token: $GATEWAY_TOKEN"
  fi
  GATEWAY_AUTH_ARGS="--gateway-auth token --gateway-token $GATEWAY_TOKEN"
elif [ "${GATEWAY_AUTH:-off}" = "password" ]; then
  if [ -z "$GATEWAY_PASSWORD" ]; then
    echo "Error: GATEWAY_AUTH=password requires GATEWAY_PASSWORD to be set"
    exit 1
  fi
  GATEWAY_AUTH_ARGS="--gateway-auth password --gateway-password $GATEWAY_PASSWORD"
else
  GATEWAY_AUTH_ARGS="--gateway-auth off"
fi

# Check if we need to run initial setup
if [ ! -f "$CONFIG_FILE" ] && [ -n "$REDPILL_API_KEY" ]; then
  echo "First boot detected with REDPILL_API_KEY - running auto-configuration..."

  # shellcheck disable=SC2086
  node dist/index.js onboard \
    --non-interactive \
    --accept-risk \
    --mode local \
    --auth-choice redpill-api-key \
    --workspace "${CLAWDBOT_WORKSPACE_DIR:-/data/workspace}" \
    --gateway-bind loopback \
    $GATEWAY_AUTH_ARGS \
    --skip-daemon \
    --skip-channels \
    --skip-skills \
    --skip-health \
    --skip-ui

  echo "Auto-configuration complete. Starting gateway..."
fi

# Start the gateway
exec node dist/index.js gateway \
  --bind loopback \
  --port "${GATEWAY_PORT:-18789}" \
  --allow-unconfigured
