# Interactive Execution Pattern

**Version:** 2.0.0
**Philosophy:** "Permission-based execution keeps humans in control"

---

## Overview

Interactive execution is the DEFAULT mode in Yoyo Dev v2.0. It pauses after each subtask completion and asks for user permission before continuing.

**Key Principle:** AI should never race ahead without human verification.

---

## Default Behavior (v2.0)

```bash
/execute-tasks              # Interactive by default
/execute-tasks --all        # Legacy mode (run without pausing)
/execute-tasks --task=2     # Run Task 2 interactively
```

**Interactive is the new normal.**

---

## Permission Model

### After Each Subtask

1. **Show changes summary**

   ```
   ✅ Task 1.1 completed - Write tests for ProfileCard
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   📝 Changes Made:
     • Created: components/ProfileCard.test.tsx (125 lines)
     • Modified: None

   🧪 Tests: All passing (3/3)
   ```

2. **Ask for permission**

   ```
   ⚠️  Continue to next task? [y/n/skip/quit]
   ```

3. **Wait for user input**
   - `y` or `yes` → Continue to next subtask
   - `n` or `no` → Stop execution, wait for user fixes
   - `skip` → Skip this task, move to next parent task
   - `quit` or `q` → Stop execution completely

4. **Proceed based on response**

---

## Implementation Pattern

### Step 1: Execute Subtask

```xml
<step number="4.1" name="execute_subtask">
  Execute the current subtask:
  1. Read subtask description
  2. Implement changes
  3. Run relevant tests
  4. Verify success
</step>
```

### Step 2: Show Changes Summary

```xml
<step number="4.2" name="show_changes_summary">
  OUTPUT: Changes Summary Template

  \033[1m\033[32m✅ Task X.Y completed\033[0m - [Subtask Description]
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  📝 \033[1mChanges Made:\033[0m
    • Created: [file paths with line counts]
    • Modified: [file paths with line counts]
    • Deleted: [file paths] (if any)

  🧪 \033[1mTests:\033[0m [status - X/Y passing]

  📊 \033[1mProgress:\033[0m [X]/[Total] subtasks complete
</step>
```

### Step 3: Ask Permission

```xml
<step number="4.3" name="ask_permission">
  Ask user for permission to continue:

  OUTPUT:

  ⚠️  Continue to next task? [y/n/skip/quit]

  Wait for user input.
</step>
```

### Step 4: Handle Response

```xml
<step number="4.4" name="handle_response">
  Based on user response:

  IF "y" or "yes":
    - Mark subtask as complete in MASTER-TASKS.md
    - Move to next subtask
    - Repeat from Step 1

  IF "n" or "no":
    - Mark subtask as complete in MASTER-TASKS.md
    - OUTPUT: Stopping execution. Resume with /execute-tasks when ready.
    - STOP

  IF "skip":
    - Mark current parent task as incomplete
    - Move to next parent task
    - Continue from Step 1

  IF "quit" or "q":
    - Mark current subtask as complete
    - OUTPUT: Execution stopped by user.
    - STOP
</step>
```

---

## Flag Behavior

### `--all` (Legacy Mode)

Run all tasks without pausing:

```xml
<condition flag="--all">
  Execute all subtasks sequentially:
  1. No permission prompts
  2. No changes summaries between subtasks
  3. Continue until all tasks complete or error occurs
  4. Show final summary at end
</condition>
```

### `--task=N` (Specific Task)

Execute only Task N (interactively by default):

```xml
<condition flag="--task=N">
  Execute only parent Task N:
  1. Identify Task N from MASTER-TASKS.md
  2. Execute all subtasks of Task N interactively
  3. Skip all other tasks
  4. Show completion summary
</condition>
```

### `--task=N --all` (Specific Task, No Pausing)

Run Task N completely without pausing:

```xml
<condition flag="--task=N --all">
  Execute only parent Task N without pausing:
  1. Identify Task N
  2. Run all subtasks of Task N
  3. No permission prompts
  4. Show final summary
</condition>
```

---

## Changes Summary Template

Use this exact format after each subtask:

