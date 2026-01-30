# Moltbot Mini

A minimal, secure email assistant using the same file structure and naming conventions as [Moltbot](https://github.com/moltbot/moltbot). Designed for progressive feature additions.

## Features

- **Gmail Integration**: Read, search, send, archive, and organize emails
- **OpenAI-Powered**: Natural language interface with function calling
- **Secure by Default**: File permissions (0o600), atomic writes, credential isolation
- **CLI-First**: Command-line interface following Moltbot patterns
- **Extensible**: Plugin architecture ready for additional channels

## Architecture (Mirrors Moltbot)

```
moltbot-mini/
├── src/
│   ├── index.ts                    # Entry point
│   ├── cli/
│   │   ├── deps.ts                 # Dependency injection (createDefaultDeps)
│   │   ├── prompt.ts               # Interactive prompts
│   │   ├── program.ts              # Main program builder
│   │   ├── run-main.ts             # CLI execution entry
│   │   └── program/
│   │       ├── register.setup.ts   # Setup commands
│   │       ├── register.gmail.ts   # Gmail commands
│   │       ├── register.chat.ts    # Chat commands
│   │       └── register.status.ts  # Status commands
│   ├── config/
│   │   ├── types.ts                # Type barrel export
│   │   ├── types.base.ts           # Base configuration types
│   │   ├── zod-schema.ts           # Schema barrel export
│   │   ├── zod-schema.core.ts      # Zod validation schemas
│   │   ├── config.ts               # Config loading/saving
│   │   ├── config-paths.ts         # File path resolution
│   │   ├── defaults.ts             # Default values
│   │   ├── env-vars.ts             # Environment variables
│   │   └── io.ts                   # Secure file I/O
│   ├── infra/
│   │   ├── credentials.ts          # Secure credential storage
│   │   └── security-audit.ts       # Security auditing
│   ├── gmail/
│   │   ├── types.ts                # Gmail type definitions
│   │   ├── auth.ts                 # OAuth2 authentication
│   │   ├── accounts.ts             # Account management
│   │   ├── monitor.ts              # Message reading (like bot.ts)
│   │   └── send.ts                 # Message sending
│   ├── agents/
│   │   ├── types.ts                # Agent types
│   │   ├── gmail-tools.ts          # Tool definitions
│   │   ├── gmail-tools.execute.ts  # Tool execution
│   │   └── openai-runner.ts        # OpenAI integration
│   └── channels/
│       └── plugins/
│           ├── types.ts            # Plugin interface
│           └── gmail.ts            # Gmail plugin
├── package.json
└── tsconfig.json
```

## Moltbot Pattern Mappings

| Moltbot Pattern | Moltbot Mini Implementation |
|-----------------|----------------------------|
| `src/cli/program/register.*.ts` | `src/cli/program/register.{setup,gmail,chat,status}.ts` |
| `src/config/types.*.ts` | `src/config/types.base.ts` |
| `src/config/zod-schema.*.ts` | `src/config/zod-schema.core.ts` |
| `src/telegram/bot.ts` | `src/gmail/monitor.ts` |
| `src/telegram/send.ts` | `src/gmail/send.ts` |
| `src/agents/bash-tools.ts` | `src/agents/gmail-tools.ts` |
| `src/agents/bash-tools.exec.ts` | `src/agents/gmail-tools.execute.ts` |
| `src/channels/plugins/types.ts` | `src/channels/plugins/types.ts` |
| `src/infra/credentials.ts` | `src/infra/credentials.ts` |
| `createDefaultDeps()` | `src/cli/deps.ts` |

## Quick Start

### Prerequisites

- Node.js 20+
- OpenAI API key
- Google Cloud project with Gmail API enabled

### Installation

```bash
cd moltbot-mini
npm install
npm run build
```

### Setup

```bash
# Interactive setup
npm run dev -- setup

# Or configure individually
npm run dev -- config set-openai-key sk-your-key
npm run dev -- gmail auth
```

### Usage

```bash
# Interactive chat
npm run dev -- chat

# Single question
npm run dev -- ask "What unread emails do I have?"

# List recent emails
npm run dev -- gmail list -n 5
npm run dev -- gmail list --query "is:unread"

# Read specific email
npm run dev -- gmail read <messageId>

# Check status
npm run dev -- status
npm run dev -- status --verbose

# Security audit
npm run dev -- security
```

## Gmail OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select existing
3. Enable the Gmail API
4. Create OAuth 2.0 credentials (Desktop app type)
5. Note your Client ID and Client Secret
6. Run `npm run dev -- setup` and enter the credentials

## Security Features

### Credential Storage

All credentials stored in `~/.moltbot-mini/` with:
- File permissions: `0o600` (owner read/write only)
- Directory permissions: `0o700` (owner only)
- Atomic writes (temp file + rename)

### Security Audit

```bash
npm run dev -- security
```

Checks for:
- World/group readable credential files
- Insecure directory permissions
- Symlinks to credential files

## Configuration

Configuration stored in `~/.moltbot-mini/config.json`:

```json
{
  "gmail": {
    "enabled": true,
    "maxResults": 20,
    "autoReply": {
      "enabled": false,
      "allowFrom": []
    }
  },
  "openai": {
    "model": "gpt-4o",
    "maxTokens": 4096,
    "temperature": 0.7,
    "systemPrompt": "You are a helpful email assistant..."
  },
  "agent": {
    "name": "Email Assistant",
    "maxHistoryLength": 20
  }
}
```

## Available Tools

The AI assistant can use these Gmail tools:

| Tool | Description |
|------|-------------|
| `gmail_list_messages` | List/search emails with Gmail query |
| `gmail_read_message` | Read full email content |
| `gmail_send_message` | Send new email or reply |
| `gmail_archive_message` | Archive (remove from inbox) |
| `gmail_trash_message` | Move to trash |
| `gmail_mark_read` | Mark as read |
| `gmail_mark_unread` | Mark as unread |
| `gmail_get_unread_count` | Count unread emails |
| `gmail_get_thread` | Get all messages in a thread |

## Adding More Features

The structure is designed for easy extension:

### Adding a New Channel (e.g., Slack)

1. Create `src/slack/` with same structure as `src/gmail/`:
   - `types.ts`, `auth.ts`, `accounts.ts`, `monitor.ts`, `send.ts`
2. Add `src/channels/plugins/slack.ts`
3. Add `src/agents/slack-tools.ts` and `slack-tools.execute.ts`
4. Register CLI commands in `src/cli/program/register.slack.ts`

### Adding a New LLM Provider (e.g., Anthropic)

1. Create `src/agents/anthropic-runner.ts`
2. Update config types in `src/config/types.base.ts`
3. Update schemas in `src/config/zod-schema.core.ts`

## Development

```bash
# Run in development mode
npm run dev -- <command>

# Type check
npm run lint

# Build
npm run build

# Run built version
npm start -- <command>
```

## Comparison with Full Moltbot

| Feature | Moltbot Mini | Full Moltbot |
|---------|--------------|--------------|
| Channels | Gmail only | 10+ (Telegram, Discord, Slack...) |
| LLM Providers | OpenAI only | 6+ (Anthropic, Bedrock, Ollama...) |
| Plugin System | Basic | Full extension architecture |
| Gateway | None | WebSocket RPC server |
| Mobile Apps | None | iOS, Android, macOS |
| CLI Structure | Same patterns | Full implementation |
| Config Structure | Same patterns | Full implementation |

## License

MIT
