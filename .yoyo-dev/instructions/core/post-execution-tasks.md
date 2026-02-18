---
description: Rules to finish off and deliver to user set of tasks that have been completed using Yoyo Dev
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Task Execution Rules

## Overview

Follow these steps to mark your progress updates, create a recap, and deliver the final report to the user.

<pre_flight_check>
EXECUTE: @.yoyo-dev/instructions/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" subagent="test-runner" name="test_suite_verification">

### Step 1: Run All Tests

Use the test-runner subagent to run the ALL tests in the application's test suite to ensure no regressions and fix any failures until all tests pass.

<instructions>
  ACTION: Use test-runner subagent
  REQUEST: "Run the full test suite"
  WAIT: For test-runner analysis
  PROCESS: Fix any reported failures
  REPEAT: Until all tests pass
</instructions>

<test_execution>
<order> 1. Run entire test suite 2. Fix any failures
</order>
<requirement>100% pass rate</requirement>
</test_execution>

<failure_handling>
<action>troubleshoot and fix</action>
<priority>before proceeding</priority>
</failure_handling>

</step>

<step number="2" subagent="implementation-verifier" name="implementation_verification">

### Step 2: Implementation Quality Verification

Use the implementation-verifier subagent to run systematic quality verification before proceeding to git workflow.

<instructions>
  ACTION: Use implementation-verifier subagent
  REQUEST: "Run complete implementation verification for [SPEC_NAME]:
            - Spec folder: [SPEC_FOLDER_PATH]
            - Run all 6 verification workflows:
              * verify-functionality (features work as specified)
              * verify-tests (coverage and pass rate)
              * verify-accessibility (WCAG AA compliance)
              * verify-performance (no regressions)
              * verify-security (no vulnerabilities)
              * verify-documentation (docs current)
            - Create verification/final-verification.md report
            - STOP if critical issues found"

WAIT: For verification completion

PROCESS: Review verification results
IF critical_issues_found:
ERROR: "Critical issues detected in verification"
DISPLAY: Issues list
SUGGEST: "Fix issues and re-run verification before proceeding"
HALT: Do not proceed to git workflow
ELSE IF warnings_found:
WARN: "Warnings found but proceeding"
DISPLAY: Warnings list
CONTINUE: To next step
ELSE:
SUCCESS: "All verification checks passed ✓"
CONTINUE: To next step
</instructions>

<verification_categories>
<functionality>
<check>All features work as specified</check>
<check>All acceptance criteria met</check>
<check>Edge cases handled</check>
<severity>critical</severity>
</functionality>

  <tests>
    <check>All tests pass</check>
    <check>Coverage ≥ 50% (minimum)</check>
    <check>Edge cases tested</check>
    <severity>critical</severity>
  </tests>

  <accessibility>
    <check>WCAG AA compliance</check>
    <check>Color contrast ≥ 4.5:1</check>
    <check>Keyboard navigation works</check>
    <severity>high</severity>
  </accessibility>

  <performance>
    <check>No performance regressions</check>
    <check>Bundle size within budgets</check>
    <severity>medium</severity>
  </performance>

  <security>
    <check>No security vulnerabilities</check>
    <check>Auth/authz correct</check>
    <severity>critical</severity>
  </security>

  <documentation>
    <check>README updated</check>
    <check>API docs current</check>
    <severity>low</severity>
  </documentation>
</verification_categories>

<critical_issue_handling>
<action>HALT execution</action>
<display>Detailed issue report</display>
<require>User fixes before proceeding</require>
</critical_issue_handling>

</step>

<step number="3" subagent="git-workflow" name="git_workflow">

### Step 3: Git Workflow

Use the git-workflow subagent to create git commit, push to GitHub, and create pull request for the implemented features.

<instructions>
  ACTION: Use git-workflow subagent
  REQUEST: "Complete git workflow for [SPEC_NAME] feature:
            - Spec: [SPEC_FOLDER_PATH]
            - Changes: All modified files
            - Current branch: [CURRENT_BRANCH]
            - Description: [SUMMARY_OF_IMPLEMENTED_FEATURES]
            - Note: Commit to current branch, do not create/switch branches"
  WAIT: For workflow completion
  PROCESS: Save PR URL for summary
</instructions>

<commit_process>
<commit>
<message>descriptive summary of changes</message>
<format>conventional commits if applicable</format>
</commit>
<push>
<target>current active branch</target>
<remote>origin</remote>
</push>
<pull_request>
<title>descriptive PR title</title>
<description>functionality recap</description>
</pull_request>
</commit_process>

<note>
  Git workflow now commits to the current active branch.
  No branch creation or switching occurs during execution.
</note>

</step>

<step number="4" subagent="project-manager" name="tasks_list_check">

### Step 4: Tasks Completion Verification

Use the project-manager subagent to read the current spec's tasks.md file and verify that all tasks have been properly marked as complete with [x] or documented with blockers.

<instructions>
  ACTION: Use project-manager subagent
  REQUEST: "Verify that all tasks have been marked with their outcome:
            - Read [SPEC_FOLDER_PATH]/tasks.md
            - Check all tasks are marked complete with [x] or (in rare cases) a documented blocking issue."
  WAIT: For task verification analysis
  PROCESS: Update task status as needed
</instructions>

</step>

<step number="5" subagent="project-manager" name="roadmap_progress_check">

### Step 5: Roadmap Progress Update (conditional)

Use the project-manager subagent to read @.yoyo-dev/product/roadmap.md and mark roadmap items as complete with [x] ONLY IF the executed tasks have completed any roadmap item(s) and the spec completes that item.

