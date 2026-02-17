---
summary: "CLI reference for `yoyoclaw config` (get/set/unset config values)"
read_when:
  - You want to read or edit config non-interactively
title: "config"
---

# `yoyoclaw config`

Config helpers: get/set/unset values by path. Run without a subcommand to open
the configure wizard (same as `yoyoclaw configure`).

## Examples

```bash
yoyoclaw config get browser.executablePath
yoyoclaw config set browser.executablePath "/usr/bin/google-chrome"
yoyoclaw config set agents.defaults.heartbeat.every "2h"
yoyoclaw config set agents.list[0].tools.exec.node "node-id-or-name"
yoyoclaw config unset tools.web.search.apiKey
```

## Paths

Paths use dot or bracket notation:

```bash
yoyoclaw config get agents.defaults.workspace
yoyoclaw config get agents.list[0].id
```

Use the agent list index to target a specific agent:

```bash
yoyoclaw config get agents.list
yoyoclaw config set agents.list[1].tools.exec.node "node-id-or-name"
```

## Values

Values are parsed as JSON5 when possible; otherwise they are treated as strings.
Use `--json` to require JSON5 parsing.

```bash
yoyoclaw config set agents.defaults.heartbeat.every "0m"
yoyoclaw config set gateway.port 19001 --json
yoyoclaw config set channels.whatsapp.groups '["*"]' --json
```

Restart the gateway after edits.
