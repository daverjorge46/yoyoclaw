#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPTS="$REPO_ROOT/scripts"
RUNNER="$SCRIPTS/run-openclaw-backup.sh"
PLIST_SRC="$SCRIPTS/openclaw-backup.plist"
LAUNCHD_DIR="$HOME/Library/LaunchAgents"
PLIST_DST="$LAUNCHD_DIR/com.openclaw.backup.plist"
CRON_MARKER="# OpenClaw 4h backup for ~/.openclaw"
CRON_CMD="$RUNNER >> $HOME/Library/Logs/openclaw-backup/openclaw-backup.log 2>&1"

mkdir -p "$LAUNCHD_DIR"
mkdir -p "$HOME/Library/Logs/openclaw-backup"

if [[ ! -x "$RUNNER" ]]; then
  echo "Runner script not executable: $RUNNER" >&2
  exit 1
fi

# ---------- launchd ----------
cp "$PLIST_SRC" "$PLIST_DST"
if ! launchctl bootstrap gui/$(id -u) "$PLIST_DST" 2>/tmp/launchd_bootstrap.err; then
  # If service already exists, unload/reload.
  launchctl bootout gui/$(id -u) "$PLIST_DST" 2>/dev/null || true
  launchctl bootstrap gui/$(id -u) "$PLIST_DST"
fi
launchctl enable gui/$(id -u)/com.openclaw.backup
launchctl kickstart -k gui/$(id -u)/com.openclaw.backup

echo "Installed launchd job at $PLIST_DST"

# ---------- cron ----------
CRON_TMP="$(mktemp)"
crontab -l > "$CRON_TMP" 2>/dev/null || true

if ! grep -Fq "$CRON_MARKER" "$CRON_TMP"; then
  {
    echo "$CRON_MARKER"
    echo "0 */4 * * * $CRON_CMD"
  } >> "$CRON_TMP"
  crontab "$CRON_TMP"
  echo "Installed cron job: every 4 hours"
else
  echo "Cron job already present; skipping cron install."
fi
rm -f "$CRON_TMP"

echo "Done."
