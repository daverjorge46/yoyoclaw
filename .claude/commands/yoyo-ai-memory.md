---
description: Initialize Yoyo AI Memory System in current project (memory system)
---

# Initialize Yoyo AI Memory System v2

This command sets up the enhanced memory system with semantic search, auto-learning, and enterprise features.

## Step 1: Check Current State

Run comprehensive checks:

```bash
# Check if .yoyo-dev exists (framework must be installed first)
ls -la .yoyo-dev/ 2>/dev/null && echo "YOYO_DEV_EXISTS" || echo "YOYO_DEV_NOT_EXISTS"

# Check if memory database exists
ls -la .yoyo-dev/memory/memory.db 2>/dev/null && echo "MEMORY_DB_EXISTS" || echo "MEMORY_DB_NOT_EXISTS"

# Check schema version if database exists
if [ -f ".yoyo-dev/memory/memory.db" ]; then
    python3 -c "
import sqlite3
conn = sqlite3.connect('.yoyo-dev/memory/memory.db')
cursor = conn.cursor()
try:
    cursor.execute(\"SELECT value FROM schema_metadata WHERE key='version'\")
    row = cursor.fetchone()
    print(f'SCHEMA_VERSION={row[0]}' if row else 'SCHEMA_VERSION=0')
except:
    print('SCHEMA_VERSION=0')
conn.close()
" 2>/dev/null || echo "SCHEMA_VERSION=0"
fi

# Check for legacy directories
ls -la .yoyo-dev/memory/memory/memory.db 2>/dev/null && echo "OLD_YOYO_AI_EXISTS" || echo "NO_OLD_YOYO_AI"
ls -la .yoyo/ 2>/dev/null && echo "OLD_YOYO_EXISTS" || echo "NO_OLD_YOYO"
```

## Step 2: Handle Results

### If `.yoyo-dev/` does NOT exist:

Tell user: "Yoyo Dev framework is not installed. Run `/yoyo-init` first to set up the project."
Exit without proceeding.

### If `.yoyo/` exists (deprecated v1-v3):

Tell user: "Found deprecated `.yoyo/` directory from Yoyo v1-v3. This should be deleted."
Ask if they want to delete it.

### If legacy memory exists (v4-v5):

Migrate automatically:

```bash
mkdir -p .yoyo-dev/memory
mkdir -p .yoyo-dev/skills

if [ -f ".yoyo-dev/memory/memory/memory.db" ]; then
    mv .yoyo-dev/memory/memory/memory.db .yoyo-dev/memory/
    mv .yoyo-dev/memory/memory/memory.db-wal .yoyo-dev/memory/ 2>/dev/null || true
    mv .yoyo-dev/memory/memory/memory.db-shm .yoyo-dev/memory/ 2>/dev/null || true
fi

if [ -d ".yoyo-dev/memory/.skills" ]; then
    mv .yoyo-dev/memory/.skills/* .yoyo-dev/skills/ 2>/dev/null || true
fi

rm -rf .yoyo-dev/memory/
echo "Migrated from v4-v5 directory structure"
```

### If SCHEMA_VERSION=1 (needs v2 migration):

Proceed to Step 3B to migrate to v2 schema.

### If SCHEMA_VERSION=2 (already v2):

Report current status and offer optimization:

```
✓ Yoyo AI Memory System v2 is already initialized!

Memory Location: .yoyo-dev/memory/memory.db
Schema Version: 2 (Enhanced)

To optimize or repair memory, proceed with Step 4.
```

### If memory does NOT exist:

Proceed to Step 3A to initialize fresh v2 schema.

## Step 3A: Create Fresh Memory System (v2 Schema)

### 3A.1 Create Directory Structure

```bash
mkdir -p .yoyo-dev/memory
mkdir -p .yoyo-dev/memory/backups
mkdir -p .yoyo-dev/memory/attachments
mkdir -p .yoyo-dev/skills
```

