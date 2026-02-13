#!/usr/bin/env bash
set -euo pipefail

# Create YouTube Shorts format video (9:16 aspect ratio, vertical)

usage() {
  cat >&2 <<'EOF'
Usage: create-short-format.sh <input_video> <start_time> <duration> [output_file]

Creates a YouTube Shorts format video:
- 9:16 aspect ratio (vertical)
- Duration: <duration> seconds (max 60)
- Starts at <start_time> (seconds or HH:MM:SS format)

Parameters:
  input_video   Source video file
  start_time    Start timestamp (seconds or HH:MM:SS)
  duration      Duration in seconds (max 60)
  output_file   Output path (optional, auto-generated if not provided)
EOF
  exit 2
}

if [[ "${1:-}" == "" || "${2:-}" == "" || "${3:-}" == "" ]]; then
  usage
fi

INPUT_VIDEO="${1:-}"
START_TIME="${2:-}"
DURATION="${3:-60}"
OUTPUT_FILE="${4:-}"

if [[ ! -f "$INPUT_VIDEO" ]]; then
  echo "Error: Input video not found: $INPUT_VIDEO" >&2
  exit 1
fi

if ! command -v ffmpeg &> /dev/null; then
  echo "Error: ffmpeg not found. Install with: brew install ffmpeg" >&2
  exit 1
fi

# Validate duration (simple integer comparison)
if [[ $DURATION -gt 60 ]]; then
  echo "Warning: YouTube Shorts must be ≤60 seconds. Clamping to 60." >&2
  DURATION=60
fi

# Convert start_time to seconds if it's in HH:MM:SS format
if [[ "$START_TIME" =~ ^[0-9]+:[0-9]+:[0-9]+$ ]]; then
  # HH:MM:SS format
  IFS=':' read -r hours minutes seconds <<< "$START_TIME"
  START_TIME=$((hours * 3600 + minutes * 60 + seconds))
fi

# Generate output filename if not provided
if [[ -z "$OUTPUT_FILE" ]]; then
  BASE_NAME=$(basename "$INPUT_VIDEO" .mp4)
  OUTPUT_DIR=$(dirname "$INPUT_VIDEO")
  OUTPUT_FILE="$OUTPUT_DIR/${BASE_NAME}_short_${START_TIME}s_${DURATION}s.mp4"
fi

mkdir -p "$(dirname "$OUTPUT_FILE")"

echo "Creating short format video..."
echo "  Input: $INPUT_VIDEO"
echo "  Start: ${START_TIME}s"
echo "  Duration: ${DURATION}s"
echo "  Output: $OUTPUT_FILE"

# Target aspect ratio: 9:16 (vertical)
TARGET_WIDTH=1080
TARGET_HEIGHT=1920

# Use ffmpeg to create the short with smart cropping
# The scale filter with crop will automatically handle aspect ratio conversion
# This approach scales to fit 9:16, then crops to exact dimensions (centered)
ffmpeg -hide_banner -loglevel warning -y \
  -ss "$START_TIME" \
  -i "$INPUT_VIDEO" \
  -t "$DURATION" \
  -vf "scale=${TARGET_WIDTH}:${TARGET_HEIGHT}:force_original_aspect_ratio=increase,crop=${TARGET_WIDTH}:${TARGET_HEIGHT},scale=${TARGET_WIDTH}:${TARGET_HEIGHT}" \
  -c:v libx264 \
  -preset medium \
  -crf 23 \
  -c:a aac \
  -b:a 128k \
  -movflags +faststart \
  "$OUTPUT_FILE"

if [[ -f "$OUTPUT_FILE" ]]; then
  echo "✅ Created short: $OUTPUT_FILE"
  echo "$OUTPUT_FILE"
else
  echo "Error: Failed to create short video" >&2
  exit 1
fi
