---
summary: "CLI reference for `openclaw reflect` (local reflections / AAR notes)"
read_when:
  - You want to save an after-action review (AAR) for a task
  - You want to list or view past reflections
title: "reflect"
---

# `openclaw reflect`

Store lightweight reflections (AAR notes) locally on disk.

Data is stored as JSONL under the OpenClaw state directory:

- Default: `~/.openclaw/reflections/reflections.jsonl`
- Override: `$OPENCLAW_STATE_DIR/reflections/reflections.jsonl`

Tip: run `openclaw reflect --help` for the full command surface.

## Add a reflection

Pass the body as an argument:

```bash
openclaw reflect add "Shipped feature X. What went well: … What to improve: …"
```

Or pipe from stdin:

```bash
echo "AAR\n\n- What went well: ...\n- What didn't: ..." | openclaw reflect add --title "Sprint 12" --tag aar --tag sprint12
```

## List reflections

```bash
openclaw reflect list
```

Limit output:

```bash
openclaw reflect list --limit 5
```

## Show a reflection

```bash
openclaw reflect show <id>
```

JSON output:

```bash
openclaw reflect show <id> --json
```
