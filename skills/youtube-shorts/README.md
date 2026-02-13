# YouTube Shorts Creator Skill

Automatically create YouTube Shorts from your YouTube videos using AI analysis (Ollama) and video editing (ffmpeg).

## Quick Start

### 1. Install Dependencies

```bash
brew install yt-dlp ffmpeg jq
```

### 2. Set Up Ollama

Make sure Ollama is running and pull a model:

```bash
ollama pull llama3.3
# or
ollama pull qwen2.5-coder:32b
```

### 3. Configure OpenClaw

Ensure Ollama is configured in your OpenClaw setup. If using Docker (like in your `docker-compose.yml`), set:

```bash
export OLLAMA_BASE=http://host.docker.internal:11434
```

### 4. Use the Skill

Ask your OpenClaw agent:

```
Create a YouTube short from https://www.youtube.com/watch?v=VIDEO_ID
```

Or use the exec tool directly:

```bash
openclaw agent --message "create a short from https://youtube.com/watch?v=VIDEO_ID"
```

## How It Works

1. **Download**: Uses `yt-dlp` to download the YouTube video
2. **Analyze**: Uses Ollama to analyze the video transcript and identify the most engaging segment
3. **Edit**: Uses `ffmpeg` to create a vertical (9:16) short format video
4. **Upload** (optional): Uploads to YouTube if credentials are configured

## Configuration

### Ollama Model

Default: Auto-detects available models. Override:

```bash
export OLLAMA_MODEL="ollama/llama3.3"
```

### Output Directory

Default: `~/.openclaw/workspace/youtube-shorts/`

Override:

```bash
export YOUTUBE_SHORTS_OUTPUT_DIR="/path/to/output"
```

### YouTube Upload (Optional)

To enable automatic upload:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project and enable YouTube Data API v3
3. Create OAuth2 credentials
4. Set environment variables:

```bash
export YOUTUBE_CLIENT_ID="your-client-id"
export YOUTUBE_CLIENT_SECRET="your-client-secret"
export YOUTUBE_REFRESH_TOKEN="your-refresh-token"
```

## Examples

### Basic Usage

```bash
# Via OpenClaw agent
openclaw agent --message "create a short from https://youtube.com/watch?v=dQw4w9WgXcQ"

# Direct script execution
./skills/youtube-shorts/scripts/create-short.sh 'https://youtube.com/watch?v=VIDEO_ID'
```

### Custom Duration

```bash
./skills/youtube-shorts/scripts/create-short.sh 'https://youtube.com/watch?v=VIDEO_ID' --duration 45
```

### Manual Segment Selection

```bash
./skills/youtube-shorts/scripts/create-short.sh 'https://youtube.com/watch?v=VIDEO_ID' --start 120 --duration 60
```

### Specific Model

```bash
./skills/youtube-shorts/scripts/create-short.sh 'https://youtube.com/watch?v=VIDEO_ID' --model ollama/qwen2.5-coder:32b
```

## Troubleshooting

### yt-dlp fails

- Update: `brew upgrade yt-dlp`
- Some videos may require cookies (private/unlisted videos)

### Ollama connection fails

- Verify Ollama is running: `ollama list`
- Check `OLLAMA_BASE` environment variable
- In Docker: Use `http://host.docker.internal:11434`
- Locally: Use `http://127.0.0.1:11434`

### ffmpeg errors

- Ensure ffmpeg is installed: `ffmpeg -version`
- Check video file is valid: `ffprobe <video_file>`

### Upload fails

- Verify YouTube API credentials are set
- Check OAuth token is valid
- Review YouTube API quota limits

## Scripts Reference

- `create-short.sh` - Main workflow orchestrator
- `download-video.sh` - Download YouTube videos
- `analyze-segments.sh` - AI analysis with Ollama
- `create-short-format.sh` - Video editing with ffmpeg
- `upload-youtube.sh` - YouTube API upload

## Notes

- Videos are automatically cropped/scaled to 9:16 aspect ratio
- Maximum duration is 60 seconds (YouTube Shorts requirement)
- Output format: MP4 (H.264/AAC) compatible with YouTube
- Intermediate files are cleaned up unless `--keep-files` is used
