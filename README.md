# `¯\_(ツ)_/¯` Yoyo Claw

Local, security-hardened OpenClaw fork for Yoyo Dev AI.

## What is Yoyo Claw

Yoyo Claw is a locally-managed fork of [OpenClaw](https://github.com/openclaw/openclaw), the open-source personal AI assistant. Yoyo Claw serves as the engine behind **Yoyo AI**, the Business and Personal AI Assistant within the Yoyo Dev AI platform.

## What Yoyo Claw Adds

- **Local-first architecture** -- Config home at `~/.yoyo-claw/`, no global npm install required. Symlinked from `~/.openclaw` and `~/.yoyo-ai` for compatibility.
- **Security hardening** -- Audit logging (`~/.yoyo-claw/audit.log`), gateway token authentication (`~/.yoyo-claw/.gateway-token`).
- **Custom extensions** -- `yoyo-dev-bridge` (spec/task/fix tools for agent integration), `yoyo-memory-sync` (Claude Code memory access).
- **Custom skills** -- `yoyo/web-search`, `yoyo/token-usage`.
- **Yoyo identity template** -- Default agent personality with warm, professional branding.
- **Themed UI** -- Cyan/mauve palette customization in `ui/src/styles/base.css`.

## Quick Start

```bash
cd yoyo-claw && pnpm install --frozen-lockfile && pnpm build
node yoyo-claw/openclaw.mjs  # or use yoyo_claw() helper from setup/functions.sh
```

Default port: **18789**

## Key Paths

| Path                                 | Purpose                      |
| ------------------------------------ | ---------------------------- |
| `~/.yoyo-claw/openclaw.json`         | Configuration                |
| `~/.yoyo-claw/agents/main/sessions/` | Session data                 |
| `~/.yoyo-claw/workspace-yoyo/`       | Workspace                    |
| `~/.yoyo-claw/.gateway-token`        | Gateway authentication token |
| `~/.yoyo-claw/audit.log`             | Security audit log           |

## Channels Supported

WhatsApp, Telegram, Slack, Discord, Google Chat, Signal, iMessage, Microsoft Teams, WebChat.

Extension channels (via plugins): BlueBubbles, Matrix, Zalo, Zalo Personal, LINE, Voice Call.

## Based on OpenClaw

Yoyo Claw is built on top of [OpenClaw](https://github.com/openclaw/openclaw) ([openclaw.ai](https://openclaw.ai)). Full credit to the OpenClaw maintainers and contributors for the upstream project.

Internal reference documentation in `docs/` mirrors upstream for compatibility. For upstream documentation, see [docs.openclaw.ai](https://docs.openclaw.ai).

## License

MIT -- See [LICENSE](LICENSE)
