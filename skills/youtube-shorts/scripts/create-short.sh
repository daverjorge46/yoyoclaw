#!/usr/bin/env bash
set -euo pipefail

# YouTube Shorts Creator - Main workflow script
# Downloads, analyzes, and creates YouTube Shorts from YouTube videos

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

usage() {
  cat >&2 <<'EOF'
Usage: create-short.sh <youtube_url> [options]

Options:
  --duration <seconds>    Target duration (default: 60, max: 60)
  --model <model>         Ollama model (default: auto-detect)
  --start <timestamp>     Manual start time (HH:MM:SS or seconds)
  --output <path>         Output file path (default: auto-generated)
  --no-upload            Skip YouTube upload
  --keep-files           Keep intermediate files
  --no-captions          Skip adding captions (default: captions enabled)

Examples:
  create-short.sh 'https://youtube.com/watch?v=VIDEO_ID'
  create-short.sh 'https://youtube.com/watch?v=VIDEO_ID' --duration 45
  create-short.sh 'https://youtube.com/watch?v=VIDEO_ID' --start 120 --duration 60
EOF
  exit 2
}

if [[ "${1:-}" == "" || "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
fi

YOUTUBE_URL="${1:-}"
shift || true

DURATION=60
MODEL=""
START_TIME=""
OUTPUT_FILE=""
NO_UPLOAD=false
KEEP_FILES=false
ADD_CAPTIONS=true

while [[ $# -gt 0 ]]; do
  case "$1" in
    --duration)
      DURATION="${2:-}"
      shift 2
      ;;
    --model)
      MODEL="${2:-}"
      shift 2
      ;;
    --start)
      START_TIME="${2:-}"
      shift 2
      ;;
    --output)
      OUTPUT_FILE="${2:-}"
      shift 2
      ;;
    --no-upload)
      NO_UPLOAD=true
      shift
      ;;
    --keep-files)
      KEEP_FILES=true
      shift
      ;;
    --no-captions)
      ADD_CAPTIONS=false
      shift
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      ;;
  esac
done

# Export YouTube URL for transcript extraction
export YOUTUBE_URL

# Validate duration
if [[ $DURATION -gt 60 ]]; then
  echo "Warning: YouTube Shorts must be ≤60 seconds. Clamping to 60." >&2
  DURATION=60
fi

# Setup directories
OUTPUT_DIR="${YOUTUBE_SHORTS_OUTPUT_DIR:-$HOME/.openclaw/workspace/youtube-shorts}"
TEMP_DIR="${OUTPUT_DIR}/temp/$(date +%s)"
mkdir -p "$TEMP_DIR"
mkdir -p "$OUTPUT_DIR"

cleanup() {
  if [[ "$KEEP_FILES" != "true" ]]; then
    rm -rf "$TEMP_DIR"
  else
    echo "Keeping intermediate files in: $TEMP_DIR"
  fi
}
trap cleanup EXIT

echo "📥 Step 1: Downloading video..."
DOWNLOADED_VIDEO="$TEMP_DIR/video.mp4"
if ! "$SCRIPT_DIR/download-video.sh" "$YOUTUBE_URL" "$TEMP_DIR"; then
  echo "Error: Failed to download video" >&2
  exit 1
fi

# Find the downloaded video file
if [[ -f "$TEMP_DIR/video.mp4" ]]; then
  DOWNLOADED_VIDEO="$TEMP_DIR/video.mp4"
