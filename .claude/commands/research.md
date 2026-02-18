---
description: Research topic in background (docs, GitHub, web) - returns notification
---

# Research

Delegate deep research to the librarian agent (runs in background).

## Usage

```bash
/research <topic>
```

## Description

Launches a background task with the **librarian** agent to conduct comprehensive research on a given topic. The librarian searches:

1. Official documentation (via context7, WebFetch)
2. GitHub repositories and code examples
3. Web search results (DuckDuckGo)
4. Best practices and patterns

Results are delivered as a notification when complete.

## Examples

```bash
# Research framework best practices
/research "Convex authentication best practices"

# Research specific implementation patterns
/research "React Server Components performance optimization"

# Research library usage
/research "Tailwind CSS v4 dark mode implementation"

# Research architectural patterns
/research "Microservices vs monolith for SaaS applications"
```

## How It Works

1. **Background Task Launched**
   - Librarian agent starts research in separate session
   - You can continue working immediately
   - No need to wait for results

2. **Comprehensive Search**
   - Librarian uses multiple MCP tools:
     - `context7_get-library-docs` - Official documentation
     - `websearch` (DuckDuckGo) - General web search
     - `gh` (GitHub) - Code examples and repositories
     - `WebFetch` - Direct documentation access

3. **Notification on Completion**
   - Toast notification in TUI
   - Message injected into current session
   - Results include:
     - Documentation excerpts
     - GitHub permalinks (not floating refs)
     - Implementation patterns
     - Best practices

4. **Access Results**
   - Results automatically appear in your session
   - Duration and token usage reported
   - Can reference findings immediately

## Output Format

When complete, you'll receive a notification like:

```
🔔 Research task "Convex authentication best practices" completed.

Results:
- Official docs: https://docs.convex.dev/auth
- GitHub example: https://github.com/get-convex/convex-demos/...
- Best practice: Use Convex Auth with Clerk integration
- Pattern: Store session tokens in HTTP-only cookies

Key Findings:
1. Convex Auth supports multiple providers (Clerk, Auth0, Custom)
2. Built-in rate limiting and CSRF protection
3. TypeScript-first with automatic type generation

Duration: 42s | Tokens: 8,247
```

## When to Use

**Use /research for:**

- Finding official documentation for libraries/frameworks
- Discovering implementation patterns and examples
- Learning best practices before implementation
- Exploring architectural decisions
- Gathering context before planning features

**Don't use /research for:**

- Internal codebase search (use /explore or Grep instead)
- Quick API lookups (just search directly)
- Decisions you already know the answer to

## Librarian Agent Details

**Capabilities:**

- External research only (no code implementation)
- Accesses GitHub, documentation sites, web search
- Returns structured findings with links
- Focuses on current year (2025) resources

**Tools Available:**

- `context7` - Library documentation
- `websearch` - DuckDuckGo search
- `gh` - GitHub API
- `WebFetch` - Web page fetching
- `Read` - File reading (for cloned repos)

**Limitations:**

- Cannot write code
- Cannot execute commands
- Cannot modify files
- Read-only access

## Background Task Management

**Check status:**

```bash
# Background tasks are automatically tracked in TUI
# You'll see: "Background: 1 running"
```

**Cancel research:**

```typescript
// If needed (advanced usage)
background_cancel({ task_id: "task-id-here" });
```

**Retrieve results manually:**

```typescript
// Usually automatic, but can retrieve manually
background_output({ task_id: "task-id-here", block: true });
```

## Integration with Workflow

**Common pattern:**

```bash
# Start research early
/research "NextJS App Router best practices 2025"

# Continue with other work
# ... implement feature ...

# Research results arrive automatically when ready
# Apply findings to your implementation
```

**In Yoyo-AI orchestration:**

```typescript
// Research fired automatically during Phase 2A
background_task({
  agent: "librarian",
  prompt: "Research topic...",
  name: "Research: Topic",
});

// Continue with Phase 2B (implementation)
// Results retrieved when needed
```

---

**Note:** Research tasks run in parallel with your main work. You don't need to wait - results will appear as notifications when ready.
