# memory-smart — Smart AI-Powered Memory for OpenClaw

## Overview

`memory-smart` is a Clawdbot/OpenClaw plugin that provides AI-powered long-term memory with provider-agnostic embeddings, entity awareness, and automatic fact extraction.

It implements a **three-tier memory model**:

```
┌─────────────────────────────────────────────────────┐
│                    TIER 1: CORE                      │
│         Always in context (~400 tokens)              │
│   Identity, active rules, current project state      │
│         Self-edited by agent via tool call            │
├─────────────────────────────────────────────────────┤
│                TIER 2: ACTIVE INDEX                   │
│         LanceDB vector store (~0 tokens at rest)     │
│   Structured facts, entity profiles, preferences     │
│   Retrieved on-demand via semantic search             │
├─────────────────────────────────────────────────────┤
│              TIER 3: ARCHIVE (existing)              │
│         Markdown files + session transcripts         │
│   Raw daily logs, MEMORY.md, session JSONLs          │
│   Searched via existing memory_search/memory_get     │
└─────────────────────────────────────────────────────┘
```

**Data flows DOWN:** Raw conversations → AI extraction → structured facts in LanceDB → important things surface to core memory.

**Data flows UP:** Core memory is always visible. Active index is searched on-demand. Archive is a fallback.

### Why memory-smart?

Current OpenClaw memory options are limited:
- **memory-core** (default): Markdown search via embeddings. No auto-capture, no auto-recall injection, no fact extraction.
- **memory-lancedb**: Has auto-recall/capture but locked to OpenAI embeddings. Capture is regex-based (dumb). No entity awareness.

**memory-smart** provides:
- ✅ Provider-agnostic embeddings (Gemini, OpenAI)
- ✅ AI-powered fact extraction (uses Gemini Flash for structured extraction)
- ✅ Core memory block (small, always-in-context, self-edited)
- ✅ Entity-aware retrieval (structured knowledge about people/projects)
- ✅ Memory consolidation (dedup, compress, decay, prune)
- ✅ Background reflection (periodic review and cleanup)

---

## Quick Start

### 1. Enable the plugin

In your Clawdbot config:

```json5
{
  plugins: {
    slots: {
      memory: "memory-smart"
    },
    entries: {
      "memory-smart": {
        enabled: true,
        config: {
          // Minimal config — auto-detects Gemini or OpenAI from env vars
        }
      }
    }
  }
}
```

### 2. Set API key

Set `GEMINI_API_KEY` in your environment. Gemini embeddings are free with generous quotas.

```bash
export GEMINI_API_KEY="your-key-here"
```

### 3. Import existing memories (optional)

If you're migrating from `memory-core`:

```bash
openclaw smart-memory import --source workspace
```

This reads your `MEMORY.md` and `memory/*.md` files, extracts facts via AI, and populates the vector store.

### 4. Verify

```bash
openclaw smart-memory stats
```

---

## Configuration Reference

```json5
{
  "memory-smart": {
    config: {
      // ─── Embedding Provider ────────────────────────────────
      embedding: {
        provider: "auto",              // "gemini" | "openai" | "auto"
                                       // auto: Gemini if GEMINI_API_KEY set, else OpenAI
        apiKey: "${GEMINI_API_KEY}",   // API key (supports ${ENV_VAR} syntax)
        model: "gemini-embedding-001"  // Embedding model
                                       // Gemini: gemini-embedding-001 (3072d, free)
                                       // OpenAI: text-embedding-3-small (1536d, $0.02/M)
                                       //         text-embedding-3-large (3072d, $0.13/M)
      },

      // ─── AI Extraction ─────────────────────────────────────
      extraction: {
        enabled: true,                 // Enable AI fact extraction
        provider: "gemini",            // LLM for extraction
        model: "gemini-2.5-flash",     // Cheap + fast model
        apiKey: "${GEMINI_API_KEY}",   // Falls back to embedding.apiKey
        maxFactsPerConversation: 10,   // Max facts per conversation
        minConversationLength: 3       // Min messages to trigger extraction
      },

      // ─── Core Memory ───────────────────────────────────────
      coreMemory: {
        enabled: true,                 // Enable core memory block
        maxTokens: 1500,               // Token budget (~4 chars/token)
        filePath: "memory/core.md"     // Path relative to workspace
      },

      // ─── Entity Profiles ───────────────────────────────────
      entities: {
        enabled: true,                 // Enable entity tracking
        autoCreate: true,              // Auto-create entities from extractions
        minMentionsToCreate: 3         // Min mentions before auto-creating
      },

      // ─── Auto-Recall (Context Injection) ───────────────────
      autoRecall: {
        enabled: true,                 // Inject memories before each agent run
        maxResults: 5,                 // Max memories to inject
        maxTokens: 2000,               // Total injection token budget
        minScore: 0.3,                 // Min similarity score (0-1)
        entityBoost: true              // Boost results for mentioned entities
      },

      // ─── Auto-Capture ──────────────────────────────────────
      autoCapture: {
        enabled: true                  // Queue conversations for extraction
      },

      // ─── Reflection (Background Maintenance) ──────────────
      reflection: {
        enabled: true,                 // Enable reflection pipeline
        intervalMinutes: 360,          // Run every 6 hours
        maxOperationsPerRun: 50,       // Max operations per run
        deduplicateThreshold: 0.92,    // Cosine similarity for dedup
        decayDays: 90,                 // Days before memory importance decays
        pruneThreshold: 0.1            // Min importance before pruning
      },

      // ─── Storage ───────────────────────────────────────────
      store: {
        dbPath: "~/.openclaw/memory/smart-memory"  // LanceDB directory
      }
    }
  }
}
```

