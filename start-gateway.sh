#!/bin/bash
# Clawdis Gateway Startup Script (using OAuth via pi)

export PATH="/Users/scald/.nvm/versions/node/v24.4.1/bin:$PATH"
export CLAWDIS_AGENT_DIR="/Users/scald/.pi/agent"
export CLAWDIS_OAUTH_DIR="/Users/scald/.clawdis/credentials"
# No ANTHROPIC_API_KEY - uses OAuth

cd /Users/scald/clawdis
exec pnpm start gateway
