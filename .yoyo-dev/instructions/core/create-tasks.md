---
description: Create an Yoyo Dev tasks list from an approved feature spec
globs:
alwaysApply: false
version: 1.1
encoding: UTF-8
---

# Spec Creation Rules

## Overview

With the user's approval, proceed to creating a tasks list based on the current feature spec.

<pre_flight_check>
EXECUTE: @.yoyo-dev/instructions/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" subagent="file-creator" name="create_tasks">

### Step 1: Create tasks.md

Use the file-creator subagent to create file: tasks.md inside of the current feature's spec folder.

<file_template>

  <header>
    # Spec Tasks
  </header>
</file_template>

<task_structure>
<major_tasks> - count: 1-5 - format: numbered checklist - grouping: by feature or component
</major_tasks>
<subtasks> - count: up to 8 per major task - format: decimal notation (1.1, 1.2) - first_subtask: typically write tests - last_subtask: verify all tests pass
</subtasks>
</task_structure>

<task_template>

## Tasks

- [ ] 1. **[MAJOR_TASK_DESCRIPTION]**
  - **Context:** [WHY_THIS_APPROACH_OR_KEY_CONSTRAINTS]
  - **Dependencies:** [PREREQUISITE_TASKS_OR_NONE]
  - **Files to Create:** [LIST_OF_NEW_FILES]
  - **Files to Modify:** [LIST_OF_EXISTING_FILES_TO_CHANGE]
  - **Parallel Safe:** [YES_IF_NO_FILE_CONFLICTS_WITH_OTHER_TASKS]
  - [ ] 1.1 Write tests for [COMPONENT]
  - [ ] 1.2 [IMPLEMENTATION_STEP]
  - [ ] 1.3 [IMPLEMENTATION_STEP]
  - [ ] 1.4 Verify all tests pass

- [ ] 2. **[MAJOR_TASK_DESCRIPTION]** - **Context:** [WHY_THIS_APPROACH_OR_KEY_CONSTRAINTS] - **Dependencies:** [PREREQUISITE_TASKS_OR_NONE] - **Files to Create:** [LIST_OF_NEW_FILES] - **Files to Modify:** [LIST_OF_EXISTING_FILES_TO_CHANGE] - **Parallel Safe:** [YES_IF_NO_FILE_CONFLICTS_WITH_OTHER_TASKS] - [ ] 2.1 Write tests for [COMPONENT] - [ ] 2.2 [IMPLEMENTATION_STEP]
     </task_template>

<context_guidelines>
<context_field> - Include key decisions from decisions.md - Note any non-obvious constraints - Reference important patterns or approaches - Keep to 1-2 sentences maximum
</context_field>

<dependencies_field> - List prerequisite tasks (e.g., "Task 1 (needs schema)") - Note required configurations (e.g., "Email service must be configured") - Mention external setup needs - Use "None" if no dependencies - IMPORTANT: Explicit dependencies enable parallel execution analysis
</dependencies_field>

<files_to_create_field> - List all NEW files this task will create - Use full relative paths (e.g., "src/components/ProfileCard.tsx") - Include test files - Use "None" if only modifying existing files - PURPOSE: Detect file conflicts for parallel execution
</files_to_create_field>

<files_to_modify_field> - List all EXISTING files this task will modify - Use full relative paths - Include configuration files - Use "None" if only creating new files - PURPOSE: Detect file conflicts for parallel execution
</files_to_modify_field>

<parallel_safe_field> - Answer "Yes" if task can run concurrently with others - Answer "No" if task has dependencies or file conflicts - Consider:
_ Are files unique to this task?
_ Does task depend on output from other tasks? \* Will task modify shared configuration files? - When in doubt, say "No" (safety first) - PURPOSE: Enable automatic parallel execution planning
</parallel_safe_field>

<key_files_field> - List 2-4 primary files to work with - Include both new and modified files - Use relative paths from project root - Helps executors know where to focus
</key_files_field>
</context_guidelines>

<ordering_principles>

- Consider technical dependencies
- Follow TDD approach
- Group related functionality
- Build incrementally
  </ordering_principles>

</step>

<step number="2" name="update_state">

### Step 2: Update Workflow State

Update the state.json file to reflect that tasks have been created.

<state_update>
<file_path>.yoyo-dev/specs/[SPEC_FOLDER]/state.json</file_path>
<updates> - tasks_created: [CURRENT_DATE] - current_phase: "tasks_ready"
</updates>
</state_update>

<instructions>
  ACTION: Read existing state.json
  UPDATE: Set tasks_created to current date
  UPDATE: Set current_phase to "tasks_ready"
  SAVE: Updated state.json
</instructions>

</step>

<step number="3" name="execution_readiness">

### Step 3: Execution Readiness Check

Evaluate readiness to begin implementation by presenting the first task summary and requesting user confirmation to proceed.

<readiness_summary>
<present_to_user> - Spec name and description - First task summary from tasks.md - Estimated complexity/scope - Key deliverables for task 1
</present_to_user>
</readiness_summary>

<execution_prompt>
PROMPT: "The spec planning is complete. The first task is:

**Task 1:** [FIRST_TASK_TITLE]
[BRIEF_DESCRIPTION_OF_TASK_1_AND_SUBTASKS]

Would you like me to proceed with implementing Task 1? I will focus only on this first task and its subtasks unless you specify otherwise.

Type 'yes' to proceed with Task 1, or let me know if you'd like to review or modify the plan first."
</execution_prompt>

<execution_flow>
IF user_confirms_yes:
REFERENCE: @.yoyo-dev/instructions/core/execute-tasks.md
FOCUS: Only Task 1 and its subtasks
CONSTRAINT: Do not proceed to additional tasks without explicit user request
ELSE:
WAIT: For user clarification or modifications
</execution_flow>

</step>

</process_flow>

<post_flight_check>
EXECUTE: @.yoyo-dev/instructions/meta/post-flight.md
</post_flight_check>
