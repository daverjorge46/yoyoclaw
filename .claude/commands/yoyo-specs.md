---
description: List all Yoyo Dev specifications
allowed-tools: Bash, Read, Glob
---

# List Specifications

List all feature specifications in the current Yoyo Dev project.

## Instructions

1. Find all spec directories in `.yoyo-dev/specs/`
2. For each spec, extract:
   - Date (from directory name: YYYY-MM-DD-name)
   - Name (remainder of directory name)
   - Status (from state.json if exists)
   - Progress (count completed vs total tasks in tasks.md)

3. Sort by date (newest first)

## Output Format

```
╭──────────────────────────────────────────────────────────────────────────────╮
│                              SPECIFICATIONS                                  │
╰──────────────────────────────────────────────────────────────────────────────╯

  #   DATE         NAME                                  STATUS       PROGRESS
  ─── ──────────── ───────────────────────────────────── ──────────── ────────
  1   2025-12-31   claude-code-native-interface          in_progress  40%
  2   2025-12-30   multi-agent-orchestration             completed    100%
  3   2025-12-28   browser-gui-dashboard                 completed    100%

  Total: 3 specs (2 completed, 1 in progress)

  💡 Use /spec <number> to view details
```

## Status Indicators

- `completed` - All tasks done
- `in_progress` - Currently being worked on
- `pending` - Not started
- `blocked` - Waiting on something

## Progress Calculation

Count tasks from tasks.md:

- Total: Lines matching `^###\s+Task\s+[0-9]+:`
- Completed: Lines with `[x]` checkboxes OR tasks marked with ✓

Progress % = (completed / total) \* 100

## Edge Cases

- No specs directory: "No specifications yet. Run /create-new to create one."
- Empty specs directory: Same message
- No tasks.md in spec: Show "0%" progress
- No state.json: Infer status from tasks (all done = completed, some done = in_progress)
