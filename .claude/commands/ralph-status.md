# Ralph Status

Show the current status of Ralph/execution progress with real-time task visibility.

## Usage

```bash
/ralph-status
/ralph-status --json   # Output as JSON for programmatic use
```

## Implementation

When this command is invoked, execute the progress tracker to show current execution status:

### Step 1: Show Execution Progress

Run the progress tracker to display current execution state:

```bash
YOYO_PROJECT_ROOT="${YOYO_PROJECT_ROOT:-$(pwd)}" /path/to/yoyo-dev/setup/progress-tracker.sh status
```

**Replace `/path/to/yoyo-dev` with the actual yoyo-dev installation path.**

### Step 2: Show Ralph Circuit Breaker Status (if available)

If Ralph is installed and has state files, also show circuit breaker status:

```bash
# Check for Ralph state files
if [[ -f ".circuit_breaker_state" ]]; then
    cat .circuit_breaker_state | jq .
fi

# Check for Ralph status.json
if [[ -f "status.json" ]]; then
    echo "Ralph Status:"
    cat status.json | jq '{loop: .current_loop, api_calls: .api_call_count, status: .status}'
fi
```

### Step 3: Show Recent Activity

Check for recent spec/fix execution:

1. Read the latest spec's `state.json` file
2. Display:
   - Current phase
   - Completed tasks list
   - Execution started timestamp
   - Whether execution is marked complete

## Output Format

```
╭──────────────────────────────────────────────────────────────────╮
│                      EXECUTION STATUS                            │
╰──────────────────────────────────────────────────────────────────╯

  ● Status:       Running
  📁 Spec:        2026-01-05-feature-name
  🔄 Phase:        implementation
  ⏱️  Elapsed:      5m 23s

  Progress:       3/10 tasks (30%)
  [████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░]

  Current Task:
    3. Implement user authentication

  Current Subtask:
    3.2 Add JWT token validation

  Action: Running tests...

  Last updated: 2026-01-05T15:23:45Z
```

## JSON Output

When `--json` flag is provided:

```json
{
  "is_running": true,
  "spec_or_fix_name": "2026-01-05-feature-name",
  "type": "spec",
  "current_phase": "implementation",
  "current_parent_task": "3. Implement user authentication",
  "current_subtask": "3.2 Add JWT token validation",
  "total_parent_tasks": 10,
  "completed_parent_tasks": 3,
  "percentage": 30,
  "current_action": "Running tests...",
  "started_at": "2026-01-05T15:18:22Z",
  "last_updated": "2026-01-05T15:23:45Z"
}
```

## Integration with Progress Tracking

This command reads from `.yoyo-dev/.cache/execution-progress.json` which is updated during task execution. The file is written by:

1. **Manual tracking**: `progress-tracker.sh` script
2. **Automatic tracking**: Execute-tasks workflow updates (when enabled)
3. **Ralph integration**: Ralph loop can update progress during autonomous execution

## Behavior

- If no active execution, shows status of last execution
- If no execution history, shows "No execution history found"
- Displays warning if Ralph circuit breaker is open
- Auto-refreshes display is NOT supported (one-shot command)

## Related Commands

- `/ralph-stop` - Stop current Ralph execution
- `/ralph-config` - View/edit Ralph configuration
- `/execute-tasks` - Start task execution with progress tracking
