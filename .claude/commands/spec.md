---
description: View details of a specific specification
allowed-tools: Bash, Read, Glob
---

# View Specification Details

View detailed information about a specific Yoyo Dev specification.

## Usage

```
/spec <number>    - View spec by list number (from /yoyo-specs)
/spec <name>      - View spec by name (partial match supported)
/spec             - View the most recent spec
```

## Arguments

$ARGUMENTS contains the spec identifier (number or name).

## Instructions

1. Parse the argument:
   - If numeric: List specs sorted by date, pick the Nth one
   - If string: Find spec directory containing that name
   - If empty: Use most recent spec

2. Read and display:
   - `spec.md` or `spec-lite.md` - Main specification
   - `state.json` - Current status
   - `tasks.md` - Task summary (not full content)
   - `decisions.md` - Technical decisions (if exists)

## Output Format

```
╭──────────────────────────────────────────────────────────────────────────────╮
│                    SPEC: claude-code-native-interface                        │
╰──────────────────────────────────────────────────────────────────────────────╯

  METADATA
  ─────────────────────────────────────────────────────────────────────────────
  Created:  2025-12-31
  Status:   in_progress
  Phase:    implementation
  Progress: ████░░░░░░░░░░░░░░░░ 20% (3/14 tasks)

  OVERVIEW
  ─────────────────────────────────────────────────────────────────────────────
  [First 3-5 lines of spec.md overview section]

  TASK SUMMARY
  ─────────────────────────────────────────────────────────────────────────────
  Phase 1: Foundation
    ✓ Task 1: Create status line script
    ✓ Task 2: Create Claude Code settings template
    ● Task 3: Create /yoyo-status command
    ○ Task 4: Create /specs command

  Phase 2: Commands
    ○ Task 5-8: [Pending tasks...]

  [Show first 2 phases, then "... and N more tasks"]

  FILES
  ─────────────────────────────────────────────────────────────────────────────
  • spec.md          - Full specification
  • spec-lite.md     - Condensed version
  • tasks.md         - Task breakdown
  • decisions.md     - Technical decisions
  • state.json       - Workflow state

  💡 Use /tasks to see full task breakdown
```

## Status Icons

- ✓ completed
- ● in_progress
- ○ pending
- ✗ failed

## Edge Cases

- Spec not found: "Specification not found. Run /yoyo-specs to see available specs."
- No tasks.md: Show "No tasks defined yet"
- No decisions.md: Omit from file list