<conditional_execution>
<preliminary_check>
EVALUATE: Did executed tasks complete any roadmap item(s)?
IF NO:
SKIP this entire step
PROCEED to step 6
IF YES:
CONTINUE with roadmap check
</preliminary_check>
</conditional_execution>

<roadmap_criteria>
<update_when> - spec fully implements roadmap feature - all related tasks completed - tests passing
</update_when>
</roadmap_criteria>

<instructions>
  ACTION: First evaluate if roadmap check is needed
      SKIP: If tasks clearly don't complete roadmap items
  EVALUATE: If current spec completes roadmap goals
  UPDATE: Mark roadmap items complete with [x] if applicable
</instructions>

</step>

<step number="6" subagent="project-manager" name="document_recap">

### Step 6: Create Recap Document

Use the project-manager subagent to create a recap document in .yoyo-dev/recaps/ folder that summarizes what was built for this spec.

<instructions>
  ACTION: Use project-manager subagent
  REQUEST: "Create recap document for current spec:
            - Create file: .yoyo-dev/recaps/[SPEC_FOLDER_NAME].md
            - Use template format with completed features summary
            - Include context from spec-lite.md
            - Document: [SPEC_FOLDER_PATH]"
  WAIT: For recap document creation
  PROCESS: Verify file is created with proper content
</instructions>

<recap_template>

# [yyyy-mm-dd] Recap: Feature Name

This recaps what was built for the spec documented at .yoyo-dev/specs/[spec-folder-name]/spec.md.

## Recap

[1 paragraph summary plus short bullet list of what was completed]

## Context

[Copy the summary found in spec-lite.md to provide concise context of what the initial goal for this spec was]
</recap_template>

<file_creation>
<location>.yoyo-dev/recaps/</location>
<naming>[SPEC_FOLDER_NAME].md</naming>
<format>markdown with yaml frontmatter if needed</format>
</file_creation>

<content_requirements>

  <summary>1 paragraph plus bullet points</summary>
  <context>from spec-lite.md summary</context>
  <reference>link to original spec</reference>
</content_requirements>

</step>

<step number="7" name="update_patterns_library">

### Step 7: Update Patterns Library

Review the implementation and extract successful patterns to add to the global patterns library.

<pattern_extraction>
<source_files> - context.md - Implementation patterns used - decisions.md - Technical choices made - Key implementation files
</source_files>
<patterns_to_capture> - Reusable architectural patterns - Successful authentication/security approaches - Effective form validation strategies - Data fetching and state management patterns - Performance optimizations that worked well - Testing strategies that were effective
</patterns_to_capture>
</pattern_extraction>

<pattern_template>

### [Pattern Name]

**Last Used:** [spec-name] ([date])
**Category:** [category]

**Use Case:** [When to apply this pattern]

**Implementation:**

- Key files: `[file paths]`
- Core approach: [description]
- Dependencies: [libraries/tools used]

**Why It Works:**
[Explanation of benefits and rationale]

**Gotchas:**

- [Known limitations or edge cases]
  </pattern_template>

<instructions>
  ACTION: Review context.md and decisions.md
  IDENTIFY: 1-2 reusable patterns from this implementation
  UPDATE: @.yoyo-dev/patterns/successful-approaches.md
  APPEND: New patterns under appropriate category
  SKIP: If no significant reusable patterns identified
</instructions>

</step>

<step number="8" name="finalize_state">

### Step 8: Finalize Workflow State

Update state.json to mark execution as complete and record PR information.

<state_finalization>
<file_path>.yoyo-dev/specs/[SPEC_FOLDER]/state.json</file_path>
<updates> - execution_completed: [CURRENT_DATE] - current_phase: "completed" - pr_url: [PR_URL_FROM_STEP_2] - active_task: null
</updates>
</state_finalization>

<instructions>
  ACTION: Read state.json
  UPDATE: Set execution_completed to current date
  UPDATE: Set current_phase to "completed"
  UPDATE: Set pr_url from git workflow step
  UPDATE: Set active_task to null
  SAVE: Final state
</instructions>

</step>

<step number="9" subagent="project-manager" name="completion_summary">

### Step 9: Completion Summary

Use the project-manager subagent to create a structured summary message with emojis showing what was done, any issues, testing instructions, and PR link.

<summary_template>

## ✅ What's been done

1. **[FEATURE_1]** - [ONE_SENTENCE_DESCRIPTION]
2. **[FEATURE_2]** - [ONE_SENTENCE_DESCRIPTION]

## ⚠️ Issues encountered

[ONLY_IF_APPLICABLE]

- **[ISSUE_1]** - [DESCRIPTION_AND_REASON]

## 👀 Ready to test in browser

[ONLY_IF_APPLICABLE]

1. [STEP_1_TO_TEST]
2. [STEP_2_TO_TEST]

## 📦 Pull Request

View PR: [GITHUB_PR_URL]
</summary_template>

<summary_sections>
<required> - functionality recap - pull request info
</required>
<conditional> - issues encountered (if any) - testing instructions (if testable in browser)
</conditional>
</summary_sections>

<instructions>
  ACTION: Create comprehensive summary
  INCLUDE: All required sections
  ADD: Conditional sections if applicable
  FORMAT: Use emoji headers for scannability
</instructions>

</step>

<step number="10" subagent="project-manager" name="completion_notification">

### Step 10: Task Completion Notification

Use the project-manager subagent to play a system sound to alert the user that tasks are complete.

<notification_command>
afplay /System/Library/Sounds/Glass.aiff
</notification_command>

<instructions>
  ACTION: Play completion sound
  PURPOSE: Alert user that task is complete
</instructions>

</step>

</process_flow>

<post_flight_check>
EXECUTE: @.yoyo-dev/instructions/meta/post-flight.md
</post_flight_check>
