# Running YouTube Shorts Skill in Docker

This guide shows how to run OpenClaw in Docker and use the YouTube Shorts skill.

## Prerequisites

1. **Copy the skill to workspace** (already done if you ran the setup):
   ```bash
   mkdir -p workspace/skills
   cp -r skills/youtube-shorts workspace/skills/
   ```

2. **Install dependencies in Docker container**:
   The Docker container needs `yt-dlp`, `ffmpeg`, and `jq`. You have two options:

   **Option A: Install via Dockerfile** (recommended for production)
   
   Create a custom Dockerfile that extends the base image:
   ```dockerfile
   FROM openclaw/gateway:latest
   RUN apt-get update && apt-get install -y \
       ffmpeg \
       jq \
       python3-pip \
       && pip3 install yt-dlp \
       && rm -rf /var/lib/apt/lists/*
   ```

   **Option B: Install at runtime** (quick test)
   
   We'll install dependencies when starting the container.

3. **Ensure Ollama is running** on your host machine (accessible at `host.docker.internal:11434`)

## Step 1: Start OpenClaw Gateway in Docker

### Option 1: Using docker-compose (Recommended)

Update your `docker-compose.yml` to install dependencies:

```yaml
services:
  gateway:
    image: openclaw/gateway:latest
    build: .
    ports:
      - "127.0.0.1:18789:18789"
    volumes:
      - /Users/home/GitHub/openclaw/config:/app/config
      - /Users/home/GitHub/openclaw/workspace:/app/workspace
      - /Users/home/GitHub/openclaw/credentials:/root/.openclaw/credentials
    environment:
      - NODE_ENV=production
      - PORT=18789
      - OPENCLAW_GATEWAY_TOKEN=${OPENCLAW_GATEWAY_TOKEN}
      - OLLAMA_BASE=http://host.docker.internal:11434
    # Install dependencies on startup
    command: >
      sh -c "
        apt-get update -qq &&
        apt-get install -y -qq ffmpeg jq python3-pip > /dev/null 2>&1 &&
        pip3 install -q yt-dlp > /dev/null 2>&1 || true &&
        node /app/dist/cli/gateway.js run --port 18789
      "
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 4G
```

Then start it:

```bash
docker-compose up -d
```

### Option 2: Manual Docker run

```bash
docker run -d \
  --name openclaw-gateway \
  -p 127.0.0.1:18789:18789 \
  -v /Users/home/GitHub/openclaw/config:/app/config \
  -v /Users/home/GitHub/openclaw/workspace:/app/workspace \
  -v /Users/home/GitHub/openclaw/credentials:/root/.openclaw/credentials \
  -e NODE_ENV=production \
  -e PORT=18789 \
  -e OPENCLAW_GATEWAY_TOKEN=73ad9a94cc4f6143272c207a4a3971411dbff2166c2ae84e8daf28b3c7dfc1f1 \
  -e OLLAMA_BASE=http://host.docker.internal:11434 \
  openclaw/gateway:latest \
  sh -c "apt-get update -qq && apt-get install -y -qq ffmpeg jq python3-pip > /dev/null 2>&1 && pip3 install -q yt-dlp > /dev/null 2>&1 || true && node /app/dist/cli/gateway.js run --port 18789"
```

## Step 2: Verify Gateway is Running

```bash
# Check status
openclaw gateway status

# Or check logs
docker-compose logs gateway
# or
docker logs openclaw-gateway
```

## Step 3: Install Dependencies (if not in Dockerfile)

If you didn't install dependencies in the Dockerfile, install them now:

```bash
docker-compose exec gateway sh -c "apt-get update && apt-get install -y ffmpeg jq python3-pip && pip3 install yt-dlp"
```

Or for manual Docker run:

```bash
docker exec -it openclaw-gateway sh -c "apt-get update && apt-get install -y ffmpeg jq python3-pip && pip3 install yt-dlp"
```

## Step 4: Verify Skill is Loaded

Check that the skill is available:

```bash
openclaw skills list | grep youtube-shorts
```

Or check in the container:

```bash
docker-compose exec gateway ls -la /app/workspace/skills/youtube-shorts/
```

## Step 5: Run the Command

Now you can create a YouTube short! Use the `openclaw agent` command:

```bash
openclaw agent --agent default --message "Create a YouTube short from https://www.youtube.com/watch?v=VIDEO_ID"
```

Replace `VIDEO_ID` with an actual YouTube video ID.

### Example:

```bash
openclaw agent --agent default --message "Create a YouTube short from https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

### With Options:

```bash
# Custom duration (45 seconds)
openclaw agent --agent default --message "Create a YouTube short from https://www.youtube.com/watch?v=VIDEO_ID with duration 45 seconds"

# Manual start time
openclaw agent --agent default --message "Create a YouTube short from https://www.youtube.com/watch?v=VIDEO_ID starting at 2 minutes"
```

## Troubleshooting

### Gateway not reachable

```bash
# Check if gateway is running
docker-compose ps

# Check gateway logs
docker-compose logs gateway

# Restart gateway
docker-compose restart gateway
```

### Skill not found

Make sure the skill is in the workspace:
```bash
ls -la workspace/skills/youtube-shorts/
```

If missing, copy it:
```bash
cp -r skills/youtube-shorts workspace/skills/
```

### Dependencies missing

Install them in the container:
```bash
docker-compose exec gateway sh -c "apt-get update && apt-get install -y ffmpeg jq python3-pip && pip3 install yt-dlp"
```

### Ollama connection fails

1. Ensure Ollama is running on your host:
   ```bash
   ollama list
   ```

2. Test connection from container:
   ```bash
   docker-compose exec gateway curl -s http://host.docker.internal:11434/api/tags
   ```

3. If it fails, check your `.env` file has `OLLAMA_BASE=http://host.docker.internal:11434`

### Agent not found

List available agents:
```bash
openclaw agents list
```

Use the correct agent ID, or create one:
```bash
openclaw agents add default
```

## Output Location

The created shorts will be saved to:
- Inside container: `/app/workspace/youtube-shorts/`
- On host: `workspace/youtube-shorts/` (since workspace is mounted)

## Next Steps

- Configure YouTube API credentials for automatic upload (see `README.md`)
- Customize the skill scripts for your needs
- Set up multiple agents for different purposes
