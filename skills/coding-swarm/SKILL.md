---
name: coding-swarm
description: Manage a fleet of coding agents in tmux sessions with persistent state tracking across Clawd session resets.
metadata: {"clawdbot":{"emoji":"🐝","os":["darwin","linux"],"requires":{"bins":["tmux","jq"]}}}
---

# Coding Swarm 🐝

Manage multiple coding agents (Codex, Claude Code, Pi) in tmux sessions with persistent state that survives Clawd session resets.

## Concept

Like Gas Town's convoy system, the swarm tracks:
- **What agents are running** (identity, task, workdir)
- **Their status** (running, done, failed, stuck)
- **Progress** (last output snippet)
- **Completion wake** (prompt or "waiting for input" sends a wake event)

State is stored in `~/.clawdbot/swarm/` so you know what's running even after waking up fresh.

## Directory Structure

```
~/.clawdbot/swarm/
├── agents/
│   ├── alpha.json          # Individual agent state
│   ├── bravo.json
│   └── ...
└── logs/
    ├── alpha.log           # Captured output
    └── ...
```

## Quick Commands

```bash
# Initialize
swarm init

# Spawn an agent
swarm spawn alpha codex "Fix issue #78"
swarm spawn bravo claude "Review PR #42"

# Check status (dashboard)
swarm status

# Get output
swarm log alpha

# Attach to session
swarm attach alpha

# Kill an agent
swarm kill alpha

# Mark an agent status
swarm mark alpha done "ready for review"

# Archive completed agents
swarm cleanup
```

## State File Schema

```json
{
  "id": "alpha",
  "tool": "codex",
  "task": "Fix issue #78",
  "workdir": "/tmp/issue-78",
  "socket": "/Users/user/.clawdbot/swarm/swarm.sock",
  "session": "alpha",
  "status": "running",
  "startedAt": "2026-01-05T10:00:00Z",
  "statusUpdatedAt": "2026-01-05T10:00:00Z",
  "notes": [
    {"text": "waiting for input", "at": "2026-01-05T11:00:00Z"}
  ]
}
```

## Session Recovery

When Clawd wakes up, check `~/.clawdbot/swarm/agents/*.json` to see what's running.

```bash
swarm status
```

This shows all agents and their current status (running/done/orphaned).

## Tools Supported

- `codex` - Uses `--yolo` by default
- `claude` - Claude Code
- `pi` - Pi Coding Agent
- `opencode` - OpenCode

## Wake Events

When `swarm status` sees an agent's pane at a shell prompt or the text
"waiting for input", it marks the agent as `done` and triggers:

```bash
clawdbot wake --text "Swarm: <agent> done (reason)" --mode now
```

If `clawdbot` is not in `PATH`, the wake step is skipped.

## Tips

1. **Use worktrees** - Each agent gets isolated branch
2. **Use `--yolo`** - Non-interactive mode for Codex
3. **Include "commit and push"** - So work is saved
4. **Poll periodically** - Check for completion in heartbeats
