#!/usr/bin/env bash
set -euo pipefail

# OpenClaw UI snapshot bundle (macOS + Peekaboo)
#
# Captures a small, consistent set of artifacts useful for debugging UI state.
# Writes outputs under /tmp so nothing is accidentally committed.
#
# Usage:
#   ./scripts/openclaw-ui-snapshot.sh

ts="$(date +%Y%m%d-%H%M%S)"
out="/tmp/openclaw-ui-snapshot-$ts"
mkdir -p "$out"

log="$out/run.log"
err="$out/errors.log"

# Keep logs deterministic/append-only for easy sharing.
: >"$log"
: >"$err"

echo "OpenClaw UI snapshot bundle" >>"$log"
echo "Timestamp: $ts" >>"$log"
echo "Output: $out" >>"$log"

echo "Saved UI snapshot bundle: $out"

if ! command -v peekaboo >/dev/null 2>&1; then
  cat >"$out/README.txt" <<'EOF'
Peekaboo was not found, so this bundle only includes instructions + logs.

Install Peekaboo:
- brew install steipete/tap/peekaboo

Then grant permissions (required for screenshots + UI maps):
- System Settings -> Privacy & Security -> Screen Recording
  - Enable: Terminal (or iTerm) and Peekaboo/Peekaboo Bridge (if present)
  - Quit and reopen Terminal/iTerm after toggling

- System Settings -> Privacy & Security -> Accessibility
  - Enable: Terminal (or iTerm) and Peekaboo/Peekaboo Bridge (if present)
  - Quit and reopen Terminal/iTerm after toggling

Re-run:
- ./scripts/openclaw-ui-snapshot.sh

If automation is blocked, take manual screenshots:
- Shift-Command-5 -> Capture Selected Window
- Also capture the OpenClaw menubar popover if that's where it lives
EOF

  echo "Note: peekaboo not found; wrote instructions to: $out/README.txt" >&2
  echo "Install with: brew install steipete/tap/peekaboo" >&2
  exit 2
fi

try_out() {
  local desc="$1"; shift
  local file="$1"; shift

  echo "" >>"$log"
  echo "== $desc ==" >>"$log"
  echo "$ $*" >>"$log"

  if "$@" >"$out/$file" 2>>"$err"; then
    :
  else
    status=$?
    echo "FAILED: $desc (exit=$status)" >>"$log"
  fi
}

try_cmd() {
  local desc="$1"; shift

  echo "" >>"$log"
  echo "== $desc ==" >>"$log"
  echo "$ $*" >>"$log"

  if "$@" >>"$log" 2>>"$err"; then
    :
  else
    status=$?
    echo "FAILED: $desc (exit=$status)" >>"$log"
  fi
}

# Permissions + UI inventory (best-effort; don't fail the whole snapshot if these error).
try_cmd "Peekaboo version" peekaboo --version
try_out "Peekaboo permissions" peekaboo-permissions.txt peekaboo permissions
try_out "Menubar list (json)" menubar.json peekaboo menubar list --json
try_out "Window list (json)" windows.json peekaboo list windows --json

# Images / UI map (these typically require Screen Recording permission).
# peekaboo writes images to a path; stdout is not meaningful for these.
try_cmd "Screenshot: screen" peekaboo image --mode screen --screen-index 0 --retina --path "$out/screen.png"
try_cmd "Screenshot: frontmost" peekaboo image --mode frontmost --retina --path "$out/frontmost.png"
try_cmd "UI map: screen (annotated)" peekaboo see --mode screen --screen-index 0 --annotate --path "$out/ui-map.png"

# Artifact summary (only list what exists so callers don't have to guess).
echo ""
echo "Artifacts:" 
for f in \
  README.txt \
  run.log \
  errors.log \
  peekaboo-permissions.txt \
  menubar.json \
  windows.json \
  screen.png \
  frontmost.png \
  ui-map.png
do
  if [[ -f "$out/$f" ]]; then
    echo "- $out/$f"
  fi
done

if [[ -s "$err" ]]; then
  echo ""
  echo "Warnings/errors captured in: $err" >&2
fi
