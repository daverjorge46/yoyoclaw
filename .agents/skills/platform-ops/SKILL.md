---
name: platform-ops
description: Platform-specific operations playbook for exe.dev VMs, macOS gateway
  operations, fly updates, and session log handling.
license: MIT
compatibility: Requires SSH/terminal access to target environments.
metadata:
  author: openclaw
  version: "1.0"
---

# Platform Ops

Use this skill for machine/platform operations that are too specific for AGENTS core policy.

## exe.dev VM Ops

- Connect: `ssh exe.dev` then `ssh <vm-name>`
- If SSH is flaky, use exe.dev web terminal/Shelley and keep tmux for long-running tasks
- Update global OpenClaw:
  - `sudo npm i -g openclaw@latest`
- Prefer `openclaw config set ...` for config updates
- Discord token must be raw token value (no `DISCORD_BOT_TOKEN=` prefix)

Gateway quick restart:

- `pkill -9 -f openclaw-gateway || true`
- `nohup openclaw gateway run --bind loopback --port 18789 --force > /tmp/openclaw-gateway.log 2>&1 &`

Verify:

- `openclaw channels status --probe`
- `ss -ltnp | rg 18789`
- `tail -n 120 /tmp/openclaw-gateway.log`

## macOS Gateway Ops

- Start/stop/restart gateway via OpenClaw Mac app (or `scripts/restart-mac.sh`)
- Do not rely on ad-hoc tmux gateway sessions for handoff
- Verify with `launchctl print gui/$UID | grep openclaw`
- Logs: `./scripts/clawlog.sh` (supports follow/tail/category)

## Signal "update fly" Shortcut

- `fly ssh console -a flawd-bot -C "bash -lc 'cd /data/clawd/openclaw && git pull --rebase origin main'"`
- `fly machines restart e825232f34d058 -a flawd-bot`

## Session Log Path Rule

When asked to open a "session" file, use:

- `~/.openclaw/agents/<agentId>/sessions/*.jsonl`
- choose newest unless a specific id is provided

## Voice Wake Forwarding

- Keep command template:
  - `openclaw-mac agent --message "${text}" --thinking low`
- Do not add extra quoting around `${text}`
- Ensure launch agent PATH includes system paths and pnpm bin (usually `$HOME/Library/pnpm`)
