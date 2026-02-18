---
description: Initialize Yoyo Dev in current project (framework + memory system)
---

# Initialize Yoyo Dev Framework

This command initializes the complete Yoyo Dev system in the current project.

## Step 1: Check Current State

Run these checks:

```bash
# Check if .yoyo-dev already exists
ls -la .yoyo-dev/ 2>/dev/null && echo "YOYO_DEV_EXISTS" || echo "YOYO_DEV_NOT_EXISTS"

# Check if memory system exists (new location in .yoyo-dev/)
ls -la .yoyo-dev/memory/memory.db 2>/dev/null && echo "MEMORY_EXISTS" || echo "MEMORY_NOT_EXISTS"

# Check for OLD .yoyo-dev/memory/ directory (needs migration)
ls -la .yoyo-dev/memory/memory/memory.db 2>/dev/null && echo "OLD_YOYO_AI_EXISTS" || echo "NO_OLD_YOYO_AI"

# Check for deprecated .yoyo/ directory
ls -la .yoyo/ 2>/dev/null && echo "OLD_YOYO_EXISTS" || echo "NO_OLD_YOYO"
```

## Step 2: Handle Deprecated Directories

**If `.yoyo/` exists (v1-v3):**
Tell user: "Found deprecated `.yoyo/` directory from Yoyo v1-v3. This should be deleted."
Ask if they want to delete it.

**If `.yoyo-dev/memory/` exists (v4-v5):**
Tell user: "Found `.yoyo-dev/memory/` directory from Yoyo v4-v5. Memory is now stored in `.yoyo-dev/memory/`."

**Migrate automatically:**

```bash
# Create new memory directory
mkdir -p .yoyo-dev/memory
mkdir -p .yoyo-dev/skills

# Move memory database if exists
if [ -f ".yoyo-dev/memory/memory/memory.db" ]; then
    mv .yoyo-dev/memory/memory/memory.db .yoyo-dev/memory/
    mv .yoyo-dev/memory/memory/memory.db-wal .yoyo-dev/memory/ 2>/dev/null || true
    mv .yoyo-dev/memory/memory/memory.db-shm .yoyo-dev/memory/ 2>/dev/null || true
fi

# Move skills if exist
if [ -d ".yoyo-dev/memory/.skills" ]; then
    mv .yoyo-dev/memory/.skills/* .yoyo-dev/skills/ 2>/dev/null || true
fi

# Remove old directory
rm -rf .yoyo-dev/memory/
```

Report: "Migrated memory from `.yoyo-dev/memory/` to `.yoyo-dev/memory/`"

## Step 3: Handle Different States

### If `.yoyo-dev/` does NOT exist:

The Yoyo Dev framework is not installed. Guide the user through installation:

1. Ask: "What are you building?"
2. After they respond, run `/plan-product` to set up the product mission and roadmap
3. Then initialize the memory system with `/yoyo-ai-memory`

### If `.yoyo-dev/` EXISTS:

Report the current state:

```bash
# Check product docs
ls .yoyo-dev/product/mission.md 2>/dev/null && echo "MISSION_EXISTS" || echo "NO_MISSION"

# Count specs
ls -d .yoyo-dev/specs/*/ 2>/dev/null | wc -l || echo "0"

# Check memory (new location)
ls .yoyo-dev/memory/memory.db 2>/dev/null && echo "MEMORY_OK" || echo "NO_MEMORY"
```

Show status report:

```
Yoyo Dev Status
===============

Framework (.yoyo-dev/):
  Product docs: [Found/Not found]
  Specifications: [N] specs
  Memory: [Initialized/Not initialized]

Available Commands:
  /plan-product    - Set up product mission and roadmap
  /create-new      - Start a new feature specification
  /execute-tasks   - Build and ship code from tasks
  /yoyo-ai-memory  - Initialize memory system only
```

### If `.yoyo-dev/` EXISTS but NO Memory System:

Tell user:

```
Framework is installed but memory system is missing.

To initialize the memory system, run: /yoyo-ai-memory

The memory system provides:
  - Project context persistence
  - Tech stack detection
  - Pattern learning
  - Conversation history
```

## Directory Reference

**Everything is consolidated in `.yoyo-dev/`:**

| Directory                 | Purpose                           |
| ------------------------- | --------------------------------- |
| `.yoyo-dev/memory/`       | SQLite database for memory system |
| `.yoyo-dev/skills/`       | Skills system                     |
| `.yoyo-dev/instructions/` | AI workflow instructions          |
| `.yoyo-dev/standards/`    | Development standards             |
| `.yoyo-dev/specs/`        | Feature specifications            |
| `.yoyo-dev/product/`      | Product docs (mission, roadmap)   |

**Deprecated directories (will be auto-migrated):**

| Directory           | Status                                                      |
| ------------------- | ----------------------------------------------------------- |
| `.yoyo-dev/memory/` | **DEPRECATED v4-v5** - auto-migrated to `.yoyo-dev/memory/` |
| `.yoyo/`            | **DEPRECATED v1-v3** - should be deleted                    |

## Quick Setup Commands

**Full setup (new project):**

1. Run `/plan-product` to define product mission
2. Run `/yoyo-ai-memory` to initialize memory

**Memory only (existing project with framework):**

- Run `/yoyo-ai-memory`

**Check status:**

```bash
# Full status
ls -la .yoyo-dev/

# Memory status
ls -la .yoyo-dev/memory/

# Full tree
tree -L 2 .yoyo-dev 2>/dev/null || find .yoyo-dev -maxdepth 2 -type d 2>/dev/null
```