### 3A.2 Create SQLite Database with Enhanced Schema

```bash
python3 << 'INIT_MEMORY_DB_V2'
import sqlite3
import os
from datetime import datetime

db_path = '.yoyo-dev/memory/memory.db'
os.makedirs(os.path.dirname(db_path), exist_ok=True)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Enable WAL mode for better concurrency
cursor.execute("PRAGMA journal_mode = WAL")
cursor.execute("PRAGMA foreign_keys = ON")

# ============================================================================
# Core Tables
# ============================================================================

# Enhanced memory_blocks table (v2)
cursor.execute("""
CREATE TABLE IF NOT EXISTS memory_blocks (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('persona', 'project', 'user', 'corrections')),
    scope TEXT NOT NULL CHECK (scope IN ('global', 'project')),
    content TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    -- v2 Enhanced columns
    embeddings TEXT,
    relevance_score REAL DEFAULT 1.0,
    access_count INTEGER DEFAULT 0,
    context_tags TEXT DEFAULT '[]',
    auto_generated INTEGER DEFAULT 0,
    confidence_level REAL DEFAULT 1.0
)
""")

# Core indexes
cursor.execute("CREATE INDEX IF NOT EXISTS idx_memory_blocks_type ON memory_blocks(type)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_memory_blocks_scope ON memory_blocks(scope)")
cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_memory_blocks_type_scope ON memory_blocks(type, scope)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_memory_blocks_relevance ON memory_blocks(relevance_score DESC, access_count DESC)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_memory_blocks_auto_generated ON memory_blocks(auto_generated)")

# Conversations table
cursor.execute("""
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    metadata TEXT
)
""")

cursor.execute("CREATE INDEX IF NOT EXISTS idx_conversations_agent ON conversations(agent_id)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp)")

# Agents table
cursor.execute("""
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT,
    model TEXT NOT NULL,
    memory_block_ids TEXT,
    settings TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)
""")

# ============================================================================
# v2 Enhanced Tables
# ============================================================================

# Memory hierarchy (relationships between blocks)
cursor.execute("""
CREATE TABLE IF NOT EXISTS memory_hierarchy (
    id TEXT PRIMARY KEY,
    parent_id TEXT NOT NULL,
    child_id TEXT NOT NULL,
    relationship_type TEXT NOT NULL CHECK (
        relationship_type IN ('related', 'derived_from', 'supersedes', 'contains')
    ),
    strength REAL DEFAULT 1.0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (parent_id) REFERENCES memory_blocks(id) ON DELETE CASCADE,
    FOREIGN KEY (child_id) REFERENCES memory_blocks(id) ON DELETE CASCADE,
    UNIQUE(parent_id, child_id, relationship_type)
)
""")

cursor.execute("CREATE INDEX IF NOT EXISTS idx_memory_hierarchy_parent ON memory_hierarchy(parent_id)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_memory_hierarchy_child ON memory_hierarchy(child_id)")

# Extended metadata
cursor.execute("""
CREATE TABLE IF NOT EXISTS memory_metadata (
    block_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (block_id, key),
    FOREIGN KEY (block_id) REFERENCES memory_blocks(id) ON DELETE CASCADE
)
""")

cursor.execute("CREATE INDEX IF NOT EXISTS idx_memory_metadata_key ON memory_metadata(key)")

# Learned patterns (auto-learning)
cursor.execute("""
CREATE TABLE IF NOT EXISTS learned_patterns (
    id TEXT PRIMARY KEY,
    pattern_type TEXT NOT NULL,
    description TEXT NOT NULL,
    frequency INTEGER DEFAULT 1,
    confidence REAL DEFAULT 0.5,
    evidence TEXT DEFAULT '[]',
    first_seen TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen TEXT NOT NULL DEFAULT (datetime('now')),
    applied INTEGER DEFAULT 0
)
""")

cursor.execute("CREATE INDEX IF NOT EXISTS idx_learned_patterns_type ON learned_patterns(pattern_type)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_learned_patterns_confidence ON learned_patterns(confidence DESC)")

# Audit log (enterprise)
cursor.execute("""
CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
    user_id TEXT,
    description TEXT NOT NULL,
    details TEXT
)
""")

cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_log_type ON audit_log(event_type)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_log_severity ON audit_log(severity)")

# Attachments (multi-modal)
cursor.execute("""
CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    block_id TEXT,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    checksum TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (block_id) REFERENCES memory_blocks(id) ON DELETE SET NULL
)
""")

cursor.execute("CREATE INDEX IF NOT EXISTS idx_attachments_block ON attachments(block_id)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_attachments_mime ON attachments(mime_type)")

# Schema metadata
cursor.execute("""
CREATE TABLE IF NOT EXISTS schema_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
)
""")

# Set schema version to 2
cursor.execute("INSERT OR REPLACE INTO schema_metadata (key, value) VALUES ('version', '2')")
cursor.execute("INSERT OR REPLACE INTO schema_metadata (key, value) VALUES ('initialized_at', ?)", (datetime.now().isoformat(),))
cursor.execute("INSERT OR REPLACE INTO schema_metadata (key, value) VALUES ('features', 'embeddings,relevance,tags,hierarchy,patterns,audit,attachments')")

conn.commit()
conn.close()

print("✓ Memory database v2 initialized successfully!")
print(f"  Location: {db_path}")
print(f"  Schema Version: 2 (Enhanced)")
INIT_MEMORY_DB_V2
```

