#!/bin/sh
# Render startup script - creates config and starts gateway
# Don't use set -e initially - we'll enable it after setup

echo "=== Render startup script ==="
echo "HOME=${HOME:-not set}"
echo "CLAWDBOT_STATE_DIR=${CLAWDBOT_STATE_DIR:-not set}"
echo "MOLTBOT_STATE_DIR=${MOLTBOT_STATE_DIR:-not set}"
echo "User: $(whoami 2>/dev/null || echo unknown)"
echo "UID: $(id -u 2>/dev/null || echo unknown)"
echo "PWD: $(pwd)"

# Set HOME if not set (node user's home is /home/node)
if [ -z "${HOME}" ]; then
  if [ -d "/home/node" ]; then
    export HOME="/home/node"
  else
    export HOME="/tmp"
  fi
  echo "Set HOME to: ${HOME}"
fi

# Prefer MOLTBOT_STATE_DIR or CLAWDBOT_STATE_DIR (legacy), else HOME/.moltbot then HOME/.clawdbot
CONFIG_DIR="${HOME}/.moltbot"
for var in MOLTBOT_STATE_DIR CLAWDBOT_STATE_DIR; do
  eval "val=\${${var}:-}"
  if [ -n "$val" ]; then
    set +e
    mkdir -p "$val" 2>/dev/null
    touch "$val/.test" 2>/dev/null
    if [ $? -eq 0 ]; then
      rm -f "$val/.test" 2>/dev/null
      CONFIG_DIR="$val"
      echo "Using ${var}: ${CONFIG_DIR}"
    fi
    set -e
    break
  fi
done

CONFIG_FILE="${CONFIG_DIR}/moltbot.json"

echo "Config dir: ${CONFIG_DIR}"
echo "Config file: ${CONFIG_FILE}"

# Create config directory (fallback: HOME/.moltbot or HOME/.clawdbot)
if ! mkdir -p "${CONFIG_DIR}" 2>/dev/null; then
  echo "ERROR: Failed to create config directory: ${CONFIG_DIR}"
  exit 1
fi

# Write config file
if ! cat > "${CONFIG_FILE}" << 'EOF'
{
  "gateway": {
    "mode": "local",
    "trustedProxies": ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"],
    "controlUi": {
      "allowInsecureAuth": true
    }
  }
}
EOF
then
  echo "ERROR: Failed to write config file: ${CONFIG_FILE}"
  exit 1
fi

echo "=== Config written to ${CONFIG_FILE} ==="
cat "${CONFIG_FILE}" || echo "Warning: Could not read config file"

# Verify config file exists and is readable
if [ ! -f "${CONFIG_FILE}" ]; then
  echo "ERROR: Config file does not exist: ${CONFIG_FILE}"
  exit 1
fi

# Set environment variables for gateway (app accepts MOLTBOT_* or CLAWDBOT_*)
export CLAWDBOT_STATE_DIR="${CONFIG_DIR}"
export CLAWDBOT_CONFIG_PATH="${CONFIG_FILE}"
export CLAWDBOT_CONFIG_CACHE_MS=0
export MOLTBOT_STATE_DIR="${CONFIG_DIR}"
export MOLTBOT_CONFIG_PATH="${CONFIG_FILE}"
export MOLTBOT_CONFIG_CACHE_MS=0

echo "=== Starting gateway ==="
echo "CONFIG_DIR=${CONFIG_DIR}"
echo "CONFIG_FILE=${CONFIG_FILE}"

# Verify node is available
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node command not found"
  echo "PATH: ${PATH}"
  exit 1
fi

echo "Node version: $(node --version)"

# Verify dist/index.js exists
if [ ! -f "dist/index.js" ]; then
  echo "ERROR: dist/index.js not found"
  echo "Contents of /app:"
  ls -la /app 2>/dev/null || echo "Cannot list /app"
  echo "Contents of current directory:"
  ls -la . 2>/dev/null || echo "Cannot list current directory"
  exit 1
fi

echo "Found dist/index.js"

# Token: CLAWDBOT_GATEWAY_TOKEN (legacy) or MOLTBOT_GATEWAY_TOKEN
GATEWAY_TOKEN="${CLAWDBOT_GATEWAY_TOKEN:-${MOLTBOT_GATEWAY_TOKEN}}"
if [ -z "${GATEWAY_TOKEN}" ]; then
  echo "ERROR: CLAWDBOT_GATEWAY_TOKEN or MOLTBOT_GATEWAY_TOKEN must be set"
  exit 1
fi

echo "Token is set (length: ${#GATEWAY_TOKEN})"

# Enable strict error handling for the final exec
set -e

# Start gateway
echo "Executing: node dist/index.js gateway --port 8080 --bind lan --auth token --allow-unconfigured"
exec node dist/index.js gateway \
  --port 8080 \
  --bind lan \
  --auth token \
  --token "${GATEWAY_TOKEN}" \
  --allow-unconfigured
