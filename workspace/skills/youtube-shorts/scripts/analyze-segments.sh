#!/usr/bin/env bash
set -euo pipefail

# Analyze video transcript and identify interesting segments using Ollama

usage() {
  cat >&2 <<'EOF'
Usage: analyze-segments.sh <video_file> [model] [target_duration] [youtube_url]

Analyzes video transcript and returns JSON with recommended segments for shorts.
EOF
  exit 2
}

if [[ "${1:-}" == "" || "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
fi

VIDEO_FILE="${1:-}"
MODEL="${2:-}"
TARGET_DURATION="${3:-60}"
YOUTUBE_URL="${4:-${YOUTUBE_URL:-}}"

if [[ ! -f "$VIDEO_FILE" ]]; then
  echo "Error: Video file not found: $VIDEO_FILE" >&2
  exit 1
fi

# Get video duration using ffprobe
if ! command -v ffprobe &> /dev/null; then
  echo "Error: ffprobe not found. Install ffmpeg: brew install ffmpeg" >&2
  exit 1
fi

VIDEO_DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$VIDEO_FILE" | cut -d. -f1)
VIDEO_DURATION=${VIDEO_DURATION:-0}

if [[ $VIDEO_DURATION -eq 0 ]]; then
  echo "Error: Could not determine video duration" >&2
  exit 1
fi

# Try to extract transcript using yt-dlp (if available)
TRANSCRIPT_FILE=$(mktemp)
TRANSCRIPT_AVAILABLE=false

# First try: Extract transcript from YouTube URL if available
if command -v yt-dlp &> /dev/null && [[ -n "${YOUTUBE_URL:-}" ]]; then
  echo "Extracting transcript from YouTube..." >&2
  # Try to get transcript using yt-dlp
  if yt-dlp --skip-download --write-auto-sub --sub-lang en --sub-format vtt --output "$TRANSCRIPT_FILE" "$YOUTUBE_URL" 2>/dev/null; then
    # Convert VTT to plain text
    if [[ -f "${TRANSCRIPT_FILE}.en.vtt" ]]; then
      # Extract text from VTT, remove timestamps and formatting
      grep -v "^[0-9]" "${TRANSCRIPT_FILE}.en.vtt" | grep -v "^WEBVTT" | grep -v "^$" | sed 's/<[^>]*>//g' | tr '\n' ' ' > "$TRANSCRIPT_FILE" 2>/dev/null
      if [[ -s "$TRANSCRIPT_FILE" ]]; then
        TRANSCRIPT_AVAILABLE=true
        echo "✅ Transcript extracted" >&2
      fi
      rm -f "${TRANSCRIPT_FILE}.en.vtt" 2>/dev/null
    fi
  fi
fi

# Fallback: Use summarize.sh if available
if [[ "$TRANSCRIPT_AVAILABLE" != "true" ]] && command -v summarize &> /dev/null && [[ -n "${YOUTUBE_URL:-}" ]]; then
  echo "Trying summarize.sh for transcript..." >&2
  if summarize "$YOUTUBE_URL" --youtube auto --extract-only > "$TRANSCRIPT_FILE" 2>/dev/null; then
    if [[ -s "$TRANSCRIPT_FILE" ]]; then
      TRANSCRIPT_AVAILABLE=true
      echo "✅ Transcript extracted via summarize" >&2
    fi
  fi
fi

# Determine Ollama endpoint
OLLAMA_BASE="${OLLAMA_BASE:-http://127.0.0.1:11434}"
if [[ "$OLLAMA_BASE" == "http://host.docker.internal:11434" ]]; then
  # Docker environment
  OLLAMA_BASE="http://host.docker.internal:11434"
fi

# Auto-detect model if not provided
if [[ -z "$MODEL" ]]; then
  if command -v ollama &> /dev/null; then
    # Try to list models and pick the first tool-capable one
    AVAILABLE_MODELS=$(ollama list 2>/dev/null | awk 'NR>1 {print $1}' | head -1 || echo "")
    if [[ -n "$AVAILABLE_MODELS" ]]; then
      MODEL="$AVAILABLE_MODELS"
    else
      MODEL="llama3.3"
    fi
  else
    MODEL="llama3.3"
  fi
fi

# Remove "ollama/" prefix if present
MODEL=$(echo "$MODEL" | sed 's|^ollama/||')

# Create analysis prompt with better instructions
TRANSCRIPT_TEXT=""
if [[ "$TRANSCRIPT_AVAILABLE" == "true" ]]; then
  TRANSCRIPT_TEXT=$(cat "$TRANSCRIPT_FILE" | head -c 4000)
fi

# Build prompt safely to avoid quote issues - escape single quotes in transcript
if [[ "$TRANSCRIPT_AVAILABLE" == "true" ]] && [[ -n "$TRANSCRIPT_TEXT" ]]; then
  ESCAPED_TRANSCRIPT=$(printf '%s\n' "$TRANSCRIPT_TEXT" | sed "s/'/'\"'\"'/g")
  TRANSCRIPT_PART="Full transcript: ${ESCAPED_TRANSCRIPT}

"
else
  TRANSCRIPT_PART=""
fi

PROMPT=$(cat <<EOF
You are analyzing a YouTube video to find the BEST ${TARGET_DURATION}-second segment for a YouTube Short that will maximize engagement and retention.

Video duration: ${VIDEO_DURATION} seconds
Target segment length: ${TARGET_DURATION} seconds

${TRANSCRIPT_PART}

CRITICAL INSTRUCTIONS:
1. **AVOID THE INTRO** - Skip the first 10-15 seconds (usually just greetings/introductions)
2. Find segments with:
   - A strong hook or attention-grabbing statement
   - High-value content (tips, insights, revelations, key moments)
   - Emotional peaks (surprise, excitement, controversy)
   - Visual interest or action
   - Self-contained narratives that don't need context
3. **Prefer middle-to-end segments** over intro segments
4. Look for moments where the speaker:
   - Reveals something important
   - Shares a key insight or tip
   - Tells an interesting story
   - Demonstrates something visually engaging
   - Has high energy or emotion

Analyze the ENTIRE video and identify the SINGLE BEST ${TARGET_DURATION}-second segment that would perform best as a YouTube Short.

Return JSON in this exact format:
{
  "segments": [
    {
      "start": <start_time_in_seconds_as_number>,
      "end": <end_time_in_seconds_as_number>,
      "reason": "<specific explanation of why this segment is engaging>"
    }
  ]
}

CRITICAL INSTRUCTIONS:
1. **AVOID THE INTRO** - Skip the first 10-15 seconds (usually just greetings/introductions)
2. Find segments with:
   - A strong hook or attention-grabbing statement
   - High-value content (tips, insights, revelations, key moments)
   - Emotional peaks (surprise, excitement, controversy)
   - Visual interest or action
   - Self-contained narratives that don't need context
3. **Prefer middle-to-end segments** over intro segments
4. Look for moments where the speaker:
   - Reveals something important
   - Shares a key insight or tip
   - Tells an interesting story
   - Demonstrates something visually engaging
   - Has high energy or emotion

Analyze the ENTIRE video and identify the SINGLE BEST ${TARGET_DURATION}-second segment that would perform best as a YouTube Short.

Return JSON in this exact format:
{
  "segments": [
    {
      "start": <start_time_in_seconds_as_number>,
      "end": <end_time_in_seconds_as_number>,
      "reason": "<specific explanation of why this segment is engaging>"
    }
  ]
}

${TRANSCRIPT_AVAILABLE:+Use the transcript timestamps to find the exact moment.}${TRANSCRIPT_AVAILABLE:-If no transcript is available, suggest a segment starting around 30% through the video (around $(($VIDEO_DURATION * 30 / 100)) seconds), avoiding the intro.}
EOF
)

# Call Ollama API
PROMPT_JSON=$(echo "$PROMPT" | jq -Rs .)
RESPONSE=$(curl -s "${OLLAMA_BASE}/api/generate" \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"${MODEL}\",
    \"prompt\": ${PROMPT_JSON},
    \"stream\": false,
    \"options\": {
      \"temperature\": 0.7,
      \"num_predict\": 500
    }
  }" 2>/dev/null || echo "")

if [[ -z "$RESPONSE" ]]; then
  echo "Error: Failed to connect to Ollama at $OLLAMA_BASE" >&2
  echo "Make sure Ollama is running and accessible." >&2
  exit 1
fi

# Extract JSON from response
JSON_RESPONSE=$(echo "$RESPONSE" | jq -r '.response' 2>/dev/null || echo "")

# Try to extract JSON object from the response
if echo "$JSON_RESPONSE" | jq -e '.segments' > /dev/null 2>&1; then
  echo "$JSON_RESPONSE" | jq '.segments'
else
  # Fallback: try to parse JSON from the text
  EXTRACTED_JSON=$(echo "$JSON_RESPONSE" | grep -o '{[^}]*"segments"[^}]*}' | head -1 || echo "")
  if [[ -n "$EXTRACTED_JSON" ]]; then
    echo "$EXTRACTED_JSON" | jq '.segments'
  else
    # Ultimate fallback: return first segment
    cat <<EOF
{
  "segments": [
    {
      "start": 0,
      "end": ${TARGET_DURATION},
      "reason": "Fallback: first ${TARGET_DURATION} seconds"
    }
  ]
}
EOF
  fi
fi

rm -f "$TRANSCRIPT_FILE"
