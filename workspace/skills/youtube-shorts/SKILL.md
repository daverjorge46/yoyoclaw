---
name: youtube-shorts
description: Create YouTube Shorts from YouTube videos using Ollama AI analysis and ffmpeg editing.
homepage: https://github.com/openclaw/openclaw
metadata:
  {
    "openclaw": {
      "emoji": "🎬",
      "requires": { "bins": ["yt-dlp", "ffmpeg", "jq"] },
      "install": [
        {
          "id": "brew",
          "kind": "brew",
          "formula": "yt-dlp",
          "bins": ["yt-dlp"],
          "label": "Install yt-dlp (brew)",
        },
        {
          "id": "brew-ffmpeg",
          "kind": "brew",
          "formula": "ffmpeg",
          "bins": ["ffmpeg"],
          "label": "Install ffmpeg (brew)",
        },
        {
          "id": "brew-jq",
          "kind": "brew",
          "formula": "jq",
          "bins": ["jq"],
          "label": "Install jq (brew)",
        },
      ],
    },
  }
---

# YouTube Shorts Creator

Automatically create YouTube Shorts from your YouTube videos using AI analysis (Ollama) to identify interesting segments, then edit them into shorts format (9:16 aspect ratio, <60 seconds).

## When to use (trigger phrases)

Use this skill when the user asks:

- "create a YouTube short from [video URL]"
- "make a short from my YouTube video"
- "convert this video to a YouTube short"
- "create shorts from my YouTube videos"

## Prerequisites

1. **Install dependencies:**
   ```bash
   brew install yt-dlp ffmpeg jq
   ```

2. **Configure Ollama:**
   - Ensure Ollama is running and accessible
   - Set `OLLAMA_API_KEY` environment variable (or configure in OpenClaw config)
   - Pull a model: `ollama pull llama3.3` or `ollama pull qwen2.5-coder:32b`

3. **Optional: YouTube API credentials** (for uploading):
   - Set `YOUTUBE_CLIENT_ID` and `YOUTUBE_CLIENT_SECRET`
   - Or use manual upload after creation

## Quick start

### Basic usage (download + analyze + create short)

```bash
# Using exec tool
exec command:"{baseDir}/scripts/create-short.sh 'https://youtube.com/watch?v=VIDEO_ID'"
```

### With custom options

```bash
exec command:"{baseDir}/scripts/create-short.sh 'https://youtube.com/watch?v=VIDEO_ID' --duration 45 --model ollama/llama3.3"
```

## Workflow

The skill performs these steps:

1. **Download**: Uses `yt-dlp` to download the video
2. **Analyze**: Uses Ollama to analyze transcript/timestamps and identify interesting segments
3. **Edit**: Uses `ffmpeg` to create a short (9:16, <60s) from the identified segment
4. **Upload** (optional): Uploads to YouTube if credentials are configured

## Scripts

### `create-short.sh` (main workflow)

Orchestrates the entire process.

**Usage:**
```bash
{baseDir}/scripts/create-short.sh <youtube_url> [options]
```

**Options:**
- `--duration <seconds>`: Target duration (default: 60, max: 60 for shorts)
- `--model <model>`: Ollama model to use (default: auto-detect)
- `--start <timestamp>`: Manual start time (HH:MM:SS or seconds)
- `--output <path>`: Output file path (default: auto-generated)
- `--no-upload`: Skip YouTube upload even if credentials are set
- `--keep-files`: Keep intermediate files after completion

### `download-video.sh`

Downloads a YouTube video using yt-dlp.

**Usage:**
```bash
{baseDir}/scripts/download-video.sh <youtube_url> [output_dir]
```

### `analyze-segments.sh`

Uses Ollama to analyze video transcript and identify interesting segments.

**Usage:**
```bash
{baseDir}/scripts/analyze-segments.sh <video_file> [model] [target_duration]
```

Returns JSON with recommended segments:
```json
{
  "segments": [
    {
      "start": 120.5,
      "end": 180.0,
      "reason": "High engagement moment with key insight"
    }
  ]
}
```

### `create-short-format.sh`

Edits video into YouTube Shorts format (9:16 aspect ratio, vertical).

**Usage:**
```bash
{baseDir}/scripts/create-short-format.sh <input_video> <start_time> <duration> [output_file]
```

**Parameters:**
- `input_video`: Source video file
- `start_time`: Start timestamp (seconds or HH:MM:SS)
- `duration`: Duration in seconds (max 60)
- `output_file`: Output path (optional, auto-generated if not provided)

### `upload-youtube.sh` (optional)

Uploads the short to YouTube using YouTube API.

**Usage:**
```bash
{baseDir}/scripts/upload-youtube.sh <video_file> <title> [description] [tags]
```

**Environment variables:**
- `YOUTUBE_CLIENT_ID`: YouTube API client ID
- `YOUTUBE_CLIENT_SECRET`: YouTube API client secret
- `YOUTUBE_REFRESH_TOKEN`: OAuth refresh token (obtain via OAuth flow)

## Examples

### Example 1: Simple short creation

```bash
exec command:"{baseDir}/scripts/create-short.sh 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'"
```

### Example 2: Custom duration and model

```bash
exec command:"{baseDir}/scripts/create-short.sh 'https://www.youtube.com/watch?v=VIDEO_ID' --duration 45 --model ollama/qwen2.5-coder:32b"
```

### Example 3: Manual segment selection

```bash
exec command:"{baseDir}/scripts/create-short.sh 'https://www.youtube.com/watch?v=VIDEO_ID' --start 120 --duration 60"
```

### Example 4: Download only (no editing)

```bash
exec command:"{baseDir}/scripts/download-video.sh 'https://www.youtube.com/watch?v=VIDEO_ID' /tmp/videos"
```

## Configuration

### Ollama model selection

The script auto-detects available Ollama models. To specify:

```bash
export OLLAMA_MODEL="ollama/llama3.3"
```

Or pass via `--model` flag.

### Output directory

Default: `~/.openclaw/workspace/youtube-shorts/`

Override:
```bash
export YOUTUBE_SHORTS_OUTPUT_DIR="/path/to/output"
```

## Notes

- **Video format**: Output is MP4 (H.264/AAC) compatible with YouTube Shorts
- **Aspect ratio**: Automatically crops/letterboxes to 9:16 (vertical)
- **Duration**: YouTube Shorts must be ≤60 seconds
- **Quality**: Preserves original quality; may re-encode for format compliance
- **Transcripts**: Uses yt-dlp's transcript extraction; falls back to audio transcription if unavailable
- **AI analysis**: Uses Ollama to identify high-engagement moments based on transcript content

## Troubleshooting

**yt-dlp fails:**
- Update: `brew upgrade yt-dlp`
- Check video is publicly accessible (or provide cookies)

**Ollama connection fails:**
- Verify Ollama is running: `ollama list`
- Check `OLLAMA_BASE` environment variable matches your setup
- Default: `http://127.0.0.1:11434` (or `http://host.docker.internal:11434` in Docker)

**ffmpeg errors:**
- Ensure ffmpeg is installed: `ffmpeg -version`
- Check video file is valid: `ffprobe <video_file>`

**Upload fails:**
- Verify YouTube API credentials
- Check OAuth token is valid and not expired
- Review YouTube API quota limits
