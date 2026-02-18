---
description: Rules for analyzing and fixing bugs, issues, and design problems
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Create Fix Rules

## Overview

This command streamlines the bug fixing and issue resolution process through systematic problem analysis, solution design, and task generation. Use this for bugs, design adjustments, layout issues, performance problems, or any corrective work.

**Workflow Path**: Problem Analysis → Root Cause → Solution Design → Task Creation

<pre_flight_check>
EXECUTE: @.yoyo-dev/instructions/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" name="problem_identification">

### Step 1: Problem Identification

Gather complete information about the problem through systematic investigation.

<information_gathering>
<problem_description> - What is the observed issue? - What is the expected behavior? - When does it occur? - Who is affected?
</problem_description>
<reproduction_steps> - How to reproduce the issue - Required conditions - Frequency (always/intermittent)
</reproduction_steps>
<impact_assessment> - User impact (critical/high/medium/low) - Affected functionality - Workarounds available?
</impact_assessment>
</information_gathering>

<discovery_modes>
<mode_a>
<trigger>User provides detailed bug report</trigger>
<action>Accept information and proceed to investigation</action>
</mode_a>
<mode_b>
<trigger>User provides brief description</trigger>
<action>Ask 3-5 clarifying questions about reproduction and impact</action>
</mode_b>
<mode_c>
<trigger>User references error message or screenshot</trigger>
<action>Analyze provided evidence and ask targeted questions</action>
</mode_c>
</discovery_modes>

<instructions>
  ACTION: Understand the problem completely
  ASK: Clarifying questions if information incomplete
  GATHER: All relevant context (error messages, screenshots, logs)
  CONFIRM: Problem understanding with user
  PROCEED: Once problem is clearly defined
</instructions>

</step>

<step number="2" subagent="context-fetcher" name="code_investigation">

### Step 2: Code Investigation

Use the context-fetcher subagent to investigate the codebase and identify the root cause.

<investigation_approach>
<locate_code> - Find files related to the problem - Identify affected components/modules - Review recent changes (git log if relevant)
</locate_code>
<analyze_code> - Examine implementation - Check for obvious bugs - Review error handling - Identify edge cases
</analyze_code>
<trace_dependencies> - Follow data flow - Check related functions/components - Identify integration points
</trace_dependencies>
</investigation_approach>

<instructions>
  ACTION: Use context-fetcher to investigate relevant code
  REQUEST: "Find files related to [problem area]"
  REQUEST: "Get implementation of [suspected component]"
  ANALYZE: Code for root cause
  DOCUMENT: Findings for next step
</instructions>

</step>

<step number="3" name="root_cause_analysis">

### Step 3: Root Cause Analysis

Determine the underlying cause of the problem through systematic analysis.

<analysis_framework>
<technical_root_cause> - What code is causing the issue? - Why is it failing? - What assumptions were incorrect?
</technical_root_cause>
<contributing_factors> - Edge cases not handled - Missing validation - Race conditions - Incorrect logic - Performance bottlenecks - State management issues
</contributing_factors>
<verification> - Does the diagnosis explain all symptoms? - Are there related issues? - What are the implications?
</verification>
</analysis_framework>

<instructions>
  ACTION: Analyze investigation findings
  IDENTIFY: Root cause (not just symptoms)
  VERIFY: Diagnosis explains observed behavior
  DOCUMENT: Technical explanation
  PRESENT: Findings to user for confirmation
</instructions>

<user_confirmation_template>
**Problem Analysis**

**Root Cause**: [TECHNICAL_EXPLANATION]

**Why This Happens**: [DETAILED_EXPLANATION]

**Files Affected**:

- [FILE_PATH_1] ([COMPONENT_NAME])
- [FILE_PATH_2] ([COMPONENT_NAME])

**Proposed Solution**: [HIGH_LEVEL_APPROACH]

Does this analysis match your understanding of the problem?
</user_confirmation_template>

<decision_tree>
IF user confirms analysis:
PROCEED to step 4
ELSE IF user provides additional information:
RETURN to step 2 for more investigation
ELSE:
WAIT for user response
</decision_tree>

</step>

<step number="4" subagent="date-checker" name="date_determination">

### Step 4: Date Determination

Use the date-checker subagent to get current date in YYYY-MM-DD format for folder naming.

<instructions>
  ACTION: Use date-checker subagent
  OUTPUT: Current date in YYYY-MM-DD format
  STORE: For use in fix folder creation
</instructions>

</step>

<step number="5" subagent="file-creator" name="create_fix_folder">

### Step 5: Create Fix Documentation Structure

Use the file-creator subagent to create organized documentation for the fix.

<folder_structure>
<path>.yoyo-dev/fixes/YYYY-MM-DD-fix-name/</path>
<naming> - Use date from step 4 - Use kebab-case for fix name - Maximum 5 words - Descriptive of the issue
</naming>
</folder_structure>

