# Moltbot Technical Documentation

## Format Guidelines for Contributors

**Style:** Concise, technical, action-oriented.
**Brevity:** One sentence per command/concept. Use bullet points, not paragraphs.
**Problem Log:** Keep entries short—problem → symptom → solution. Add date and who fixed it if known.
**Commands:** Always include the command first, explanation after (e.g., `systemctl restart moltbot-gateway` # Restarts the gateway service).
**Sections:** Group by topic. Use `##` for major sections, `###` for subsections.
**Updates:** When adding new problems/solutions, add to the end of the Problem Log section with date.

---

## Process Architecture

### Core Components

1. **Moltbot Gateway** (`moltbot-gateway`)
   - Service: `/etc/systemd/system/moltbot-gateway.service`
   - Runs: `/usr/bin/node dist/entry.js gateway --port 18789`
   - Manager: `systemd` (isolated from PM2)
   - Handles: Telegram integration, message routing, model selection

2. **Supporting Processes**
   - **Dashboard** (si_project/dashboard) - PM2 managed, separate from bot
   - **AI Product Visualizer** (ai_product_visualizer) - PM2 managed, separate from bot
   - **Telegram Relay** - Embedded in gateway (grammY framework)
   - **Task-Type Router** - Compiled TypeScript module in gateway

3. **Configuration Files**
   - Global: `/root/.clawdbot/moltbot.json`
   - Agent-specific: `/root/.clawdbot/agents/main/config.json`
   - Environment: `/root/.clawdbot/.env`

---

## Process Management

### Moltbot Gateway (Systemd)

```bash
# Check status
systemctl status moltbot-gateway

# Restart (reloads config + code)
systemctl restart moltbot-gateway

# Stop gracefully
systemctl stop moltbot-gateway

# Start if stopped
systemctl start moltbot-gateway

# View live logs
journalctl -u moltbot-gateway -f

# View last 100 lines
journalctl -u moltbot-gateway -n 100
```

**Auto-restart:** Enabled. If process crashes, systemd restarts it within 5 seconds.
**Boot persistence:** Enabled. Starts automatically on system reboot.

### From Telegram Chat

Send `/restart` command in Telegram to restart the bot gracefully without terminal access.

### Dashboard (PM2)

```bash
# Check status
pm2 list

# Restart
pm2 restart dashboard

# Logs
pm2 logs dashboard

# Stop
pm2 stop dashboard
```

**Isolation:** Runs in separate PM2 daemon. Does not interfere with Moltbot.

### Logs Location

```bash
# Moltbot systemd logs
journalctl -u moltbot-gateway -n 200

# Moltbot app logs (most detailed)
tail -f /var/log/moltbot-gateway.log

# Application debug logs
tail -f /tmp/moltbot/moltbot-*.log
```

---

## Problem Log & Solutions

### 1. **Duplicate Telegram Responses** (Jan 28, 2026)

**Problem:** Bot sending same message 2-3 times.

**Root Cause:** `streamMode: "partial"` in Telegram config caused responses to stream as chunks, each sent separately.

**Solution:** Changed `streamMode` from `"partial"` to `"block"` in `/root/.clawdbot/moltbot.json`.

```json
"telegram": {
  "streamMode": "block"  // Single unified message
}
```

**Status:** ✅ Fixed. Single responses now.

---

### 2. **Unknown Model Error** (Jan 28, 2026)

**Problem:** Error: `Unknown model: openrouter/mistralai/mistral-devstral-2`

**Root Cause:** Incorrect OpenRouter model ID format. Used old naming convention.

**Solution:** Updated model IDs to correct OpenRouter format:
- `mistralai/devstral-2512` (Mistral Devstral 2)
- `google/gemini-2.0-flash-001` (Gemini 2.0 Flash)
- `meta-llama/llama-3.3-70b-instruct:free` (Llama 3.3 70B)

**Status:** ✅ Fixed. Models now load correctly.

---

### 3. **PM2 Process Isolation Conflict** (Jan 28, 2026)

**Problem:** Dashboard PM2 restarting 140+ times. Gateway conflicting with dashboard in same PM2 daemon.

**Root Cause:** Moltbot gateway was added to default PM2 instance, sharing resources with dashboard.

**Solution:** Moved Moltbot from PM2 to systemd service (isolated).
- Moltbot: `systemd` only
- Dashboard: `PM2` only
- No shared daemon = no conflicts

**Status:** ✅ Fixed. Processes now isolated.

**Files changed:**
- Created: `/etc/systemd/system/moltbot-gateway.service`
- Removed: Moltbot from PM2 list

---

### 4. **Missing Task-Type Router Compilation** (Jan 28, 2026)

**Problem:** Bot said it implemented task-type routing but nothing changed.

**Root Cause:** TypeScript source files modified but not compiled to `dist/`.

**Solution:**
1. Fixed import error in `src/agents/task-type-router.ts` (DEFAULT_PROVIDER location)
2. Compiled: `npm run build`
3. Restarted gateway to load new `dist/` code

**Status:** ✅ Fixed. Task-type router now active.

---

### 5. **Telegram Command Limit Exceeded** (Jan 29, 2026)

**Problem:** Error: `setMyCommands failed: BOT_COMMANDS_TOO_MUCH` (Telegram API limit = 100 commands).

**Root Cause:** Both config files had `"native": "auto"` trying to register all skills + commands with Telegram.

**Solution:** Disabled native command auto-registration:
```json
// /root/.clawdbot/moltbot.json
"commands": {
  "native": false,
  "nativeSkills": false
}

// /root/.clawdbot/agents/main/config.json
"commands": {
  "native": false,
  "text": true,
  "restart": true
}
```

**Status:** ✅ Fixed. Telegram now connects without errors.

---

### 6. **Node.js Version Too Old** (Jan 28, 2026)

**Problem:** Moltbot requires Node.js 24+ but only v20 was installed.

**Root Cause:** Package.json specified `engines: { node: ">=24" }`.

**Solution:** Upgraded Node.js:
```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Verified:** `node --version` → v24.13.0

**Status:** ✅ Fixed.

---

### 7. **Gateway Crash Loop & Inotify Exhaustion** (Jan 29, 2026)

**Problem:** Gateway hung/became unresponsive. Systemd crashed 1203+ times. Telegram bot stopped responding.

**Symptoms:**
- `Port 18789 is already in use` (but port handler didn't properly clean up)
- `Gateway failed to start: gateway already running (pid 618450); lock timeout after 5000ms`
- Lock files stale/not released

**Root Cause:** System hit **inotify file descriptor limit** (`ENOSPC`):
```
Error: ENOSPC: System limit for number of file watchers reached, watch '/root/.moltbot/moltbot.json'
Error: ENOSPC: System limit for number of file watchers reached, watch '/root/clawd/canvas'
Error: ENOSPC: System limit for number of file watchers reached, watch '/root/clawd'
```

Gateway couldn't monitor config/skill files for changes → config reloading broke → became hung/unresponsive → systemd restart loop.

**Solutions:**

1. **Immediate fix:** Kill stuck process + clean lock files
```bash
kill -9 618450
rm -f ~/.clawdbot/gateway.lock ~/.clawdbot/moltbot.lock
systemctl restart moltbot-gateway
```

2. **Permanent inotify limit increase:** `/etc/sysctl.d/99-moltbot-inotify.conf`
```
fs.inotify.max_user_watches=524288  # Increased from 65536
```
Apply: `sysctl -p /etc/sysctl.d/99-moltbot-inotify.conf`

3. **Better systemd service:** `/etc/systemd/system/moltbot-gateway.service`
   - Changed `Restart=always` → `Restart=on-failure` (only restart on actual failure)
   - Increased `RestartSec=5` → `RestartSec=10` (reduce CPU churn)
   - Reduced `StartLimitBurst=10` → `StartLimitBurst=5` (fewer restart attempts before blocking)
   - Added `ExecStartPre` to auto-clean stale locks on startup

4. **Health check monitoring:** `/etc/systemd/system/moltbot-health-check.{service,timer}`
   - Runs `/root/moltbot/scripts/health-check-gateway.sh` every 5 minutes
   - Checks if gateway is responding on port 18789
   - Detects stale lock files and crash loops
   - Automatically cleans locks and restarts if needed
   - **Isolated:** Does not interfere with other services (code-server, ssh, etc.)

**Key Files Added/Modified:**
- Created: `scripts/health-check-gateway.sh` (health check logic)
- Created: `/etc/systemd/system/moltbot-health-check.service`
- Created: `/etc/systemd/system/moltbot-health-check.timer`
- Created: `/etc/sysctl.d/99-moltbot-inotify.conf`
- Modified: `/etc/systemd/system/moltbot-gateway.service` (restart policy)

**Status:** ✅ Fixed. All preventative measures in place.

---

## Configuration Summary

### Model Fallback Chain

**Primary:** Mistral Devstral 2 2512 (agentic specialist)
**Fallbacks:**
1. Gemini 2.0 Flash (long-context, 1M tokens)
2. Llama 3.3 70B (creative/pedagogical)
3. Moonshot Kimi K2.5 (language model)
4. Claude Sonnet 4.5 (escalation)
5. Claude Opus 4.5 (complex reasoning)

### Task-Type Routing

- **File Analysis** → Gemini Flash
- **Creative Content** → Llama 3.3 70B
- **Debugging** → Claude Sonnet 4.5
- **CLI/Commands** → Mistral Devstral 2
- **General** → Mistral Devstral 2 (default)

### Telegram Settings

- **Streaming Mode:** `block` (single message per response)
- **Commands Native:** `false` (avoid API limit)
- **Restart Command:** `true` (allows `/restart` from chat)
- **User ID Allowlist:** 876311493 (only you)

---

---

## Architecture: Service Isolation & Stability

### Systemd Services Running on This Host
- `moltbot-gateway.service` - Telegram bot gateway (isolated, does not affect others)
- `moltbot-health-check.timer` - Periodic gateway health monitoring (oneshot service, no resource hoarding)
- `code-server.service` - Code editor (independent, unaffected)
- `ssh.service` - SSH server (independent, unaffected)

### Safety Design
- **No shared resources:** Each service runs independently
- **No resource limits affecting others:** Moltbot has `LimitNOFILE/NOPROC` set locally only
- **Health check is isolated:** Runs as `oneshot` (completes quickly), doesn't run concurrently with gateway
- **No interference with startup/shutdown:** Services can be restarted independently

### Monitoring
- **Automatic health checks:** Every 5 minutes (can be adjusted in `moltbot-health-check.timer`)
- **Logs:** `/tmp/moltbot-health-check.log` (separate from gateway logs)
- **Manual check:** `systemctl list-timers moltbot-health-check.timer`

---

## Quick Troubleshooting

### Bot Not Responding

1. Check status: `systemctl status moltbot-gateway`
2. Check logs: `journalctl -u moltbot-gateway -n 50`
3. Check health: `bash /root/moltbot/scripts/health-check-gateway.sh`
4. Restart: `systemctl restart moltbot-gateway`
5. Check inotify limit (if file watching errors): `cat /proc/sys/fs/inotify/max_user_watches`

### Telegram Connection Error

Check logs for `setMyCommands failed` or network errors.
If command limit error: Verify `native: false` in both config files.

### High Latency (>1 minute)

Expected for first API call to OpenRouter. Check OpenRouter API status.
If consistent, check model health: `node dist/entry.js models status`

### Duplicate Responses

Check `streamMode: "block"` is set in `/root/.clawdbot/moltbot.json`.
If issue persists, reduce retry attempts in retry policy config.

---

## Deployment Checklist

- [ ] Node.js 24+ installed
- [ ] Moltbot cloned and built (`npm run build`)
- [ ] Systemd service created and enabled
- [ ] Config files populated (moltbot.json, agents/main/config.json)
- [ ] API keys in environment or .env
- [ ] Telegram bot token configured
- [ ] Gateway started: `systemctl start moltbot-gateway`
- [ ] Telegram connection verified: `node dist/entry.js channels status`
- [ ] Test message sent in Telegram

---

## Key File Locations

```
/root/moltbot/                          Main installation
├── dist/                               Compiled code (loaded at runtime)
├── src/                                TypeScript source
├── scripts/
│   └── health-check-gateway.sh         Health monitoring script
├── ecosystem.config.cjs                PM2 config (legacy, not used)
└── README_Tech.md                      This file

~/.clawdbot/                            Config directory
├── moltbot.json                        Global gateway config
├── agents/main/
│   ├── config.json                     Agent-specific config
│   └── auth-profiles.json              API key storage
└── .env                                Environment variables

/etc/systemd/system/                    System services
├── moltbot-gateway.service             Systemd service (gateway)
├── moltbot-health-check.service        Health check service
├── moltbot-health-check.timer          Health check timer (runs every 5min)
└── ...other services (code-server, ssh, etc)

/etc/sysctl.d/                          System configuration
└── 99-moltbot-inotify.conf            Inotify limit config

/var/log/                               System logs
└── moltbot-gateway.log                 Gateway application log

/tmp/moltbot/                           Runtime logs
├── moltbot-*.log                       Detailed debug logs
└── moltbot-health-check.log            Health check results
```

---

**Last Updated:** Jan 29, 2026 (18:50 UTC)
**Maintained By:** Claude Code + Moltbot Task Router
**Latest:** Crash loop root cause fixed (inotify limit), health monitoring added, service isolation verified
