# Parallel Execution Strategy

## Context

Guidelines for analyzing task dependencies and executing tasks and agents in parallel to maximize development velocity while maintaining code safety.

## Core Principles

1. **Safety First** - Never parallelize if there's any risk of conflicts
2. **Maximize Concurrency** - Execute everything possible in parallel
3. **Automatic Analysis** - Analyze dependencies by default
4. **Explicit Dependencies** - Tasks declare their dependencies clearly
5. **File-Based Conflicts** - Primary conflict detection via file paths
6. **Agent Parallelism** - Multiple agents can work concurrently within tasks

---

## Dependency Analysis

### Conflict Types

**1. File Write Conflicts**

- Two tasks modify the same file
- **Resolution**: Execute sequentially

**2. File Read Dependencies**

- Task B needs file created by Task A
- **Resolution**: Task A must complete before Task B

**3. Logical Dependencies**

- Task B depends on Task A's outcome (e.g., schema before API)
- **Resolution**: Execute sequentially

**4. Test Dependencies**

- Tests need implementation to exist
- **Resolution**: Implementation before tests (though TDD reverses this)

**5. No Conflicts**

- Tasks operate on completely separate files
- **Resolution**: Execute in parallel!

### Dependency Detection Algorithm

```
FOR each task in task_list:
  EXTRACT:
    - files_to_create: []
    - files_to_modify: []
    - files_to_read: []
    - logical_dependencies: []
    - depends_on_tasks: []

FOR each task_pair (A, B):
  IF A.files_to_create ∩ B.files_to_modify != ∅:
    CONFLICT: File write conflict
    RESOLUTION: Sequential (A → B or B → A)

  IF A.files_to_create ∩ B.files_to_read != ∅:
    DEPENDENCY: B depends on A
    RESOLUTION: Sequential (A → B)

  IF A.files_to_modify ∩ B.files_to_modify != ∅:
    CONFLICT: Same file modification
    RESOLUTION: Sequential (A → B or B → A)

  IF B IN A.depends_on_tasks:
    DEPENDENCY: Explicit dependency
    RESOLUTION: Sequential (A → B)

  IF no_conflicts_detected:
    PARALLEL: Can execute simultaneously

CREATE: Dependency graph
IDENTIFY: Parallel execution groups
GENERATE: Execution plan
```

### Execution Groups

**Group 0** - No dependencies (execute first, all in parallel)

```
Task 1: Create ProfileCard component    [files: ProfileCard.tsx]
Task 2: Create SettingsPage component   [files: SettingsPage.tsx]
Task 3: Create utility functions        [files: utils/validation.ts]
```

**Status**: ✓ All can run in parallel (no file conflicts)

**Group 1** - Depends on Group 0 (execute after Group 0, parallel within group)

```
Task 4: Create ProfilePage (uses ProfileCard)    [depends: Task 1]
Task 5: Create tests for SettingsPage            [depends: Task 2]
```

**Status**: ✓ Task 4 and 5 can run in parallel (different dependencies)

**Group 2** - Depends on Group 1

```
Task 6: Integration tests (needs all pages)      [depends: Task 4, 5]
```

**Status**: Must wait for Group 1 completion

---

## Task Metadata Structure

### Required Fields in tasks.md

```markdown
## Task 1: Create Database Schema

**Dependencies**: None
**Files to Create**:

- `convex/schema.ts`
- `convex/migrations/001_user_profiles.ts`

**Files to Modify**:

- `convex/schema/index.ts`

**Parallel Safe**: Yes (if no other task touches these files)

**Subtasks**:

- [ ] 1.1 Define user profile schema
- [ ] 1.2 Create migration script
- [ ] 1.3 Update schema index
- [ ] 1.4 Run migration tests

---

## Task 2: Create API Endpoints

**Dependencies**: Task 1 (needs schema)
**Files to Create**:

- `convex/profile.ts`
- `convex/profileQueries.ts`

**Files to Modify**: None

**Parallel Safe**: No (depends on Task 1)

**Subtasks**:

- [ ] 2.1 Write API endpoint tests
- [ ] 2.2 Implement GET /api/profile
- [ ] 2.3 Implement PUT /api/profile
- [ ] 2.4 Verify all tests pass

---

## Task 3: Create ProfileCard Component

**Dependencies**: None
**Files to Create**:

- `src/components/ProfileCard.tsx`
- `src/components/ProfileCard.test.tsx`

**Files to Modify**: None

**Parallel Safe**: Yes (independent of other tasks)

**Subtasks**:

- [ ] 3.1 Write component tests
- [ ] 3.2 Implement ProfileCard UI
- [ ] 3.3 Add styling
- [ ] 3.4 Verify tests pass
```

