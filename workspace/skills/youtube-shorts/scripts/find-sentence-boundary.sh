#!/usr/bin/env bash
set -euo pipefail

# Find the next sentence boundary after a given timestamp to avoid cutting mid-sentence

usage() {
  cat >&2 <<'EOF'
Usage: find-sentence-boundary.sh <vtt_file> <start_time_seconds> <max_duration>

Finds the end of the last complete sentence within max_duration from start_time.
Returns the adjusted duration that completes the sentence.
EOF
  exit 2
}

if [[ "${1:-}" == "" || "${2:-}" == "" || "${3:-}" == "" ]]; then
  usage
fi

VTT_FILE="${1:-}"
START_TIME="${2:-0}"
MAX_DURATION="${3:-60}"

if [[ ! -f "$VTT_FILE" ]]; then
  echo "$MAX_DURATION"  # Return max duration if no VTT file
  exit 0
fi

# Convert start_time to seconds if needed
if [[ "$START_TIME" =~ ^[0-9]+:[0-9]+:[0-9]+$ ]]; then
  IFS=':' read -r hours minutes seconds <<< "$START_TIME"
  START_TIME=$((hours * 3600 + minutes * 60 + seconds))
fi

END_TIME=$((START_TIME + MAX_DURATION))
TARGET_END=$END_TIME

# Parse VTT file to find sentence boundaries
# Look for timestamps and text that ends with sentence punctuation
if command -v python3 &> /dev/null; then
  python3 <<PYTHON_SCRIPT
import re
import sys

start_time = $START_TIME
max_end = $END_TIME
target_end = max_end

try:
    segments = []
    current_text = ""
    current_start_sec = 0
    current_end_sec = 0
    
    with open("$VTT_FILE", 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            line = line.strip()
            if not line or line == "WEBVTT" or re.match(r'^NOTE', line) or re.match(r'^\d+$', line):
                continue
            
            # Match timestamp: 00:00:00.000 --> 00:00:05.000
            timestamp_match = re.match(r'(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})', line)
            if timestamp_match:
                # Save previous segment if exists
                if current_text:
                    segments.append({
                        'start': current_start_sec,
                        'end': current_end_sec,
                        'text': current_text
                    })
                
                # Convert timestamp to seconds
                h1, m1, s1, ms1 = map(int, timestamp_match.groups()[:4])
                h2, m2, s2, ms2 = map(int, timestamp_match.groups()[4:])
                current_start_sec = h1 * 3600 + m1 * 60 + s1 + ms1 / 1000.0
                current_end_sec = h2 * 3600 + m2 * 60 + s2 + ms2 / 1000.0
                current_text = ""
            else:
                # Accumulate text
                clean_line = re.sub(r'<[^>]+>', '', line)
                if clean_line:
                    current_text += " " + clean_line if current_text else clean_line
        
        # Add last segment
        if current_text:
            segments.append({
                'start': current_start_sec,
                'end': current_end_sec,
                'text': current_text
            })
    
    # Find the best sentence boundary
    best_end = start_time + $MAX_DURATION
    
    for seg in segments:
        seg_start = seg['start']
        seg_end = seg['end']
        text = seg['text']
        
        # Check if segment overlaps with our time range
        if seg_start < start_time + $MAX_DURATION and seg_end > start_time:
            # Check for sentence endings
            # Look for punctuation followed by space or end of text
            sentences = re.split(r'([.!?]+[\s\n]*)', text)
            
            # Reconstruct sentences with punctuation
            full_sentences = []
            for i in range(0, len(sentences) - 1, 2):
                if i + 1 < len(sentences):
                    full_sentences.append(sentences[i] + sentences[i + 1])
                else:
                    full_sentences.append(sentences[i])
            
            # Find where complete sentences end
            cumulative_length = 0
            for sentence in full_sentences:
                if sentence.strip() and re.search(r'[.!?]', sentence):
                    # This is a complete sentence
                    # Estimate its end time proportionally
                    sentence_ratio = len(sentence) / len(text) if text else 0
                    sentence_end = seg_start + (seg_end - seg_start) * (cumulative_length + len(sentence)) / len(text) if text else seg_end
                    
                    if sentence_end <= start_time + $MAX_DURATION and sentence_end > start_time:
                        best_end = max(best_end, sentence_end)
                    
                    cumulative_length += len(sentence)
                else:
                    cumulative_length += len(sentence)
            
            # Also check if the entire segment ends with sentence punctuation
            if re.search(r'[.!?]\s*$', text.strip()):
                if seg_end <= start_time + $MAX_DURATION:
                    best_end = max(best_end, seg_end)
    
    # Calculate duration (ensure it's within limits)
    duration = best_end - start_time
    duration = max(1, min(int(duration), $MAX_DURATION))
    print(duration)
        
except Exception as e:
    # Fallback: return max duration
    print($MAX_DURATION)
PYTHON_SCRIPT
else
  # Fallback: return max duration
  echo "$MAX_DURATION"
fi
