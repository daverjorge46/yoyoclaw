---
description: Rules for professional project cleanup with safety validations
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Yoyo Cleanup - Project Maintenance Rules

## Overview

Professional project maintenance command that cleans deprecated code, organizes documentation, removes unused files/folders, and maintains Yoyo Dev project hygiene. **Safety-first approach** with multiple validation gates.

**Core Principle**: Never delete without explicit user confirmation. Default mode is scan-only.

## Formatting Guidelines

This command uses rich terminal formatting for professional output. Reference `@.yoyo-dev/standards/formatting-helpers.md` for templates.

**Required formatting:**

- Command header (T1)
- Phase progress indicators (T2)
- Warning messages for deletions (T5)
- Critical alerts for risky operations (T6)
- File tree for changes (T11)
- Completion summary (T12)

<pre_flight_check>
EXECUTE: @.yoyo-dev/instructions/meta/pre-flight.md

OUTPUT: Command header

\033[1m\033[36m┌────────────────────────────────────────────────┐\033[0m
\033[1m\033[36m│\033[0m 🧹 \033[1mYOYO DEV - PROJECT CLEANUP\033[0m \033[1m\033[36m│\033[0m
\033[1m\033[36m│\033[0m ──────────────────────────────────────────── \033[1m\033[36m│\033[0m
\033[1m\033[36m│\033[0m \033[2mProfessional maintenance with safety checks\033[0m \033[1m\033[36m│\033[0m
\033[1m\033[36m└────────────────────────────────────────────────┘\033[0m

PARSE: Command arguments
--scan (default): Analyze only, no changes
--preview: Show exact planned changes
--execute: Apply changes with confirmations
--docs: Documentation cleanup only
--code: Code cleanup only
--all: Full cleanup (all categories)
--no-backup: Skip backup creation (risky)

</pre_flight_check>

<process_flow>

<step number="1" name="safety_gate">

### Step 1: Safety Gate

Perform mandatory safety checks before any analysis or cleanup.

<safety_checks>
<check name="git_status">
<command>git status --porcelain</command>
<pass_condition>Empty output (clean working directory)</pass_condition>
<fail_action>
IF --execute mode:
WARN: "Working directory has uncommitted changes"
ASK: "Proceed anyway? Changes will mix with cleanup."
IF user declines:
EXIT with instructions to commit or stash
ELSE:
CONTINUE with warning note in report
</fail_action>
</check>

  <check name="git_repo">
    <command>git rev-parse --git-dir 2>/dev/null</command>
    <pass_condition>Returns .git path</pass_condition>
    <fail_action>
      WARN: "Not a git repository - no rollback available"
      IF --execute mode:
        ASK: "Continue without git safety net?"
        IF user declines:
          EXIT
    </fail_action>
  </check>

  <check name="yoyo_initialized">
    <condition>Directory .yoyo-dev/ exists</condition>
    <fail_action>
      ERROR: "Yoyo Dev not initialized"
      SUGGEST: "Run /yoyo-init first"
      EXIT
    </fail_action>
  </check>
</safety_checks>

<safety_output>
IF all checks pass:
OUTPUT:
\033[32m✓\033[0m Git status: Clean working directory
\033[32m✓\033[0m Git repo: Safety net available
\033[32m✓\033[0m Yoyo Dev: Initialized

IF any warning:
OUTPUT:
\033[33m⚠\033[0m {Warning message}
</safety_output>

</step>

<step number="2" name="project_scan">

### Step 2: Project Scan

Analyze project for cleanup opportunities across all categories.

<scan_categories>

  <category name="deprecated_code" enabled="--code OR --all OR default">
    <title>Deprecated Code Detection</title>
    <checks>
      <check>
        <name>Unused imports</name>
        <method>Static analysis via grep/AST patterns</method>
        <patterns>
          - TypeScript: imported but not used
          - Python: imported but not referenced
          - JavaScript: require/import not used
        </patterns>
      </check>
      <check>
        <name>Dead exports</name>
        <method>Find exports not imported anywhere</method>
      </check>
      <check>
        <name>Deprecated markers</name>
        <method>Find @deprecated, DEPRECATED comments</method>
      </check>
      <check>
        <name>Old TODOs</name>
        <method>TODO/FIXME/HACK with dates > 90 days</method>
      </check>
      <check>
        <name>Console statements</name>
        <method>console.log/debug/warn in non-test files</method>
        <exclude>Test files, development configs</exclude>
      </check>
      <check>
        <name>Commented code blocks</name>
        <method>Large blocks of commented code (> 10 lines)</method>
      </check>
    </checks>
  </category>

  <category name="file_system" enabled="--all OR default">
    <title>File System Cleanup</title>
    <checks>
      <check>
        <name>Empty directories</name>
        <method>find . -type d -empty</method>
        <exclude>.git, node_modules, .yoyo-dev/specs (may have empty sub-specs)</exclude>
      </check>
      <check>
        <name>Backup files</name>
        <patterns>*.bak, *.orig, *~, *.swp, .*.swp</patterns>
      </check>
      <check>
        <name>Cache directories</name>
        <patterns>.cache, __pycache__, .pytest_cache, .mypy_cache</patterns>
        <exclude>If in .gitignore, just report</exclude>
      </check>
      <check>
        <name>Build artifacts</name>
        <patterns>dist/, build/, out/, .next/</patterns>
        <action>Report if not in .gitignore</action>
      </check>
      <check>
        <name>Duplicate files</name>
        <method>Find files with identical content (by hash)</method>
        <threshold>Files > 1KB</threshold>
      </check>
      <check>
        <name>Large files</name>
        <threshold>> 10MB not in .gitignore</threshold>
        <action>Report for review</action>
      </check>
    </checks>
  </category>

  <category name="documentation" enabled="--docs OR --all OR default">
    <title>Documentation Organization</title>
    <checks>
      <check>
        <name>Orphaned docs</name>
        <method>Docs referencing files that don't exist</method>
      </check>
      <check>
        <name>Broken links</name>
        <method>Internal markdown links that 404</method>
      </check>
      <check>
        <name>Duplicate docs</name>
        <method>Files with > 80% content similarity</method>
      </check>
      <check>
        <name>Outdated sections</name>
        <patterns>
          - "Coming soon" sections
          - References to removed features
          - Old version numbers
        </patterns>
      </check>
      <check>
        <name>Missing docs</name>
        <method>Public APIs without JSDoc/docstrings</method>
        <action>Report only (don't auto-generate)</action>
      </check>
    </checks>
  </category>

  <category name="yoyo_specific" enabled="--all OR default">
    <title>Yoyo Dev Maintenance</title>
    <checks>
      <check>
        <name>Stale specs</name>
        <criteria>
          - state.json shows "abandoned" or "paused" > 30 days
          - No activity in 60+ days
          - status: "draft" for > 30 days
        </criteria>
        <action>Suggest archiving, not deletion</action>
      </check>
      <check>
        <name>Completed fixes</name>
        <criteria>
          - state.json shows "completed"
          - Older than 30 days
          - Associated PR merged
        </criteria>
        <action>Suggest archiving to .yoyo-dev/archive/fixes/</action>
      </check>
      <check>
        <name>Old recaps</name>
        <criteria>Recaps older than 90 days</criteria>
        <action>Suggest archiving</action>
      </check>
      <check>
        <name>Unused patterns</name>
        <method>Patterns not referenced in any spec/task</method>
        <action>Report for review</action>
      </check>
      <check>
        <name>Memory cleanup</name>
        <criteria>
          - Memory blocks older than 180 days
          - Blocks with type "corrections" that haven't been accessed
        </criteria>
        <action>Suggest pruning</action>
      </check>
    </checks>
  </category>

</scan_categories>

<scan_output>
FOR each category:
OUTPUT: Category header
\033[1m\033[34m┌─ {CATEGORY_ICON} {CATEGORY_NAME} ──────────────────────────┐\033[0m

    FOR each finding:
      OUTPUT: Finding with severity
      \033[34m│\033[0m  {SEVERITY_ICON} {finding_description}                    \033[34m│\033[0m
      \033[34m│\033[0m    └─ {file_path}:{line_number}                          \033[34m│\033[0m

    OUTPUT: Category footer with count
    \033[1m\033[34m└────────────────────────────────────────────────────────────┘\033[0m
    Found: {count} issues

SEVERITY_ICONS:
🔴 Critical (should fix)
🟠 Warning (recommended)
🟡 Info (optional)
⚪ Low (cosmetic)
</scan_output>

</step>

<step number="3" name="report_generation">

### Step 3: Report Generation

Generate comprehensive cleanup report.

<report_structure>
CREATE: .yoyo-dev/cleanup/ directory (if not exists)

CREATE: .yoyo-dev/cleanup/YYYY-MM-DD-scan-report.md

CONTENT: # Cleanup Scan Report

    > Generated: {timestamp}
    > Mode: {scan|preview|execute}
    > Scope: {docs|code|all|default}

    ## Summary

    | Category | Critical | Warning | Info | Total |
    |----------|----------|---------|------|-------|
    | Code     | X        | Y       | Z    | N     |
    | Files    | X        | Y       | Z    | N     |
    | Docs     | X        | Y       | Z    | N     |
    | Yoyo     | X        | Y       | Z    | N     |
    | **Total**| **X**    | **Y**   | **Z**| **N** |

    ## Detailed Findings

    ### Deprecated Code
    {detailed_list_with_file_paths}

    ### File System
    {detailed_list}

    ### Documentation
    {detailed_list}

    ### Yoyo Dev
    {detailed_list}

    ## Recommended Actions

    1. {prioritized_action_1}
    2. {prioritized_action_2}
    ...

    ## Commands

    ```bash
    # Preview specific fixes
    /yoyo-cleanup --preview

    # Execute cleanup
    /yoyo-cleanup --execute
    ```

</report_structure>

<instructions>
  IF mode == --scan:
    OUTPUT: Report path
    OUTPUT: Summary statistics
    OUTPUT: "Run /yoyo-cleanup --preview to see planned changes"
    EXIT

ELSE:
CONTINUE to step 4
</instructions>

</step>

<step number="4" name="cleanup_preview" condition="mode == --preview OR mode == --execute">

### Step 4: Cleanup Preview

Show exact changes that would be made.

<preview_format>
OUTPUT: Preview header

\033[1m\033[33m┌─ ⚠ CLEANUP PREVIEW ────────────────────────────┐\033[0m
\033[33m│\033[0m \033[33m│\033[0m
\033[33m│\033[0m The following changes will be made: \033[33m│\033[0m
\033[33m│\033[0m \033[33m│\033[0m
\033[1m\033[33m└────────────────────────────────────────────────┘\033[0m

FOR each action_category:
OUTPUT: Action category header

    \033[1m\033[34m┌─ 📝 {CATEGORY} CHANGES ────────────────────────┐\033[0m
    \033[34m│\033[0m                                                \033[34m│\033[0m

    FOR each action:
      OUTPUT: Action with icon

      IF action == DELETE:
        \033[34m│\033[0m  \033[31m✗ DELETE\033[0m  {path}                          \033[34m│\033[0m

      IF action == MOVE:
        \033[34m│\033[0m  \033[33m→ MOVE\033[0m    {from} → {to}                   \033[34m│\033[0m

      IF action == MODIFY:
        \033[34m│\033[0m  \033[33m✎ MODIFY\033[0m  {path} ({description})          \033[34m│\033[0m

      IF action == ARCHIVE:
        \033[34m│\033[0m  \033[36m📦 ARCHIVE\033[0m {path}                         \033[34m│\033[0m

    \033[34m│\033[0m                                                \033[34m│\033[0m
    \033[1m\033[34m└────────────────────────────────────────────────┘\033[0m

OUTPUT: Summary counts
Files to delete: {N}
Files to move: {N}
Files to modify: {N}
Files to archive: {N}
Total changes: {N}

</preview_format>

<instructions>
  IF mode == --preview:
    OUTPUT: "Run /yoyo-cleanup --execute to apply these changes"
    EXIT

ELSE IF mode == --execute:
CONTINUE to step 5
</instructions>

</step>

<step number="5" name="backup_creation" condition="mode == --execute AND NOT --no-backup">

### Step 5: Backup Creation

Create safety backup before making changes.

<backup_process>
CREATE: .cleanup-backup-YYYYMMDD-HHMMSS/ directory

FOR each file to be deleted or modified:
COPY: file to backup directory (preserving structure)

OUTPUT: Backup confirmation

\033[32m✓\033[0m Backup created: .cleanup-backup-{timestamp}/
\033[90m Contains {N} files ({size})\033[0m
\033[90m To restore: cp -r .cleanup-backup-{timestamp}/\* .\033[0m

</backup_process>

<skip_condition>
IF --no-backup flag:
OUTPUT: Warning

    \033[1m\033[33m┌─ ⚠ NO BACKUP ──────────────────────────────────┐\033[0m
    \033[33m│\033[0m                                                \033[33m│\033[0m
    \033[33m│\033[0m  --no-backup specified. Changes are permanent  \033[33m│\033[0m
    \033[33m│\033[0m  unless you have git to rollback.              \033[33m│\033[0m
    \033[33m│\033[0m                                                \033[33m│\033[0m
    \033[1m\033[33m└────────────────────────────────────────────────┘\033[0m

    ASK: "Continue without backup? (y/N)"
    IF user declines:
      EXIT

</skip_condition>

</step>

<step number="6" name="execute_cleanup" condition="mode == --execute">

### Step 6: Execute Cleanup

Apply changes with per-category confirmation.

<execution_process>

FOR each category WITH changes:

    OUTPUT: Category confirmation prompt

    \033[1m\033[35m┌─ 💡 {CATEGORY} CLEANUP ────────────────────────┐\033[0m
    \033[35m│\033[0m                                                \033[35m│\033[0m
    \033[35m│\033[0m  {N} changes in this category:                \033[35m│\033[0m
    \033[35m│\033[0m                                                \033[35m│\033[0m
    \033[35m│\033[0m  • {change_1_summary}                         \033[35m│\033[0m
    \033[35m│\033[0m  • {change_2_summary}                         \033[35m│\033[0m
    \033[35m│\033[0m  • ... ({remaining} more)                     \033[35m│\033[0m
    \033[35m│\033[0m                                                \033[35m│\033[0m
    \033[35m│\033[0m  \033[1m[Y]\033[0m Apply these changes                      \033[35m│\033[0m
    \033[35m│\033[0m  \033[1m[N]\033[0m Skip this category                       \033[35m│\033[0m
    \033[35m│\033[0m  \033[1m[D]\033[0m Show details                             \033[35m│\033[0m
    \033[35m│\033[0m  \033[1m[Q]\033[0m Quit cleanup                             \033[35m│\033[0m
    \033[35m│\033[0m                                                \033[35m│\033[0m
    \033[1m\033[35m└────────────────────────────────────────────────┘\033[0m

    \033[1m>\033[0m Choice: _

    IF user chooses Y:
      EXECUTE: Apply changes for this category
      LOG: Changes to cleanup log
      OUTPUT: Progress

      Applying {category}... \033[32m████████████████████\033[0m 100%  ({applied}/{total})

    IF user chooses N:
      SKIP: This category
      LOG: "Skipped by user"

    IF user chooses D:
      SHOW: Detailed list of changes
      RETURN to confirmation prompt

    IF user chooses Q:
      OUTPUT: "Cleanup aborted by user"
      SHOW: Summary of changes made so far
      EXIT

</execution_process>

<deletion_safeguards>
NEVER delete without confirmation: - .env files (even if detected as unused) - Files in .git/ - Files in node_modules/ (just report) - Files matching .gitignore patterns - Files modified in last 24 hours - Files with "DO NOT DELETE" comments

EXTRA confirmation for: - Directories with > 10 files - Files > 1MB - Spec folders (even stale ones) - Anything in src/ or lib/ directories
</deletion_safeguards>

</step>

<step number="7" name="cleanup_log">

### Step 7: Cleanup Log

Document all changes made during cleanup.

<log_structure>
CREATE/APPEND: .yoyo-dev/cleanup/YYYY-MM-DD-cleanup-log.md

CONTENT: # Cleanup Log - {date}

    > Executed: {timestamp}
    > Mode: {mode}
    > Operator: {git user.name or "unknown"}

    ## Changes Applied

    ### Deleted ({N} items)
    | Path | Size | Reason |
    |------|------|--------|
    | {path} | {size} | {reason} |

    ### Moved/Archived ({N} items)
    | From | To | Reason |
    |------|-----|--------|
    | {from} | {to} | {reason} |

    ### Modified ({N} items)
    | Path | Change | Details |
    |------|--------|---------|
    | {path} | {change_type} | {details} |

    ## Skipped

    - {category}: Skipped by user
    - {item}: {reason}

    ## Rollback

    ```bash
    # Restore from backup
    cp -r .cleanup-backup-{timestamp}/* .

    # Or via git
    git checkout -- .
    git clean -fd
    ```

</log_structure>

</step>

<step number="8" name="completion_summary">

### Step 8: Completion Summary

Present final summary of cleanup results.

<summary_output>
IF changes were made:

    \033[1m\033[42m\033[30m╔═══════════════════════════════════════════════════════════╗\033[0m
    \033[1m\033[42m\033[30m║  ✓ CLEANUP COMPLETED                                      ║\033[0m
    \033[1m\033[42m\033[30m╠═══════════════════════════════════════════════════════════╣\033[0m
    \033[42m\033[30m║                                                           ║\033[0m
    \033[42m\033[30m║  Deleted:   {N} files ({size} freed)                      ║\033[0m
    \033[42m\033[30m║  Archived:  {N} items                                     ║\033[0m
    \033[42m\033[30m║  Modified:  {N} files                                     ║\033[0m
    \033[42m\033[30m║  Skipped:   {N} categories                                ║\033[0m
    \033[42m\033[30m║                                                           ║\033[0m
    \033[1m\033[42m\033[30m╠═══════════════════════════════════════════════════════════╣\033[0m
    \033[1m\033[42m\033[30m║  📋 LOGS                                                  ║\033[0m
    \033[1m\033[42m\033[30m╠═══════════════════════════════════════════════════════════╣\033[0m
    \033[42m\033[30m║                                                           ║\033[0m
    \033[42m\033[30m║  Report: .yoyo-dev/cleanup/{report_file}                  ║\033[0m
    \033[42m\033[30m║  Log:    .yoyo-dev/cleanup/{log_file}                     ║\033[0m
    \033[42m\033[30m║  Backup: .cleanup-backup-{timestamp}/                     ║\033[0m
    \033[42m\033[30m║                                                           ║\033[0m
    \033[1m\033[42m\033[30m╠═══════════════════════════════════════════════════════════╣\033[0m
    \033[1m\033[42m\033[30m║  🚀 NEXT STEPS                                            ║\033[0m
    \033[1m\033[42m\033[30m╠═══════════════════════════════════════════════════════════╣\033[0m
    \033[42m\033[30m║                                                           ║\033[0m
    \033[42m\033[30m║  → Review changes: git status                             ║\033[0m
    \033[42m\033[30m║  → Commit: git add . && git commit -m "chore: cleanup"    ║\033[0m
    \033[42m\033[30m║  → Remove backup: rm -rf .cleanup-backup-{timestamp}/     ║\033[0m
    \033[42m\033[30m║                                                           ║\033[0m
    \033[1m\033[42m\033[30m╚═══════════════════════════════════════════════════════════╝\033[0m

IF scan only (no changes):

    \033[1m\033[36m╔═══════════════════════════════════════════════════════════╗\033[0m
    \033[1m\033[36m║  📊 SCAN COMPLETE                                         ║\033[0m
    \033[1m\033[36m╠═══════════════════════════════════════════════════════════╣\033[0m
    \033[36m║                                                           ║\033[0m
    \033[36m║  Found: {total} cleanup opportunities                     ║\033[0m
    \033[36m║                                                           ║\033[0m
    \033[36m║  • Critical: {N}                                          ║\033[0m
    \033[36m║  • Warning:  {N}                                          ║\033[0m
    \033[36m║  • Info:     {N}                                          ║\033[0m
    \033[36m║                                                           ║\033[0m
    \033[36m║  Report: .yoyo-dev/cleanup/{report_file}                  ║\033[0m
    \033[36m║                                                           ║\033[0m
    \033[1m\033[36m╠═══════════════════════════════════════════════════════════╣\033[0m
    \033[1m\033[36m║  🚀 NEXT STEPS                                            ║\033[0m
    \033[1m\033[36m╠═══════════════════════════════════════════════════════════╣\033[0m
    \033[36m║                                                           ║\033[0m
    \033[36m║  → Preview: /yoyo-cleanup --preview                       ║\033[0m
    \033[36m║  → Execute: /yoyo-cleanup --execute                       ║\033[0m
    \033[36m║                                                           ║\033[0m
    \033[1m\033[36m╚═══════════════════════════════════════════════════════════╝\033[0m

</summary_output>

</step>

</process_flow>

<post_flight_check>
EXECUTE: @.yoyo-dev/instructions/meta/post-flight.md
</post_flight_check>

## Error Handling

<error_handling>
IF permission denied:
OUTPUT: Error with sudo suggestion (if appropriate)
LOG: Error to cleanup log
CONTINUE with other files

IF file locked:
OUTPUT: Warning about locked file
SKIP: That file
CONTINUE

IF disk full during backup:
OUTPUT: Critical error
SUGGEST: "Run with --no-backup or free disk space"
EXIT

IF any unexpected error:
OUTPUT: Error message
ROLLBACK: Any partial changes in current category
ASK: "Continue with remaining categories?"
</error_handling>

## Archive Structure

<archive_structure>
ARCHIVE location: .yoyo-dev/archive/

Structure:
.yoyo-dev/archive/
├── specs/ # Archived specifications
│ └── YYYY-MM-DD-name/
├── fixes/ # Archived fixes
│ └── YYYY-MM-DD-name/
├── recaps/ # Archived recaps
│ └── YYYY-MM-DD-name.md
└── patterns/ # Archived patterns
└── pattern-name.md

ARCHIVE metadata:
Each archived item gets a .archive-info.json:
{
"archived_date": "YYYY-MM-DD",
"reason": "stale|completed|superseded",
"original_path": "path/to/original",
"archived_by": "yoyo-cleanup"
}
</archive_structure>

## Sensitive Path Protection

<protected_paths>
NEVER touch (even with --all --execute): - .git/ - .env* (report only) - \*\*/credentials* - **/secrets\* - **/_password_ - **/_token_ - **/*key.pem - \*\*/*key.json - node_modules/ (report only) - .yoyo-dev/product/ (core product docs) - .yoyo-dev/memory/memory.db (active memory)

REQUIRE extra confirmation: - .yoyo-dev/specs/ (even stale) - src/ or lib/ directories - package.json, tsconfig.json, etc. - Any file > 1MB
</protected_paths>

## Summary

This command provides safe, professional project maintenance:

1. **Safety First**: Multiple validation gates, never delete without confirmation
2. **Progressive Disclosure**: Scan → Preview → Execute flow
3. **Per-Category Control**: User approves each category separately
4. **Full Audit Trail**: Detailed logs and backup
5. **Easy Rollback**: Git-friendly with backup option
6. **Smart Detection**: Finds real issues, not false positives
7. **Archive Support**: Move stale items rather than delete

**Default behavior**: Scan only (no changes made)
