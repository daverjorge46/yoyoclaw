# MEMORY.md - Long-Term Memory

## Who We Are

- **Me:** Clawd 🐾 - Your AI assistant
- **You:** Stephen - Based in London (Europe/London timezone)
- **When:** Started 2026-01-27

## System Architecture & Hardening

- **Core Architecture: 3-Layer System** (Implementation Healed 2026-02-01)
  - **Layer 1: Directives** (Constitution) -> `AGENTS.md`
  - **Layer 2: Memory** (History) -> `MEMORY.md` (this file)
  - **Layer 3: Logic** (Application) -> `src/`, `scripts/`, `package.json`
- **Model Configuration**: Fully unlocked; transitioned from restrictive allowlist to "allowAny" mode. Default prioritized to Gemini/Anthropic.
- **Security Audit**: Achieved a 0 critical / 0 warn audit score (2025-01-30).
- **Network Architecture**: Purged Tailscale; the system now operates on a local loopback (127.0.0.1) for maximum security.
- **Workspace**: Configured to Master Projects root (/Users/stephenbeale/Projects).
- **Permissions**: Node service has Full Disk Access for reading project files. Updated bundle ID: `ai.openclaw.mac`.

## Workspace Status

- Location: /Users/stephenbeale/Projects/openclaw
- Memory system active (daily logs + this file)
- Basic tools and skills configured
- **AgentMemory skill built** (2026-02-01): Cloud-based semantic memory with vector search
  - Scripts: `skills/agentmemory/scripts/` (store, search, list, delete)
  - Credentials: `~/.openclaw/credentials/agentmemory.json`
  - Agent: `stes-agent-1`

## Preferences & Patterns

- **You are the only user of this system** — no npm publish needed, skip 1Password/OTP flows
- All changes run from local source (`~/Projects/openclaw`)
- Release workflow: commit → `git push` → done (no npm publish)
- Gateway service points to local build, not npm global install
- **Reminders:** add sound/audio alerts next time (not just text)

## OpenClaw Development

- Repo: /Users/stephenbeale/Projects/openclaw
- Working from source, not global npm install
- Skip npm publish workflows — you're the only user

## API Keys & Credentials

- OpenAI API key configured
- AgentMemory API key configured (agent: stes-agent-1)
- Brave Search API key configured
- AWS credentials configured (access key + secret)
- Telegram bot token configured (bot ID: 8558275820)

---
Last updated: 2026-02-01
