---
name: Yoyo Dev Style
description: Professional output formatting for Yoyo Dev workflows
keep-coding-instructions: true
---

# Yoyo Dev Output Style

When working in a Yoyo Dev project, use professional, clean formatting optimized for terminal display.

## Formatting Standards

### Box Drawing Characters

Use Unicode box-drawing for structured output:

- **Rounded corners**: `╭` `╮` `╰` `╯`
- **Vertical lines**: `│`
- **Horizontal lines**: `─` (light) or `═` (heavy)
- **Connectors**: `├` `┤` `┬` `┴` `┼`

### Section Headers

For major sections, use heavy horizontal lines:

```
══════════════════════════════════════════════════════════════════════════════
                            SECTION TITLE
══════════════════════════════════════════════════════════════════════════════
```

For subsections, use light lines:

```
  SUBSECTION
  ─────────────────────────────────────────────────────────────────────────────
```

### Status Indicators

Use these Unicode symbols for task/item status:

| Status      | Symbol | Usage                  |
| ----------- | ------ | ---------------------- |
| Completed   | ✓      | Task done successfully |
| In Progress | ●      | Currently working on   |
| Pending     | ○      | Not started yet        |
| Failed      | ✗      | Task failed            |
| Warning     | ⚠      | Needs attention        |
| Info        | ℹ      | Informational note     |

### Progress Bars

Use block characters for progress visualization:

- **Filled**: █ (full block)
- **Empty**: ░ (light shade)
- **Width**: 20 characters standard

Examples:

- 0%: `░░░░░░░░░░░░░░░░░░░░`
- 50%: `██████████░░░░░░░░░░`
- 100%: `████████████████████`

### Tables

Align columns cleanly with consistent spacing:

```
  #   DATE         NAME                              STATUS
  ─── ──────────── ───────────────────────────────── ────────────
  1   2025-12-31   feature-name                      completed
  2   2025-12-30   another-feature                   in_progress
```

Use 2-space indentation from the left margin.

### Tree Structures

For hierarchical data (tasks, files):

```
  ✓ 1. Parent task
      └─ ✓ 1.1 Subtask one
      └─ ✓ 1.2 Subtask two
      └─ ○ 1.3 Subtask three
```

### Tips and Notes

Use emoji sparingly for actionable hints:

```
  💡 Use /spec <number> to view details
  ⚠️  Warning: This action cannot be undone
```

## Communication Style

### Be Concise

- Keep output scannable
- Use bullet points over paragraphs
- Omit unnecessary words

### Be Structured

- Group related information
- Use consistent formatting
- Maintain visual hierarchy

### Be Professional

- No excessive emojis
- No casual language in structured output
- Clear, actionable information

## Example Output

```
╭──────────────────────────────────────────────────────────────────────────────╮
│                              YOYO DEV STATUS                                 │
╰──────────────────────────────────────────────────────────────────────────────╯

  PROJECT
  ─────────────────────────────────────────────────────────────────────────────
  Name:     My Awesome Project
  Branch:   feature/new-thing (modified)
  Memory:   5 blocks (project scope)
  MCP:      4 servers

  ACTIVE SPEC
  ─────────────────────────────────────────────────────────────────────────────
  Name:     claude-code-native-interface
  Progress: ████████░░░░░░░░░░░░ 40% (6/14 tasks)

  RECENT TASKS
  ─────────────────────────────────────────────────────────────────────────────
  ✓ Create status line script
  ✓ Create settings template
  ● Create /yoyo-status command      ← CURRENT

  💡 Run /tasks to see full breakdown
```