### Automatic Dependency Detection

If tasks don't explicitly declare dependencies, analyze from subtask descriptions:

```markdown
Subtask: "Create UserProfile component that uses ProfileCard"
→ DETECTED: Depends on task that creates ProfileCard

Subtask: "Add profile route to routes/index.ts"
→ DETECTED: Modifies routes/index.ts (check for conflicts)

Subtask: "Write tests for profile API using database"
→ DETECTED: Depends on database schema task
```

---

## Parallel Execution Patterns

### Pattern 1: Fully Independent Tasks

**Scenario**: Frontend components with no shared files

```
PARALLEL EXECUTION:
├─ Agent 1: Task 1 - ProfileCard component
├─ Agent 2: Task 2 - SettingsPage component
└─ Agent 3: Task 3 - AboutPage component

RESULT: 3x faster (3 tasks in parallel)
```

**Safety Check**:

- ✓ No file conflicts
- ✓ No dependencies
- ✓ Independent test suites

### Pattern 2: Layered Dependencies

**Scenario**: Backend → Frontend flow

```
GROUP 1 (Parallel):
├─ Task 1: Database schema
├─ Task 2: Utility functions
└─ Task 3: Type definitions

↓ (Wait for Group 1)

GROUP 2 (Parallel):
├─ Task 4: API endpoints (depends on 1, 3)
└─ Task 5: Frontend hooks (depends on 2, 3)

↓ (Wait for Group 2)

GROUP 3 (Sequential):
└─ Task 6: Integration tests (depends on 4, 5)

RESULT: 2x faster (parallel groups)
```

### Pattern 3: Pipeline Pattern

**Scenario**: Sequential pipeline with parallel branches

```
Task 1: Schema
   ↓
   ├─ Task 2A: Users API ──┐
   ├─ Task 2B: Posts API ──┼─→ Task 4: Integration
   └─ Task 2C: Comments API┘

EXECUTION:
1. Task 1 (sequential)
2. Tasks 2A, 2B, 2C (parallel)
3. Task 4 (sequential, waits for 2A-C)

RESULT: 3x faster on middle layer
```

### Pattern 4: Agent Parallelism Within Task

**Scenario**: Single task needs multiple operations

```markdown
## Task 3: Create User Profile Feature

Subtasks:

- [ ] 3.1 Write tests for ProfileCard
- [ ] 3.2 Write tests for ProfilePage
- [ ] 3.3 Implement ProfileCard
- [ ] 3.4 Implement ProfilePage
- [ ] 3.5 Add route configuration
- [ ] 3.6 Run all tests
```

**Parallel Execution Within Task**:

```
PHASE 1 (Parallel - Test Writing):
├─ Agent A: Write ProfileCard tests (3.1)
└─ Agent B: Write ProfilePage tests (3.2)

PHASE 2 (Parallel - Implementation):
├─ Agent A: Implement ProfileCard (3.3)
└─ Agent B: Implement ProfilePage (3.4)

PHASE 3 (Sequential - Integration):
└─ Agent A: Add routes (3.5)

PHASE 4 (Sequential - Verification):
└─ Agent A: Run all tests (3.6)

RESULT: 2x faster (parallel test writing + parallel implementation)
```

---

## Implementation Strategy

### Step 1: Dependency Analysis

```xml
<step name="dependency_analysis">
  ACTION: Analyze task dependencies automatically

  FOR each task in tasks.md:
    EXTRACT:
      - Task number and name
      - Files to create (from subtask descriptions)
      - Files to modify (from subtask descriptions)
      - Explicit dependencies (from "Dependencies:" field)
      - Logical dependencies (infer from descriptions)

  BUILD: Dependency graph
    - Nodes: Tasks
    - Edges: Dependencies (A → B means B depends on A)

  DETECT: File conflicts
    FOR each task pair (A, B):
      IF A.files_to_modify ∩ B.files_to_modify != ∅:
        MARK: Sequential (conflict)
      IF A.files_to_create ∩ B.files_to_read != ∅:
        MARK: A → B (dependency)

  GROUP: Tasks into execution groups
    - Group 0: No dependencies
    - Group 1: Depends only on Group 0
    - Group N: Depends on previous groups

  OUTPUT: Execution plan with parallel groups
</step>
```

### Step 2: Execution Plan Visualization

