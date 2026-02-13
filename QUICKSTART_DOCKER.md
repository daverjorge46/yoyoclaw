# Quick Start: YouTube Shorts with OpenClaw Docker

## 1. Start OpenClaw Gateway

```bash
docker-compose up -d
```

This will:
- Start the gateway container
- Install dependencies (ffmpeg, jq, yt-dlp) on first run
- Connect to Ollama at `host.docker.internal:11434`

## 2. Verify Everything is Running

```bash
# Check gateway status
openclaw gateway status

# Check container logs
docker-compose logs gateway

# Verify skill is available
openclaw skills list | grep youtube-shorts
```

## 3. Create a YouTube Short

```bash
openclaw agent --agent default --message "Create a YouTube short from https://www.youtube.com/watch?v=VIDEO_ID"
```

Replace `VIDEO_ID` with an actual YouTube video ID.

### Example:

```bash
openclaw agent --agent default --message "Create a YouTube short from https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

## 4. Find Your Short

The created short will be saved to:
```
workspace/youtube-shorts/short_VIDEO_ID_TIMESTAMP.mp4
```

## Troubleshooting

**Gateway not running?**
```bash
docker-compose restart gateway
docker-compose logs gateway
```

**Dependencies missing?**
The docker-compose.yml installs them automatically. If issues persist:
```bash
docker-compose exec gateway sh -c "apt-get update && apt-get install -y ffmpeg jq python3-pip && pip3 install yt-dlp"
```

**Ollama not accessible?**
Make sure Ollama is running on your Mac:
```bash
ollama list
```

**Agent not found?**
List agents and create one if needed:
```bash
openclaw agents list
openclaw agents add default
```