---

## Tools

### `memory_recall`

Semantic search through the fact store.

**Parameters:**
- `query` (string, required): Search query
- `limit` (number, optional): Max results (default 5)

**Example:**
```
memory_recall({ query: "EverWhen marketing strategy", limit: 3 })
```

**Returns:** Array of matching facts with relevance scores.

### `memory_store`

Manually store a fact in long-term memory.

**Parameters:**
- `text` (string, required): The fact to remember
- `category` (string, optional): preference | decision | fact | entity | rule | project | relationship | other
- `importance` (number, optional): 0.0-1.0 (default 0.5)

**Example:**
```
memory_store({
  text: "Jack prefers concise Telegram messages over long explanations",
  category: "preference",
  importance: 0.9
})
```

### `memory_forget`

Delete a specific memory by ID or by text search.

**Parameters:**
- `id` (string, optional): Exact memory ID to delete
- `query` (string, optional): Text to search and delete matching memories

### `core_memory_update`

Edit the always-in-context core memory block.

**Parameters:**
- `section` (string, required): "identity" | "human" | "rules" | "active_context" | "relationships"
- `content` (string, required): New content for the section
- `mode` (string, optional): "replace" | "append" | "remove_line" (default "replace")

**Example:**
```
core_memory_update({
  section: "active_context",
  content: "- Currently building memory-smart plugin for OpenClaw",
  mode: "append"
})
```

### `entity_lookup`

Look up everything known about a person, project, or entity.

**Parameters:**
- `name` (string, required): Entity name or alias

**Returns:** Entity profile with summary, type, aliases, and all linked facts.

---

## How It Works

### Auto-Recall (Context Injection)

On every `before_agent_start` event:

1. **Core memory** is always injected (~400 tokens)
2. The user's message is embedded and searched against the fact store
3. If known entity names appear in the message, their profiles are included
4. Results are injected as XML blocks:

```xml
<core-memory>
[core memory block content]
</core-memory>

<relevant-memories>
1. [preference] Jack prefers action over questions. (95%)
2. [rule] Never code on EverWhen repos — marketing only. (93%)
3. [project] Mission Control deployed at mission-control-ten-ochre.vercel.app (87%)
</relevant-memories>
```

Total injection budget: 2,000 tokens max.

### Auto-Capture

On every `agent_end` event:

1. User + assistant messages are extracted from the conversation
2. Very short exchanges (<3 messages) are skipped
3. Memory injection blocks are filtered out
4. The conversation is queued for batch AI extraction

### AI Fact Extraction

During the reflection pipeline (or import):

1. Queued conversations are sent to Gemini Flash
2. The AI extracts structured facts: `{ text, category, importance, entities }`
3. Each fact is self-contained (understandable without context)
4. Max 10 facts per conversation

**Extraction cost:** ~$0.001-0.003/day at 25 conversations/day.

### Reflection Pipeline

Runs every 6 hours (configurable) or manually via `smart-memory reflect`:

