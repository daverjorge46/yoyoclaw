#!/bin/bash
# Sync Claude Code credentials to k8s secret.yaml
#
# Usage: bash skills/sync-claude-credentials/scripts/sync.sh

set -e

CREDENTIALS_PATH="$HOME/.claude/.credentials.json"
SECRET_PATH="k8s/secret.yaml"

# Check credentials file exists
if [[ ! -f "$CREDENTIALS_PATH" ]]; then
    echo "Error: Claude credentials not found at $CREDENTIALS_PATH"
    echo "Run 'claude login' first to authenticate."
    exit 1
fi

# Check secret.yaml exists
if [[ ! -f "$SECRET_PATH" ]]; then
    echo "Error: Secret file not found at $SECRET_PATH"
    exit 1
fi

# Extract access token using jq or grep/sed
if command -v jq &> /dev/null; then
    ACCESS_TOKEN=$(jq -r '.claudeAiOauth.accessToken // empty' "$CREDENTIALS_PATH")
    EXPIRES_AT=$(jq -r '.claudeAiOauth.expiresAt // 0' "$CREDENTIALS_PATH")
    SUBSCRIPTION=$(jq -r '.claudeAiOauth.subscriptionType // "unknown"' "$CREDENTIALS_PATH")
else
    # Fallback: use grep/sed
    ACCESS_TOKEN=$(grep -o '"accessToken":"[^"]*"' "$CREDENTIALS_PATH" | sed 's/"accessToken":"//;s/"$//')
    EXPIRES_AT=$(grep -o '"expiresAt":[0-9]*' "$CREDENTIALS_PATH" | sed 's/"expiresAt"://')
    SUBSCRIPTION=$(grep -o '"subscriptionType":"[^"]*"' "$CREDENTIALS_PATH" | sed 's/"subscriptionType":"//;s/"$//')
fi

if [[ -z "$ACCESS_TOKEN" ]]; then
    echo "Error: No OAuth access token found in credentials."
    echo "Run 'claude login' and sign in with Claude.ai."
    exit 1
fi

# Check token expiry
NOW=$(date +%s)000
if [[ $EXPIRES_AT -lt $NOW ]]; then
    echo "Warning: Access token may have expired!"
    echo "Run 'claude login' to refresh."
fi

EXPIRES_IN_MS=$((EXPIRES_AT - NOW))
EXPIRES_IN_DAYS=$((EXPIRES_IN_MS / 1000 / 60 / 60 / 24))

echo "Subscription: $SUBSCRIPTION"
echo "Token expires in: ~$EXPIRES_IN_DAYS days"

# Update secret.yaml using sed
if grep -q 'CLAUDE_AI_SESSION_KEY:' "$SECRET_PATH"; then
    sed -i "s|CLAUDE_AI_SESSION_KEY:.*|CLAUDE_AI_SESSION_KEY: \"$ACCESS_TOKEN\"|" "$SECRET_PATH"
    echo "Updated CLAUDE_AI_SESSION_KEY"
else
    echo "Error: CLAUDE_AI_SESSION_KEY not found in $SECRET_PATH"
    exit 1
fi

echo ""
echo "Sync completed!"
echo ""
echo "To apply: kubectl apply -f $SECRET_PATH"
