---
name: inference-extraction
description: "Extract connective inferences from session conversations before reset"
homepage: https://docs.openclaw.ai/automation/hooks#inference-extraction
metadata:
  {
    "openclaw":
      {
        "emoji": "\uD83E\uDDE0",
        "events": ["command:new", "command:reset"],
        "requires": { "config": ["workspace.dir"] },
        "install": [{ "id": "bundled", "kind": "bundled", "label": "Bundled with OpenClaw" }],
      },
  }
---

# Inference Extraction Hook

Extracts connective inferences (behavioral patterns, decision-making tendencies, persuasion frames) from session conversations when you issue `/new` or `/reset`.

## What It Does

When you reset a session:

1. **Reads the session transcript** - Loads user/assistant messages from the ending session
2. **Checks minimum turns** - Skips trivial sessions below a configurable threshold (default: 5 messages)
3. **Runs extraction prompt** - Calls LLM to identify connective inferences (not just facts)
4. **Saves structured notes** - Writes each inference as a markdown file to `<workspace>/memory/inferences/`

## How It Differs from Session Memory

The `session-memory` hook saves a raw conversation log. This hook produces **connective inferences** - patterns that link observations:

- **Fact** (session-memory): "User asked about React performance"
- **Inference** (this hook): "User optimizes prematurely - raises performance concerns before measuring, suggesting anxiety-driven development patterns"

Over time, these inferences compound: each new session benefits from accumulated understanding.

## Output Format

Inference files are created as:

```markdown
# Inference: [domain] - [date]

**Domain**: communication
**Confidence**: high
**Extracted**: 2026-01-16T14:30:00Z

## Insight

User frames technical disagreements as questions rather than assertions,
suggesting a conflict-avoidant communication style that prioritizes harmony
over directness. This pattern is strongest in group contexts.
```

## Configuration

| Option      | Type    | Default     | Description                             |
| ----------- | ------- | ----------- | --------------------------------------- |
| `enabled`   | boolean | `true`      | Enable/disable extraction               |
| `minTurns`  | number  | `5`         | Minimum messages before extraction runs |
| `messages`  | number  | `30`        | Number of recent messages to analyze    |
| `domainTag` | string  | `undefined` | Optional domain prefix for filenames    |

Example configuration:

```json
{
  "hooks": {
    "internal": {
      "entries": {
        "inference-extraction": {
          "enabled": true,
          "minTurns": 10,
          "messages": 50,
          "domainTag": "trading"
        }
      }
    }
  }
}
```

## Disabling

```bash
openclaw hooks disable inference-extraction
```

Or in config:

```json
{
  "hooks": {
    "internal": {
      "entries": {
        "inference-extraction": { "enabled": false }
      }
    }
  }
}
```
