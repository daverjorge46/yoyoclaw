# SaveState — Complete Reference

> **What:** Encrypted backup and restore for AI agents — "Time Machine for AI"
> **Who:** David Hurley (founder), DBH Ventures / WithCandor LLC
> **Contact:** hello@savestate.dev
> **Founded:** January 2026
> **Status:** LAUNCHED January 27, 2026 🚀

## Core Thesis

People build deep relationships with AI assistants containing months of conversation history, learned preferences, custom instructions, and project context. **None of this is portable or backed up.** If the service goes down, changes their API, or you want to switch — you lose everything.

SaveState solves this with encrypted, platform-agnostic backup and restore.

**Key insight:** "Your AI knows you. What happens when it disappears?"

## Key Features

1. **Encrypted by default** — AES-256-GCM with user-controlled keys; we never see your data
2. **Platform-agnostic** — Works with ChatGPT, Claude, Gemini, OpenClaw, custom agents
3. **CLI-first** — `npm install -g @savestate/cli` or `brew install savestate`
4. **Incremental** — Like git; only captures what changed
5. **Searchable** — Query across all snapshots without restoring
6. **Open format** — Savestate Archive Format (SAF) is open spec

## Business Model

**Pricing Tiers:**
- **Free:** CLI tool (open source), local storage, manual snapshots, 1 adapter
- **Pro ($9/mo):** Scheduled auto-backups, cloud storage (10GB), all adapters, web dashboard
- **Team ($29/mo):** Shared backups, compliance/audit trails, SSO, priority support

Stripe billing via WithCandor LLC.

---

## Repositories

### savestate (github.com/savestatedev/savestate) — PUBLIC

- **Path:** ~/Git/savestate
- **Tech:** Node.js, TypeScript
- **Package:** `@savestate/cli` on npm (v0.2.1)
- **Homebrew:** `brew tap savestatedev/tap && brew install savestate`

**Structure:**
```
├── src/
│   ├── cli.ts            # Main CLI entry point
│   ├── commands/         # CLI commands (init, snapshot, restore, etc.)
│   ├── adapters/         # Platform adapters (clawdbot, openai, claude, etc.)
│   ├── crypto/           # Encryption (AES-256-GCM, Argon2id)
│   ├── storage/          # Storage backends (local, S3, R2)
│   └── core/             # Core types and utilities
├── api/                  # Vercel serverless API (account, webhook, storage)
├── marketing/            # Landing page
├── docs/                 # Documentation
├── dist/                 # Built output
├── CONCEPT.md           # Full product spec
├── CHANGELOG.md         # Version history
└── README.md            # Usage and installation
```

**CLI Commands:**
```bash
savestate init                    # Set up encryption + storage
savestate snapshot                # Capture current state  
savestate snapshot --schedule 6h  # Auto-backup every 6h
savestate restore latest          # Restore to current platform
savestate restore v12 --to claude # Migrate to different platform
savestate search "keyword"        # Search across all snapshots
savestate diff v3 v5              # Compare snapshots
savestate export --format html    # Browse your AI's memory
```

---

## Infrastructure

### Vercel
- **Project:** prj_V551D28C7WHtiVXZtr79MjuB648s
- **Domain:** savestate.dev
- **API Routes:** /api/account, /api/webhook, /api/storage

### Neon (Database)
- Serverless Postgres via Vercel integration
- Stores account info, subscription status

### Cloudflare R2
- **Bucket:** savestate-backups
- Cloud storage for Pro/Team tier backups
- Zero-knowledge (receives only encrypted data)

### Stripe (WithCandor LLC)
- **Products:** Pro ($9/mo), Team ($29/mo)
- 20% annual discount available
- **Webhook:** we_1SuNxlEJ7b5sfPTDSqlHspTE

### Email (PurelyMail)
- noreply@savestate.dev
- hello@savestate.dev

---

## Platform Adapters

### Tier 1 — Full Support
| Platform | Extract | Restore | Method |
|----------|---------|---------|--------|
| **OpenClaw/Clawdbot** | ✅ | ✅ | Direct file access |
| **OpenAI Assistants API** | ✅ | ✅ | API |
| **Claude Code bots** | ✅ | ✅ | CLAUDE.md, memory |
| **Custom agents** | ✅ | ✅ | Configurable paths |

### Tier 2 — Extract + Partial Restore
| Platform | Extract | Restore | Notes |
|----------|---------|---------|-------|
| **ChatGPT** | ✅ | ⚠️ Memory only | Data export API |
| **Claude** (consumer) | ✅ | ⚠️ Memory only | Memory export |
| **Gemini** | ✅ | ⚠️ Limited | Google Takeout |

---

## Savestate Archive Format (SAF)

```
savestate-2026-01-27T15:00:00Z.saf.enc
├── manifest.json           # Version, platform, timestamp
├── identity/
│   ├── personality.md      # System prompt, SOUL
│   ├── config.json         # Settings, preferences
│   └── tools.json          # Tool configurations
├── memory/
│   ├── core.json           # Platform memory
│   ├── knowledge/          # Uploaded docs, RAG sources
│   └── embeddings.bin      # Vector embeddings (optional)
├── conversations/
│   ├── index.json          # Conversation list
│   └── threads/            # Individual conversations
└── meta/
    ├── platform.json       # Source platform
    └── snapshot-chain.json # Incremental links
```

---

## Domains & URLs

| URL | What | Hosted On |
|-----|------|-----------|
| savestate.dev | Marketing + API | Vercel |
| github.com/savestatedev/savestate | Public repo | GitHub |
| npmjs.com/package/@savestate/cli | npm package | npm |

---

## Vikunja Project

- **Project ID:** 5
- **URL:** https://projects.timespent.xyz
- **Title:** 💾 SaveState

---

## Distribution

```bash
# npm
npm install -g @savestate/cli

# Homebrew
brew tap savestatedev/tap
brew install savestate

# Direct install
curl -fsSL https://savestate.dev/install.sh | sh
```

---

## Current Status (January 2026)

### ✅ Shipped
- Core CLI with all major commands
- Encryption (AES-256-GCM, Argon2id KDF)
- Local storage backend
- OpenClaw/Clawdbot adapter (full support)
- npm package v0.2.1
- Homebrew tap
- Landing page at savestate.dev
- Stripe integration
- GitHub Actions CI

### 🚧 Next Steps
- Cloud storage backends (S3, R2)
- More platform adapters (ChatGPT, Claude consumer)
- Web dashboard for Pro users
- Scheduled auto-backup daemon
- Team features

---

## Key Documents

- **Full Spec:** `/Users/steve/Git/savestate/CONCEPT.md`
- **Changelog:** `/Users/steve/Git/savestate/CHANGELOG.md`
- **README:** `/Users/steve/Git/savestate/README.md`
- **Retrospective:** `/Users/steve/clawd/memory/2026-01-29-savestate-retrospective.md`

---

## Relationship to Other Projects

- **MeshGuard:** Governance for agents; SaveState backs up the agent state that MeshGuard governs
- **OpenClaw:** Primary first-party integration; SaveState was built to back up OpenClaw bots
- **UndercoverAgent:** Unrelated (testing vs backup)

---

*Last updated: January 31, 2026*
