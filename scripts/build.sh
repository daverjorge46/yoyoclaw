#!/usr/bin/env bash
#
# OpenClaw Fork Build Script
# Builds the project from source
#
# Usage:
#   ./scripts/build.sh [options]
#
# Options:
#   --clean         Clean node_modules before build
#   --watch         Watch mode for development
#   --dry-run       Show what would be done
#   --help          Show this help message
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Defaults
CLEAN=false
WATCH=false
DRY_RUN=false

# Auto-detect fork directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPENCLAW_FORK_DIR="${OPENCLAW_FORK_DIR:-$(dirname "$SCRIPT_DIR")}"

log() { echo -e "${BLUE}[build]${NC} $*"; }
log_ok() { echo -e "${GREEN}[build]${NC} ✓ $*"; }
log_warn() { echo -e "${YELLOW}[build]${NC} ⚠ $*"; }
log_error() { echo -e "${RED}[build]${NC} ✗ $*"; }

usage() {
    head -20 "$0" | grep "^#" | sed 's/^# \?//'
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --clean)
            CLEAN=true
            shift
            ;;
        --watch)
            WATCH=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help|-h)
            usage
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            ;;
    esac
done

cd "$OPENCLAW_FORK_DIR"

VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*"version": *"\([^"]*\)".*/\1/')
log "Building OpenClaw $VERSION"
log "Directory: $OPENCLAW_FORK_DIR"
echo

# Clean if requested
if $CLEAN; then
    log "Cleaning..."
    if $DRY_RUN; then
        log "[dry-run] Would remove node_modules and dist"
    else
        rm -rf node_modules dist
        log_ok "Cleaned"
    fi
fi

# Install dependencies
if [[ ! -d "node_modules" ]]; then
    log "Installing dependencies..."
    if $DRY_RUN; then
        log "[dry-run] Would run: npm install"
    else
        npm install
        log_ok "Dependencies installed"
    fi
fi

# Build
if $WATCH; then
    log "Starting watch mode..."
    if $DRY_RUN; then
        log "[dry-run] Would run: npm run dev"
    else
        exec npm run dev
    fi
else
    log "Building..."
    if $DRY_RUN; then
        log "[dry-run] Would run: npm run build"
    else
        START=$(date +%s)
        npm run build
        END=$(date +%s)
        log_ok "Build complete in $((END - START))s"
    fi
fi

# Verify
if ! $DRY_RUN && ! $WATCH; then
    if [[ -f "openclaw.mjs" ]]; then
        BUILT_VERSION=$(node openclaw.mjs --version 2>/dev/null | tail -1 || echo "unknown")
        log_ok "Built version: $BUILT_VERSION"
    fi
fi
