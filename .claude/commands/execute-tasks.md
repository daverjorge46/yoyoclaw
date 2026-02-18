---
description: Execute tasks with multi-agent orchestration, TDD, and auto-recovery
---

# Execute Tasks

Execute tasks using the Yoyo-AI orchestrator or legacy workflow.

## Usage

```bash
/execute-tasks                           # Use Yoyo-AI (default)
/execute-tasks --orchestrator legacy     # Use legacy v4.0 workflow
/execute-tasks --orchestrator yoyo-ai    # Explicit Yoyo-AI
/execute-tasks --devil                   # With devil's advocate review
/execute-tasks --security                # With security review
```

## Options

### Orchestrator Selection

- **`--orchestrator yoyo-ai`** (default) - Use intelligent multi-agent orchestration
  - Automatic delegation to specialized agents
  - Parallel background tasks for research
  - Failure recovery with Oracle escalation
  - Frontend auto-delegation
  - Todo-driven workflow
  - Reference: `@.yoyo-dev/instructions/core/yoyo-ai-orchestration.md`

- **`--orchestrator legacy`** - Use traditional v4.0 linear workflow
  - Single-agent execution
  - Manual workflow steps
  - No auto-delegation
  - Reference: `@.yoyo-dev/instructions/core/execute-tasks.md`

### Review Modes (Optional)

- `--devil` - Devil's advocate review (critical analysis)
- `--security` - Security-focused review
- `--performance` - Performance optimization review
- `--production` - Production-readiness review

### Execution Modes

- `--sequential` - Force sequential execution (no parallelization)
- `--parallel` - Force parallel execution where possible

### Delegation Control

- `--no-delegation` - Disable automatic agent delegation (implement everything yourself)

## Default Behavior

**Without flags:** Uses Yoyo-AI orchestrator with intelligent delegation.

**Workflow Steps:**

1. Phase 0: Intent Classification
2. Phase 1: Codebase Assessment
3. Phase 2A: Research & Exploration (parallel)
4. Phase 2B: Implementation (todo-driven)
5. Phase 3: Verification & Completion

## Examples

```bash
# Simple execution (Yoyo-AI)
/execute-tasks

# Legacy mode (v4.0 workflow)
/execute-tasks --orchestrator legacy

# With security review
/execute-tasks --security

# No auto-delegation (manual implementation)
/execute-tasks --no-delegation

# Sequential execution with devil's advocate
/execute-tasks --sequential --devil
```

## Instructions Reference

- **Yoyo-AI Orchestration:** `@.yoyo-dev/instructions/core/yoyo-ai-orchestration.md`
- **Legacy Workflow:** `@.yoyo-dev/instructions/core/execute-tasks.md`

## Configuration

The default orchestrator can be set in `.yoyo-dev/config.yml`:

```yaml
workflows:
  task_execution:
    orchestrator: yoyo-ai # or "legacy" for v4.0
```

---

**Note:** Yoyo-AI orchestration (v5.0) provides intelligent delegation, parallel execution, and failure recovery. Use legacy mode only if you prefer the traditional linear workflow or need to debug orchestration issues.