1. **Extract:** Process queued conversations → new facts
2. **Store:** Embed and store facts (with dedup check)
3. **Link:** Match facts to entities → update entity profiles
4. **Consolidate:** Merge near-duplicate memories (>0.92 similarity)
5. **Decay:** Reduce importance of stale, unaccessed memories (>90 days)
6. **Promote:** Surface high-importance facts to core memory "Active Context"

---

## Migration from memory-core

### Step-by-Step

1. **Configure the plugin** in your Clawdbot config (see Quick Start above)

2. **Set your API key:**
   ```bash
   export GEMINI_API_KEY="your-key"
   ```

3. **Import existing memories:**
   ```bash
   openclaw smart-memory import --source workspace
   ```
   This reads:
   - `MEMORY.md` (long-term curated memories)
   - `memory/*.md` (daily logs)
   - `SOUL.md`, `USER.md`, `IDENTITY.md` (for core memory generation)

4. **Verify the import:**
   ```bash
   openclaw smart-memory stats
   openclaw smart-memory search "some topic you remember"
   ```

5. **Your existing files are preserved.** The plugin adds a layer ON TOP — it doesn't replace or modify your markdown files.

6. **Fallback:** If memory-smart fails, the existing `memory_search`/`memory_get` tools from memory-core still work.

---

## CLI Reference

### `smart-memory stats`

Show comprehensive statistics: memory counts by category, entity counts by type, core memory usage, queue size, reflection history, config info, and disk usage.

```bash
openclaw smart-memory stats
```

### `smart-memory search <query>`

Semantic search through memories.

```bash
openclaw smart-memory search "EverWhen marketing"
openclaw smart-memory search "Jack's preferences" --limit 20
openclaw smart-memory search "deployment" --category project --min-score 0.5
```

**Options:**
- `--limit <n>` — Max results (default 10)
- `--category <cat>` — Filter by category
- `--min-score <n>` — Min similarity score 0-1 (default 0.3)

### `smart-memory entities`

List all entity profiles.

```bash
openclaw smart-memory entities
openclaw smart-memory entities --type person
openclaw smart-memory entities --sort recent
```

**Options:**
- `--type <type>` — Filter: person|project|tool|place|organization
- `--sort <field>` — Sort by: mentions|recent|name (default: mentions)

### `smart-memory entity <name>`

Show detailed entity profile with summary, aliases, and linked facts.

```bash
openclaw smart-memory entity "Jack"
openclaw smart-memory entity "EverWhen"
```

### `smart-memory core`

Display current core memory contents with per-section token counts and a usage bar.

```bash
openclaw smart-memory core
```

### `smart-memory reflect`

Manually trigger the full reflection pipeline (extraction, dedup, consolidation, decay, promotion).

```bash
openclaw smart-memory reflect
```

### `smart-memory export`

Export all memories and entities.

```bash
openclaw smart-memory export > memories.json
openclaw smart-memory export --format markdown > memories.md
```

**Options:**
- `--format <fmt>` — Output format: json|markdown (default: json)

### `smart-memory import`

Import from existing workspace memory files.

```bash
openclaw smart-memory import --source workspace
```

**Options:**
- `--source <source>` — Import source (currently only "workspace")

### `smart-memory reset`

Reset the database (delete all memories and entities). Core memory file is NOT deleted.

```bash
openclaw smart-memory reset --force
```

**Options:**
- `--force` — Skip confirmation prompt

---

## Architecture

### Component Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        memory-smart plugin                        │
│                                                                    │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────────┐   │
│  │  Providers  │  │   Stores   │  │      Lifecycle Hooks      │   │
│  ├────────────┤  ├────────────┤  ├──────────────────────────┤   │
│  │ Gemini     │  │ MemoryDB   │  │ auto-recall              │   │
│  │ OpenAI     │  │ EntityDB   │  │ (before_agent_start)     │   │
│  │ (factory)  │  │ CoreMemory │  │                          │   │
│  └────────────┘  └────────────┘  │ auto-capture             │   │
│                                   │ (agent_end)              │   │
│  ┌────────────┐  ┌────────────┐  │                          │   │
│  │   Tools    │  │ Extraction │  │ reflection               │   │
│  ├────────────┤  ├────────────┤  │ (background interval)    │   │
│  │ recall     │  │ extractor  │  └──────────────────────────┘   │
│  │ store      │  │ queue      │                                    │
│  │ forget     │  │ resolver   │  ┌──────────────────────────┐   │
│  │ core_upd   │  └────────────┘  │          CLI              │   │
│  │ entity_lkp │                   │  stats, search, reflect  │   │
│  └────────────┘                   │  export, import, reset   │   │
│                                   └──────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
          │                   │
          ▼                   ▼
   ┌────────────┐     ┌────────────────┐
   │  LanceDB   │     │  Gemini Flash  │
   │  (vectors) │     │  (extraction)  │
   └────────────┘     └────────────────┘