<example_names>

- 2025-03-15-login-redirect-bug
- 2025-03-16-mobile-layout-fix
- 2025-03-17-api-timeout-issue
- 2025-03-18-memory-leak-dashboard
  </example_names>

<instructions>
  ACTION: Create .yoyo-dev/fixes/[YYYY-MM-DD-fix-name]/ directory
  CREATE: State tracking file
  PROCEED: To analysis documentation
</instructions>

<state_file_initialization>
<file_path>.yoyo-dev/fixes/YYYY-MM-DD-fix-name/state.json</file_path>
<initial_content>
{
"fix_name": "[FIX_NAME]",
"fix_created": "[CURRENT_DATE]",
"issue_type": "[bug|design|performance|other]",
"priority": "[critical|high|medium|low]",
"tasks_created": null,
"execution_started": null,
"execution_completed": null,
"current_phase": "analysis",
"completed_tasks": [],
"active_task": null,
"pr_url": null,
"affected_files": []
}
</initial_content>
<note>Branch field removed - fixes are committed to current active branch</note>
</state_file_initialization>

</step>

<step number="6" subagent="file-creator" name="create_analysis_document">

### Step 6: Create Analysis Document

Use the file-creator subagent to create comprehensive problem analysis documentation.

<file_template>
<file_path>.yoyo-dev/fixes/YYYY-MM-DD-fix-name/analysis.md</file_path>
</file_template>

<document_structure>

# Problem Analysis

> Fix: [FIX_NAME]
> Created: [CURRENT_DATE]
> Priority: [CRITICAL|HIGH|MEDIUM|LOW]

## Problem Description

[CLEAR_DESCRIPTION_OF_THE_ISSUE]

## Reproduction Steps

1. [STEP_1]
2. [STEP_2]
3. [STEP_3]

**Expected Behavior**: [WHAT_SHOULD_HAPPEN]
**Actual Behavior**: [WHAT_ACTUALLY_HAPPENS]

## Root Cause

[TECHNICAL_EXPLANATION_OF_WHY_ISSUE_OCCURS]

**Affected Files**:

- `[FILE_PATH_1]:[LINE_RANGE]` - [DESCRIPTION]
- `[FILE_PATH_2]:[LINE_RANGE]` - [DESCRIPTION]

## Impact Assessment

- **Severity**: [CRITICAL|HIGH|MEDIUM|LOW]
- **Affected Users**: [WHO_IS_IMPACTED]
- **Affected Functionality**: [WHAT_FEATURES_AFFECTED]
- **Workaround Available**: [YES/NO - DESCRIPTION]

## Solution Approach

[HIGH_LEVEL_DESCRIPTION_OF_FIX_STRATEGY]

**Implementation Steps**:

1. [STEP_1]
2. [STEP_2]
3. [STEP_3]

**Testing Strategy**:

- [TEST_APPROACH_1]
- [TEST_APPROACH_2]

**Risk Assessment**:

- **Breaking Changes**: [YES/NO - DETAILS]
- **Performance Impact**: [POSITIVE|NEUTRAL|NEGATIVE - DETAILS]
- **Side Effects**: [POTENTIAL_UNINTENDED_CONSEQUENCES]
  </document_structure>

<instructions>
  ACTION: Create analysis.md with complete problem analysis
  INCLUDE: All information from steps 1-3
  ADD: Solution approach and implementation strategy
  FORMAT: Use template structure above
  ENSURE: Technical accuracy and completeness
</instructions>

</step>

<step number="7" subagent="file-creator" name="create_solution_lite">

### Step 7: Create Solution Summary

Use the file-creator subagent to create condensed summary for AI context efficiency.

<file_template>
<file_path>.yoyo-dev/fixes/YYYY-MM-DD-fix-name/solution-lite.md</file_path>
</file_template>

<content_template>

# Fix Summary (Lite)

**Problem**: [ONE_SENTENCE_DESCRIPTION]

**Root Cause**: [ONE_SENTENCE_TECHNICAL_CAUSE]

**Solution**: [ONE_SENTENCE_FIX_APPROACH]

**Files to Modify**:

- [FILE_1] - [CHANGE_TYPE]
- [FILE_2] - [CHANGE_TYPE]
  </content_template>

<instructions>
  ACTION: Create solution-lite.md
  CONDENSE: Key information from analysis.md
  FOCUS: Problem, cause, solution, affected files
  LENGTH: Maximum 5-6 lines
</instructions>

</step>

<step number="8" name="user_solution_review">

### Step 8: User Solution Review

Present analysis and solution approach for user approval before task creation.

<review_request_template>
**Fix Analysis Complete**

**Documentation**:

- Full Analysis: @.yoyo-dev/fixes/[FIX_FOLDER]/analysis.md
- Quick Summary: @.yoyo-dev/fixes/[FIX_FOLDER]/solution-lite.md

