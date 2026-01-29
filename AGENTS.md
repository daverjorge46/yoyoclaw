# AI Agent Guidelines

**Version:** 4.7

---

## Critical Rules

| Rule | Description |
|------|-------------|
| **CLI First** | Use `speckitadv` CLI for all workflow operations |
| **CLI Flags** | Use named flags (`--flag value`), NOT positional args |
| **OS Shell** | Bash (Linux/macOS), PowerShell (Windows) |
| **ASCII-Only** | No Unicode. Use `->`, `[ok]`, `[x]`, `[!]` |
| **Mermaid Diagrams** | Mermaid syntax only. No ASCII art |
| **State Auto-Detection** | After stage 2, CLI auto-detects stage from state.json |
| **Workflow Prompts** | Follow workflow-specific prompts for file operations |

---

## RFC 2119 Compliance

| Keyword | Meaning | Action |
|---------|---------|--------|
| **MUST** | Mandatory | Always follow |
| **NEVER** | Prohibited | Never do |
| **SHOULD** | Recommended | Follow unless justified |
| **MAY** | Optional | Use judgment |

| Marker | Action |
|--------|--------|
| `[!]` | Critical - treat as MUST |
| `[ok]`/`[x]` | Verify before proceeding |
| `[STOP: USER_*]` | WAIT for user |
| `[STOP: *]` (other) | Execute and continue |

---

## Quick Reference

**Priority:** Constitution > Spec > Plan > Supporting Docs

**Task States:** `[ ]` pending, `[x]` complete, `[F]` failed, `[B]` blocked

| Problem | Action |
|---------|--------|
| Spec unclear | STOP, mark [B], WAIT |
| Test failed (syntax) | Auto-fix max 2x |
| Test failed (logic) | Mark [F], WAIT |
| Constitution conflict | STOP, FLAG, WAIT |

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `analyze-project` | Analyze existing project (git branch workflow) |
| `deepwiki` | Generate AI-powered wiki (requires civyk-repoix) |
| `deepwiki-update-state` | Update deepwiki workflow state |
| `constitution` | Create project constitution |
| `specify` | Create baseline specification |
| `plan` | Create implementation plan |
| `tasks` | Generate actionable tasks |
| `implement` | Execute implementation |
| `tests` | Iterative test implementation |
| `review` | Iterative code review |

**CLI vs Slash Commands:**

- Slash commands (`/speckitadv.xxx`) → Human users in IDE
- CLI commands (`speckitadv xxx`) → AI agents programmatically

---

## Deepwiki State Commands

| Command | Purpose |
|---------|---------|
| `init --files=N --symbols=N --components="a,b" --repoix-mode=mcp` | Initialize state |
| `stage --stage=ID --status=completed --artifacts=files` | Update stage |
| `verify-stage --stage=ID` | Verify prerequisites |
| `enumerate-index` | Discover file patterns and component naming |
| `business-context --context-file=path` | Save business context |
| `discovery-cache --key=K --value='json'` | Save cross-stage context |
| `show` | Show current state |
| `show --key=KEY` | Show specific key |
| `complete` | Mark workflow complete |

---

## Chunking (>1500 lines)

| Principle | Description |
|-----------|-------------|
| Completion-based | Each chunk is complete logical section |
| Full quality | Multiple writes, NOT reduced content |
| Progress display | Show progress after each chunk |
| No placeholders | Never TODO, TBD, "will be analyzed" |
| Resume support | Check existing content before starting |

---

## Agentic Markers

| Marker | Action |
|--------|--------|
| `[AUTO-CONTINUE]` | Proceed immediately |
| `[STAGE TRANSITION]` | Auto-continue to next stage |
| `[WAIT-FOR-INPUT]` | Stop and wait |
| `[GATE-CHECK]` | Pass: continue. Fail: wait |
| `[WORKFLOW COMPLETE]` | Stop, report completion |

**Default:** No marker = `[AUTO-CONTINUE]`. Do NOT ask "should I continue?"

---

