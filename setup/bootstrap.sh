#!/usr/bin/env bash
# YoyoClaw Bootstrap Installer
# Usage:  curl -sSL https://raw.githubusercontent.com/daverjorge46/yoyoclaw/main/setup/bootstrap.sh | bash
#
# Environment variables for customization:
#   YOYOCLAW_GIT_DIR   - Override clone path   (default: ~/.yoyoclaw/source)
#   YOYOCLAW_BRANCH    - Branch to clone       (default: main)
#   YOYOCLAW_NO_ONBOARD=1 - Skip onboarding step
#   YOYOCLAW_PROFILE   - Profile name          (default: yoyo)

set -euo pipefail

# ── Configurable defaults ────────────────────────────────────────────
CLONE_DIR="${YOYOCLAW_GIT_DIR:-$HOME/.yoyoclaw/source}"
BRANCH="${YOYOCLAW_BRANCH:-main}"
PROFILE="${YOYOCLAW_PROFILE:-yoyo}"
NO_ONBOARD="${YOYOCLAW_NO_ONBOARD:-0}"
REPO_URL="https://github.com/daverjorge46/yoyoclaw.git"
MIN_NODE_MAJOR=22

# ── Colors / helpers ─────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

info()  { printf "${CYAN}[info]${RESET}  %s\n" "$*"; }
ok()    { printf "${GREEN}[ok]${RESET}    %s\n" "$*"; }
warn()  { printf "${YELLOW}[warn]${RESET}  %s\n" "$*"; }
die()   { printf "${RED}[error]${RESET} %s\n" "$*" >&2; exit 1; }

# ── Banner ───────────────────────────────────────────────────────────
banner() {
  printf "${BOLD}${CYAN}"
  cat <<'ART'

  ██    ██  ██████  ██    ██  ██████   ██████ ██       █████  ██     ██
   ██  ██  ██    ██  ██  ██  ██    ██ ██      ██      ██   ██ ██     ██
    ████   ██    ██   ████   ██    ██ ██      ██      ███████ ██  █  ██
     ██    ██    ██    ██    ██    ██ ██      ██      ██   ██ ██ ███ ██
     ██     ██████     ██     ██████   ██████ ███████ ██   ██  ███ ███

ART
  printf "${RESET}"
  printf "  ${BOLD}Multi-channel AI gateway with extensible messaging${RESET}\n\n"
}

# ── Prerequisite checks ─────────────────────────────────────────────
require_cmd() {
  command -v "$1" >/dev/null 2>&1 || return 1
}

check_git() {
  require_cmd git || die "git is required but not found. Install it first: https://git-scm.com"
  ok "git found: $(git --version)"
}

# Returns the major version number from `node --version` (e.g. "22").
node_major() {
  node --version 2>/dev/null | sed 's/^v//' | cut -d. -f1
}

ensure_node() {
  if require_cmd node; then
    local major
    major="$(node_major)"
    if [ "$major" -ge "$MIN_NODE_MAJOR" ] 2>/dev/null; then
      ok "Node.js $(node --version) found (>= $MIN_NODE_MAJOR required)"
      return 0
    fi
    warn "Node.js $(node --version) found but >= $MIN_NODE_MAJOR is required"
  else
    warn "Node.js not found"
  fi

  info "Attempting to install Node.js $MIN_NODE_MAJOR via nvm or fnm..."

  # Try fnm first (faster, Rust-based)
  if require_cmd fnm; then
    info "Using fnm to install Node $MIN_NODE_MAJOR..."
    fnm install "$MIN_NODE_MAJOR" && fnm use "$MIN_NODE_MAJOR"
    eval "$(fnm env)"
  # Try nvm
  elif [ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]; then
    info "Using nvm to install Node $MIN_NODE_MAJOR..."
    # shellcheck disable=SC1091
    . "${NVM_DIR:-$HOME/.nvm}/nvm.sh"
    nvm install "$MIN_NODE_MAJOR" && nvm use "$MIN_NODE_MAJOR"
  else
    die "Node.js >= $MIN_NODE_MAJOR is required but not found, and neither fnm nor nvm are available.
Install Node.js $MIN_NODE_MAJOR+:
  - fnm:  https://github.com/Schniz/fnm
  - nvm:  https://github.com/nvm-sh/nvm
  - Direct: https://nodejs.org"
  fi

  # Verify the install worked
  local major
  major="$(node_major)"
  if [ "$major" -lt "$MIN_NODE_MAJOR" ] 2>/dev/null; then
    die "Failed to install Node.js >= $MIN_NODE_MAJOR"
  fi
  ok "Node.js $(node --version) installed"
}

ensure_pnpm() {
  if require_cmd pnpm; then
    ok "pnpm found: $(pnpm --version)"
    return 0
  fi

  info "Installing pnpm..."
  if require_cmd corepack; then
    corepack enable pnpm 2>/dev/null && corepack prepare pnpm@latest --activate 2>/dev/null
  fi

  # Fallback if corepack didn't work
  if ! require_cmd pnpm; then
    npm install -g pnpm
  fi

  require_cmd pnpm || die "Failed to install pnpm"
  ok "pnpm installed: $(pnpm --version)"
}

