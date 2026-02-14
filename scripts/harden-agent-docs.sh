#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF' >&2
Usage:
  harden-agent-docs.sh <docs_dir> [--agent-user node] [--agent-group node]

Goal:
  Keep the agent productive (read/write in docs) while preventing it from
  unexpectedly deleting or mutating identity-defining files.

What it does:
  - Sets <docs_dir> to root-owned + sticky bit (mode 1775). This prevents
    deletion/rename of files the agent does not own.
  - Makes these files immutable to the agent (root:root 0444) if present:
      IDENTITY.md, SOUL.md, TOOLS.md
  - Makes these files editable but not deletable by the agent (root:<group> 0664) if present:
      MEMORY.md, HEARTBEAT.md
  - Defaults all other children under <docs_dir> to <agent-user>:<agent-group>,
    dirs 0775 and files 0664.

Run this as root (e.g. `docker exec -u root ...`).
EOF
}

DOCS_DIR="${1:-}"
shift || true

AGENT_USER="node"
AGENT_GROUP="node"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --agent-user)
      AGENT_USER="${2:-}"; shift 2 || true ;;
    --agent-group)
      AGENT_GROUP="${2:-}"; shift 2 || true ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      echo "Unknown arg: $1" >&2
      usage
      exit 2
      ;;
  esac
done

if [[ -z "${DOCS_DIR}" ]]; then
  usage
  exit 2
fi

if [[ "$(id -u)" != "0" ]]; then
  echo "Error: must run as root (try: docker exec -u root ...)." >&2
  exit 1
fi

if ! id "${AGENT_USER}" >/dev/null 2>&1; then
  echo "Error: user not found: ${AGENT_USER}" >&2
  exit 1
fi

if ! getent group "${AGENT_GROUP}" >/dev/null 2>&1; then
  echo "Error: group not found: ${AGENT_GROUP}" >&2
  exit 1
fi

mkdir -p "${DOCS_DIR}"

# 1) Directory policy: sticky bit + root-owned so the agent can't delete/rename
#    files it doesn't own (even if it can write in the directory).
chown root:"${AGENT_GROUP}" "${DOCS_DIR}"
chmod 1775 "${DOCS_DIR}"

# 2) Defaults for children (skip symlinks to avoid touching unexpected targets).
find "${DOCS_DIR}" -mindepth 1 -type d -exec chown "${AGENT_USER}:${AGENT_GROUP}" {} + -exec chmod 0775 {} +
find "${DOCS_DIR}" -mindepth 1 -type f -exec chown "${AGENT_USER}:${AGENT_GROUP}" {} + -exec chmod 0664 {} +

# 3) Lock identity-defining docs files (read-only, root-owned).
for f in IDENTITY.md SOUL.md TOOLS.md; do
  p="${DOCS_DIR%/}/${f}"
  if [[ -f "${p}" ]]; then
    chown root:root "${p}"
    chmod 0444 "${p}"
  fi
done

# 4) Allow edits but prevent deletion/rename (root-owned; writable via group).
for f in MEMORY.md HEARTBEAT.md; do
  p="${DOCS_DIR%/}/${f}"
  if [[ -f "${p}" ]]; then
    chown root:"${AGENT_GROUP}" "${p}"
    chmod 0664 "${p}"
  fi
done

# 5) Re-assert directory policy in case an earlier operation changed it.
chown root:"${AGENT_GROUP}" "${DOCS_DIR}"
chmod 1775 "${DOCS_DIR}"

echo "OK: hardened ${DOCS_DIR}"
