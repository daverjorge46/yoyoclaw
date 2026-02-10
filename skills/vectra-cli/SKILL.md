---
name: vectra-cli
description: Use Vectra CLI for workspace bootstrap, node lifecycle, hive status, workflow session hooks, and work-claim coordination. Trigger when a user asks to create/manage Vectra nodes, inspect hive health, start desktop/overmind data, or run agent workflow sync commands.
metadata:
  {
    "openclaw":
      {
        "emoji": "🧠",
        "requires": { "bins": ["node"] }
      },
  }
---

# Vectra CLI

Use `node vectra.mjs ...` from the Vectra repo root.

## Quick Start

```bash
node vectra.mjs status
node vectra.mjs nodes
node vectra.mjs sync
```

If you need command details, read `references/commands.md`.

## Core Workflow

1. Confirm repo root and dependencies.
2. Check current hive state.
3. Perform requested action (node creation, workflow sync, work claim, desktop/startup).
4. Re-check status and summarize changes.

## Common Operations

### Inspect health

```bash
node vectra.mjs status
node vectra.mjs nodes
node vectra.mjs overmind
```

### Coordinate multi-agent work

```bash
node vectra.mjs work list
node vectra.mjs work claim "<task summary>"
node vectra.mjs work release
```

### Sync and workflow lifecycle hooks

```bash
node vectra.mjs sync
node vectra.mjs workflow start --summary "<task>" --agent "<name>" --difficulty medium
node vectra.mjs workflow checkpoint --id <SESSION_ID> -m "<milestone>" -p 50
node vectra.mjs workflow end --id <SESSION_ID> --status completed --summary "<result>"
```

### Create and manage nodes

```bash
node vectra.mjs node <name>
node vectra.mjs agent <action>
```

## Guardrails

- Run destructive or state-changing actions only when explicitly requested.
- Prefer `status`/`nodes` before and after changes.
- If a command fails, rerun with `--help` for that subcommand and adjust flags.
- Keep summaries short: what ran, what changed, what failed, next action.
