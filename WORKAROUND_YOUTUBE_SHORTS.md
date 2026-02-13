# Workaround: Create YouTube Shorts Without Model Discovery

Since Ollama model discovery isn't working properly, here's a workaround to create YouTube Shorts using the scripts directly.

## Option 1: Use Scripts Directly (Recommended)

The YouTube Shorts skill scripts are ready to use. You can run them directly:

```bash
# Download video
./workspace/skills/youtube-shorts/scripts/download-video.sh 'https://www.youtube.com/watch?v=fvvNdW5Urpo' /tmp/videos

# Analyze segments (this requires Ollama - we'll skip AI analysis for now)
# Or manually specify start time:
START_TIME=0  # Start at beginning
DURATION=60   # 60 seconds

# Create short format
./workspace/skills/youtube-shorts/scripts/create-short-format.sh /tmp/videos/video.mp4 $START_TIME $DURATION /tmp/short.mp4
```

## Option 2: Use OpenClaw Exec Tool (When Gateway Works)

Once the gateway connection is fixed, you can use OpenClaw's `exec` tool:

```bash
openclaw agent --agent default --message "Use exec to run: ./workspace/skills/youtube-shorts/scripts/create-short.sh 'https://www.youtube.com/watch?v=VIDEO_ID'"
```

## Option 3: Fix Model Discovery

The root issue is that Ollama model discovery isn't working. To fix:

1. **Check if OLLAMA_API_KEY is set in the right place:**
   ```bash
   echo $OLLAMA_API_KEY
   ```

2. **Make sure Ollama is accessible:**
   ```bash
   curl http://127.0.0.1:11434/api/tags
   ```

3. **Try restarting OpenClaw gateway:**
   ```bash
   docker-compose restart gateway
   ```

4. **Check gateway logs for discovery errors:**
   ```bash
   docker-compose logs gateway | grep -i ollama
   ```

## Current Status

- ✅ YouTube Shorts scripts are created and ready
- ✅ Dependencies installed (ffmpeg, yt-dlp, jq)  
- ✅ Gateway is running in Docker
- ❌ Ollama model discovery not working
- ❌ Gateway WebSocket connection failing

## Next Steps

1. **Immediate**: Use scripts directly (Option 1)
2. **Short-term**: Fix gateway connection issue
3. **Long-term**: Fix Ollama model discovery or use explicit provider config
