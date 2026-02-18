---
description: View details of a specific bug fix
allowed-tools: Bash, Read, Glob
---

# View Bug Fix Details

View detailed analysis and solution for a specific bug fix.

## Usage

```
/fix <number>     - View fix by list number (from /yoyo-fixes)
/fix <name>       - View fix by name (partial match supported)
/fix              - View the most recent fix
```

## Arguments

$ARGUMENTS contains the fix identifier (number or name).

## Instructions

1. Parse the argument:
   - If numeric: List fixes sorted by date, pick the Nth one
   - If string: Find fix directory containing that name
   - If empty: Use most recent fix

2. Read and display:
   - `analysis.md` - Problem analysis and root cause
   - `solution-lite.md` - Solution summary (if exists)
   - `tasks.md` - Fix tasks
   - `state.json` - Current status

## Output Format

```
╭──────────────────────────────────────────────────────────────────────────────╮
│                      FIX: gui-unhandled-rejection                            │
╰──────────────────────────────────────────────────────────────────────────────╯

  METADATA
  ─────────────────────────────────────────────────────────────────────────────
  Created:  2025-12-31
  Status:   completed
  Severity: medium

  PROBLEM
  ─────────────────────────────────────────────────────────────────────────────
  [Summary from analysis.md - what was broken]

  ROOT CAUSE
  ─────────────────────────────────────────────────────────────────────────────
  [Root cause analysis from analysis.md]

  SOLUTION
  ─────────────────────────────────────────────────────────────────────────────
  [Solution summary from solution-lite.md or analysis.md]

  FILES CHANGED
  ─────────────────────────────────────────────────────────────────────────────
  • src/hooks/useChat.ts - Changed mutateAsync to mutate
  • src/components/CodebaseChat.tsx - Removed async from handler

  TASKS
  ─────────────────────────────────────────────────────────────────────────────
  ✓ 1. Identify root cause
  ✓ 2. Implement fix
  ✓ 3. Add tests
  ✓ 4. Verify in production

  Progress: ████████████████████ 100% (4/4 complete)
```

## Section Extraction

From analysis.md:

- **Problem**: Look for `## Problem` or first paragraph
- **Root Cause**: Look for `## Root Cause` section
- **Solution**: Look for `## Solution` or `## Fix` section
- **Files Changed**: Look for `## Files` or extract from solution

## Edge Cases

- Fix not found: "Bug fix not found. Run /yoyo-fixes to see available fixes."
- No analysis.md: "No analysis document found for this fix."
- No tasks.md: Show "No tasks defined"