Proceed to Step 3C for project scanning.

## Step 3B: Migrate Existing Database to v2

```bash
python3 << 'MIGRATE_TO_V2'
import sqlite3
from datetime import datetime

db_path = '.yoyo-dev/memory/memory.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("Starting migration to v2 schema...")

# Check current version
cursor.execute("SELECT value FROM schema_metadata WHERE key='version'")
row = cursor.fetchone()
current_version = int(row[0]) if row else 1

if current_version >= 2:
    print("Already at v2 or higher. No migration needed.")
    conn.close()
    exit(0)

# Enable foreign keys
cursor.execute("PRAGMA foreign_keys = ON")

# Add v2 columns to memory_blocks (SQLite ALTER TABLE is limited)
new_columns = [
    ("embeddings", "TEXT"),
    ("relevance_score", "REAL DEFAULT 1.0"),
    ("access_count", "INTEGER DEFAULT 0"),
    ("context_tags", "TEXT DEFAULT '[]'"),
    ("auto_generated", "INTEGER DEFAULT 0"),
    ("confidence_level", "REAL DEFAULT 1.0"),
]

for col_name, col_type in new_columns:
    try:
        cursor.execute(f"ALTER TABLE memory_blocks ADD COLUMN {col_name} {col_type}")
        print(f"  + Added column: {col_name}")
    except sqlite3.OperationalError:
        print(f"  = Column exists: {col_name}")

# Create v2 indexes
indexes = [
    "CREATE INDEX IF NOT EXISTS idx_memory_blocks_relevance ON memory_blocks(relevance_score DESC, access_count DESC)",
    "CREATE INDEX IF NOT EXISTS idx_memory_blocks_auto_generated ON memory_blocks(auto_generated)",
]

for idx_sql in indexes:
    cursor.execute(idx_sql)

# Create v2 tables
v2_tables = [
    """CREATE TABLE IF NOT EXISTS memory_hierarchy (
        id TEXT PRIMARY KEY,
        parent_id TEXT NOT NULL,
        child_id TEXT NOT NULL,
        relationship_type TEXT NOT NULL,
        strength REAL DEFAULT 1.0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(parent_id, child_id, relationship_type)
    )""",
    """CREATE TABLE IF NOT EXISTS memory_metadata (
        block_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (block_id, key)
    )""",
    """CREATE TABLE IF NOT EXISTS learned_patterns (
        id TEXT PRIMARY KEY,
        pattern_type TEXT NOT NULL,
        description TEXT NOT NULL,
        frequency INTEGER DEFAULT 1,
        confidence REAL DEFAULT 0.5,
        evidence TEXT DEFAULT '[]',
        first_seen TEXT NOT NULL DEFAULT (datetime('now')),
        last_seen TEXT NOT NULL DEFAULT (datetime('now')),
        applied INTEGER DEFAULT 0
    )""",
    """CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        event_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        user_id TEXT,
        description TEXT NOT NULL,
        details TEXT
    )""",
    """CREATE TABLE IF NOT EXISTS attachments (
        id TEXT PRIMARY KEY,
        block_id TEXT,
        filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        checksum TEXT NOT NULL,
        storage_path TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )""",
]

for table_sql in v2_tables:
    cursor.execute(table_sql)
    print(f"  + Created table")

# Update schema version
cursor.execute("INSERT OR REPLACE INTO schema_metadata (key, value) VALUES ('version', '2')")
cursor.execute("INSERT OR REPLACE INTO schema_metadata (key, value) VALUES ('migrated_at', ?)", (datetime.now().isoformat(),))
cursor.execute("INSERT OR REPLACE INTO schema_metadata (key, value) VALUES ('features', 'embeddings,relevance,tags,hierarchy,patterns,audit,attachments')")

conn.commit()
conn.close()

print("\n✓ Migration to v2 complete!")
MIGRATE_TO_V2
```

