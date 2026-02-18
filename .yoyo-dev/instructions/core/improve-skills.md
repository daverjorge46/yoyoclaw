---
description: Optimize Claude Code Skills for better discoverability
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Improve Skills Rules

## Overview

Optimize Claude Code Skills for better discoverability and triggering reliability.

**Use this when:**

- Skills aren't being triggered reliably
- Skill descriptions are unclear
- Want to standardize skill format
- Improving skill UX

<pre_flight_check>
CHECK: .claude/skills/ directory exists
CHECK: At least one .md file in skills directory
</pre_flight_check>

<process_flow>

<step number="1" name="scan_skills">

### Step 1: Scan Skills Directory

Find all skill files in .claude/skills/ directory.

<instructions>
  ACTION: List all .md files in .claude/skills/

IF directory not found:
ERROR: ".claude/skills/ directory not found"
SUGGEST: "Create skills directory or run this command from project root"
EXIT

IF no skills found:
ERROR: "No skill files found in .claude/skills/"
SUGGEST: "Add some skills first using Claude Code Skills feature"
EXIT

COUNT: Total skills found

DISPLAY: Skills found

\033[1m\033[36m╔═══════════════════════════════════════════════════════════╗\033[0m
\033[1m\033[36m║\033[0m 📚 SKILLS FOUND \033[1m\033[36m║\033[0m
\033[1m\033[36m╠═══════════════════════════════════════════════════════════╣\033[0m
\033[36m║\033[0m Total Skills: [N] \033[36m║\033[0m
\033[36m║\033[0m \033[36m║\033[0m
\033[36m║\033[0m Skills: \033[36m║\033[0m
\033[36m║\033[0m • [skill-1.md] \033[36m║\033[0m
\033[36m║\033[0m • [skill-2.md] \033[36m║\033[0m
\033[1m\033[36m╚═══════════════════════════════════════════════════════════╝\033[0m

ASK: "Optimize all skills or select specific ones? (all/select)"

IF user_chooses_select:
ASK: "Which skills? (comma-separated names or numbers)"
VALIDATE: Selection
STORE: selected_skills
ELSE:
STORE: selected_skills = all_skills
</instructions>

</step>

<step number="2" name="analyze_skills">

### Step 2: Analyze Each Skill

Review current skill descriptions and identify improvement opportunities.

<instructions>
  FOR each skill in selected_skills:

    READ: Skill file content

    ANALYZE:
      - Does it have clear description?
      - Does it have "When to use this skill" section?
      - Are triggering keywords clear?
      - Is the description concise?
      - Does it follow consistent format?

    IDENTIFY: Improvement opportunities
      - Missing sections
      - Unclear language
      - Lack of examples
      - Poor keyword choices
      - Inconsistent formatting

    STORE: analysis_results[skill] = {
      current_description: "...",
      has_when_section: true/false,
      clarity_score: 1-10,
      improvements_needed: [...]
    }

</instructions>

</step>

<step number="3" name="optimize_skills">

### Step 3: Generate Optimized Versions

Create improved versions of each skill.

<instructions>
  FOR each skill in selected_skills:

    OPTIMIZE: Skill description
      - Make first sentence clear and concise
      - Focus on what the skill does
      - Use action verbs
      - Remove unnecessary words

    ADD: "When to use this skill" section if missing
      - List 3-5 specific use cases
      - Make triggering scenarios clear
      - Help users know when to invoke

    ENHANCE: Triggering keywords
      - Identify key terms that should trigger the skill
      - Add synonyms and variations
      - Make keywords prominent in description

    IMPROVE: Format and structure
      - Consistent heading levels
      - Clear sections
      - Good examples
      - Actionable instructions

    STORE: optimized_skills[skill] = {
      original: original_content,
      optimized: optimized_content,
      changes: [list_of_changes]
    }

</instructions>

</step>

<step number="4" name="preview_changes">

### Step 4: Preview Changes for User Approval

Show before/after comparison for each skill.

<instructions>
  FOR each skill in optimized_skills:

    DISPLAY: Comparison

    \033[1m\033[34m┌─ SKILL: [NAME] ────────────────────────────────┐\033[0m
    \033[34m│\033[0m                                                    \033[34m│\033[0m
    \033[34m│\033[0m  \033[1mBEFORE:\033[0m                                         \033[34m│\033[0m
    \033[34m│\033[0m  [First 100 chars of original]...                \033[34m│\033[0m
    \033[34m│\033[0m                                                    \033[34m│\033[0m
    \033[34m│\033[0m  \033[1mAFTER:\033[0m                                          \033[34m│\033[0m
    \033[34m│\033[0m  [First 100 chars of optimized]...               \033[34m│\033[0m
    \033[34m│\033[0m                                                    \033[34m│\033[0m
    \033[34m│\033[0m  \033[32m✓\033[0m Improvements:                                \033[34m│\033[0m
    \033[34m│\033[0m    • Added "When to use" section                 \033[34m│\033[0m
    \033[34m│\033[0m    • Clearer description                         \033[34m│\033[0m
    \033[34m│\033[0m    • Better keywords                             \033[34m│\033[0m
    \033[1m\033[34m└────────────────────────────────────────────────┘\033[0m

    ASK: "Apply this optimization? (Y/n/view-full)"

    IF user_says_view_full:
      DISPLAY: Full before/after content side-by-side
      ASK: "Apply this optimization? (Y/n)"

    RECORD: user_approval[skill] = yes/no

</instructions>

</step>

<step number="5" name="apply_changes">

### Step 5: Apply Approved Changes

Update skill files with approved optimizations.

<instructions>
  FOR each skill in optimized_skills:

    IF user_approval[skill] == yes:

      BACKUP: Original skill file (optional)
        # In case user wants to revert

      WRITE: Optimized content to skill file

      LOG: Change applied

      OUTPUT: \033[32m✓ Updated: [skill-name].md\033[0m

    ELSE:
      LOG: Change skipped

      OUTPUT: \033[33m○ Skipped: [skill-name].md\033[0m

COUNT: skills_updated

DISPLAY: Summary

\033[1m\033[32m╔═══════════════════════════════════════════════════════════╗\033[0m
\033[1m\033[32m║\033[0m ✅ SKILLS OPTIMIZATION COMPLETE \033[1m\033[32m║\033[0m
\033[1m\033[32m╠═══════════════════════════════════════════════════════════╣\033[0m
\033[32m║\033[0m Skills Analyzed: [N] \033[32m║\033[0m
\033[32m║\033[0m Skills Updated: [M] \033[32m║\033[0m
\033[32m║\033[0m Skills Skipped: [K] \033[32m║\033[0m
\033[1m\033[32m╚═══════════════════════════════════════════════════════════╝\033[0m
</instructions>

</step>

<step number="6" name="create_report">

### Step 6: Create Optimization Report

Generate detailed report of all optimizations.

<instructions>
  CREATE: .claude/skills/optimization-report-[DATE].md

TEMPLATE: # Skills Optimization Report

    **Date:** [DATE]
    **Skills Analyzed:** [N]
    **Skills Optimized:** [M]

    ---

    ## Summary

    This report details the optimizations applied to Claude Code Skills
    for improved discoverability and triggering reliability.

    ---

    ## Skills Optimized

    ### [skill-name].md

    **Status:** ✅ Updated

    **Changes Applied:**
    - Added "When to use this skill" section
    - Improved description clarity
    - Enhanced triggering keywords
    - Better formatting

    **Before:**
    ```
    [Original description]
    ```

    **After:**
    ```
    [Optimized description]
    ```

    **Improvements:**
    - Clearer action-oriented description
    - 4 specific use cases added
    - Better keyword prominence

    ---

    ### [next-skill].md

    [... repeat for each skill ...]

    ---

    ## Skills Skipped

    [List any skipped skills and why]

    ---

    ## Recommendations

    **General:**
    - Review skill triggering after optimization
    - Test skills with common user queries
    - Update skills periodically as needs change

    **Specific:**
    [Any skill-specific recommendations]

    ---

    ## Next Steps

    1. Test optimized skills in Claude Code
    2. Monitor skill triggering reliability
    3. Gather user feedback
    4. Re-run optimization periodically

DISPLAY: Report created

\033[1m\033[36m📄 Optimization Report\033[0m
Path: .claude/skills/optimization-report-[DATE].md
</instructions>

</step>

</process_flow>

<post_flight_check>
CHECK: Approved skills were updated successfully
CHECK: Optimization report created
CHECK: All skill files are valid markdown
</post_flight_check>

## Skill Optimization Guidelines

### Good Skill Description

**Before:**
"This skill helps with databases"

**After:**
"Design and create database schemas with proper indexes, migrations, and type safety."

### Good "When to Use" Section

```markdown
## When to use this skill

Use this skill when:

- Creating new database tables or schemas
- Adding indexes for query optimization
- Designing data models for features
- Writing database migrations
- Need help with foreign keys and relationships
```

### Good Triggering Keywords

Prominently feature keywords that should trigger the skill:

- "database schema"
- "create table"
- "migrations"
- "indexes"
- "data model"

## Notes

- Skills are optimized in-place (original content replaced)
- Preview before applying ensures user control
- Optimization report documents all changes
- Can be run multiple times as skills evolve
- Safe to skip any skills during preview
