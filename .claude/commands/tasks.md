---
description: Show tasks for the current active specification
allowed-tools: Bash, Read, Glob
---

# Show Current Tasks

Display the task breakdown for the current active specification.

## Usage

```
/tasks            - Show tasks for most recent spec
/tasks <name>     - Show tasks for specific spec
```

## Arguments

$ARGUMENTS optionally contains a spec name to filter.

## Instructions

1. Find the active spec:
   - If argument provided: Find matching spec
   - Otherwise: Use most recent spec directory

2. Read `tasks.md` from the spec directory

3. Parse task structure:
   - Phase headers: `## Phase N: Name`
   - Task headers: `### Task N: Name`
   - Subtasks: `- Task N.M: Name`
   - Acceptance criteria: `- [ ]` or `- [x]`

4. Determine task status:
   - Has `[x]` checkboxes checked → completed
   - First unchecked task → in_progress
   - Rest → pending

## Output Format

```
╭──────────────────────────────────────────────────────────────────────────────╮
│                  TASKS: claude-code-native-interface                         │
╰──────────────────────────────────────────────────────────────────────────────╯

  ## Phase 1: Foundation

  ✓ 1. Create status line script
      └─ ✓ 1.1 Write statusline.sh with git branch extraction
      └─ ✓ 1.2 Add spec name detection
      └─ ✓ 1.3 Add task progress counting
      └─ ✓ 1.4 Add MCP server count
      └─ ✓ 1.5 Add memory block count
      └─ ✓ 1.6 Test in various environments

  ✓ 2. Create Claude Code settings template
      └─ ✓ 2.1 Create settings template
      └─ ✓ 2.2 Configure statusline reference
      └─ ✓ 2.3 Add to project.sh installation

  ## Phase 2: Custom Slash Commands

  ● 3. Create /yoyo-status command               ← CURRENT
      └─ ○ 3.1 Create command markdown file
      └─ ○ 3.2 Implement project info section
      └─ ○ 3.3 Implement active spec section
      └─ ○ 3.4 Implement recent activity section
      └─ ○ 3.5 Add professional formatting

  ○ 4. Create /yoyo-specs command
  ○ 5. Create /spec detail command
  ○ 6. Create /tasks command
  ○ 7. Create /yoyo-fixes command
  ○ 8. Create /fix detail command

  ## Phase 3: Output Style

  ○ 9. Create Yoyo output style

  ─────────────────────────────────────────────────────────────────────────────

  Progress: ████░░░░░░░░░░░░░░░░ 20% (3/14 complete)

  Legend: ✓ completed  ● in_progress  ○ pending  ✗ failed
```

## Status Detection Logic

1. If task has ALL acceptance criteria checked `[x]` → ✓ completed
2. First task with SOME or NO criteria checked → ● in_progress (mark with ← CURRENT)
3. Tasks after in_progress → ○ pending
4. Tasks explicitly marked failed → ✗ failed

## Tree Characters

- `└─` for last subtask
- `├─` for other subtasks (optional, can use └─ for all)

## Edge Cases

- No spec found: "No active specification. Run /create-new to create one."
- No tasks.md: "No tasks defined for this spec."
- All tasks completed: Show 100% and "All tasks complete! 🎉"
