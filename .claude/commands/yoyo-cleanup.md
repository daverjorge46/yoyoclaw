---
description: Professional project cleanup with safety validations (deprecated code, docs, files)
---

# Yoyo Cleanup - Project Maintenance

Professional project maintenance command with safety validations. Clean deprecated code, organize documentation, remove unused files/folders.

## Command

```bash
/yoyo-cleanup [--mode] [target]
```

## Modes

- `--scan` - **Scan only** (default) - Analyze project, report issues, no changes
- `--preview` - **Preview cleanup** - Show exact changes that would be made
- `--execute` - **Execute cleanup** - Apply changes with confirmation prompts
- `--docs` - **Documentation only** - Focus on organizing documentation
- `--code` - **Code only** - Focus on deprecated/unused code
- `--all` - **Full cleanup** - Run all cleanup phases

## Examples

```bash
# Scan project for cleanup opportunities (safe, no changes)
/yoyo-cleanup

# Preview what would be cleaned
/yoyo-cleanup --preview

# Execute cleanup with confirmations
/yoyo-cleanup --execute

# Focus on documentation organization
/yoyo-cleanup --docs

# Focus on deprecated code only
/yoyo-cleanup --code

# Full maintenance with all phases
/yoyo-cleanup --all --execute
```

## Cleanup Categories

### 1. Deprecated Code Detection

- Unused exports/imports
- Dead code paths
- Deprecated API usage
- TODO/FIXME/HACK comments older than 30 days
- Console.log statements in production code

### 2. File System Cleanup

- Empty directories
- Backup files (_.bak, _.orig, \*~)
- Cache directories (.cache, **pycache**, node_modules/.cache)
- Build artifacts that should be gitignored
- Duplicate files

### 3. Documentation Organization

- Outdated README sections
- Orphaned documentation (docs referencing deleted code)
- Duplicate documentation
- Missing documentation for public APIs
- Inconsistent doc formatting

### 4. Yoyo Dev Specific

- Old specs without recent activity
- Completed fixes that can be archived
- Stale recaps
- Outdated patterns
- Memory cleanup (old blocks)

## Safety Validations

**Before ANY changes:**

1. **Git Status Check** - Require clean working directory
2. **Backup Creation** - Optional backup of affected files
3. **Dry Run First** - Always show preview before execution
4. **Confirmation Prompts** - User approval for each category
5. **Rollback Info** - Git commands to undo if needed

## Output

### Scan Report

```
.yoyo-dev/cleanup/YYYY-MM-DD-scan-report.md
```

### Cleanup Log

```
.yoyo-dev/cleanup/YYYY-MM-DD-cleanup-log.md
```

## Integration

### With Review Command

```bash
/yoyo-review --quality → Identifies issues
  ↓
/yoyo-cleanup --preview → Shows what can be cleaned
  ↓
/yoyo-cleanup --execute → Applies cleanup
```

### With Git Workflow

```bash
git checkout -b cleanup/maintenance-YYYYMMDD
  ↓
/yoyo-cleanup --execute
  ↓
git add . && git commit
```

## Notes

- **Non-destructive by default** - Scan mode makes no changes
- **Requires explicit --execute** - Prevents accidental deletions
- **Per-category confirmation** - Approve each type of change
- **Git safety net** - All changes can be reverted
- **Backup option** - Create .cleanup-backup/ before changes

---

**Full instruction file:** `.yoyo-dev/instructions/core/yoyo-cleanup.md`
