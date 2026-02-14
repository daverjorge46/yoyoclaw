#!/usr/bin/env bash
set -euo pipefail

# Backup/backup-snapshot of ~/.openclaw into this repo with sensitive redaction.
#
# Outputs a timestamped snapshot under .openclaw-backups/<timestamp>/
# and commits it if changes are detected.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SRC_DIR="${HOME}/.openclaw"
SNAP_BASE="$REPO_ROOT/.openclaw-backups"
SNAPSHOT_TS="$(date +"%Y%m%d_%H%M%S")"
SNAPSHOT_DIR="$SNAP_BASE/$SNAPSHOT_TS"

mkdir -p "$SNAP_BASE"
mkdir -p "$SNAPSHOT_DIR"

export SRC_DIR SNAPSHOT_DIR
python3 - <<'PY'
from pathlib import Path
import os
import re
import shutil

SRC_DIR = Path(os.environ["SRC_DIR"])
DST_DIR = Path(os.environ["SNAPSHOT_DIR"])

# Conservative redaction for common secret-bearing files/content.
SENSITIVE_PATH_HINTS = [
    "/.ssh/",
    "/.aws/",
    "/.config/",
    "/.kube/",
    ".env",
    "id_rsa",
    "id_ed25519",
]

EXCLUDE_FILES = {
    ".DS_Store",
}

EXCLUDE_SUFFIXES = {
    ".sqlite",
    ".sqlite3",
    ".db",
    ".ipynb",
    ".log",
    ".log.1",
    ".jsonl",
}

PATTERNS = [
    re.compile(r"(?im)^[\t ]*(?:export[\t ]+)?(?:[A-Za-z_][A-Za-z0-9_]*_?(?:KEY|KEYS?|TOKEN|SECRET|PASS|PASSWORD)|API[_-]?KEY|CLIENT_SECRET|CLIENTID|CLIENT_ID|CLIENT_SECRET)\s*[:=].+$"),
    re.compile(r"(?i)\\b(api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key|bearer\\s+token)\\b[^\n]*"),
    re.compile(r"(?i)\"(?:botToken|appToken|token|apiKey|secret|password)\"\s*:\s*\"[^\"]+\""),
    re.compile(r"(?i)\b(sk-[A-Za-z0-9]{10,}|xox[baprs]-[0-9A-Za-z\\-]{10,}|ghp_[A-Za-z0-9]{20,})\b"),
    re.compile(r"(?i)xai-[A-Za-z0-9]{20,}"),
    re.compile(r"(?i)https://hooks\\.slack\\.com/services/[A-Z0-9/]+"),
    re.compile(r"(?i)pypi-[A-Za-z0-9_\\-]{60,}"),
    re.compile(r"(?i)https?://[^:\\s]+:[^@\\s]+@"),
]


def is_binary(path: Path) -> bool:
    try:
        with open(path, "rb") as f:
            return b"\x00" in f.read(4096)
    except Exception:
        return True


def path_is_sensitive(path: Path) -> bool:
    low = str(path).lower()
    if any(token in low for token in SENSITIVE_PATH_HINTS):
        return True
    if any(part.lower() in {"authorized_keys", "known_hosts", "config"} for part in path.parts):
        return True
    return False


for root, dirs, files in os.walk(SRC_DIR):
    src_root = Path(root)
    rel_root = src_root.relative_to(SRC_DIR)

    # Skip backup directory to prevent recursive backup
    dirs[:] = [d for d in dirs if d != '.openclaw-backups']

    # Do not skip directories by default; this is a full mirror.
    # Sensitive paths are copied, then redacted where possible.
    out_root = DST_DIR / rel_root
    out_root.mkdir(parents=True, exist_ok=True)

    for name in files:
        if name in EXCLUDE_FILES:
            continue
        src_file = src_root / name
        rel = src_file.relative_to(SRC_DIR)
        dst_file = DST_DIR / rel

        if src_file.suffix.lower() in EXCLUDE_SUFFIXES:
            continue

        if path_is_sensitive(src_file) and (is_binary(src_file) or src_file.suffix.lower() in {
            ".pem", ".key", ".p12", ".pfx", ".crt", ".cer", ".der"
        }):
            # skip high-risk binary key material
            continue

        if is_binary(src_file):
            try:
                shutil.copy2(src_file, dst_file)
            except (FileNotFoundError, OSError):
                # Skip files that disappear during backup (transient files, broken symlinks)
                pass
            continue

        try:
            text = src_file.read_text(encoding="utf-8")
        except Exception:
            try:
                shutil.copy2(src_file, dst_file)
            except (FileNotFoundError, OSError):
                # Skip files that disappear during backup
                pass
            continue

        new = text
        for pattern in PATTERNS:
            new = pattern.sub("[REDACTED]", new)

        dst_file.write_text(new, encoding="utf-8")
        try:
            shutil.copystat(src_file, dst_file)
        except Exception:
            pass

# Write manifest and redaction log in each snapshot for auditability
(DST_DIR / "REDACTION_MANIFEST.txt").write_text(
    "Source: {}\nTimestamp: {}\nStatus: redacted+mirrored\n".format(SRC_DIR, os.environ["SNAPSHOT_DIR"])
)
PY

cd "$REPO_ROOT"

git add .openclaw-backups/
if git diff --quiet --cached -- .openclaw-backups; then
  echo "No changes to commit."
  git restore --staged .openclaw-backups 2>/dev/null || true
  exit 0
fi

git commit -m "chore: backup ~/.openclaw snapshot $SNAPSHOT_TS"