## Step 3C: Intelligent Project Scanning

Perform deep project analysis to create rich initial memory:

```bash
python3 << 'SCAN_PROJECT'
import sqlite3
import json
import os
import uuid
from datetime import datetime
import re
from pathlib import Path

db_path = '.yoyo-dev/memory/memory.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# ============================================================================
# Deep Project Analysis
# ============================================================================

project_name = os.path.basename(os.getcwd())
tech_stack = {}
patterns = []
key_directories = {}
key_files = []
architecture_hints = []
dependencies = {}

print("Scanning project...")

# ----------------------------------------------------------------------------
# Node.js/TypeScript Detection
# ----------------------------------------------------------------------------
if os.path.exists('package.json'):
    print("  Found package.json")
    try:
        with open('package.json', 'r') as f:
            pkg = json.load(f)
            project_name = pkg.get('name', project_name)
            deps = {**pkg.get('dependencies', {}), **pkg.get('devDependencies', {})}
            dependencies = deps

            # Language detection
            if 'typescript' in deps or os.path.exists('tsconfig.json'):
                tech_stack['language'] = 'TypeScript'
                tech_stack['strict_mode'] = True  # Assume strict for TS projects
            else:
                tech_stack['language'] = 'JavaScript'

            # Framework detection (order matters)
            if 'next' in deps:
                tech_stack['framework'] = 'Next.js'
                tech_stack['ssr'] = True
            elif 'nuxt' in deps:
                tech_stack['framework'] = 'Nuxt'
                tech_stack['ssr'] = True
            elif 'remix' in deps:
                tech_stack['framework'] = 'Remix'
                tech_stack['ssr'] = True
            elif 'svelte' in deps or '@sveltejs/kit' in deps:
                tech_stack['framework'] = 'SvelteKit' if '@sveltejs/kit' in deps else 'Svelte'
            elif 'vue' in deps:
                tech_stack['framework'] = 'Vue'
            elif 'react' in deps:
                tech_stack['framework'] = 'React'
            elif 'express' in deps:
                tech_stack['framework'] = 'Express'
                tech_stack['api_only'] = True
            elif 'fastify' in deps:
                tech_stack['framework'] = 'Fastify'
                tech_stack['api_only'] = True
            elif 'hono' in deps:
                tech_stack['framework'] = 'Hono'
                tech_stack['api_only'] = True

            # Testing detection
            if 'vitest' in deps:
                tech_stack['testing'] = 'Vitest'
            elif 'jest' in deps:
                tech_stack['testing'] = 'Jest'
            elif 'mocha' in deps:
                tech_stack['testing'] = 'Mocha'

            # Styling detection
            if 'tailwindcss' in deps:
                tech_stack['styling'] = 'Tailwind CSS'
            elif 'styled-components' in deps:
                tech_stack['styling'] = 'styled-components'
            elif '@emotion/styled' in deps:
                tech_stack['styling'] = 'Emotion'
            elif 'sass' in deps:
                tech_stack['styling'] = 'Sass'

            # State management
            if 'zustand' in deps:
                tech_stack['state_management'] = 'Zustand'
            elif '@reduxjs/toolkit' in deps or 'redux' in deps:
                tech_stack['state_management'] = 'Redux'
            elif 'recoil' in deps:
                tech_stack['state_management'] = 'Recoil'
            elif 'jotai' in deps:
                tech_stack['state_management'] = 'Jotai'

            # Database/ORM
            if 'prisma' in deps or '@prisma/client' in deps:
                tech_stack['orm'] = 'Prisma'
            elif 'drizzle-orm' in deps:
                tech_stack['orm'] = 'Drizzle'
            elif 'typeorm' in deps:
                tech_stack['orm'] = 'TypeORM'
            elif 'mongoose' in deps:
                tech_stack['database'] = 'MongoDB'
            elif 'better-sqlite3' in deps:
                tech_stack['database'] = 'SQLite'

            # API tools
            if '@tanstack/react-query' in deps:
                tech_stack['data_fetching'] = 'TanStack Query'
            elif 'swr' in deps:
                tech_stack['data_fetching'] = 'SWR'
            if 'axios' in deps:
                tech_stack['http_client'] = 'Axios'
            if 'zod' in deps:
                tech_stack['validation'] = 'Zod'
                patterns.append('schema-validation')

    except Exception as e:
        print(f"  Warning: Could not parse package.json: {e}")

# ----------------------------------------------------------------------------
# Python Detection
# ----------------------------------------------------------------------------
elif os.path.exists('pyproject.toml') or os.path.exists('requirements.txt'):
    tech_stack['language'] = 'Python'
    print("  Found Python project")

    content = ""
    if os.path.exists('pyproject.toml'):
        with open('pyproject.toml', 'r') as f:
            content = f.read().lower()
    elif os.path.exists('requirements.txt'):
        with open('requirements.txt', 'r') as f:
            content = f.read().lower()

    if 'fastapi' in content:
        tech_stack['framework'] = 'FastAPI'
    elif 'django' in content:
        tech_stack['framework'] = 'Django'
    elif 'flask' in content:
        tech_stack['framework'] = 'Flask'

    if 'pytest' in content:
        tech_stack['testing'] = 'pytest'
    if 'sqlalchemy' in content:
        tech_stack['orm'] = 'SQLAlchemy'
    if 'pydantic' in content:
        tech_stack['validation'] = 'Pydantic'
        patterns.append('schema-validation')

# ----------------------------------------------------------------------------
# Go Detection
# ----------------------------------------------------------------------------
elif os.path.exists('go.mod'):
    tech_stack['language'] = 'Go'
    print("  Found Go project")

# ----------------------------------------------------------------------------
# Rust Detection
# ----------------------------------------------------------------------------
elif os.path.exists('Cargo.toml'):
    tech_stack['language'] = 'Rust'
    print("  Found Rust project")

# ----------------------------------------------------------------------------
# Directory Structure Analysis
# ----------------------------------------------------------------------------
print("  Analyzing directory structure...")

important_dirs = {
    'src': 'source code',
    'src/components': 'UI components',
    'src/pages': 'page components',
    'src/app': 'app router/components',
    'src/lib': 'shared utilities',
    'src/hooks': 'custom hooks',
    'src/services': 'service layer',
    'src/api': 'API routes/handlers',
    'src/utils': 'utility functions',
    'src/types': 'type definitions',
    'src/styles': 'stylesheets',
    'src/store': 'state management',
    'src/context': 'React context',
    'components': 'UI components',
    'pages': 'page components',
    'app': 'app directory',
    'lib': 'shared libraries',
    'api': 'API endpoints',
    'tests': 'test files',
    '__tests__': 'Jest tests',
    'test': 'test files',
    'public': 'static assets',
    'static': 'static files',
    'assets': 'asset files',
}

for dir_path, description in important_dirs.items():
    if os.path.isdir(dir_path):
        key_directories[dir_path] = description

# Pattern detection from structure
if 'src/components' in key_directories or 'components' in key_directories:
    patterns.append('component-based')
if 'src/hooks' in key_directories:
    patterns.append('custom-hooks')
if 'src/services' in key_directories or 'services' in key_directories:
    patterns.append('service-layer')
if 'src/context' in key_directories:
    patterns.append('context-api')
if 'src/store' in key_directories:
    patterns.append('centralized-state')
if 'tests' in key_directories or '__tests__' in key_directories or 'test' in key_directories:
    patterns.append('TDD')
if os.path.exists('.github/workflows'):
    patterns.append('CI/CD')
if os.path.exists('docker-compose.yml') or os.path.exists('Dockerfile'):
    patterns.append('containerized')

# Key files detection
important_files = [
    'tsconfig.json', 'package.json', 'tailwind.config.js', 'tailwind.config.ts',
    'vite.config.ts', 'vite.config.js', 'next.config.js', 'next.config.mjs',
    'vitest.config.ts', 'jest.config.js', '.env.example', 'docker-compose.yml',
    'Dockerfile', '.prettierrc', '.eslintrc.js', '.eslintrc.json',
]

for file_name in important_files:
    if os.path.exists(file_name):
        key_files.append(file_name)

# Architecture hints
if tech_stack.get('framework') in ['Next.js', 'Nuxt', 'Remix', 'SvelteKit']:
    architecture_hints.append('full-stack-meta-framework')
elif tech_stack.get('api_only'):
    architecture_hints.append('api-backend')
elif tech_stack.get('framework') in ['React', 'Vue', 'Svelte']:
    architecture_hints.append('spa-frontend')

if 'service-layer' in patterns:
    architecture_hints.append('layered-architecture')
if tech_stack.get('orm'):
    architecture_hints.append('database-backed')

# ============================================================================
# Create Memory Blocks
# ============================================================================

now = datetime.now().isoformat()

# Project block with rich metadata
project_content = {
    "name": project_name,
    "description": f"{tech_stack.get('language', 'Unknown')} project" +
                   (f" using {tech_stack.get('framework', '')}" if tech_stack.get('framework') else ""),
    "tech_stack": tech_stack,
    "architecture": architecture_hints[0] if architecture_hints else "modular",
    "patterns": patterns,
    "key_directories": key_directories,
    "key_files": key_files,
    "detected_at": now,
}

project_tags = ["project-info", tech_stack.get('language', 'unknown').lower()]
if tech_stack.get('framework'):
    project_tags.append(tech_stack['framework'].lower().replace('.', ''))

project_id = str(uuid.uuid4())
cursor.execute("""
INSERT OR REPLACE INTO memory_blocks
(id, type, scope, content, version, created_at, updated_at, relevance_score, context_tags, auto_generated, confidence_level)
VALUES (?, 'project', 'project', ?, 1, ?, ?, 1.0, ?, 1, 0.9)
""", (project_id, json.dumps(project_content), now, now, json.dumps(project_tags)))

# Persona block with expertise matching project
expertise = [tech_stack.get('language', 'general')]
if tech_stack.get('framework'):
    expertise.append(tech_stack['framework'])
if tech_stack.get('testing'):
    expertise.append(tech_stack['testing'])
if tech_stack.get('orm'):
    expertise.append(tech_stack['orm'])

persona_content = {
    "name": "Yoyo",
    "traits": ["helpful", "thorough", "context-aware", "precise"],
    "communication_style": "technical",
    "expertise_areas": expertise,
    "preferences": {
        "code_style": "clean",
        "documentation": "inline-comments",
        "testing": "test-first" if 'TDD' in patterns else "test-after",
    }
}

persona_id = str(uuid.uuid4())
cursor.execute("""
INSERT OR REPLACE INTO memory_blocks
(id, type, scope, content, version, created_at, updated_at, relevance_score, context_tags, auto_generated, confidence_level)
VALUES (?, 'persona', 'project', ?, 1, ?, ?, 1.0, ?, 1, 0.85)
""", (persona_id, json.dumps(persona_content), now, now, json.dumps(["persona", "ai-assistant"])))

# User preferences block (empty, to be filled)
user_content = {
    "preferences": {},
    "interaction_patterns": [],
    "notes": []
}

user_id = str(uuid.uuid4())
cursor.execute("""
INSERT OR REPLACE INTO memory_blocks
(id, type, scope, content, version, created_at, updated_at, relevance_score, context_tags, auto_generated, confidence_level)
VALUES (?, 'user', 'project', ?, 1, ?, ?, 0.8, ?, 1, 0.5)
""", (user_id, json.dumps(user_content), now, now, json.dumps(["user-preferences"])))

# Corrections block (empty, for learning)
corrections_content = {
    "entries": [],
    "last_updated": now
}

corrections_id = str(uuid.uuid4())
cursor.execute("""
INSERT OR REPLACE INTO memory_blocks
(id, type, scope, content, version, created_at, updated_at, relevance_score, context_tags, auto_generated, confidence_level)
VALUES (?, 'corrections', 'project', ?, 1, ?, ?, 0.9, ?, 1, 0.5)
""", (corrections_id, json.dumps(corrections_content), now, now, json.dumps(["corrections", "learning"])))

# Log initialization in audit
cursor.execute("""
INSERT INTO audit_log (id, event_type, severity, description, details)
VALUES (?, 'memory_initialized', 'info', 'Memory system initialized with project scan', ?)
""", (str(uuid.uuid4()), json.dumps({"project": project_name, "tech_stack": tech_stack})))

conn.commit()
conn.close()

# ============================================================================
# Report Results
# ============================================================================

print("\n✓ Project scanned and memory initialized!")
print(f"  Project: {project_name}")
print(f"  Language: {tech_stack.get('language', 'Unknown')}")
if tech_stack.get('framework'):
    print(f"  Framework: {tech_stack['framework']}")
if tech_stack.get('testing'):
    print(f"  Testing: {tech_stack['testing']}")
if tech_stack.get('styling'):
    print(f"  Styling: {tech_stack['styling']}")
if patterns:
    print(f"  Patterns: {', '.join(patterns[:5])}")
print(f"  Key directories: {len(key_directories)}")
print(f"  Key files: {len(key_files)}")
SCAN_PROJECT
```

