---
summary: "CLI reference for `yoyoclaw agents` (list/add/delete/set identity)"
read_when:
  - You want multiple isolated agents (workspaces + routing + auth)
title: "agents"
---

# `yoyoclaw agents`

Manage isolated agents (workspaces + auth + routing).

Related:

- Multi-agent routing: [Multi-Agent Routing](/concepts/multi-agent)
- Agent workspace: [Agent workspace](/concepts/agent-workspace)

## Examples

```bash
yoyoclaw agents list
yoyoclaw agents add work --workspace ~/.yoyoclaw/workspace-work
yoyoclaw agents set-identity --workspace ~/.yoyoclaw/workspace --from-identity
yoyoclaw agents set-identity --agent main --avatar avatars/yoyoclaw.png
yoyoclaw agents delete work
```

## Identity files

Each agent workspace can include an `IDENTITY.md` at the workspace root:

- Example path: `~/.yoyoclaw/workspace/IDENTITY.md`
- `set-identity --from-identity` reads from the workspace root (or an explicit `--identity-file`)

Avatar paths resolve relative to the workspace root.

## Set identity

`set-identity` writes fields into `agents.list[].identity`:

- `name`
- `theme`
- `emoji`
- `avatar` (workspace-relative path, http(s) URL, or data URI)

Load from `IDENTITY.md`:

```bash
yoyoclaw agents set-identity --workspace ~/.yoyoclaw/workspace --from-identity
```

Override fields explicitly:

```bash
yoyoclaw agents set-identity --agent main --name "YoyoClaw" --emoji "🦞" --avatar avatars/yoyoclaw.png
```

Config sample:

```json5
{
  agents: {
    list: [
      {
        id: "main",
        identity: {
          name: "YoyoClaw",
          theme: "space lobster",
          emoji: "🦞",
          avatar: "avatars/yoyoclaw.png",
        },
      },
    ],
  },
}
```
