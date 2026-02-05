# Ralph Loop Rules — Safe Execution Protocol
**Version:** v1.0
**Generated:** 2026-02-05
**Purpose:** Define strict rules for autonomous task execution

---

## 0) Core Principle

**The Ralph Loop is deterministic, observable, and fail-closed.**

Every iteration:
- Processes exactly ONE task
- Creates exactly ONE branch
- Stops on first failure
- Logs every decision

---

## 1) Loop Invariants (Never Break These)

1. **One task per iteration** — no batch processing
2. **One branch per task** — branch naming: `sophie/YYYYMMDD-<slug>`
3. **Stop on test failure** — never proceed with broken tests
4. **No destructive commands** — never run rm, drop, truncate, etc.
5. **No new tools without approval** — tool additions require updated contracts + tests
6. **Observable logs** — every iteration writes to LOOP_LOG.md
7. **Replay protection** — task IDs are single-use

---

## 2) Task Selection Rules

### 2.1 Task Status Values

| Status | Meaning |
|--------|---------|
| READY | All prerequisites satisfied; safe to execute |
| BLOCKED | Prerequisites missing; cannot proceed |
| IN_PROGRESS | Currently being worked (lock held) |
| COMPLETED | Done; archived |
| FAILED | Attempted but failed; needs review |

### 2.2 Selection Algorithm

```
1. Read TODO_QUEUE.md
2. Find first task with status=READY
3. If none found → sleep and retry
4. If found → lock task (set status=IN_PROGRESS)
5. Proceed with execution
```

### 2.3 Prerequisites Check

Before marking task READY, verify:
- Required files exist
- Required acceptance tests exist
- No blocking dependencies
- Contracts are clear

---

## 3) Execution Protocol

### 3.1 Pre-Flight Checks (Every Iteration)

```bash
1. Verify git clean (no uncommitted changes to src/)
2. Run pnpm -s lint
3. Run pnpm -s test
4. If any fail → STOP, log reason, exit
```

### 3.2 Branch Creation

```bash
git checkout -b sophie/YYYYMMDD-<task-slug>
```

**Rules:**
- Always branch from current HEAD
- Use ISO date format
- Slug derived from task description

### 3.3 Task Execution (Phase 2+)

**Bootstrap Note:** During bootstrap, loop only validates.
**Future behavior:** Claude Code plugin executes actual work.

Expected execution flow:
1. Parse task definition
2. Load relevant contracts
3. Identify acceptance tests
4. Execute work
5. Run lint + tests
6. Commit if passing
7. Write log entry

### 3.4 Post-Execution

```bash
1. Run lint + tests again
2. If pass → commit with descriptive message
3. If fail → mark task FAILED, log reason
4. Update TODO_QUEUE.md task status
5. Write LOOP_LOG.md entry
```

---

## 4) Safety Gates (Hard Stops)

The loop MUST stop immediately if:

1. **Test failure** — never proceed with failing tests
2. **Lint failure** — code quality gate
3. **Contract violation detected** — security/authority breach
4. **Missing prerequisite** — dependency not satisfied
5. **Ambiguous requirement** — unclear Definition of Done

---

## 5) Logging Requirements

Every iteration writes to `LOOP_LOG.md`:

```markdown
## 2026-02-05T14:30:00Z
**Task:** [READY] Create SOPHIE_BASE_PROMPT file
**Status:** COMPLETED
**Branch:** sophie/20260205-base-prompt
**Tests:** PASS
**Lint:** PASS
**Commit:** abc123de
**Notes:** Created prompt file with v1 header
```

---

## 6) Error Handling

### 6.1 Recoverable Errors
- No READY tasks → sleep and retry
- Network timeout → log and retry next iteration
- Rate limit → backoff and retry

### 6.2 Non-Recoverable Errors
- Test failure → stop and alert
- Contract violation → stop and alert
- Security issue → stop and alert

### 6.3 Error Logging

All errors logged to `LOOP_LOG.md` with:
- Timestamp
- Task attempted
- Error type
- Stack trace (if applicable)
- Remediation steps

---

## 7) Prohibited Actions (Never Allow)

The loop MUST NEVER:

1. Delete files outside working branch
2. Execute shell commands from external input
3. Auto-approve side effects
4. Modify governance docs without version bump
5. Disable or skip tests
6. Commit with failing tests
7. Push to remote without explicit approval
8. Install packages without manifest update
9. Modify .env or secrets
10. Execute SQL DDL/DML directly

---

## 8) Branch Hygiene

### 8.1 Branch Lifecycle

1. Create from main/current
2. Execute one task
3. Commit if passing
4. Leave branch for manual review
5. Founder merges after review

### 8.2 No Auto-Merge

Loop creates branches but NEVER merges automatically.

All merges require:
- Manual review
- Acceptance test verification
- Founder approval

---

## 9) Extensibility (Future)

### 9.1 Plugin Support

Loop may be extended with plugins:
- Custom validators
- Pre/post-execution hooks
- Specialized executors

**Rule:** All plugins must:
- Declare capabilities in manifest
- Respect safety gates
- Log all actions
- Fail-closed on error

### 9.2 Enhanced Ralph (Future)

Future versions may include:
- LLM-assisted task planning
- Parallel execution lanes
- Adaptive retry strategies
- Smart prioritization

**Constraint:** All enhancements must preserve safety invariants.

---

## 10) Testing the Loop

### 10.1 Dry Run Mode

```bash
RALPH_DRY_RUN=1 bash scripts/ralph-loop.sh
```

Dry run mode:
- Logs actions without executing
- Validates task queue format
- Checks prerequisites
- No git operations

### 10.2 Single Iteration Mode

```bash
RALPH_ONCE=1 bash scripts/ralph-loop.sh
```

Runs exactly one iteration then exits.

---

## 11) Configuration

### 11.1 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| RALPH_SLEEP | 60 | Seconds between iterations |
| RALPH_DRY_RUN | 0 | If 1, log but don't execute |
| RALPH_ONCE | 0 | If 1, run one iteration only |
| RALPH_MAX_RETRIES | 3 | Max retries for transient errors |

### 11.2 Loop Configuration File (Future)

`docs/_sophie_devpack/LOOP_CONFIG.yaml` may define:
- Task filters
- Execution lanes
- Priority rules
- Notification settings

---

## 12) Monitoring & Observability

### 12.1 What to Monitor

- Iteration count
- Tasks completed
- Test pass rate
- Error frequency
- Average iteration time

### 12.2 Alerts

Consider alerting on:
- Loop stopped (unexpected exit)
- High error rate (>50%)
- Stuck task (no progress in 24h)
- Test failure streak (>3)

---

## 13) Owner Sign-Off

The Ralph Loop is a power tool.

Used correctly:
- Increases throughput
- Maintains quality
- Preserves safety

Used incorrectly:
- Breaks contracts
- Corrupts state
- Erodes trust

These rules ensure correct use.

---

## 14) Bootstrap Note

During 2026-02-05 bootstrap:
- Loop script created as safe scaffolding
- Validates and logs only (no execution)
- Future sessions will enhance with plugin support

**Current behavior:** Loop checks lint/tests and logs status.
**Future behavior:** Loop executes tasks per TODO_QUEUE.
