---
description: Advanced orchestration for complex multi-agent task execution
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Orchestrate Tasks Rules

## Overview

Advanced orchestration workflow for complex multi-agent scenarios where you need fine-grained control over agent assignment and execution strategy.

**Use this when:**

- Complex features requiring multiple specialized agents
- Need manual control over which agent handles which task group
- Want to assign specific standards to different task groups
- Creating strategic orchestration plans

**For normal execution:** Use `/execute-tasks` (automatic, comprehensive)

<pre_flight_check>
EXECUTE: @instructions/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" name="task_selection">

### Step 1: Identify Tasks to Execute

Load tasks.md and let user select which task groups to orchestrate.

<instructions>
  ACTION: Read tasks.md from spec folder

IF spec folder not in context:
ASK: "Which spec folder? (e.g., .yoyo-dev/specs/2025-10-30-feature-name/)"
LOAD: tasks.md from specified folder

PARSE: Extract all task groups (## Task N: Name)

DISPLAY: Task groups in formatted table

\033[1m\033[36m╔═══════════════════════════════════════════════════════════╗\033[0m
\033[1m\033[36m║\033[0m 📋 AVAILABLE TASK GROUPS \033[1m\033[36m║\033[0m
\033[1m\033[36m╠═══════════════════════════════════════════════════════════╣\033[0m
\033[36m║\033[0m Task 1: [Name] Status: [✓/□] \033[36m║\033[0m
\033[36m║\033[0m Task 2: [Name] Status: [✓/□] \033[36m║\033[0m
\033[1m\033[36m╚═══════════════════════════════════════════════════════════╝\033[0m

ASK: "Which task groups do you want to orchestrate? (e.g., 1,2,3 or 'all')"

VALIDATE: User selection

STORE: selected_task_groups
</instructions>

</step>

<step number="2" name="agent_assignment">

### Step 2: Assign Specialized Agents to Task Groups

For each selected task group, let user assign a specialized agent.

<instructions>
  LOAD: List of available specialized agents from config.yml

AVAILABLE_AGENTS: - implementer (general TDD implementation) - spec-writer (specification writing) - tasks-list-creator (task breakdown) - product-planner (product documentation) - implementation-verifier (quality verification) - spec-shaper (requirements gathering) - spec-initializer (folder initialization)

FOR each task_group in selected_task_groups:

    DISPLAY: Task group details

    \033[1m\033[34m┌─ TASK GROUP [N]: [NAME] ───────────────────────┐\033[0m
    \033[34m│\033[0m  [Brief description from tasks.md]                 \033[34m│\033[0m
    \033[34m│\033[0m  Files to Create: [list]                           \033[34m│\033[0m
    \033[34m│\033[0m  Files to Modify: [list]                           \033[34m│\033[0m
    \033[1m\033[34m└──────────────────────────────────────────────────┘\033[0m

    DISPLAY: Available agents with descriptions

    ASK: "Which agent should handle Task Group [N]? (default: implementer)"

    RECORD: task_group_N → assigned_agent

STORE: agent_assignments
</instructions>

</step>

<step number="3" name="standards_assignment">

### Step 3: Assign Relevant Standards to Task Groups

For each selected task group, let user select relevant standards.

<instructions>
  LOAD: List of available standards from .yoyo-dev/standards/

AVAILABLE_STANDARDS: - best-practices.md (core development practices) - tech-stack.md (technology standards) - design-system.md (UI/design standards) - parallel-execution.md (task execution) - personas.md (development approach) - code-style/\*.md (language-specific styles)

FOR each task_group in selected_task_groups:

    DISPLAY: Task group and assigned agent

    SUGGEST: Default standards based on task type
      IF task involves UI:
        SUGGEST: design-system.md, code-style/react.md
      IF task involves database:
        SUGGEST: best-practices.md, code-style/typescript.md
      IF task involves API:
        SUGGEST: best-practices.md, tech-stack.md

    ASK: "Which standards should guide Task Group [N]? (comma-separated, or 'default')"

    RECORD: task_group_N → [standards_list]

STORE: standards_assignments
</instructions>

</step>

<step number="4" name="create_orchestration_file">

### Step 4: Create Orchestration Roadmap

Generate orchestration.yml file with all assignments and execution plan.

<instructions>
  ANALYZE: Task dependencies from tasks.md metadata

BUILD: Parallel execution groups
Group 0: Tasks with no dependencies
Group 1: Tasks depending only on Group 0
Group N: Tasks depending on previous groups

CREATE: orchestration.yml in spec folder

TEMPLATE: # Orchestration Roadmap # Created: [DATE] # Spec: [SPEC_NAME]

    orchestration:
      spec_folder: [PATH]
      task_groups:
        - group_number: 1
          group_name: [NAME]
          agent: [ASSIGNED_AGENT]
          standards:
            - [STANDARD_1]
            - [STANDARD_2]
          status: pending

        - group_number: 2
          group_name: [NAME]
          agent: [ASSIGNED_AGENT]
          standards:
            - [STANDARD_1]
          status: pending

    execution:
      parallel_groups:
        - [1]          # Group 0: No dependencies
        - [2, 3]       # Group 1: Can run in parallel
        - [4]          # Group 2: Depends on previous

DISPLAY: Orchestration plan

\033[1m\033[32m╔═══════════════════════════════════════════════════════════╗\033[0m
\033[1m\033[32m║\033[0m ✓ ORCHESTRATION PLAN CREATED \033[1m\033[32m║\033[0m
\033[1m\033[32m╠═══════════════════════════════════════════════════════════╣\033[0m
\033[32m║\033[0m File: orchestration.yml \033[32m║\033[0m
\033[32m║\033[0m Task Groups: [N] \033[32m║\033[0m
\033[32m║\033[0m Parallel Groups: [G] \033[32m║\033[0m
\033[1m\033[32m╚═══════════════════════════════════════════════════════════╝\033[0m

ASK: "Proceed with execution? (Y/n)"

IF user_confirms:
CONTINUE: To step 5
ELSE:
OUTPUT: "Orchestration plan saved. Run /orchestrate-tasks again when ready."
EXIT
</instructions>

</step>

<step number="5" name="execute_tasks">

### Step 5: Execute Tasks Using Assigned Agents

Execute each parallel group using the Task tool with assigned agents.

<instructions>
  FOR each parallel_group in execution.parallel_groups:

    OUTPUT: Group header

    \033[1m\033[35m┌─ EXECUTING GROUP [N] ──────────────────────────┐\033[0m
    \033[35m│\033[0m  Tasks: [TASK_LIST]                                \033[35m│\033[0m
    \033[35m│\033[0m  Mode: [Parallel/Sequential]                       \033[35m│\033[0m
    \033[1m\033[35m└────────────────────────────────────────────────┘\033[0m

    IF parallel_group.length > 1:
      # PARALLEL EXECUTION
      EXECUTE: Multiple Task tool calls in SINGLE message

      FOR each task in parallel_group:
        USE: Task tool with:
          subagent_type: "general-purpose"
          description: "Execute Task [N] via [AGENT]"
          prompt: "
            You are the [ASSIGNED_AGENT] agent.

            Execute Task Group [N]: [NAME] from tasks.md

            Relevant standards to follow:
            [STANDARDS_LIST]

            Spec context: [SPEC_FOLDER]

            Complete all subtasks in this task group.
            Follow TDD approach: write tests first, then implement.
            Mark subtasks complete as you go.

            Return: Summary of what was implemented and test results.
          "

      WAIT: For all parallel tasks to complete

      COLLECT: Results from each agent

    ELSE:
      # SEQUENTIAL EXECUTION
      task = parallel_group[0]

      USE: Task tool with assigned agent (same as above)

      WAIT: For completion

      COLLECT: Result

    UPDATE: orchestration.yml with status = "completed" for finished tasks

    OUTPUT: Group completion

    \033[32m✓ Group [N] Complete\033[0m

OUTPUT: All groups executed
</instructions>

</step>

<step number="6" name="create_orchestration_report">

### Step 6: Create Orchestration Report

Aggregate results and create comprehensive orchestration report.

<instructions>
  CREATE: orchestration-report.md in spec folder

TEMPLATE: # Orchestration Report

    **Spec:** [SPEC_NAME]
    **Date:** [DATE]
    **Task Groups:** [N]
    **Status:** [COMPLETE/PARTIAL]

    ---

    ## Execution Summary

    **Total Groups:** [N]
    **Parallel Groups:** [G]
    **Total Time:** [TIME]
    **Agents Used:** [LIST]

    ---

    ## Group Results

    ### Group [N]: [NAME]

    **Agent:** [AGENT]
    **Standards:** [LIST]
    **Status:** ✓ Complete
    **Duration:** [TIME]

    **Implementation:**
    [SUMMARY FROM AGENT]

    **Files Changed:**
    - Created: [FILES]
    - Modified: [FILES]

    **Tests:** [PASS/FAIL]

    ---

    ## Issues Encountered

    [LIST ANY ISSUES OR "None"]

    ---

    ## Next Steps

    - Run full test suite
    - Create pull request
    - Update roadmap

DISPLAY: Report location

\033[1m\033[36m📄 Orchestration Report Created\033[0m
Path: [PATH]/orchestration-report.md
</instructions>

</step>

<step number="7" subagent="git-workflow" name="git_workflow">

### Step 7: Git Workflow

Execute standard git workflow: commit, push, create PR.

<instructions>
  USE: git-workflow subagent

REQUEST: "Complete git workflow for [SPEC_NAME] feature: - Spec: [SPEC_FOLDER_PATH] - Changes: All modified files - Orchestration: Used multi-agent orchestration - Create commit and push - Create pull request with orchestration summary"

WAIT: For git-workflow completion

COLLECT: pr_url
</instructions>

</step>

<step number="8" subagent="project-manager" name="update_tracking">

### Step 8: Update Task Tracking and Create Recap

Update tasks.md, roadmap.md, and create recap.

<instructions>
  USE: project-manager subagent

REQUEST: "Complete post-execution tracking for [SPEC_NAME]: - Verify all orchestrated tasks marked complete in tasks.md - Update roadmap.md if applicable - Create recap in .yoyo-dev/recaps/ - Generate completion summary with:
_ PR URL
_ Orchestration strategy used
_ Agents involved
_ Total time saved via parallel execution"

WAIT: For project-manager completion

COLLECT: completion_summary

OUTPUT: Final summary

\033[1m\033[32m╔═══════════════════════════════════════════════════════════╗\033[0m
\033[1m\033[32m║\033[0m ✅ ORCHESTRATION COMPLETE \033[1m\033[32m║\033[0m
\033[1m\033[32m╠═══════════════════════════════════════════════════════════╣\033[0m
\033[32m║\033[0m Spec: [SPEC_NAME] \033[32m║\033[0m
\033[32m║\033[0m Task Groups: [N] completed \033[32m║\033[0m
\033[32m║\033[0m Agents Used: [LIST] \033[32m║\033[0m
\033[32m║\033[0m PR: [URL] \033[32m║\033[0m
\033[32m║\033[0m \033[32m║\033[0m
\033[32m║\033[0m 📄 Reports: \033[32m║\033[0m
\033[32m║\033[0m • orchestration.yml \033[32m║\033[0m
\033[32m║\033[0m • orchestration-report.md \033[32m║\033[0m
\033[32m║\033[0m • recap in .yoyo-dev/recaps/ \033[32m║\033[0m
\033[1m\033[32m╚═══════════════════════════════════════════════════════════╝\033[0m
</instructions>

</step>

</process_flow>

<post_flight_check>
CHECK: All selected task groups marked complete in tasks.md
CHECK: orchestration.yml exists and is valid YAML
CHECK: orchestration-report.md created
CHECK: All tests passing
CHECK: PR created successfully
CHECK: Recap created
</post_flight_check>

## Notes

- **When to use:** Complex multi-agent scenarios requiring fine-grained control
- **Default execution:** Use `/execute-tasks` for automatic, comprehensive execution
- **Orchestration benefits:** Manual agent assignment, custom standards selection, strategic planning
- **Parallel execution:** Automatically detected based on dependencies
- **Reports:** orchestration.yml (plan) + orchestration-report.md (results)
