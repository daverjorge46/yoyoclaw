#!/usr/bin/env bash
#
# OpenClaw Fork Install Script
# Installs OpenClaw from a local fork directory
#
# Usage:
#   ./scripts/install.sh [options]
#
# Options:
#   --dry-run       Show what would be done without executing
#   --force         Skip confirmation prompts
#   --link          Create symlink instead of copy (for development)
#   --help          Show this help message
#
# Environment Variables:
#   OPENCLAW_FORK_DIR    Fork directory (default: auto-detect from script location)
#   OPENCLAW_INSTALL_DIR Installation target (default: ~/.volta or npm global)
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Defaults
DRY_RUN=false
FORCE=false
LINK_MODE=false

# Auto-detect fork directory from script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPENCLAW_FORK_DIR="${OPENCLAW_FORK_DIR:-$(dirname "$SCRIPT_DIR")}"

log() { echo -e "${BLUE}[install]${NC} $*"; }
log_ok() { echo -e "${GREEN}[install]${NC} ✓ $*"; }
log_warn() { echo -e "${YELLOW}[install]${NC} ⚠ $*"; }
log_error() { echo -e "${RED}[install]${NC} ✗ $*"; }

usage() {
    head -30 "$0" | grep "^#" | sed 's/^# \?//'
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
        --link)
            LINK_MODE=true
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

# Get version from package.json
VERSION=$(grep '"version"' "$OPENCLAW_FORK_DIR/package.json" | head -1 | sed 's/.*"version": *"\([^"]*\)".*/\1/')
log "OpenClaw Fork Installer"
log "Fork directory: $OPENCLAW_FORK_DIR"
log "Version: $VERSION"
echo

# Check prerequisites
check_prereqs() {
    log "Checking prerequisites..."
    
    local missing=()
    
    command -v node >/dev/null 2>&1 || missing+=("node")
    command -v npm >/dev/null 2>&1 || missing+=("npm")
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "Missing required tools: ${missing[*]}"
        log_error "Please install Node.js 20+ first"
        exit 1
    fi
    
    # Check Node version
    NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
    if [[ $NODE_VERSION -lt 20 ]]; then
        log_error "Node.js 20+ required, found: $(node -v)"
        exit 1
    fi
    
    log_ok "Node $(node -v), npm $(npm -v)"
}

# Build the project
build_fork() {
    log "Building fork..."
    
    if $DRY_RUN; then
        log "[dry-run] Would run: npm install && npm run build"
        return
    fi
    
    cd "$OPENCLAW_FORK_DIR"
    
    # Install dependencies if needed
    if [[ ! -d "node_modules" ]]; then
        log "Installing dependencies..."
        npm install
    fi
    
    # Build
    log "Compiling TypeScript..."
    npm run build
    
    log_ok "Build complete"
}

# Install globally
install_global() {
    log "Installing globally..."
    
    if $DRY_RUN; then
        log "[dry-run] Would run: npm link (from $OPENCLAW_FORK_DIR)"
        return
    fi
    
    cd "$OPENCLAW_FORK_DIR"
    
    # Unlink any previous version
    npm unlink -g openclaw 2>/dev/null || true
    
    # Link the fork
    npm link
    
    # Verify installation
    if command -v openclaw >/dev/null 2>&1; then
        INSTALLED_VERSION=$(openclaw --version 2>/dev/null | tail -1)
        log_ok "Installed: openclaw $INSTALLED_VERSION"
    else
        log_warn "openclaw not in PATH. You may need to restart your shell."
    fi
}

# Show summary
show_summary() {
    echo
    log "Installation complete!"
    echo
    echo "  Fork:    $OPENCLAW_FORK_DIR"
    echo "  Version: $VERSION"
    echo
    if $LINK_MODE || $DRY_RUN; then
        echo "  The fork is linked globally. Changes to the fork"
        echo "  will be reflected immediately after rebuild."
    fi
    echo
    echo "  Run 'openclaw --version' to verify."
    echo
}

# Confirm with user
confirm() {
    if $FORCE; then
        return 0
    fi
    
    echo
    read -p "Proceed with installation? [y/N] " -n 1 -r
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
    
    check_prereqs
    
    confirm
    
    build_fork
    install_global
    show_summary
}

main "$@"
