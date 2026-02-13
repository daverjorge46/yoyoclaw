#!/usr/bin/env bash
set -euo pipefail

# Download YouTube video using yt-dlp

usage() {
  cat >&2 <<'EOF'
Usage: download-video.sh <youtube_url> [output_dir]

Downloads a YouTube video and saves it as video.mp4 in the output directory.
EOF
  exit 2
}

if [[ "${1:-}" == "" || "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
fi

YOUTUBE_URL="${1:-}"
OUTPUT_DIR="${2:-$(pwd)}"

if ! command -v yt-dlp &> /dev/null; then
  echo "Error: yt-dlp not found. Install with: brew install yt-dlp" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

echo "Downloading: $YOUTUBE_URL"

# Download video (best quality MP4, or best available)
yt-dlp \
  --format "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" \
  --merge-output-format mp4 \
  --output "$OUTPUT_DIR/video.%(ext)s" \
  --no-playlist \
  "$YOUTUBE_URL"

# Find the downloaded file
if [[ -f "$OUTPUT_DIR/video.mp4" ]]; then
  echo "$OUTPUT_DIR/video.mp4"
elif [[ -f "$OUTPUT_DIR"/*.mp4 ]]; then
  ls "$OUTPUT_DIR"/*.mp4 | head -1
else
  echo "Error: Could not find downloaded video" >&2
  exit 1
fi
