#!/usr/bin/env bash
set -euo pipefail

DOCKER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$DOCKER_DIR")"
COMPOSE_FILE="$REPO_ROOT/docker-compose.yml"
IMAGE_NAME="${OPENCLAW_IMAGE:-openclaw:local}"
EXTRA_MOUNTS="${OPENCLAW_EXTRA_MOUNTS:-}"
HOME_VOLUME_NAME="${OPENCLAW_HOME_VOLUME:-}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing dependency: $1" >&2
    exit 1
  fi
}

require_cmd docker
if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose not available (try: docker compose version)" >&2
  exit 1
fi

ensure_buildx() {
  if docker buildx version >/dev/null 2>&1; then
    return 0
  fi

  echo "BuildKit/buildx not found. Trying to install docker-buildx-plugin..."

  if command -v sudo >/dev/null 2>&1; then
    sudo apt-get update && sudo apt-get install -y docker-buildx-plugin || true
  elif [[ "$(id -u)" -eq 0 ]]; then
    apt-get update && apt-get install -y docker-buildx-plugin || true
  fi

  if ! docker buildx version >/dev/null 2>&1; then
    echo "Docker buildx is required for this Dockerfile (--mount cache)." >&2
    echo "Please install it manually, e.g.: sudo apt-get install -y docker-buildx-plugin" >&2
    exit 1
  fi
}

OPENCLAW_CONFIG_DIR="${OPENCLAW_CONFIG_DIR:-$HOME/.openclaw}"
OPENCLAW_WORKSPACE_DIR="${OPENCLAW_WORKSPACE_DIR:-$HOME/.openclaw/workspace}"

mkdir -p "$OPENCLAW_CONFIG_DIR"
mkdir -p "$OPENCLAW_WORKSPACE_DIR"

export OPENCLAW_CONFIG_DIR
export OPENCLAW_WORKSPACE_DIR
export OPENCLAW_GATEWAY_PORT="${OPENCLAW_GATEWAY_PORT:-18789}"
export OPENCLAW_BRIDGE_PORT="${OPENCLAW_BRIDGE_PORT:-18790}"
export OPENCLAW_GATEWAY_BIND="${OPENCLAW_GATEWAY_BIND:-lan}"
export OPENCLAW_IMAGE="$IMAGE_NAME"
export OPENCLAW_DOCKER_APT_PACKAGES="${OPENCLAW_DOCKER_APT_PACKAGES:-}"
export OPENCLAW_EXTRA_MOUNTS="$EXTRA_MOUNTS"
export OPENCLAW_HOME_VOLUME="$HOME_VOLUME_NAME"

if [[ -z "${OPENCLAW_GATEWAY_TOKEN:-}" ]]; then
  if command -v openssl >/dev/null 2>&1; then
    OPENCLAW_GATEWAY_TOKEN="$(openssl rand -hex 32)"
  else
    OPENCLAW_GATEWAY_TOKEN="$(python3 - <<'PY'
import secrets
print(secrets.token_hex(32))
PY
)"
  fi
fi
export OPENCLAW_GATEWAY_TOKEN

COMPOSE_ARGS=("-f" "$COMPOSE_FILE")
COMPOSE_HINT="docker compose -f ${COMPOSE_FILE}"
if [[ -n "$EXTRA_MOUNTS" || -n "$HOME_VOLUME_NAME" ]]; then
  echo "Notice: OPENCLAW_EXTRA_MOUNTS/OPENCLAW_HOME_VOLUME are ignored in single-file mode." >&2
  echo "Edit docker-compose.yml directly for custom mounts/volumes." >&2
fi

ENV_FILE="$REPO_ROOT/.env"
upsert_env() {
  local file="$1"
  shift
  local -a keys=("$@")
  local tmp
  tmp="$(mktemp)"
  # Use a delimited string instead of an associative array so the script
  # works with Bash 3.2 (macOS default) which lacks `declare -A`.
  local seen=" "

  if [[ -f "$file" ]]; then
    while IFS= read -r line || [[ -n "$line" ]]; do
      local key="${line%%=*}"
      local replaced=false
      for k in "${keys[@]}"; do
        if [[ "$key" == "$k" ]]; then
          printf '%s=%s\n' "$k" "${!k-}" >>"$tmp"
          seen="$seen$k "
          replaced=true
          break
        fi
      done
      if [[ "$replaced" == false ]]; then
        printf '%s\n' "$line" >>"$tmp"
      fi
    done <"$file"
  fi

  for k in "${keys[@]}"; do
    if [[ "$seen" != *" $k "* ]]; then
      printf '%s=%s\n' "$k" "${!k-}" >>"$tmp"
    fi
  done

  mv "$tmp" "$file"
}

