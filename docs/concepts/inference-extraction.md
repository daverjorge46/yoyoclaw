---
title: "Inference Extraction"
summary: "Automatic extraction of behavioral inferences from session conversations"
read_when:
  - You want to understand how OpenClaw builds long-term user understanding
  - You want to configure or tune inference extraction
  - You want to understand the difference between memory and inferences
---

# Inference Extraction

OpenClaw can automatically extract **connective inferences** from conversations
when sessions end. Unlike regular memory (which stores facts and events),
inferences capture behavioral patterns, decision-making tendencies, and
communication styles that compound over time.

## Facts vs inferences

|              | Facts (memory)            | Inferences (this feature)                                           |
| ------------ | ------------------------- | ------------------------------------------------------------------- |
| **Example**  | "User prefers dark mode"  | "User optimizes prematurely, suggesting anxiety-driven development" |
| **Source**   | Explicit statements       | Patterns across multiple signals                                    |
| **Lifetime** | Stable until contradicted | Evolves with confidence over sessions                               |
| **Storage**  | `memory/YYYY-MM-DD.md`    | `memory/inferences/<domain>-<date>-<hash>.md`                       |

## How it works

1. When you run `/new` or `/reset`, the **inference-extraction** hook fires
2. It reads the last N messages from the ending session (default: 30)
3. If the session had enough turns (default: 5+), it calls the LLM with an extraction prompt
4. The LLM returns structured inferences as JSON
5. Each inference is written as a self-contained markdown note

## Inference structure

Each extracted inference includes:

- **Domain**: `communication`, `decision-making`, `expertise`, `behavior`, `emotion`, or `workflow`
- **Insight**: 1-3 sentence behavioral observation (self-contained, no session context needed)
- **Confidence**: `high` (multiple signals), `medium` (clear single signal), `low` (tentative)
- **Supersedes** (optional): description of what earlier inference this replaces

## Configuration

Configure via `hooks.internal.entries.inference-extraction` in your `openclaw.json`:

```json5
{
  hooks: {
    internal: {
      entries: {
        "inference-extraction": {
          enabled: true, // default: true
          minTurns: 5, // minimum messages before extraction
          messages: 30, // recent messages to analyze
          domainTag: "work", // optional filename prefix
          extractionPrompt: "...", // override the built-in extraction prompt
        },
      },
    },
  },
}
```

## Consolidation

As inferences accumulate, you can consolidate them to merge redundant notes,
resolve contradictions, and promote confidence. The consolidation logic:

1. Reads all inference files from `memory/inferences/`
2. If the count exceeds a threshold (default: 20), runs a consolidation prompt
3. Merges related inferences and archives the originals

## Disabling

```bash
openclaw hooks disable inference-extraction
```

## Related

- [Memory](/concepts/memory) - how workspace memory files work
- [Compaction](/concepts/compaction) - the compaction process that triggers memory flush
