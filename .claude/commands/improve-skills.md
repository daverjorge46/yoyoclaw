---
description: Optimize Claude Code skill descriptions for better triggering
---

# Improve Skills

Optimize Claude Code Skills for better discoverability and triggering.

Refer to the instructions located in this file:
@instructions/core/improve-skills.md

## When to Use

Use `/improve-skills` when:

- Claude Code Skills aren't being triggered reliably
- Skill descriptions are unclear or outdated
- Want to add "When to use this skill" sections
- Improving skill discoverability for better UX

## What It Does

1. **Scan Skills** - Find all .md files in `.claude/skills/`
2. **Analyze** - Review current skill descriptions for clarity
3. **Optimize** - Rewrite descriptions for better discoverability
4. **Enhance** - Add "When to use this skill" sections
5. **Preview** - Show before/after comparison
6. **Apply** - Update approved skills
7. **Report** - Generate optimization report

## Example

```bash
/improve-skills

# The command will:
# 1. Scan .claude/skills/ directory
# 2. Analyze each skill description
# 3. Generate optimized versions
# 4. Show you before/after for each skill
# 5. Ask for approval
# 6. Apply approved changes
# 7. Create optimization report
```

## Benefits

- **Better Discoverability** - Skills are easier to find and trigger
- **Clearer Descriptions** - Users understand what each skill does
- **Improved Triggering** - Better keywords for automatic activation
- **Consistent Format** - All skills follow same structure