remove_env_key() {
  local file="$1"
  local key="$2"
  local tmp
  tmp="$(mktemp)"

  if [[ -f "$file" ]]; then
    while IFS= read -r line || [[ -n "$line" ]]; do
      local current_key="${line%%=*}"
      if [[ "$current_key" != "$key" ]]; then
        printf '%s\n' "$line" >>"$tmp"
      fi
    done <"$file"
    mv "$tmp" "$file"
  else
    rm -f "$tmp"
  fi
}

upsert_env "$ENV_FILE" \
  OPENCLAW_CONFIG_DIR \
  OPENCLAW_WORKSPACE_DIR \
  OPENCLAW_GATEWAY_PORT \
  OPENCLAW_BRIDGE_PORT \
  OPENCLAW_GATEWAY_BIND \
  OPENCLAW_GATEWAY_TOKEN \
  OPENCLAW_IMAGE \
  OPENCLAW_EXTRA_MOUNTS \
  OPENCLAW_HOME_VOLUME \
  OPENCLAW_DOCKER_APT_PACKAGES
remove_env_key "$ENV_FILE" "COMPOSE_FILE"

echo "==> Building Docker image: $IMAGE_NAME"
ensure_buildx
DOCKER_BUILDKIT=1 docker buildx build \
  --load \
  --build-arg "OPENCLAW_DOCKER_APT_PACKAGES=${OPENCLAW_DOCKER_APT_PACKAGES}" \
  -t "$IMAGE_NAME" \
  -f "$REPO_ROOT/Dockerfile" \
  "$REPO_ROOT"

echo ""
if [[ -n "${OPENCLAW_ONBOARD_NON_INTERACTIVE:-}" ]]; then
  echo "==> Onboarding (non-interactive)"
  docker compose "${COMPOSE_ARGS[@]}" run --rm openclaw-cli onboard \
    --non-interactive --accept-risk --flow quickstart --mode local \
    --gateway-bind lan --gateway-auth token --gateway-token "$OPENCLAW_GATEWAY_TOKEN" \
    --tailscale off --skip-daemon --skip-channels --skip-skills --skip-ui --skip-health
else
  echo "==> Onboarding (interactive)"
  echo "When prompted:"
  echo "  - Gateway bind: lan"
  echo "  - Gateway auth: token"
  echo "  - Gateway token: $OPENCLAW_GATEWAY_TOKEN"
  echo "  - Tailscale exposure: Off"
  echo "  - Install Gateway daemon: No"
  echo ""
  docker compose "${COMPOSE_ARGS[@]}" run --rm openclaw-cli onboard --no-install-daemon
fi

echo ""
echo "==> Provider setup (optional)"
echo "WhatsApp (QR):"
echo "  ${COMPOSE_HINT} run --rm openclaw-cli channels login"
echo "Telegram (bot token):"
echo "  ${COMPOSE_HINT} run --rm openclaw-cli channels add --channel telegram --token <token>"
echo "Discord (bot token):"
echo "  ${COMPOSE_HINT} run --rm openclaw-cli channels add --channel discord --token <token>"
echo "Docs: https://docs.openclaw.ai/channels"

echo ""
echo "==> Starting gateway"
docker compose "${COMPOSE_ARGS[@]}" up -d openclaw-gateway

echo ""
echo "Gateway running with host port mapping."
echo "Access from tailnet devices via the host's tailnet IP."
echo "Config: $OPENCLAW_CONFIG_DIR"
echo "Workspace: $OPENCLAW_WORKSPACE_DIR"
echo "Token: $OPENCLAW_GATEWAY_TOKEN"
echo ""
echo "Commands:"
echo "  ${COMPOSE_HINT} logs -f openclaw-gateway"
echo "  ${COMPOSE_HINT} exec openclaw-gateway node dist/index.js health --token \"$OPENCLAW_GATEWAY_TOKEN\""
