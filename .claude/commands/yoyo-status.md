---
description: Display Yoyo Dev project status dashboard
allowed-tools: Bash, Read, Glob
---

# Yoyo Dev Status Dashboard

Display a comprehensive status dashboard for the current Yoyo Dev project.

## Instructions

Gather the following information and display it in a professional, formatted dashboard:

### 1. Project Information

- Read `.yoyo-dev/product/mission-lite.md` for project name and tagline
- Run `git branch --show-current` for current branch
- Run `git status --porcelain` to check for uncommitted changes
- Count memory blocks: `sqlite3 .yoyo-dev/memory/memory/memory.db "SELECT COUNT(*) FROM memory_blocks"` (if exists)
- Count MCP servers: `docker mcp server ls 2>/dev/null | grep -c '^[a-z]'` (if docker available)

### 2. Active Specification

- Find most recent spec directory in `.yoyo-dev/specs/`
- Read `state.json` for current phase and status
- Count tasks in `tasks.md` (total and completed)
- Calculate progress percentage

### 3. Recent Activity

- Show last 3 git commits: `git log --oneline -3`
- Or show recent task completions from tasks.md

## Output Format

Use this exact format with Unicode box-drawing:

```
══════════════════════════════════════════════════════════════════════════════
                            YOYO DEV STATUS
══════════════════════════════════════════════════════════════════════════════

  PROJECT
  ─────────────────────────────────────────────────────────────────────────────
  Name:     [Project name from mission-lite.md]
  Branch:   [branch name] ([clean/modified])
  Memory:   [N] blocks ([scope])
  MCP:      [N] servers

  ACTIVE SPEC
  ─────────────────────────────────────────────────────────────────────────────
  Name:     [spec-name]
  Created:  [YYYY-MM-DD]
  Phase:    [phase from state.json]
  Progress: [████████░░░░░░░░░░░░] [X]% ([completed]/[total] tasks)

  RECENT ACTIVITY
  ─────────────────────────────────────────────────────────────────────────────
  • [Most recent commit or task]
  • [Second most recent]
  • [Third most recent]

══════════════════════════════════════════════════════════════════════════════
```

## Progress Bar

Calculate the progress bar width (20 characters total):

- Filled blocks: █ (proportional to completion %)
- Empty blocks: ░

Example for 40% completion: `████████░░░░░░░░░░░░`

## Edge Cases

- If no `.yoyo-dev/` directory: Show "Yoyo Dev not initialized. Run /yoyo-init"
- If no specs: Show "No specifications yet. Run /create-new"
- If no git: Show "no-git" for branch
- If no docker: Show "N/A" for MCP
- If no memory.db: Show "0 blocks"