**Problem**: [ONE_LINE_SUMMARY]
**Solution**: [ONE_LINE_APPROACH]

**Affected Files**: [FILE_COUNT] files need changes

Please review the analysis. Once approved, I'll create the task breakdown for implementation.

**Options**:

- "approved" or "looks good" → I'll create tasks
- Request different approach → I'll update the solution
- Need more investigation → I'll dig deeper
  </review_request_template>

<decision_tree>
IF user approves solution:
PROCEED to step 9
ELSE IF user requests different approach:
RETURN to step 3 for alternative solution
ELSE IF user requests more investigation:
RETURN to step 2 for deeper analysis
ELSE:
WAIT for user response
</decision_tree>

</step>

<step number="9" name="create_fix_tasks">

### Step 9: Create Fix Tasks

Generate task breakdown following TDD approach for systematic fix implementation.

<file_template>
<file_path>.yoyo-dev/fixes/YYYY-MM-DD-fix-name/tasks.md</file_path>
</file_template>

<task_structure>

# Fix Tasks Checklist

> Fix: [FIX_NAME]
> Created: [CURRENT_DATE]

## Task 1: Write Tests for Bug Reproduction

- [ ] Create test that reproduces the bug (should fail)
- [ ] Document expected vs actual behavior in test
- [ ] Verify test fails consistently

## Task 2: Implement Fix for [COMPONENT_NAME]

- [ ] [SPECIFIC_CODE_CHANGE_1]
- [ ] [SPECIFIC_CODE_CHANGE_2]
- [ ] [SPECIFIC_CODE_CHANGE_3]
- [ ] Verify reproduction test now passes

## Task 3: Add Regression Tests

- [ ] Write tests for edge cases
- [ ] Write tests for related functionality
- [ ] Verify all existing tests still pass
- [ ] Verify all new tests pass

[ADDITIONAL_TASKS_IF_NEEDED]

## Task N: Verification and Cleanup

- [ ] Run full test suite
- [ ] Manual testing of affected functionality
- [ ] Check for performance impact
- [ ] Update documentation if needed
- [ ] Verify fix resolves original issue
      </task_structure>

<task_creation_guidelines>
<parent_tasks> - Typically 2-4 parent tasks for fixes - First task: Always reproduction tests - Middle tasks: Implementation changes - Last task: Always verification
</parent_tasks>
<subtasks> - Maximum 8 per parent task - Specific and actionable - Include file paths and line ranges when possible - Always include test verification
</subtasks>
<tdd_approach> - Red: Write failing test - Green: Make test pass - Refactor: Clean up code - Verify: All tests pass
</tdd_approach>
</task_creation_guidelines>

<instructions>
  ACTION: Create tasks.md in fix folder
  STRUCTURE: Follow TDD approach (test first, then fix)
  ENSURE: Tasks are specific and actionable
  INCLUDE: Testing at each step
  VERIFY: Tasks cover complete fix implementation
</instructions>

<state_update>
<file>.yoyo-dev/fixes/[FIX_FOLDER]/state.json</file>
<updates> - tasks_created: [CURRENT_DATE] - current_phase: "ready_for_execution"
</updates>
</state_update>

</step>

<step number="10" name="execution_readiness">

### Step 10: Execution Readiness

Present task summary and confirm readiness to execute the fix.

<readiness_message_template>
**Fix Tasks Created**: @.yoyo-dev/fixes/[FIX_FOLDER]/tasks.md

**Task Summary**:

- Task 1: Reproduce bug with tests
- Task 2: Implement fix in [FILE_COUNT] file(s)
- Task 3: Add regression tests
- Task N: Verification

**Ready to execute?**

- Run `/execute-tasks` to start fixing
- Or review tasks first and then execute

**Note**: The fix will be implemented following TDD - tests first, then implementation, then verification.
</readiness_message_template>

</step>

</process_flow>

<post_flight_check>
EXECUTE: @.yoyo-dev/instructions/meta/post-flight.md
</post_flight_check>

## Summary

This command provides a systematic approach to bug fixes and issue resolution:

1. **Problem Identification**: Understand the issue completely
2. **Code Investigation**: Find and analyze the problematic code
3. **Root Cause Analysis**: Determine why it's failing
4. **Solution Design**: Plan the fix approach
5. **Documentation**: Create comprehensive analysis
6. **Task Creation**: Generate TDD-based task breakdown
7. **Readiness**: Prepare for execution

**Key Differences from /create-new**:

- Focus on problem analysis vs feature design
- Emphasis on root cause identification
- TDD approach with reproduction tests first
- Stored in `.yoyo-dev/fixes/` instead of `.yoyo-dev/specs/`
- Includes impact assessment and risk analysis

**Next Step**: User runs `/execute-tasks` to implement the fix.