```xml
<step name="show_execution_plan">
  OUTPUT: Formatted execution plan (T8 - Table)

  \033[1m\033[36m╔═══════════════════════════════════════════════════════════╗\033[0m
  \033[1m\033[36m║\033[0m  📊 PARALLEL EXECUTION PLAN                               \033[1m\033[36m║\033[0m
  \033[1m\033[36m╠═══════════════════════════════════════════════════════════╣\033[0m
  \033[36m║\033[0m                                                           \033[36m║\033[0m
  \033[36m║\033[0m  Total Tasks:        5                                    \033[36m║\033[0m
  \033[36m║\033[0m  Parallel Groups:    3                                    \033[36m║\033[0m
  \033[36m║\033[0m  Max Concurrency:    3 tasks                              \033[36m║\033[0m
  \033[36m║\033[0m  Est. Time Saved:    ~40% faster                          \033[36m║\033[0m
  \033[36m║\033[0m                                                           \033[36m║\033[0m
  \033[1m\033[36m╠═══════════════════════════════════════════════════════════╣\033[0m
  \033[1m\033[36m║\033[0m  GROUP 1: Foundation (Parallel)                       \033[1m\033[36m║\033[0m
  \033[1m\033[36m╠═══════════════════════════════════════════════════════════╣\033[0m
  \033[36m║\033[0m                                                           \033[36m║\033[0m
  \033[36m║\033[0m  • Task 1: Database Schema                                \033[36m║\033[0m
  \033[36m║\033[0m  • Task 3: ProfileCard Component                          \033[36m║\033[0m
  \033[36m║\033[0m  • Task 4: SettingsPage Component                         \033[36m║\033[0m
  \033[36m║\033[0m                                                           \033[36m║\033[0m
  \033[36m║\033[0m  \033[32m✓\033[0m No file conflicts detected                           \033[36m║\033[0m
  \033[36m║\033[0m                                                           \033[36m║\033[0m
  \033[1m\033[36m╠═══════════════════════════════════════════════════════════╣\033[0m
  \033[1m\033[36m║\033[0m  GROUP 2: Integration (Parallel)                      \033[1m\033[36m║\033[0m
  \033[1m\033[36m╠═══════════════════════════════════════════════════════════╣\033[0m
  \033[36m║\033[0m                                                           \033[36m║\033[0m
  \033[36m║\033[0m  • Task 2: API Endpoints (depends on Task 1)              \033[36m║\033[0m
  \033[36m║\033[0m                                                           \033[36m║\033[0m
  \033[1m\033[36m╠═══════════════════════════════════════════════════════════╣\033[0m
  \033[1m\033[36m║\033[0m  GROUP 3: Finalization (Sequential)                   \033[1m\033[36m║\033[0m
  \033[1m\033[36m╠═══════════════════════════════════════════════════════════╣\033[0m
  \033[36m║\033[0m                                                           \033[36m║\033[0m
  \033[36m║\033[0m  • Task 5: Integration Tests (depends on 2, 3, 4)         \033[36m║\033[0m
  \033[36m║\033[0m                                                           \033[36m║\033[0m
  \033[1m\033[36m╚═══════════════════════════════════════════════════════════╝\033[0m

  ASK: "Execute with parallel processing? (Y/n)"
  DEFAULT: Yes
</step>
```

### Step 3: Parallel Task Execution

```xml
<step name="parallel_execution">
  FOR each execution_group in execution_plan:

    IF group.tasks.length > 1:
      OUTPUT: "Executing Group {N} in parallel ({M} tasks)..."

      EXECUTE: All tasks in parallel using multiple tool calls

      # Claude Code supports multiple tool calls in single message!
      SEND_MESSAGE:
        - Task tool (general-purpose agent) for Task A
        - Task tool (general-purpose agent) for Task B
        - Task tool (general-purpose agent) for Task C

      WAIT: For all tasks in group to complete

      COLLECT: Results from all parallel executions

      CHECK: All tasks completed successfully
        IF any_task_failed:
          STOP: Do not continue to next group
          REPORT: Failure details
        ELSE:
          CONTINUE: To next group

    ELSE:
      OUTPUT: "Executing Task {N}..."
      EXECUTE: Single task
      CHECK: Success before continuing

  OUTPUT: Completion summary with parallel metrics
</step>
```

### Step 4: Agent Parallelism Within Tasks

```xml
<step name="agent_parallelism_in_task">
  WHEN: Executing individual task

  ANALYZE: Subtasks for parallelism opportunities

  IDENTIFY: Parallel phases
    - Phase 1: Test writing (multiple files, independent)
    - Phase 2: Implementation (multiple components, independent)
    - Phase 3: Integration (single file, sequential)

  FOR each phase:
    IF phase_has_parallel_work:
      EXECUTE: Multiple agents concurrently

      Example:
        SEND_MESSAGE:
          - Bash: Create test file A
          - Bash: Create test file B
          - Bash: Create test file C

      WAIT: For all agents to complete
      VERIFY: All succeeded

    ELSE:
      EXECUTE: Sequential work

  BENEFIT: Even single tasks can be 2-3x faster
</step>
```

