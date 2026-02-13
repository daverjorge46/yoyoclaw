#!/usr/bin/env bash
set -euo pipefail

# Add bold English captions to a video file

usage() {
  cat >&2 <<'EOF'
Usage: add-captions.sh <video_file> [youtube_url] [output_file] [vtt_file]

Adds bold, engaging English captions to a video optimized for YouTube Shorts.
If youtube_url is provided, extracts transcript from YouTube.
If vtt_file is provided, uses that VTT file directly (for segment-adjusted subtitles).
EOF
  exit 2
}

if [[ "${1:-}" == "" ]]; then
  usage
fi

VIDEO_FILE="${1:-}"
YOUTUBE_URL="${2:-}"
OUTPUT_FILE="${3:-}"
PROVIDED_VTT="${4:-}"

if [[ ! -f "$VIDEO_FILE" ]]; then
  echo "Error: Video file not found: $VIDEO_FILE" >&2
  exit 1
fi

if ! command -v ffmpeg &> /dev/null; then
  echo "Error: ffmpeg not found. Install with: brew install ffmpeg" >&2
  exit 1
fi

# Generate output filename if not provided
if [[ -z "$OUTPUT_FILE" ]]; then
  BASE_NAME=$(basename "$VIDEO_FILE" .mp4)
  OUTPUT_DIR=$(dirname "$VIDEO_FILE")
  OUTPUT_FILE="$OUTPUT_DIR/${BASE_NAME}_captioned.mp4"
fi

mkdir -p "$(dirname "$OUTPUT_FILE")"

# Get video duration
VIDEO_DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$VIDEO_FILE" 2>/dev/null | cut -d. -f1 || echo "60")

echo "🎬 Adding captions to video..."
echo "  Input: $VIDEO_FILE"
echo "  Output: $OUTPUT_FILE"

# Try to extract transcript from YouTube URL or use provided VTT
TRANSCRIPT_VTT=""
SUBTITLE_FILE=$(mktemp).vtt

# Use provided VTT file if available (for segment-adjusted subtitles)
if [[ -n "$PROVIDED_VTT" ]] && [[ -f "$PROVIDED_VTT" ]]; then
  cp "$PROVIDED_VTT" "$SUBTITLE_FILE"
  TRANSCRIPT_VTT="$SUBTITLE_FILE"
  echo "📝 Using provided transcript file" >&2
elif [[ -n "$YOUTUBE_URL" ]] && command -v yt-dlp &> /dev/null; then
  echo "📝 Extracting transcript from YouTube..." >&2
  TEMP_VTT=$(mktemp)
  if yt-dlp --skip-download --write-auto-sub --sub-lang en --sub-format vtt --output "$TEMP_VTT" "$YOUTUBE_URL" 2>/dev/null; then
    if [[ -f "${TEMP_VTT}.en.vtt" ]]; then
      TRANSCRIPT_VTT="${TEMP_VTT}.en.vtt"
      echo "✅ Transcript extracted" >&2
    fi
  fi
fi

# If no transcript, we'll generate a simple caption file
if [[ -z "$TRANSCRIPT_VTT" ]]; then
  echo "⚠️  No transcript available, creating placeholder captions" >&2
  # Create a simple VTT file with placeholder
  cat > "$SUBTITLE_FILE" <<EOF
WEBVTT

00:00:00.000 --> 00:00:${VIDEO_DURATION}.000
<v Engaging Content>
Watch till the end!
EOF
else
  # Use the extracted VTT file
  cp "$TRANSCRIPT_VTT" "$SUBTITLE_FILE"
fi

# Create ASS subtitle file with bold styling for YouTube Shorts
ASS_FILE=$(mktemp).ass
cat > "$ASS_FILE" <<'EOF'
[Script Info]
Title: YouTube Shorts Captions
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,72,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,4,0,2,20,20,60,1
Style: Bold,Arial Bold,80,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,5,0,2,20,20,60,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
EOF

