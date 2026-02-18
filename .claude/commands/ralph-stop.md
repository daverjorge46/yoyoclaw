# Ralph Stop

Gracefully stop the current Ralph autonomous execution.

## Usage

```bash
/ralph-stop
```

## Description

Sends a stop signal to the running Ralph process, allowing it to:

1. Complete the current iteration
2. Save progress state
3. Generate a partial execution report
4. Exit cleanly

## Implementation

When invoked:

1. Find running Ralph process
2. Send graceful termination signal
3. Wait for current iteration to complete
4. Report final status

## Output Format

```
╭──────────────────────────────────────────────────────────────────╮
│                  RALPH STOP REQUEST                               │
╰──────────────────────────────────────────────────────────────────╯

  Sending stop signal to Ralph...

  Waiting for current iteration to complete...

  ✓ Ralph stopped gracefully

  Final Status:
  - Loops completed: 12
  - Tasks completed: 4/5
  - Tests: 23/25 passing
  - Time elapsed: 00:45:23

  Progress saved to:
  .yoyo-dev/ralph/logs/2026-01-02-123456.log

  To resume, run:
  yoyo --ralph execute-tasks
```

## Behavior

- **Safe Stop**: Waits for current iteration to finish
- **Force Stop**: Use Ctrl+C twice for immediate termination
- **State Preservation**: Progress is saved for potential resume
- **No Running Process**: Shows message if Ralph is not running

## Related Commands

- `/ralph-status` - Check current Ralph status
- `/ralph-config` - View/edit Ralph configuration
