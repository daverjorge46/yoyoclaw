---
description: List all Yoyo Dev bug fix records
allowed-tools: Bash, Read, Glob
---

# List Bug Fixes

List all bug fix records in the current Yoyo Dev project.

## Instructions

1. Find all fix directories in `.yoyo-dev/fixes/`
2. For each fix, extract:
   - Date (from directory name: YYYY-MM-DD-name)
   - Name (remainder of directory name)
   - Status (from state.json if exists, or infer from tasks)
   - Root cause summary (first line of "Root Cause" section in analysis.md)

3. Sort by date (newest first)

## Output Format

```
╭──────────────────────────────────────────────────────────────────────────────╮
│                               BUG FIXES                                      │
╰──────────────────────────────────────────────────────────────────────────────╯

  #   DATE         NAME                              STATUS       ROOT CAUSE
  ─── ──────────── ───────────────────────────────── ──────────── ────────────────
  1   2025-12-31   gui-unhandled-rejection           completed    async mutation
  2   2025-12-30   orphaned-vite-process             completed    port blocking
  3   2025-12-29   symlink-script-resolution         completed    path resolution

  Total: 3 fixes (3 completed)

  💡 Use /fix <number> to view detailed analysis
```

## Root Cause Extraction

Look for these patterns in analysis.md:

1. `## Root Cause` section - use first line of content
2. `**Root Cause:**` inline - use the text after
3. `Cause:` field - use the value

Truncate to ~20 characters with "..." if longer.

## Edge Cases

- No fixes directory: "No bug fixes recorded yet."
- Empty fixes directory: Same message
- No analysis.md: Show "unknown" for root cause
- No state.json: Infer status from tasks (all done = completed)