# Convert VTT to ASS format with bold styling
# Use Python for better VTT parsing if available
if command -v python3 &> /dev/null && [[ -f "$SUBTITLE_FILE" ]] && [[ -s "$SUBTITLE_FILE" ]]; then
  python3 <<PYTHON_SCRIPT > "${ASS_FILE}.tmp"
import re
import sys

# ASS header
ass_content = """[Script Info]
Title: YouTube Shorts Captions
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Bold,Arial Bold,80,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,6,3,2,20,20,80,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

# Parse VTT file
current_start = ""
current_end = ""
current_text = []

try:
    with open("$SUBTITLE_FILE", 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            line = line.strip()
            if not line or line == "WEBVTT" or re.match(r'^NOTE', line) or re.match(r'^\d+$', line):
                continue
            
            # Match timestamp line: 00:00:00.000 --> 00:00:05.000
            timestamp_match = re.match(r'(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})', line)
            if timestamp_match:
                # Save previous dialogue if exists
                if current_start and current_text:
                    text = ' '.join(current_text)
                    # Clean HTML tags and escape special chars
                    text = re.sub(r'<[^>]+>', '', text)
                    text = text.replace('&', r'\\&').replace('{', r'\\{').replace('}', r'\\}')
                    # Convert to ASS timestamp (HH:MM:SS.mm)
                    start_ass = f"{timestamp_match.group(1)}:{timestamp_match.group(2)}:{timestamp_match.group(3)}.{timestamp_match.group(4)[:2]}"
                    end_ass = f"{timestamp_match.group(5)}:{timestamp_match.group(6)}:{timestamp_match.group(7)}.{timestamp_match.group(8)[:2]}"
                    ass_content += f"Dialogue: 0,{current_start},{end_ass},Bold,,0,0,0,,{{\\\\b1}}{text}{{\\\\b0}}\n"
                
                current_start = f"{timestamp_match.group(1)}:{timestamp_match.group(2)}:{timestamp_match.group(3)}.{timestamp_match.group(4)[:2]}"
                current_end = f"{timestamp_match.group(5)}:{timestamp_match.group(6)}:{timestamp_match.group(7)}.{timestamp_match.group(8)[:2]}"
                current_text = []
            else:
                # Text line - clean HTML tags
                clean_line = re.sub(r'<[^>]+>', '', line)
                if clean_line:
                    current_text.append(clean_line)

    # Add last dialogue
    if current_start and current_text:
        text = ' '.join(current_text)
        text = re.sub(r'<[^>]+>', '', text)
        text = text.replace('&', r'\\&').replace('{', r'\\{').replace('}', r'\\}')
        ass_content += f"Dialogue: 0,{current_start},{current_end},Bold,,0,0,0,,{{\\\\b1}}{text}{{\\\\b0}}\n"
except Exception as e:
    # Fallback on error - use VIDEO_DURATION from bash variable
    video_dur = int("""$VIDEO_DURATION""")
    ass_content += f"Dialogue: 0,0:00:00.00,0:00:{video_dur}.00,Bold,,0,0,0,,{{\\\\b1}}Engaging Content{{\\\\b0}}\n"

print(ass_content, end='')
PYTHON_SCRIPT
  if [[ -f "${ASS_FILE}.tmp" ]] && [[ -s "${ASS_FILE}.tmp" ]]; then
    mv "${ASS_FILE}.tmp" "$ASS_FILE"
  else
    # Fallback if Python conversion failed
    cat >> "$ASS_FILE" <<EOF
Dialogue: 0,0:00:00.00,0:00:${VIDEO_DURATION}.00,Bold,,0,0,0,,{\\b1}Engaging Content{\\b0}
EOF
  fi
else
  # Fallback: Simple conversion without Python
  echo "⚠️  Python not found or no transcript, using simple caption generation" >&2
  cat >> "$ASS_FILE" <<EOF
Dialogue: 0,0:00:00.00,0:00:${VIDEO_DURATION}.00,Bold,,0,0,0,,{\\b1}Engaging Content - Watch till the end!{\\b0}
EOF
fi

# Use ffmpeg to burn in subtitles with bold styling
echo "🎨 Rendering captions..." >&2

# Extract captions from ASS/VTT and create drawtext filter chain
# This approach is more reliable than subtitles filter
DRAWTEXT_FILTER_FILE=$(mktemp)

python3 <<PYTHON_CAPTIONS > "$DRAWTEXT_FILTER_FILE"
import re
import sys

drawtext_filters = []

try:
    # Read ASS file
    with open("$ASS_FILE", 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            if line.startswith("Dialogue:"):
                # Parse ASS dialogue: Dialogue: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
                parts = line.split(",", 9)
                if len(parts) >= 10:
                    start_time = parts[1].strip()
                    end_time = parts[2].strip()
                    text_part = parts[9].strip()
                    
                    # Extract text (remove ASS formatting codes)
                    text = re.sub(r'\{[^}]*\}', '', text_part)
                    text = text.replace("\\N", " ").replace("\\n", " ").replace("\\h", " ")
                    text = text.strip()
                    
                    if not text:
                        continue
                    
                    # Convert ASS time (HH:MM:SS.mm) to seconds
                    def ass_to_sec(ass_time):
                        try:
                            time_parts = ass_time.split(":")
                            if len(time_parts) == 3:
                                h, m, s = map(float, time_parts)
                                return h * 3600 + m * 60 + s
                        except:
                            pass
                        return 0
                    
                    start_sec = ass_to_sec(start_time)
                    end_sec = ass_to_sec(end_time)
                    
                    # Skip if outside video duration
                    if end_sec <= start_sec or start_sec < 0:
                        continue
                    
                    # Escape text for drawtext (escape single quotes properly)
                    # Replace single quotes with escaped version for shell
                    text_escaped = text.replace("'", "'\\''")
                    
                    # Create drawtext filter with bold styling
                    # Position: centered horizontally, near bottom (100px from bottom)
                    # Style: Large white text with black box background for readability
                    filter_str = (
                        f"drawtext=text='{text_escaped}':"
                        f"fontsize=85:"
                        f"fontcolor=white:"
                        f"x=(w-text_w)/2:"  # Center horizontally
                        f"y=h-th-120:"     # Near bottom (120px margin for YouTube Shorts)
                        f"enable='between(t,{start_sec:.2f},{end_sec:.2f})':"  # Show only during this time
                        f"box=1:"          # Enable background box
                        f"boxcolor=black@0.85:"  # Semi-transparent black background (darker for better contrast)
                        f"boxborderw=12:"  # Thick border for bold effect
                        f"bordercolor=black@1.0"  # Solid black border
                    )
                    drawtext_filters.append(filter_str)
except Exception as e:
    sys.stderr.write(f"Error processing captions: {e}\n")
    pass

if drawtext_filters:
    # Chain all drawtext filters together
    filter_chain = "[" + "][".join(drawtext_filters) + "]"
    print(filter_chain)
else:
    # Fallback: single placeholder caption
    print("drawtext=text='Engaging Content':fontsize=80:fontcolor=white:x=(w-text_w)/2:y=h-th-100:box=1:boxcolor=black@0.8:boxborderw=10")
PYTHON_CAPTIONS

DRAWTEXT_FILTER=$(cat "$DRAWTEXT_FILTER_FILE")
rm -f "$DRAWTEXT_FILTER_FILE"

# Apply captions using drawtext filter
ffmpeg -hide_banner -loglevel warning -y \
  -i "$VIDEO_FILE" \
  -vf "$DRAWTEXT_FILTER" \
  -c:v libx264 \
  -preset medium \
  -crf 23 \
  -c:a copy \
  -movflags +faststart \
  "$OUTPUT_FILE"

if [[ -f "$OUTPUT_FILE" ]]; then
  echo "✅ Created captioned video: $OUTPUT_FILE"
  echo "$OUTPUT_FILE"
  rm -f "$SUBTITLE_FILE" "$ASS_FILE" "${TEMP_VTT}.en.vtt" 2>/dev/null
else
  echo "Error: Failed to add captions" >&2
  rm -f "$SUBTITLE_FILE" "$ASS_FILE" "${TEMP_VTT}.en.vtt" 2>/dev/null
  exit 1
fi
