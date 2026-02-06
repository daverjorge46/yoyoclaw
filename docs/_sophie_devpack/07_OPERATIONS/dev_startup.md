# Moltbot Dev Startup Guide

Zero-friction dev environment for Moltbot gateway and TUI.

## Quick Start

### From Cursor/VS Code

1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Type "Run Task"
3. Select **Moltbot: Dev Up**

Or use the keyboard shortcut `Cmd+Shift+B` (default build task).

### From Terminal

```bash
# Start gateway + TUI
pnpm dev:up

# Start with model reset (clears persisted session model)
pnpm dev:up:reset

# Stop all dev processes
pnpm dev:down
```

## What It Does

The `dev:up` script:

1. **Finds repo root** - Works from any subdirectory
2. **Loads `.env`** - From repo root (belt-and-suspenders with existing dotenv)
3. **Starts gateway** - `pnpm gateway:dev` with channels disabled
4. **Waits for ready** - Watches for `Health: OK` or listening message
5. **Starts TUI** - `pnpm tui:dev` connected to dev gateway
6. **Handles Ctrl+C** - Graceful shutdown of both processes

## Environment Variables

Place your API keys in `.env` at repo root:

```bash
# Moonshot (preferred when present)
MOONSHOT_API_KEY=sk-...

# Optional fallbacks
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Gateway auth (optional)
CLAWDBOT_GATEWAY_TOKEN=your-token
```

## Default Provider Resolution

The system automatically selects the default provider:

| Priority | Condition | Provider | Model |
|----------|-----------|----------|-------|
| 1 | `MOONSHOT_API_KEY` present | moonshot | kimi-k2-0905-preview |
| 2 | Ollama running locally | ollama | llama3:chat |
| 3 | Fallback | ollama | llama3:chat (will fail without Ollama) |

## Dev State Location

Dev profile stores state in `~/.clawdbot-dev/`:

```
~/.clawdbot-dev/
├── moltbot.json          # Config
├── agents/
│   └── main/
│       ├── agent/
│       │   └── models.json   # Discovered models
│       └── sessions/
│           └── sessions.json # Session state
└── ...
```

## Resetting Dev State

If the TUI shows the wrong model (e.g., `ollama/llama3:chat` when you expect `moonshot/kimi-k2-0905-preview`):

```bash
# Option 1: Use reset flag
pnpm dev:up:reset

# Option 2: Manual reset (preserves sessions)
rm ~/.clawdbot-dev/agents/main/agent/models.json

# Option 3: Full reset (loses sessions)
rm -rf ~/.clawdbot-dev
```

## Troubleshooting

### Gateway won't start: "port in use"

```bash
pnpm dev:down
# or manually
lsof -i :19001 -t | xargs kill -9
```

### TUI shows wrong model

The model displayed in TUI comes from session defaults. If it's stale:

1. Run `pnpm dev:up:reset` to clear cached model config
2. Or use `/model moonshot/kimi-k2-0905-preview` in TUI to override

### Gateway health shows moonshot but agent model shows ollama

This was a bug where `server-startup-log.ts` and `session-utils.ts` used static defaults instead of dynamic resolution. Fixed in 2026.1.29+.

### Moonshot API 401 error

Check your `MOONSHOT_API_KEY` in `.env`:
- Must be valid API key from platform.moonshot.ai
- No quotes needed around the value
- No trailing whitespace

```bash
# Verify key is loaded (prints presence, not value)
pnpm dev:up
# Look for: [dev-up] API keys present: MOONSHOT_API_KEY
```

## VS Code Tasks

Available tasks (via Command Palette → Run Task):

| Task | Description |
|------|-------------|
| **Moltbot: Dev Up** | Start gateway + TUI (default build task) |
| **Moltbot: Dev Up (Reset)** | Start with model cache reset |
| **Moltbot: Dev Down** | Kill dev processes on port 19001 |