## civyk-repoix Integration

### Mode Detection (Stage 01)

DeepWiki tries MCP first, falls back to CLI. Mode persisted in state.json.

### MCP vs CLI Conversion

| MCP Syntax | CLI Syntax |
|------------|------------|
| `mcp__civyk-repoix__index_status()` | `civyk-repoix query index-status` |
| `search_symbols(query="%User", kind="class")` | `--query "%User" --kind class` |
| `kinds=["class", "function"]` | `--kinds "class,function"` |
| `include_private=True` | `--include-private` |

**Name conversion:** snake_case → kebab-case (`search_symbols` → `search-symbols`)

**Exit codes:** `0` = success (JSON stdout), `1` = error (`{"error": "..."}`)

### MCP Tool Categories (32 Tools)

**Status:** `index_status`, `build_context_pack`

**Discovery:** `search_symbols`, `get_symbol`, `list_files`, `search_code`, `find_similar`

- `search_symbols`: SQL LIKE patterns (`%` wildcard). NOT regex. OR not supported.
- `list_files`: fnmatch patterns (`*`, `**`, `?`). Brace expansion NOT supported.

**Navigation:** `get_file_symbols`, `get_definition`, `get_callers`, `get_references`, `get_file_imports`, `get_type_hierarchy`, `get_related_files`

**Architecture:** `get_components`, `get_api_endpoints`, `get_dependencies`

**Git-Aware:** `get_recent_changes`, `get_hotspots`, `get_branch_diff`

**Analysis:** `get_dead_code`, `find_circular_dependencies`, `analyze_impact`, `get_duplicate_code`, `get_tests_for`, `get_code_for_test`, `get_tool_performance_stats`

**AI Context Cache:** `store_understanding`, `recall_understanding`, `get_understanding_stats`, `invalidate_understanding`

**Maintenance:** `force_reindex`

### Pagination

All list tools return: `total_count`, `truncated`, `has_more`, `offset`, `hint`

Use `limit` and `offset` for pagination. **MUST paginate when `has_more=true`.**

**Paginated tools:** `search_symbols`, `get_references`, `get_api_endpoints`, `get_callers`, `list_files`, `search_code`, `get_recent_changes`, `get_hotspots`, `get_branch_diff`, `get_duplicate_code`, `get_dead_code`, `get_type_hierarchy`

### AI Context Cache (Cross-Session Persistence)

The AI Context Cache enables **cross-session persistence** of code understanding. Your analysis survives session restarts and new conversations, saving **80-90% of tokens**.

| Tool | Purpose |
|------|---------|
| `recall_understanding` | **Call FIRST** before reading any file (saves 80-90% tokens) |
| `store_understanding` | Persist analysis AFTER thoroughly reading files |
| `get_understanding_stats` | **Session start**: See cached targets, filter by path/scope, sort, check freshness |
| `invalidate_understanding` | Manually clear stale entries |

**[!] SESSION START: Check Cache First**

At the **start of any workflow or session**, proactively check what's already cached:

```text
# 1. Check cache statistics to see what's available
get_understanding_stats(limit=50)

# 2. If working on a specific area, recall relevant cached understanding:
recall_understanding(target="project")           # Project-level overview
recall_understanding(target="<module_path>")     # Module you'll be working in

# 3. Use cached understanding to:
#    - Skip redundant file reads
#    - Understand existing patterns before making changes
#    - Identify related areas that might be affected
```

**Why check cache first?**

- Previous sessions may have already analyzed the files you need
- Cached understanding includes gotchas and edge cases you'd otherwise miss
- Dramatically reduces time-to-context in new sessions

**`store_understanding` fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `scope` | Yes | `file`, `class`, `module`, or `project` |
| `target` | Yes | Path identifier (e.g., `src/auth.py`, `src/auth.py::AuthClient`) |
| `purpose` | Yes | 1-2 sentence summary of WHAT and WHY |
| `importance` | Yes | `critical`, `high`, `medium`, or `low` |
| `key_points` | No | 2-5 main functionality highlights |
| `gotchas` | No | Non-obvious behaviors that could cause bugs |
| `analysis` | No | **Detailed free-form analysis** for complex business logic, state machines, workflows |

