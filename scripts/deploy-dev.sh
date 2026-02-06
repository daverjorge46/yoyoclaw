#!/usr/bin/env bash
# deploy-dev.sh — Deploy OpenClaw to development
# Thin wrapper around deploy.sh. See deploy.sh for full docs.
#
# Usage:
#   ./scripts/deploy-dev.sh              # Build + deploy
#   ./scripts/deploy-dev.sh --skip-build # Deploy existing dist
#   ./scripts/deploy-dev.sh --backup     # Backup previous deploy first
#   ./scripts/deploy-dev.sh --dry-run    # Show what would be synced

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
export DEPLOY_ENV=dev
exec "$SCRIPT_DIR/deploy.sh" "$@"