---

## Safety Mechanisms

### 1. Conservative Conflict Detection

```
RULE: When in doubt, execute sequentially

IF unable to determine file list from description:
  MARK: Sequential (safe default)

IF task description mentions "uses" or "integrates":
  MARK: Potential dependency, analyze carefully

IF unclear about file conflicts:
  ASK USER: "Can Task A and B run in parallel?"
```

### 2. Pre-Execution Validation

```
BEFORE parallel execution:
  CHECK: Git working directory clean
  CHECK: No uncommitted changes
  CHECK: All dependencies installed
  CHECK: Tests currently passing

IF any_check_fails:
  ABORT: Parallel execution
  FIX: Issues first
```

### 3. Rollback on Failure

```
IF task_fails during parallel execution:
  STOP: All parallel executions
  ROLLBACK: Changes from current group
  REPORT: Which task failed and why
  OFFER: Continue with failed task fixed, or abort
```

### 4. File Lock Detection

```
BEFORE modifying file:
  CHECK: File not being modified by another agent

IF file_locked:
  WAIT: For lock release
  RETRY: Modification

TIMEOUT: 30 seconds
IF timeout_exceeded:
  FAIL: Task with clear error message
```

---

## Performance Metrics

### Execution Time Tracking

```markdown
## Parallel Execution Report

**Total Tasks**: 5
**Execution Groups**: 3
**Tasks in Parallel**: 3 (Group 1)

**Timing**:

- Group 1 (3 tasks parallel): 4 min (vs 12 min sequential = 3x faster)
- Group 2 (1 task): 3 min
- Group 3 (1 task): 2 min
- **Total Time**: 9 min (vs 20 min sequential = 2.2x faster)

**Time Saved**: 11 minutes (55% faster)
```

### Metrics Dashboard

```
╔═══════════════════════════════════════════════════════════╗
║  📊 PARALLEL EXECUTION METRICS                            ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  Tasks Completed:      5/5  ████████████████████ 100%    ║
║  Parallel Efficiency:  220% (2.2x faster)                ║
║  Max Concurrency:      3 agents                          ║
║  Time Saved:           11 minutes                        ║
║                                                           ║
║  Group 1 (parallel):   4 min  ⚡⚡⚡                      ║
║  Group 2 (sequential): 3 min  →                          ║
║  Group 3 (sequential): 2 min  →                          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

---

## Best Practices

### 1. Design Tasks for Parallelism

✅ **Good**:

```
Task 1: Create ProfileCard component
Task 2: Create SettingsCard component
Task 3: Create AboutCard component
```

**Result**: All 3 can run in parallel

❌ **Bad**:

```
Task 1: Create all components in components.tsx
```

**Result**: Single file, must be sequential

### 2. Explicit Dependencies

✅ **Good**:

```markdown
## Task 2: Create API Endpoints

**Dependencies**: Task 1 (needs schema)
```

❌ **Bad**:

```markdown
## Task 2: Create API Endpoints

(No mention of schema dependency)
```

### 3. Granular File Operations

✅ **Good**:

```
Subtask: Create src/components/ProfileCard.tsx
Subtask: Create src/components/SettingsPage.tsx
```

**Result**: Clear file list, easy conflict detection

❌ **Bad**:

```
Subtask: Create all components
```

**Result**: Unknown file list, must be conservative

### 4. Test Independence

✅ **Good**:

```
Task 1: Tests for ProfileCard
Task 2: Tests for SettingsPage
```

**Result**: Independent test files, parallel safe

❌ **Bad**:

```
Task 1: Tests for entire feature
```

**Result**: Single test file, sequential only

---

## Configuration

### Enable/Disable Parallel Execution

In `.yoyo-dev/config.yml`:

```yaml
parallel_execution:
  enabled: true
  max_concurrency: 5 # Max parallel tasks
  auto_analyze: true # Automatic dependency analysis
  conservative_mode: false # When true, more sequential execution
  ask_confirmation: true # Ask before parallel execution

  safety:
    require_clean_git: true
    rollback_on_failure: true
    timeout_seconds: 300
```

### Per-Command Override

```bash
# Force parallel
/execute-tasks --parallel

# Force sequential (safe mode)
/execute-tasks --sequential

# Specify max concurrency
/execute-tasks --parallel --max=3
```

---

## Future Enhancements

1. **Machine Learning** - Learn optimal parallelization from past executions
2. **Resource Monitoring** - Adjust concurrency based on system load
3. **Distributed Execution** - Execute tasks across multiple machines
4. **Smart Batching** - Group related tasks for better cache locality
5. **Predictive Analysis** - Estimate time savings before execution

---

**Parallel execution by default: Faster development, maintained safety! ⚡**