**`get_understanding_stats` parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | int | 50 | Max entries total (1-200) |
| `offset` | int | 0 | Pagination offset |
| `filter` | string | - | Filter targets by path (contains match) |
| `scope` | string | - | Filter by scope: `file`, `class`, `module`, `project` |
| `sort_by` | string | importance | Sort by: `importance`, `access_count`, `target` |
| `include_fresh` | bool | true | Check freshness per entry (false = faster) |
| `case_insensitive` | bool | true | Whether filter is case-insensitive |

**Key behaviors:**

- Cross-session: Understanding persists across session restarts and new conversations
- Long sessions: Avoid re-reading files analyzed earlier in the conversation
- Auto-invalidation: Cache invalidates when file content changes (hash mismatch)
- Freshness check: Response includes `fresh` boolean to indicate if cache is current

**[!] CRITICAL: AI Cache Usage Pattern**

```text
BEFORE reading ANY source file:
1. Call recall_understanding(target="path/to/file.py")
2. Check response:
   - found=true AND fresh=true -> USE cached understanding, SKIP file read
   - found=true AND fresh=false -> File changed, re-read and UPDATE cache
   - found=false -> Read file, analyze, then store_understanding

AFTER thorough analysis of a file/module/component:
1. Call store_understanding with:
   - scope: file/class/module/project
   - target: the path analyzed
   - purpose: what the code does
   - importance: critical/high/medium/low
   - key_points: main functionality
   - gotchas: non-obvious behaviors
   - analysis: detailed notes for complex logic
```

**When to Store Understanding:**

| Scope | When to Use | Example Target |
|-------|-------------|----------------|
| `file` | After reading and analyzing a source file | `src/auth/oauth.py` |
| `class` | After deep-diving into a specific class | `src/auth/oauth.py::OAuthClient` |
| `module` | After analyzing a directory/package | `src/auth` |
| `project` | After initial codebase orientation | `project` |

### Recommended Workflow

1. `index_status` -> verify ready
2. `recall_understanding` -> **check cached analysis FIRST** (saves 80-90% tokens)
   - If `found=true` AND `fresh=true` -> Use cached understanding, skip file read
   - If `found=true` AND `fresh=false` -> File changed, re-read and update cache
   - If `found=false` -> Read file, analyze, then `store_understanding`
3. `build_context_pack` -> initial context
4. `get_file_symbols` -> understand files
5. `get_definition` + `get_callers` -> navigation
6. `search_symbols` -> drill down
7. `store_understanding` -> persist analysis after reading files (enables cross-session recall)

**For cross-session efficiency:**

```text
Session 1: Read file -> Analyze -> store_understanding
Session 2: recall_understanding -> Use cached analysis (no file read needed!)
```

**For refactoring:** `analyze_impact` -> `get_duplicate_code` -> `get_tests_for` -> `find_circular_dependencies` -> `get_dead_code`

---

## Code Generation

**Discovery-First:**

- Use civyk-repoix MCP/CLI to discover existing utils, base classes, methods, patterns before creating new
- Prefer extending existing patterns over introducing new ones

**Quality Standards:**

- Production-ready, functionally deterministic and idempotent
- Consider all edge cases in design, implementation, and test coverage
- Small commits (1 scenario, <300 lines)

**Quality Gates (Pre-Commit):**

- Zero compile errors
- Zero warnings (treat warnings as errors)
- Run: Formatters -> Linters -> Type checkers -> Build
- All new implementations covered by tests
- All new tests must pass

---

## Ethics & Safety

**MUST NOT:** Commit secrets/keys, share PII, make undisclosed network calls

**Licensing:** Prefer permissive (MIT, Apache, BSD). STOP for license conflicts.

---

*AI agents MUST follow these guidelines for spec-driven development.*