```

### Data Flow

```
User Message
     │
     ▼
[before_agent_start]  ──→  embed query ──→ search LanceDB ──→ inject context
     │
     ▼
[agent runs with injected memories]
     │
     ▼
[agent_end]  ──→  queue conversation for extraction
     │
     ▼
[reflection job runs every 6h]
     │
     ├──→ Extract: AI extraction via Gemini Flash
     ├──→ Store: embed + store facts (dedup check)
     ├──→ Link: resolve entities, update profiles
     ├──→ Consolidate: merge near-duplicates
     ├──→ Decay: reduce importance of stale memories
     └──→ Promote: surface important facts to core memory
```

### File Structure

```
memory-smart/
├── openclaw.plugin.json          # Plugin manifest
├── package.json                  # Dependencies
├── index.ts                      # Plugin entry point
├── config.ts                     # Config schema + validation
├── providers/
│   ├── types.ts                  # EmbeddingProvider interface
│   ├── factory.ts                # Provider factory
│   ├── gemini.ts                 # Gemini embeddings
│   └── openai.ts                 # OpenAI embeddings
├── store/
│   ├── memory-db.ts              # LanceDB memory store (facts)
│   ├── entity-db.ts              # LanceDB entity store
│   └── core-memory.ts            # Core memory file manager
├── extraction/
│   ├── extractor.ts              # AI fact extraction (Gemini Flash)
│   ├── entity-resolver.ts        # Entity name resolution + linking
│   └── queue.ts                  # Extraction queue (batch processing)
├── lifecycle/
│   ├── auto-recall.ts            # before_agent_start hook
│   ├── auto-capture.ts           # agent_end hook
│   └── reflection.ts             # Background reflection job
├── tools/
│   ├── memory-recall.ts          # memory_recall tool
│   ├── memory-store.ts           # memory_store tool
│   ├── memory-forget.ts          # memory_forget tool
│   ├── core-memory-update.ts     # core_memory_update tool
│   └── entity-lookup.ts          # entity_lookup tool
├── cli/
│   ├── commands.ts               # CLI command registration
│   └── import.ts                 # Workspace import tool
└── docs/
    └── PLUGIN.md                 # This documentation
```

---

## FAQ

### What API keys do I need?

At minimum, one of:
- `GEMINI_API_KEY` — Free Gemini embeddings + cheap Flash extraction (~$0.003/day)
- `OPENAI_API_KEY` — OpenAI embeddings ($0.02-0.13/M tokens)

Gemini is recommended: free embeddings, generous quotas, and Flash is very cheap for extraction.

### How much disk space does it use?

Typically under 50MB even with thousands of facts. LanceDB stores vectors efficiently (3072-dim × 4 bytes × 1000 facts ≈ 12MB plus metadata).

### Can I switch embedding providers?

Changing providers requires re-embedding all vectors. Use `smart-memory reset` and then `smart-memory import` to re-import from your workspace files.

### Does this replace my MEMORY.md and daily logs?

No. The plugin adds a layer ON TOP of your existing markdown files. It reads from them during import but never modifies them. Your existing `memory_search` and `memory_get` tools still work as fallback.

### How many tokens does auto-recall add per session?

Core memory: ~400 tokens (always). Relevant memories: 0-1,000 tokens (only if matches found). Total: ~400-1,400 tokens. Much less than manually reading MEMORY.md + daily logs (~5,000+ tokens).

### What happens if the Gemini API is down?

- Auto-recall: will warn and skip (no context injection, but agent still works)
- Auto-capture: conversations are queued and extracted later
- Reflection: scheduled run retries on next interval
- Tools: will return error messages to the agent

### Can I use this with multiple agents?

Yes, each agent gets its own LanceDB path via `store.dbPath`. Core memory files are also per-workspace.

---

*Plugin by Buddy 🐕 | Built for OpenClaw/Clawdbot*
