#!/bin/sh
# Render startup script - creates config and starts gateway
set -e

echo "=== Render startup script ==="
echo "CLAWDBOT_STATE_DIR=${CLAWDBOT_STATE_DIR}"
echo "HOME=${HOME}"

CONFIG_DIR="${CLAWDBOT_STATE_DIR:-/data/.clawdbot}"
CONFIG_FILE="${CONFIG_DIR}/clawdbot.json"

echo "Config dir: ${CONFIG_DIR}"
echo "Config file: ${CONFIG_FILE}"

# Create config directory
mkdir -p "${CONFIG_DIR}"

# Write config file with Render-specific settings
# trustedProxies allows Render's internal proxy IPs to be trusted
cat > "${CONFIG_FILE}" << 'EOF'
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

echo "=== Config written to ${CONFIG_FILE} ==="
cat "${CONFIG_FILE}"
echo "=== End config ==="

# Verify file exists
ls -la "${CONFIG_DIR}/"

# Also check default config location
echo "=== Checking ~/.clawdbot ==="
ls -la ~/.clawdbot/ 2>/dev/null || echo "~/.clawdbot does not exist"

# Start the gateway with token from env var
echo "=== Starting gateway ==="
exec node dist/index.js gateway \
  --port 8080 \
  --bind lan \
  --auth token \
  --token "$CLAWDBOT_GATEWAY_TOKEN" \
  --allow-unconfigured
