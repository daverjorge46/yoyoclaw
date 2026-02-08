#!/usr/bin/env bash
#
# OpenClaw Fork Upgrade Script
# Updates the fork and reinstalls
#
# Usage:
#   ./scripts/upgrade.sh [options]
#
# Options:
#   --dry-run           Show what would be done without executing
#   --force             Skip confirmation prompts
#   --upstream          Sync with upstream before upgrading
#   --no-restart        Don't restart gateway after upgrade
#   --help              Show this help message
#
# Environment Variables:
#   OPENCLAW_FORK_DIR    Fork directory (default: auto-detect)
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Defaults
DRY_RUN=false
FORCE=false
SYNC_UPSTREAM=false
RESTART_GATEWAY=true

# Auto-detect fork directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPENCLAW_FORK_DIR="${OPENCLAW_FORK_DIR:-$(dirname "$SCRIPT_DIR")}"

log() { echo -e "${BLUE}[upgrade]${NC} $*"; }
log_ok() { echo -e "${GREEN}[upgrade]${NC} ✓ $*"; }
log_warn() { echo -e "${YELLOW}[upgrade]${NC} ⚠ $*"; }
log_error() { echo -e "${RED}[upgrade]${NC} ✗ $*"; }

usage() {
    head -25 "$0" | grep "^#" | sed 's/^# \?//'
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --upstream)
            SYNC_UPSTREAM=true
            shift
            ;;
        --no-restart)
            RESTART_GATEWAY=false
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

# Verify fork directory
if [[ ! -f "$OPENCLAW_FORK_DIR/package.json" ]]; then
    log_error "Not a valid OpenClaw directory: $OPENCLAW_FORK_DIR"
    exit 1
fi

cd "$OPENCLAW_FORK_DIR"

# Get current version
OLD_VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*"version": *"\([^"]*\)".*/\1/')
log "OpenClaw Fork Upgrader"
log "Fork directory: $OPENCLAW_FORK_DIR"
log "Current version: $OLD_VERSION"
echo

# Check for uncommitted changes
check_git_status() {
    log "Checking git status..."
    
    if ! git diff --quiet 2>/dev/null; then
        log_warn "Uncommitted changes detected"
        if ! $FORCE; then
            read -p "Continue anyway? [y/N] " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log "Aborted."
                exit 0
            fi
        fi
    fi
    
    log_ok "Git status checked"
}

# Sync with upstream
sync_upstream() {
    if ! $SYNC_UPSTREAM; then
        return
    fi
    
    log "Syncing with upstream..."
    
    if $DRY_RUN; then
        log "[dry-run] Would run: git fetch upstream && git merge upstream/main"
        return
    fi
    
    # Check if upstream remote exists
    if ! git remote get-url upstream >/dev/null 2>&1; then
        log_warn "No 'upstream' remote found. Skipping sync."
        return
    fi
    
    git fetch upstream
    
    # Get current branch
    CURRENT_BRANCH=$(git branch --show-current)
    
    if [[ "$CURRENT_BRANCH" == "main" ]]; then
        log "Merging upstream/main..."
        git merge upstream/main --no-edit || {
            log_error "Merge conflict! Resolve manually and run again."
            exit 1
        }
    else
        log_warn "Not on main branch ($CURRENT_BRANCH). Skipping merge."
    fi
    
    log_ok "Upstream sync complete"
}

# Pull latest changes
pull_changes() {
    log "Pulling latest changes..."
    
    if $DRY_RUN; then
        log "[dry-run] Would run: git pull"
        return
    fi
    
    git pull --ff-only || {
        log_warn "Fast-forward pull failed. Try: git pull --rebase"
    }
    
    log_ok "Pull complete"
}

# Rebuild
rebuild() {
    log "Rebuilding..."
    
    if $DRY_RUN; then
        log "[dry-run] Would run: npm install && npm run build"
        return
    fi
    
    # Clean and reinstall dependencies
    rm -rf node_modules
    npm install
    
    # Build
    npm run build
    
    log_ok "Rebuild complete"
}

# Reinstall globally
reinstall() {
    log "Reinstalling globally..."
    
    if $DRY_RUN; then
        log "[dry-run] Would run: npm link"
        return
    fi
    
    npm link
    
    log_ok "Reinstall complete"
}

# Restart gateway
restart_gateway() {
    if ! $RESTART_GATEWAY; then
        return
    fi
    
    log "Checking gateway..."
    
    if $DRY_RUN; then
        log "[dry-run] Would restart gateway if running"
        return
    fi
    
    # Check if gateway is running
    if pgrep -f "openclaw.*gateway" >/dev/null 2>&1; then
        log "Restarting gateway..."
        openclaw gateway restart 2>/dev/null || {
            log_warn "Could not restart gateway automatically"
        }
    else
        log "Gateway not running, skipping restart"
    fi
}

# Show summary
show_summary() {
    NEW_VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*"version": *"\([^"]*\)".*/\1/')
    
    echo
    log "Upgrade complete!"
    echo
    echo "  Old version: $OLD_VERSION"
    echo "  New version: $NEW_VERSION"
    echo
    
    if command -v openclaw >/dev/null 2>&1; then
        echo "  Installed:   $(openclaw --version 2>/dev/null | tail -1)"
    fi
    echo
}

# Confirm
confirm() {
    if $FORCE; then
        return 0
    fi
    
    echo
    read -p "Proceed with upgrade? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Aborted."
        exit 0
    fi
}

# Main
main() {
    if $DRY_RUN; then
        log_warn "DRY RUN MODE - no changes will be made"
        echo
    fi
    
    check_git_status
    
    confirm
    
    sync_upstream
    pull_changes
    rebuild
    reinstall
    restart_gateway
    show_summary
}

main "$@"
