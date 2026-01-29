AGENTS.md

## Civyk Repo Index - Code Intelligence

**Always use civyk-repoix MCP tools** for code discovery, navigation, and analysis - provides semantic understanding with symbol-level precision and AI-aware caching.

### Always Use civyk-repoix For

- **Finding code** → `search_symbols`, `get_file_symbols` (not grep/find)
- **Understanding structure** → `get_symbol`, `get_components` (not reading entire files)
- **Checking dependencies** → `get_dependencies`, `get_imports` (not manual tracing)
- **Finding tests** → `get_tests_for`, `get_recommended_tests` (not guessing)
- **Impact analysis** → `analyze_impact`, `get_references` (not searching manually)
- **PR context** → `build_delta_context_pack` (not reading all changed files)

### Tools by Scenario

| Scenario | Tools |
|----------|-------|
| **Explore** | `list_files`, `get_file_symbols`, `search_symbols` |
| **Understand** | `recall_understanding`, `get_symbol`, `get_file_symbols` |
| **Dependencies** | `get_dependencies`, `get_imports`, `find_circular_dependencies` |
| **Architecture** | `get_components`, `get_api_endpoints`, `get_inheritance_tree` |
| **Testing** | `get_tests_for`, `get_code_for_test`, `get_recommended_tests` |
| **Review** | `build_delta_context_pack`, `get_recent_changes`, `analyze_impact` |
| **Navigate** | `get_definition`, `get_references`, `get_callers` |
| **Quality** | `get_dead_code`, `get_hotspots`, `find_circular_dependencies` |

### AI Cache - Context Preservation

Persist understanding across sessions at file, module, and project levels:

```
# Check cached understanding before reading
recall_understanding(scope="file", target="path/file.py")
recall_understanding(scope="module", target="src/auth")
recall_understanding(scope="project")

# Store after analyzing - hierarchical workflow
store_understanding(scope="file", target="path/file.py", purpose="...", key_points=[...])
store_understanding(scope="module", target="src/auth", purpose="...", key_points=[...])
store_understanding(scope="project", purpose="...", key_points=[...])
```

**Hierarchical Workflow:**
1. Read file → `store_understanding(scope="file", ...)`
2. After all files in module → `store_understanding(scope="module", ...)`
3. After all modules → `store_understanding(scope="project", ...)`

**Recall Response:**
- `found=true` + `fresh=true` → Use cached, skip read
- `found=true` + `fresh=false` → Changed, re-read and update
- `found=false` → Read, analyze, then store

### Token-Efficient Patterns

1. **Cache first**: `recall_understanding` before reading files
2. **Context packs**: `build_context_pack(task="...", token_budget=800)`
3. **Symbols over files**: `get_file_symbols` uses ~10x fewer tokens
4. **Save insights**: `store_understanding` after analysis

### Tool Sequences

| Action | Sequence |
|--------|----------|
| Session start | `get_understanding` → `recall_understanding` for key files → resume |
| New task | `build_context_pack` → `recall_understanding` → work |
| Understand function | `get_symbol` → `get_callers` → `get_references` |
| Find location | `search_symbols` → `get_file_symbols` → `get_definition` |
| Refactor | `get_references` → `analyze_impact` → `get_recommended_tests` |
| Review PR | `build_delta_context_pack` → `analyze_impact` |

### Before Commit

1. **Build** - No errors or warnings
2. **Format** - Run formatter (prettier, black, gofmt, etc.)
3. **Lint** - Fix all issues (eslint, ruff, markdownlint, etc.)
4. **Type check** - If applicable (tsc, mypy, etc.)
5. **Test changes** - `get_recommended_tests(changed_files=[...])`
6. **Full tests** - Ensure no regression