# ── Clone ────────────────────────────────────────────────────────────
clone_repo() {
  if [ -d "$CLONE_DIR/.git" ]; then
    info "Repository already exists at $CLONE_DIR — pulling latest..."
    git -C "$CLONE_DIR" fetch origin "$BRANCH"
    git -C "$CLONE_DIR" checkout "$BRANCH"
    git -C "$CLONE_DIR" reset --hard "origin/$BRANCH"
    ok "Updated to latest $BRANCH"
  else
    info "Cloning YoyoClaw ($BRANCH) into $CLONE_DIR..."
    mkdir -p "$(dirname "$CLONE_DIR")"
    git clone --branch "$BRANCH" --single-branch --depth 1 "$REPO_URL" "$CLONE_DIR"
    ok "Cloned to $CLONE_DIR"
  fi
}

# ── Build ────────────────────────────────────────────────────────────
install_and_build() {
  info "Installing dependencies..."
  if [ -f "$CLONE_DIR/pnpm-lock.yaml" ]; then
    (cd "$CLONE_DIR" && pnpm install --frozen-lockfile)
  else
    (cd "$CLONE_DIR" && pnpm install)
  fi
  ok "Dependencies installed"

  info "Building YoyoClaw..."
  (cd "$CLONE_DIR" && pnpm build)
  ok "Build complete"

  # Build control UI if the script exists
  if (cd "$CLONE_DIR" && pnpm run --silent ui:build 2>/dev/null); then
    ok "Control UI built"
  else
    warn "Control UI build skipped (ui:build not available or failed)"
  fi
}

# ── Link globally ───────────────────────────────────────────────────
link_global() {
  info "Linking yoyoclaw globally..."

  # Ensure PNPM_HOME is set and the directory exists — required for pnpm link --global.
  export PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}"
  mkdir -p "$PNPM_HOME"
  export PATH="$PNPM_HOME:$PATH"

  # Persist PNPM_HOME into shell rc files for future sessions.
  pnpm setup 2>/dev/null || true

  # Try pnpm link --global; fall back to a manual symlink if it fails.
  if (cd "$CLONE_DIR" && pnpm link --global) 2>/dev/null; then
    ok "yoyoclaw linked globally via pnpm"
  else
    warn "pnpm link --global failed — creating manual symlink instead"
    local bin_dir="$HOME/.local/bin"
    mkdir -p "$bin_dir"
    ln -sf "$CLONE_DIR/yoyoclaw.mjs" "$bin_dir/yoyoclaw"
    chmod +x "$bin_dir/yoyoclaw"
    export PATH="$bin_dir:$PATH"
    ok "yoyoclaw symlinked to $bin_dir/yoyoclaw"
  fi

  if require_cmd yoyoclaw; then
    ok "yoyoclaw is now available in PATH: $(command -v yoyoclaw)"
  else
    warn "yoyoclaw not found in PATH. Add one of these to your shell profile:"
    warn "  export PATH=\"$PNPM_HOME:\$PATH\""
    warn "  export PATH=\"$HOME/.local/bin:\$PATH\""
  fi
}

# ── Onboarding ──────────────────────────────────────────────────────
run_onboarding() {
  if [ "$NO_ONBOARD" = "1" ]; then
    info "Skipping onboarding (YOYOCLAW_NO_ONBOARD=1)"
    return 0
  fi

  info "Running onboarding with profile '$PROFILE'..."
  yoyoclaw --profile "$PROFILE" onboard \
    --non-interactive --accept-risk \
    --flow quickstart --mode local \
    --auth-choice skip \
    --skip-channels --skip-skills \
    --skip-daemon --skip-ui --skip-health
  ok "Onboarding complete"
}

# ── Shell completions ──────────────────────────────────────────────
generate_completions() {
  info "Generating shell completions..."
  if yoyoclaw completion --write-state 2>/dev/null; then
    ok "Shell completions generated"
  else
    warn "Shell completions could not be generated (non-critical)"
  fi
}

# ── Success message ─────────────────────────────────────────────────
print_success() {
  local state_dir="$HOME/.yoyoclaw-$PROFILE"
  printf "\n"
  printf "${GREEN}${BOLD}  YoyoClaw installed successfully!${RESET}\n"
  printf "\n"
  printf "  ${BOLD}Source:${RESET}     %s\n" "$CLONE_DIR"
  printf "  ${BOLD}State dir:${RESET}  %s\n" "$state_dir"
  printf "  ${BOLD}Workspace:${RESET}  %s/workspace\n" "$state_dir"
  printf "  ${BOLD}Profile:${RESET}    %s\n" "$PROFILE"
  printf "\n"
  printf "  ${YELLOW}${BOLD}  ⚠  Reload your shell to use yoyoclaw:${RESET}\n"
  printf "\n"
  printf "    ${CYAN}source ~/.bashrc${RESET}\n"
  printf "\n"
  printf "  ${BOLD}Then run:${RESET}\n"
  printf "    ${CYAN}yoyoclaw --profile %s status${RESET}   # Check status\n" "$PROFILE"
  printf "    ${CYAN}yoyoclaw --profile %s start${RESET}    # Start the gateway\n" "$PROFILE"
  printf "\n"
}

# ── Main ─────────────────────────────────────────────────────────────
main() {
  banner
  check_git
  ensure_node
  ensure_pnpm
  clone_repo
  install_and_build
  link_global
  run_onboarding
  generate_completions
  print_success
}

main "$@"
