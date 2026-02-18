---
description: Rules for creating new features with full specification workflow
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Create New Feature Rules

## Overview

This command streamlines the creation of new features by combining spec creation and task generation in a single workflow. Use this when building new features, components, pages, or functionality.

**Workflow Path**: Discovery → Clarification → Specification → Task Creation

## Formatting Guidelines

This command uses rich terminal formatting for superior developer experience. Reference `@.yoyo-dev/standards/formatting-helpers.md` for templates.

**Required formatting:**

- Command header (T1)
- Phase progress indicators (T2)
- Success/error messages (T3/T4)
- Final completion summary (T12)

<pre_flight_check>
EXECUTE: @.yoyo-dev/instructions/meta/pre-flight.md

OUTPUT: Command header

\033[1m\033[36m┌────────────────────────────────────────────────┐\033[0m
\033[1m\033[36m│\033[0m 🚀 \033[1mYOYO DEV - CREATE NEW FEATURE\033[0m \033[1m\033[36m│\033[0m
\033[1m\033[36m│\033[0m ──────────────────────────────────────────── \033[1m\033[36m│\033[0m
\033[1m\033[36m│\033[0m \033[2mStreamlined feature creation workflow\033[0m \033[1m\033[36m│\033[0m
\033[1m\033[36m└────────────────────────────────────────────────┘\033[0m

</pre_flight_check>

<process_flow>

<step number="1" name="feature_discovery">

### Step 1: Feature Discovery

Understand what the user wants to build through initial discovery and scope identification.

<discovery_modes>
<mode_a>
<trigger>User provides detailed description</trigger>
<action>Accept description and proceed to clarification</action>
</mode_a>
<mode_b>
<trigger>User provides brief idea</trigger>
<action>Ask 2-3 initial scoping questions</action>
</mode_b>
<mode_c>
<trigger>User says "what's next?"</trigger>
<action> 1. READ @.yoyo-dev/product/roadmap.md 2. FIND next uncompleted item 3. SUGGEST to user 4. WAIT for approval
</action>
</mode_c>
</discovery_modes>

<instructions>
  ACTION: Identify feature to build
  GATHER: Initial requirements
  CONFIRM: Feature scope with user
  PROCEED: Once feature is clear
</instructions>

</step>

<step number="2" subagent="context-fetcher" name="context_gathering">

### Step 2: Context Gathering (Conditional)

Use the context-fetcher subagent to load product context only if not already available in current context.

<conditional_logic>
IF both mission-lite.md AND tech-stack.md already in context:
SKIP this step entirely
PROCEED to step 3
ELSE:
READ only missing files: - @.yoyo-dev/product/mission-lite.md (if not in context) - @.yoyo-dev/product/tech-stack.md (if not in context)
CONTINUE with context analysis
</conditional_logic>

<context_purpose>
<mission_lite>Align feature with product vision</mission_lite>
<tech_stack>Ensure technical compatibility</tech_stack>
</context_purpose>

</step>

<step number="3" name="requirements_clarification">

### Step 3: Requirements Clarification

Ask targeted numbered questions to clarify all ambiguities before specification creation.

<clarification_areas>
<functional> - Core functionality and behavior - User interactions and workflows - Input validation and edge cases
</functional>
<technical> - UI/UX requirements and patterns - Data requirements and structure - Integration points with existing code - Performance requirements
</technical>
<scope> - What IS included (in scope) - What is NOT included (out of scope) - Dependencies on other features - Success criteria
</scope>
</clarification_areas>

<question_format>
Present questions in numbered list:

1. [FUNCTIONAL_QUESTION]
2. [TECHNICAL_QUESTION]
3. [SCOPE_QUESTION]
   ...
   </question_format>

<instructions>
  ACTION: Analyze requirements gaps
  ASK: Numbered clarification questions (2-8 questions typical)
  WAIT: For complete user responses
  ITERATE: Ask follow-up questions if needed
  VERIFY: All ambiguities resolved
  PROCEED: Once requirements are crystal clear
</instructions>

</step>

<step number="4" name="execute_spec_creation">

### Step 4: Execute Spec Creation

Run the full spec creation workflow using existing create-spec instructions.

<instructions>
  ACTION: Execute @.yoyo-dev/instructions/core/create-spec.md
  SKIP: Steps 1-3 (already completed in this workflow)
  START: From Step 4 (date determination)
  COMPLETE: All spec creation steps through user review
  RESULT: Full spec documentation package
</instructions>

<spec_outputs>

- spec.md (full requirements)
- spec-lite.md (condensed summary)
- technical-spec.md (implementation details)
- decisions.md (technical decisions)
- database-schema.md (conditional)
- api-spec.md (conditional)
- state.json (workflow tracking)
  </spec_outputs>

</step>

<step number="5" name="user_spec_review">

### Step 5: User Spec Review

Present created specification for user review and approval before task creation.

<review_request_template>
I've created the complete specification:

**Core Documents:**

- Requirements: @.yoyo-dev/specs/[SPEC_FOLDER]/spec.md
- Summary: @.yoyo-dev/specs/[SPEC_FOLDER]/spec-lite.md
- Technical Details: @.yoyo-dev/specs/[SPEC_FOLDER]/sub-specs/technical-spec.md
- Technical Decisions: @.yoyo-dev/specs/[SPEC_FOLDER]/decisions.md

[LIST_CONDITIONAL_SPECS_IF_CREATED]

Please review the specification. Once approved, I'll create the task breakdown for implementation.

**Options:**

- "approved" or "looks good" → I'll create tasks
- Request specific changes → I'll update the spec
  </review_request_template>

<decision_tree>
IF user approves:
PROCEED to step 6
ELSE IF user requests changes:
UPDATE specification files
RETURN to this step for re-review
ELSE:
WAIT for user response
</decision_tree>

</step>

<step number="6" name="execute_task_creation">

### Step 6: Execute Task Creation

After spec approval, automatically create task breakdown following the create-tasks workflow.

<instructions>
  ACTION: Create tasks.md in spec folder
  FOLLOW: Task creation patterns from @.yoyo-dev/instructions/core/create-tasks.md
  STRUCTURE:
    - 1-5 parent tasks
    - Each with up to 8 subtasks
    - First subtask: Write tests
    - Middle subtasks: Implementation
    - Last subtask: Verify tests pass
</instructions>

<task_breakdown_template>

# Tasks Checklist

> Spec: [SPEC_NAME]
> Created: [DATE]

## Parent Task 1: [TASK_NAME]

- [ ] Write tests for [component/feature]
- [ ] [Implementation step 1]
- [ ] [Implementation step 2]
- [ ] [Implementation step 3]
- [ ] Verify all tests pass

## Parent Task 2: [TASK_NAME]

- [ ] Write tests for [component/feature]
- [ ] [Implementation step 1]
- [ ] [Implementation step 2]
- [ ] Verify all tests pass
      </task_breakdown_template>

</step>

<step number="7" name="execution_readiness">

### Step 7: Execution Readiness

Present first task summary and confirm readiness to execute.

<readiness_message_template>
OUTPUT: Completion summary (T12)

\033[1m\033[42m\033[30m╔═══════════════════════════════════════════════════════════╗\033[0m
\033[1m\033[42m\033[30m║ ✓ FEATURE READY FOR IMPLEMENTATION ║\033[0m
\033[1m\033[42m\033[30m╠═══════════════════════════════════════════════════════════╣\033[0m
\033[42m\033[30m║ ║\033[0m
\033[42m\033[30m║ Feature: [FEATURE_NAME] ║\033[0m
\033[42m\033[30m║ Spec: .yoyo-dev/specs/[SPEC_FOLDER]/ ║\033[0m
\033[42m\033[30m║ Tasks: [TOTAL_TASKS] parent tasks ║\033[0m
\033[42m\033[30m║ Subtasks: [TOTAL_SUBTASKS] implementation steps ║\033[0m
\033[42m\033[30m║ ║\033[0m
\033[1m\033[42m\033[30m╠═══════════════════════════════════════════════════════════╣\033[0m
\033[1m\033[42m\033[30m║ 📋 FIRST TASK ║\033[0m
\033[1m\033[42m\033[30m╠═══════════════════════════════════════════════════════════╣\033[0m
\033[42m\033[30m║ ║\033[0m
\033[42m\033[30m║ [PARENT_TASK_1_NAME] ║\033[0m
\033[42m\033[30m║ ║\033[0m
\033[42m\033[30m║ Subtasks: ║\033[0m
\033[42m\033[30m║ • [SUBTASK_1] ║\033[0m
\033[42m\033[30m║ • [SUBTASK_2] ║\033[0m
\033[42m\033[30m║ • [...] ║\033[0m
\033[42m\033[30m║ ║\033[0m
\033[1m\033[42m\033[30m╠═══════════════════════════════════════════════════════════╣\033[0m
\033[1m\033[42m\033[30m║ 🚀 NEXT STEP ║\033[0m
\033[1m\033[42m\033[30m╠═══════════════════════════════════════════════════════════╣\033[0m
\033[42m\033[30m║ ║\033[0m
\033[42m\033[30m║ Ready to start implementation! ║\033[0m
\033[42m\033[30m║ ║\033[0m
\033[42m\033[30m║ → Run: \033[1m/execute-tasks\033[0m\033[42m\033[30m ║\033[0m
\033[42m\033[30m║ ║\033[0m
\033[42m\033[30m║ Or specify tasks: /execute-tasks [task numbers] ║\033[0m
\033[42m\033[30m║ ║\033[0m
\033[1m\033[42m\033[30m╚═══════════════════════════════════════════════════════════╝\033[0m
</readiness_message_template>

<state_update>
<file>.yoyo-dev/specs/[SPEC_FOLDER]/state.json</file>
<updates> - tasks_created: [CURRENT_DATE] - current_phase: "ready_for_execution"
</updates>
</state_update>

</step>

</process_flow>

<post_flight_check>
EXECUTE: @.yoyo-dev/instructions/meta/post-flight.md
</post_flight_check>

## Summary

This command provides a streamlined path from idea to executable tasks:

1. **Discovery**: Understand what to build
2. **Clarification**: Resolve all ambiguities through targeted questions
3. **Specification**: Create comprehensive spec documentation
4. **Review**: Get user approval on spec
5. **Tasks**: Generate actionable task breakdown
6. **Readiness**: Prepare for execution

**Next Step**: User runs `/execute-tasks` to begin implementation.
