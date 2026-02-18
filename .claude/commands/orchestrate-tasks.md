---
description: Advanced multi-agent orchestration with manual agent/standards assignment
---

# Orchestrate Tasks

Advanced orchestration for complex multi-agent task execution scenarios.

Refer to the instructions located in this file:
@instructions/core/orchestrate-tasks.md

## When to Use

Use `/orchestrate-tasks` when:

- You need fine-grained control over which agents execute which tasks
- Working on complex features requiring multiple specialized agents
- Want to manually assign specific standards to different task groups
- Need to create a strategic orchestration plan before execution

For normal task execution, use `/execute-tasks` (automatic, comprehensive).

## What It Does

1. **Task Selection** - Choose which task groups to execute
2. **Agent Assignment** - Manually assign specialized agents to each group
3. **Standards Assignment** - Select relevant standards for each group
4. **Orchestration Planning** - Create orchestration.yml roadmap
5. **Parallel Execution** - Execute tasks using assigned agents
6. **Reporting** - Generate orchestration report with results

## Example

```bash
/orchestrate-tasks

# The command will:
# 1. Show available task groups
# 2. Ask which groups to execute
# 3. Let you assign agents to each group
# 4. Let you assign standards to each group
# 5. Create orchestration.yml
# 6. Execute with assigned agents
# 7. Generate orchestration report
```
