# Pull Request: Model Profile Manager (`moltbot profiles`)

## Summary

Add `moltbot profiles` command for fast switching between authenticated model configurations.

**Solves**: Users managing multiple AI providers (Anthropic, OpenAI, Google, OpenRouter) need to frequently switch configurations. Currently requires manual editing of `moltbot.json` and `.env` files, which is error-prone and time-consuming.

## Related Issues
- Partially addresses #2888 (model switching failures during sessions)
- Helps with #2883 (migration from clawdbot)
- Complements #2897 (doctor command request)

## Changes

### New Files

| Target Location | Description |
|-----------------|-------------|
| `src/profiles/profiles.ts` | ProfileManager class - handles profile storage, switching, backup |
| `src/cli/profiles-cli.ts` | CLI command registration using Commander (lazy-loaded) |
| `src/profiles/profiles.test.ts` | Unit tests with vitest |

### Modified Files

| File | Change |
|------|--------|
| `src/cli/program/register.subclis.ts` | Add "profiles" entry for lazy-loading |

## Commands Added

```bash
# List all saved profiles
moltbot profiles list

# Save current config as a named profile
moltbot profiles add <name> [-d "description"] [-f]

# Switch to a saved profile (creates backup)
moltbot profiles use <name> [--restart] [--no-backup]

# Delete a profile
moltbot profiles delete <name> [-f]

# Show current active profile
moltbot profiles current

# Show profile manager paths
moltbot profiles status

# Show profile details (or current config if no name)
moltbot profiles show [name] [--json]
```

## Implementation Details

### Architecture

This module is designed to complement (not replace) the existing `src/cli/profile.ts` which handles `--profile`/`--dev` CLI flags. The new `profiles` command manages **saved configuration snapshots** for quick switching.

**Integration with existing CLI structure:**
- Uses lazy-loading via `register.subclis.ts` (consistent with other commands)
- Uses `@clack/prompts` for interactive confirmation (consistent with moltbot style)
- Uses `chalk` for terminal output (consistent with other commands)

### Storage Location

```
~/.moltbot/
├── moltbot.json        # Active config
├── .env                # Active credentials
├── backups/            # Auto-created backups before switching
│   ├── moltbot-2026-01-28T10-30-00-000Z.json
│   └── env-2026-01-28T10-30-00-000Z
└── profiles/
    ├── .meta.json      # Tracks current profile and metadata
    ├── claude-opus.json
    ├── gemini-pro.json
    └── gpt-4o.json
```

### Profile Format

Each `<profile>.json` stores:
```json
{
  "name": "claude-opus",
  "description": "Opus 4 for complex tasks",
  "model": "anthropic/claude-opus-4",
  "provider": "anthropic",
  "createdAt": "2026-01-28T00:00:00.000Z",
  "config": { /* full moltbot.json snapshot */ },
  "env": "ANTHROPIC_API_KEY=sk-xxx\n..."
}
```

### Meta File Format

`.meta.json` tracks state across profiles:
```json
{
  "currentProfile": "claude-opus",
  "profiles": {
    "claude-opus": {
      "model": "anthropic/claude-opus-4",
      "provider": "anthropic",
      "createdAt": "2026-01-28T00:00:00.000Z"
    }
  }
}
```

### Safety Features

- **Auto-backup**: Creates timestamped backup before switching (unless `--no-backup`)
- **Confirmation prompt**: Asks before delete (unless `--force`)
- **Gateway restart**: Optional `--restart` flag after switching
- **CLAWDBOT_STATE_DIR support**: Honors environment variable for custom state directory

## Demo

```
$ moltbot profiles list

Saved Profiles:

┌─────────────────────┬────────────────────────────────────┬──────────────────┐
│ Name                │ Model                              │ Provider         │
├─────────────────────┼────────────────────────────────────┼──────────────────┤
│ ● claude-opus       │ anthropic/claude-opus-4            │ anthropic        │
│   gemini-pro        │ google/gemini-2.5-pro              │ google           │
│   gpt-4o            │ openai/gpt-4o                      │ openai           │
└─────────────────────┴────────────────────────────────────┴──────────────────┘

● Current: claude-opus

$ moltbot profiles use gemini-pro --restart
✓ Current config backed up.
✓ Switched to profile "gemini-pro".
  Model: google/gemini-2.5-pro
Restarting gateway...
✓ Gateway restarted.
```

## Testing

```bash
pnpm test src/profiles/profiles.test.ts
```

Test coverage:
- ProfileManager unit tests (constructor, getMeta, saveMeta, listProfiles, profileExists, getProfile, getCurrentConfig, getCurrentEnv, extractModelInfo, saveProfile, useProfile, deleteProfile, getCurrentProfile, backupCurrentConfig, getStatus)
- Factory function tests (createProfileManager)
- CLI command integration tests (marked as TODO for subprocess testing)

## Integration Guide

### Step 1: Add source files

```bash
cp profiles.ts       <moltbot>/src/profiles/profiles.ts
cp profiles-cli.ts   <moltbot>/src/cli/profiles-cli.ts
cp profiles.test.ts  <moltbot>/src/profiles/profiles.test.ts
```

### Step 2: Update register.subclis.ts

Add this entry to the `entries` array in `src/cli/program/register.subclis.ts`:

```typescript
{
  name: "profiles",
  description: "Model configuration profiles",
  register: async (program) => {
    const mod = await import("../profiles-cli.js");
    mod.registerProfilesCli(program);
  },
},
```

### Step 3: Verify

```bash
pnpm build
moltbot profiles --help
pnpm test src/profiles/profiles.test.ts
```

## Checklist

- [x] Code follows project style (TypeScript, ESM imports)
- [x] Uses `@clack/prompts` for interactive prompts (consistent with moltbot)
- [x] Uses `chalk` for terminal output (consistent with moltbot)
- [x] Uses lazy-loading via `register.subclis.ts` (consistent with moltbot)
- [x] Unit tests added with vitest
- [x] No breaking changes to existing commands
- [x] Works with existing `~/.moltbot` directory structure
- [x] Honors `CLAWDBOT_STATE_DIR` environment variable
- [ ] Documentation update (pending review)

## Migration from Community Tool

This PR is based on `clawd-profile` from the [moltbot-setup](https://github.com/user/moltbot-setup) community project, rewritten in TypeScript to match moltbot's codebase style.

Key differences from community version:
- TypeScript instead of JavaScript
- Uses `@clack/prompts` instead of `inquirer`
- Uses `chalk` instead of custom color functions
- Follows moltbot's lazy-loading command registration pattern
- Integrated with moltbot's directory structure conventions

---

**Note**: Happy to adjust the implementation based on feedback. The core concept is simple - snapshot configs into named profiles for instant switching.