## Step 4: Verify and Optimize

Run comprehensive verification:

```bash
python3 << 'VERIFY_MEMORY'
import sqlite3
import json
from datetime import datetime

db_path = '.yoyo-dev/memory/memory.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("Memory System Verification")
print("=" * 40)

# Check schema version
cursor.execute("SELECT value FROM schema_metadata WHERE key='version'")
row = cursor.fetchone()
version = row[0] if row else "unknown"
print(f"Schema Version: {version}")

# Check features
cursor.execute("SELECT value FROM schema_metadata WHERE key='features'")
row = cursor.fetchone()
features = row[0] if row else "basic"
print(f"Features: {features}")

# Count memory blocks
cursor.execute("SELECT type, COUNT(*) FROM memory_blocks GROUP BY type")
block_counts = dict(cursor.fetchall())
print(f"\nMemory Blocks:")
for block_type, count in block_counts.items():
    print(f"  {block_type}: {count}")

# Check for embeddings
cursor.execute("SELECT COUNT(*) FROM memory_blocks WHERE embeddings IS NOT NULL")
embedded_count = cursor.fetchone()[0]
print(f"\nBlocks with embeddings: {embedded_count}")

# Check audit log
cursor.execute("SELECT COUNT(*) FROM audit_log")
audit_count = cursor.fetchone()[0]
print(f"Audit log entries: {audit_count}")

# Check patterns
cursor.execute("SELECT COUNT(*) FROM learned_patterns")
pattern_count = cursor.fetchone()[0]
print(f"Learned patterns: {pattern_count}")

# Database size
import os
db_size = os.path.getsize(db_path)
print(f"\nDatabase size: {db_size / 1024:.1f} KB")

# Project info
cursor.execute("SELECT content FROM memory_blocks WHERE type='project' LIMIT 1")
row = cursor.fetchone()
if row:
    project = json.loads(row[0])
    print(f"\nProject: {project.get('name', 'Unknown')}")
    tech = project.get('tech_stack', {})
    if tech:
        print(f"Tech Stack: {tech.get('language', '?')}" +
              (f" + {tech.get('framework', '')}" if tech.get('framework') else ""))

conn.close()

print("\n" + "=" * 40)
print("✓ Memory system verification complete")
VERIFY_MEMORY
```

