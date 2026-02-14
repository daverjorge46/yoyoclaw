#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/backup-openclaw-full.sh"
LOG_DIR="${HOME}/Library/Logs/openclaw-backup"
mkdir -p "$LOG_DIR"

TS="$(date +"%Y-%m-%d %H:%M:%S")"
{
  echo "[$TS] Starting ~/.openclaw backup"
  "$BACKUP_SCRIPT"
  echo "[$TS] Backup complete"
} >> "$LOG_DIR/openclaw-backup.log" 2>&1
