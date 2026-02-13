# Quick Fix: Using Ollama with OpenClaw

## The Issue

You're getting "Unknown model: ollama/llama3.3" because:
1. Model discovery needs OLLAMA_API_KEY set
2. The gateway connection is failing (falling back to embedded)
3. Embedded mode needs Ollama accessible at 127.0.0.1:11434

## Quick Solution

### Option 1: Use Local Mode with Ollama on Host

Since your Ollama runs on your Mac (not in Docker), use `--local` mode:

```bash
export OLLAMA_API_KEY="ollama-local"
export OLLAMA_BASE="http://127.0.0.1:11434"

openclaw agent --agent default --local --message "Create a YouTube short from https://www.youtube.com/watch?v=VIDEO_ID"
```

### Option 2: Fix Gateway Connection

The gateway WebSocket is failing. Try:

1. **Check gateway is running:**
   ```bash
   docker-compose ps
   docker-compose logs gateway --tail 20
   ```

2. **Restart gateway:**
   ```bash
   docker-compose restart gateway
   ```

3. **Use gateway (without --local):**
   ```bash
   export OLLAMA_API_KEY="ollama-local"
   openclaw agent --agent default --message "Create a YouTube short from https://www.youtube.com/watch?v=VIDEO_ID"
   ```

### Option 3: Configure Agent Properly

The agent needs Ollama configured. Since model discovery isn't working, let's use a workaround:

1. **Set environment variables permanently:**
   Add to your `~/.zshrc` or `~/.bashrc`:
   ```bash
   export OLLAMA_API_KEY="ollama-local"
   export OLLAMA_BASE="http://127.0.0.1:11434"
   ```

2. **Use the main agent** (which might be configured differently):
   ```bash
   openclaw agent --agent main --local --message "Create a YouTube short from https://www.youtube.com/watch?v=VIDEO_ID"
   ```

## Recommended Approach

For now, use **Option 1** (local mode) since:
- Ollama runs on your Mac (127.0.0.1:11434)
- Gateway connection is having issues
- Local mode works directly with Ollama

Once gateway is stable, you can remove `--local` and it will use the Docker gateway.
