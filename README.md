# `¯\_(ツ)_/¯` YoyoClaw

Local, security-hardened AI gateway fork for Yoyo Dev AI.

## What is YoyoClaw

YoyoClaw is a locally-managed fork of [OpenClaw](https://github.com/openclaw/openclaw), the open-source personal AI assistant. YoyoClaw serves as the engine behind **Yoyo AI**, the Business and Personal AI Assistant within the Yoyo Dev AI platform.

## What YoyoClaw Adds

- **Local-first architecture** -- Config home at `~/.yoyoclaw/`, no global npm install required. Symlinked from `~/.openclaw` and `~/.yoyo-ai` for compatibility.
- **Security hardening** -- Audit logging (`~/.yoyoclaw/audit.log`), gateway token authentication (`~/.yoyoclaw/.gateway-token`).
- **Custom extensions** -- `yoyo-dev-bridge` (spec/task/fix tools for agent integration), `yoyo-memory-sync` (Claude Code memory access).
- **Custom skills** -- `yoyo/web-search`, `yoyo/token-usage`.
- **Yoyo identity template** -- Default agent personality with warm, professional branding.
- **Themed UI** -- Cyan/mauve palette customization in `ui/src/styles/base.css`.

## Quick Start

```bash
cd yoyoclaw && pnpm install --frozen-lockfile && pnpm build
node yoyoclaw/yoyoclaw.mjs  # or use yoyo_claw() helper from setup/functions.sh
```

Default port: **18789**

## Key Paths

| Path                                | Purpose                      |
| ----------------------------------- | ---------------------------- |
| `~/.yoyoclaw/yoyoclaw.json`         | Configuration                |
| `~/.yoyoclaw/agents/main/sessions/` | Session data                 |
| `~/.yoyoclaw/workspace-yoyo/`       | Workspace                    |
| `~/.yoyoclaw/.gateway-token`        | Gateway authentication token |
| `~/.yoyoclaw/audit.log`             | Security audit log           |

## Channels Supported

WhatsApp, Telegram, Slack, Discord, Google Chat, Signal, iMessage, Microsoft Teams, WebChat.

Extension channels (via plugins): BlueBubbles, Matrix, Zalo, Zalo Personal, LINE, Voice Call.

## Based on OpenClaw

YoyoClaw is built on top of [OpenClaw](https://github.com/openclaw/openclaw). Full credit to the OpenClaw maintainers and contributors for the upstream project.

Internal reference documentation in `docs/` mirrors upstream for compatibility. For upstream documentation, see [docs.openclaw.ai](https://docs.openclaw.ai).

## License

MIT -- See [LICENSE](LICENSE)