## Step 5: Report Success

Display final summary:

```
✓ Yoyo AI Memory System v2 Initialized!

Directory Structure:
  .yoyo-dev/
  ├── memory/
  │   ├── memory.db      # SQLite database (v2 schema)
  │   ├── backups/       # Automatic backups
  │   └── attachments/   # File attachments
  ├── skills/            # Skills system
  ├── instructions/      # AI workflow instructions
  ├── standards/         # Development standards
  ├── specs/             # Feature specifications
  └── ...

Memory Blocks Created:
  • project - Project context and tech stack (auto-detected)
  • persona - AI assistant configuration
  • user - User preferences (empty, will learn)
  • corrections - Learning corrections (empty, will learn)

Enhanced Features (v2):
  • Semantic search with vector embeddings
  • Auto-tagging and context extraction
  • Relevance scoring and access tracking
  • Memory hierarchy and relationships
  • Pattern detection and auto-learning
  • Enterprise audit logging
  • File attachments support

The memory system will:
  • Store project context across sessions
  • Track conversation history
  • Learn patterns and preferences automatically
  • Support semantic similarity search
  • Maintain audit trails for compliance

To view memory status:
  $ yoyo              # Launch TUI
  $ yoyo-gui          # Launch browser GUI
```

## Directory Reference

**All memory-related files in `.yoyo-dev/memory/`:**

| Location        | Purpose                               |
| --------------- | ------------------------------------- |
| `memory.db`     | SQLite database (v2 enhanced schema)  |
| `memory.db-wal` | Write-ahead log for concurrent access |
| `backups/`      | Automatic backup files                |
| `attachments/`  | File attachments storage              |

**Schema v2 Tables:**

| Table              | Purpose                             |
| ------------------ | ----------------------------------- |
| `memory_blocks`    | Core memory storage with embeddings |
| `conversations`    | Chat history                        |
| `agents`           | AI agent configurations             |
| `memory_hierarchy` | Block relationships                 |
| `memory_metadata`  | Extended metadata                   |
| `learned_patterns` | Auto-detected patterns              |
| `audit_log`        | Security/compliance logging         |
| `attachments`      | File attachment metadata            |
| `schema_metadata`  | Version and features                |