elif [[ -f "$TEMP_DIR"/*.mp4 ]]; then
  DOWNLOADED_VIDEO=$(ls "$TEMP_DIR"/*.mp4 | head -1)
else
  echo "Error: Could not find downloaded video file" >&2
  exit 1
fi

echo "✅ Downloaded: $DOWNLOADED_VIDEO"

# Extract transcript VTT for sentence boundary detection
TRANSCRIPT_VTT=""
if [[ -n "$YOUTUBE_URL" ]] && command -v yt-dlp &> /dev/null; then
  echo "📝 Extracting transcript for sentence boundary detection..." >&2
  TEMP_VTT_BASE=$(mktemp)
  if yt-dlp --skip-download --write-auto-sub --sub-lang en --sub-format vtt --output "$TEMP_VTT_BASE" "$YOUTUBE_URL" 2>/dev/null; then
    if [[ -f "${TEMP_VTT_BASE}.en.vtt" ]]; then
      TRANSCRIPT_VTT="${TEMP_VTT_BASE}.en.vtt"
      echo "✅ Transcript extracted" >&2
    fi
  fi
fi

# Determine start time
if [[ -z "$START_TIME" ]]; then
  echo "🤖 Step 2: Analyzing video with Ollama to find best segment..."
  SEGMENT_JSON="$TEMP_DIR/segments.json"
  export YOUTUBE_URL
  if ! "$SCRIPT_DIR/analyze-segments.sh" "$DOWNLOADED_VIDEO" "${MODEL:-}" "$DURATION" "$YOUTUBE_URL" > "$SEGMENT_JSON"; then
    echo "Warning: AI analysis failed" >&2
    # Smart fallback: use middle section instead of intro
    VIDEO_DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$DOWNLOADED_VIDEO" 2>/dev/null | cut -d. -f1 || echo "0")
    if [[ $VIDEO_DURATION -gt $((DURATION * 2)) ]]; then
      # Start at 25% through the video (skip intro, get to content)
      START_TIME=$((VIDEO_DURATION * 25 / 100))
      echo "📊 Using smart fallback: starting at ${START_TIME}s (25% through video)" >&2
    else
      START_TIME=0
      echo "Warning: Video too short, using first ${DURATION}s" >&2
    fi
  else
    # Extract start time from JSON
    if command -v jq &> /dev/null; then
      START_TIME=$(jq -r '.segments[0].start // 0' "$SEGMENT_JSON" 2>/dev/null || echo "0")
      # Validate start time (ensure it's not just the intro)
      if [[ $START_TIME -lt 10 ]]; then
        echo "⚠️  Analysis suggested intro (${START_TIME}s), using smarter fallback" >&2
        VIDEO_DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$DOWNLOADED_VIDEO" 2>/dev/null | cut -d. -f1 || echo "0")
        if [[ $VIDEO_DURATION -gt $((DURATION * 2)) ]]; then
          START_TIME=$((VIDEO_DURATION * 30 / 100))
          echo "📊 Using segment starting at ${START_TIME}s (30% through video)" >&2
        fi
      else
        echo "📊 Recommended segment: starts at ${START_TIME}s"
      fi
    else
      echo "Warning: jq not found, using smart fallback" >&2
      VIDEO_DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$DOWNLOADED_VIDEO" 2>/dev/null | cut -d. -f1 || echo "0")
      START_TIME=$((VIDEO_DURATION * 25 / 100))
    fi
  fi
fi

# Step 2.5: Adjust duration to complete sentences (dynamic duration)
if [[ -n "$TRANSCRIPT_VTT" ]] && [[ -f "$TRANSCRIPT_VTT" ]]; then
  echo "🔍 Finding sentence boundary to avoid cutting mid-sentence..."
  ADJUSTED_DURATION=$("$SCRIPT_DIR/find-sentence-boundary.sh" "$TRANSCRIPT_VTT" "$START_TIME" "$DURATION")
  if [[ $ADJUSTED_DURATION -ne $DURATION ]] && [[ $ADJUSTED_DURATION -le 60 ]]; then
    echo "📏 Adjusted duration from ${DURATION}s to ${ADJUSTED_DURATION}s to complete sentence"
    DURATION=$ADJUSTED_DURATION
  elif [[ $ADJUSTED_DURATION -gt 60 ]]; then
    echo "⚠️  Sentence completion would exceed 60s limit, using ${DURATION}s"
  fi
fi

# Generate output filename
if [[ -z "$OUTPUT_FILE" ]]; then
  VIDEO_ID=$(echo "$YOUTUBE_URL" | sed -E 's/.*[?&]v=([^&]*).*/\1/' || echo "video")
  OUTPUT_FILE="$OUTPUT_DIR/short_${VIDEO_ID}_$(date +%Y%m%d_%H%M%S).mp4"
fi

echo "✂️  Step 3: Creating short format (9:16, ${DURATION}s)..."
SHORT_NO_CAPTIONS="${OUTPUT_FILE%.mp4}_nocaptions.mp4"
if ! "$SCRIPT_DIR/create-short-format.sh" "$DOWNLOADED_VIDEO" "$START_TIME" "$DURATION" "$SHORT_NO_CAPTIONS"; then
  echo "Error: Failed to create short format" >&2
  exit 1
fi

# Step 4: Add captions if requested
if [[ "$ADD_CAPTIONS" == "true" ]]; then
  echo "📝 Step 4: Adding bold captions..."
  # Pass the transcript VTT file path if available
  if [[ -n "$TRANSCRIPT_VTT" ]] && [[ -f "$TRANSCRIPT_VTT" ]]; then
    # Create a temporary VTT file adjusted for the segment
    ADJUSTED_VTT="$TEMP_DIR/adjusted_subtitles.vtt"
    if command -v python3 &> /dev/null; then
      python3 <<PYTHON_ADJUST > "$ADJUSTED_VTT"
import re

start_offset = $START_TIME
try:
    with open("$TRANSCRIPT_VTT", 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
        # Adjust timestamps by subtracting start_offset
        def adjust_timestamp(match):
            h, m, s, ms = map(int, match.groups()[:4])
            total_sec = h * 3600 + m * 60 + s + ms / 1000.0
            if total_sec < start_offset:
                return ""
            adjusted_sec = total_sec - start_offset
            if adjusted_sec > $DURATION:
                return ""
            new_h = int(adjusted_sec // 3600)
            new_m = int((adjusted_sec % 3600) // 60)
            new_s = int(adjusted_sec % 60)
            new_ms = int((adjusted_sec % 1) * 1000)
            return f"{new_h:02d}:{new_m:02d}:{new_s:02d}.{new_ms:03d}"
        
        # Adjust all timestamps
        pattern = r'(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})'
        adjusted = re.sub(pattern, lambda m: adjust_timestamp(m) + " --> " + adjust_timestamp(re.match(r'(\d{2}):(\d{2}):(\d{2})\.(\d{3})', m.group(5) + ":" + m.group(6) + ":" + m.group(7) + "." + m.group(8))) if m.group(5) else "", content)
        print(adjusted)
except:
    pass
PYTHON_ADJUST
      if [[ -s "$ADJUSTED_VTT" ]]; then
        # Use adjusted VTT for captions (pass as 4th parameter)
        TRANSCRIPT_VTT_ARG="$ADJUSTED_VTT"
      else
        TRANSCRIPT_VTT_ARG=""
      fi
    else
      TRANSCRIPT_VTT_ARG=""
    fi
    
    # Call add-captions with VTT file if available
    if [[ -n "$TRANSCRIPT_VTT_ARG" ]] && [[ -f "$TRANSCRIPT_VTT_ARG" ]]; then
      # Use provided VTT file
      if ! "$SCRIPT_DIR/add-captions.sh" "$SHORT_NO_CAPTIONS" "" "$OUTPUT_FILE" "$TRANSCRIPT_VTT_ARG"; then
        echo "Warning: Failed to add captions with provided VTT, trying YouTube extraction" >&2
        if ! "$SCRIPT_DIR/add-captions.sh" "$SHORT_NO_CAPTIONS" "$YOUTUBE_URL" "$OUTPUT_FILE"; then
          echo "Warning: Failed to add captions, using video without captions" >&2
          mv "$SHORT_NO_CAPTIONS" "$OUTPUT_FILE"
        else
          rm -f "$SHORT_NO_CAPTIONS"
        fi
      else
        rm -f "$SHORT_NO_CAPTIONS"
      fi
    else
      # Use original method (extract from YouTube)
      if ! "$SCRIPT_DIR/add-captions.sh" "$SHORT_NO_CAPTIONS" "$YOUTUBE_URL" "$OUTPUT_FILE"; then
        echo "Warning: Failed to add captions, using video without captions" >&2
        mv "$SHORT_NO_CAPTIONS" "$OUTPUT_FILE"
      else
        rm -f "$SHORT_NO_CAPTIONS"
      fi
    fi
  else
    # No transcript VTT, use original method
    if ! "$SCRIPT_DIR/add-captions.sh" "$SHORT_NO_CAPTIONS" "$YOUTUBE_URL" "$OUTPUT_FILE"; then
      echo "Warning: Failed to add captions, using video without captions" >&2
      mv "$SHORT_NO_CAPTIONS" "$OUTPUT_FILE"
    else
      rm -f "$SHORT_NO_CAPTIONS"
    fi
  fi
else
  mv "$SHORT_NO_CAPTIONS" "$OUTPUT_FILE"
fi

echo "✅ Created short: $OUTPUT_FILE"

# Upload if requested
if [[ "$NO_UPLOAD" != "true" ]] && [[ -n "${YOUTUBE_CLIENT_ID:-}" ]] && [[ -n "${YOUTUBE_CLIENT_SECRET:-}" ]]; then
  echo "📤 Step 5: Uploading to YouTube..."
  TITLE="Short from $(basename "$OUTPUT_FILE" .mp4)"
  if ! "$SCRIPT_DIR/upload-youtube.sh" "$OUTPUT_FILE" "$TITLE"; then
    echo "Warning: Upload failed, but video is ready at: $OUTPUT_FILE" >&2
  else
    echo "✅ Uploaded successfully!"
  fi
else
  echo "ℹ️  Skipping upload (use --no-upload to suppress this message, or configure YouTube API)"
fi

echo ""
echo "🎉 Success! Short created at: $OUTPUT_FILE"