```
\033[1m\033[32m✅ Task X.Y completed\033[0m - [Subtask Description]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 \033[1mChanges Made:\033[0m
  • Created: path/to/file.tsx (125 lines)
  • Created: path/to/file.test.tsx (45 lines)
  • Modified: path/to/existing.tsx (+15 lines, -3 lines)
  • Modified: path/to/config.ts (+2 lines)
  • Deleted: path/to/old-file.tsx

🧪 \033[1mTests:\033[0m \033[32mAll passing (3/3)\033[0m

📊 \033[1mProgress:\033[0m 3/12 subtasks complete

⚠️  Continue to next task? [y/n/skip/quit]
```

---

## Task Discovery During Execution

When new tasks are discovered during execution:

1. **Add to MASTER-TASKS.md**

   ```markdown
   ## 🆕 Newly Discovered Tasks

   - [ ] Add image compression before upload
         **Discovered:** During Task 3.2 (implement upload)
         **Reason:** Large images causing slow uploads
         **Priority:** Medium
         **Should we:** Add now or defer?
   ```

2. **Ask user immediately**

   ```
   🆕 New task discovered: "Add image compression"

   Reason: Large images causing slow uploads

   Options:
     1. Add to current sprint (run now)
     2. Defer to later (add to task list)
     3. Skip (don't add)

   Choice [1/2/3]:
   ```

3. **Handle based on response**
   - `1` → Add subtask to current task, execute after current subtask
   - `2` → Add to "Newly Discovered Tasks" section, continue
   - `3` → Don't add, continue

---

## Error Handling

### If Subtask Fails

```
❌ Task X.Y failed - [Subtask Description]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚨 \033[1mError:\033[0m [Error message]

📝 \033[1mAttempted Changes:\033[0m
  • [List of attempted changes]

💡 \033[1mSuggested Fix:\033[0m
  [Concrete fix recommendation]

Options:
  1. Retry with fix
  2. Skip this subtask
  3. Stop execution

Choice [1/2/3]:
```

### Handle Error Response

- `1` → Apply suggested fix, retry subtask
- `2` → Mark subtask as incomplete, move to next
- `3` → Stop execution

---

## MASTER-TASKS.md Updates

After each subtask completion:

1. **Mark subtask complete**

   ```markdown
   - [x] 1.1 Write tests for ProfileCard
   - [ ] 1.2 Implement ProfileCard base
   ```

2. **Update Current Focus**

   ```markdown
   ## 🎯 Current Focus

   **Active Task:** Task 1: Profile Card Component
   **Active Subtask:** 1.2 Implement ProfileCard base
   **Next Step:** Create component with basic props
   ```

3. **Update Progress Summary**

   ```markdown
   ## 📊 Progress Summary

   **Completed:** 3/12 tasks
   **Remaining:** 9 tasks
   **Estimated Time:** ~2 hours
   ```

   Progress: [███░░░░░░░░░░░░░] 25%

   ```

   ```

---

## Interactive Mode Benefits

1. **User stays in control** - No surprises, no racing ahead
2. **Early error detection** - Catch issues before they compound
3. **Context switching** - User can fix issues in real-time
4. **Confidence building** - See progress incrementally
5. **Learning opportunity** - Understand what AI is doing

---

## When to Use `--all` Flag

Use legacy mode (`--all`) when:

✅ You trust the task breakdown completely
✅ Tasks are well-defined and low-risk
✅ You want to walk away and let it run
✅ Tasks have already been verified once

❌ Don't use `--all` for:

- First-time execution of complex features
- Tasks with unclear requirements
- High-risk operations (auth, payments, data migrations)
- When learning the codebase

---

## Integration with Task Monitor

When using `--monitor` flag:

1. Task monitor updates in real-time
2. Shows current task in split pane
3. Progress bar updates after each subtask
4. User sees both: changes summary + monitor panel

**Recommended combo:**

```bash
/execute-tasks --monitor
```

Gives you:

- Interactive execution (pause after each subtask)
- Live task monitor in split pane
- Best of both worlds

---

## Summary

**v1.0 behavior:** Run all tasks automatically (--all was default)
**v2.0 behavior:** Run interactively (pause after each subtask)

**Why?** Because control > speed. Users should verify each step.

**Mantra:** "Your AI learns. Your AI remembers. Your AI evolves."

Interactive mode = Powerful control
`--all` flag = Invisible automation
