# memory-smart

**AI-powered memory plugin for OpenClaw** with provider-agnostic embeddings, core memory, entity profiles, and intelligent recall.

## Features

- **🧠 Core Memory** — Always-in-context block (~500 tokens) for identity, rules, and active context. Self-edited by the agent via tool calls.
- **🔍 Semantic Search** — LanceDB vector store with similarity search across stored facts, decisions, and preferences.
- **🏷️ Entity Profiles** — Structured knowledge about people, projects, and organizations with linked facts.
- **📥 Auto-Recall** — Relevant memories automatically injected into context each turn.
- **🤖 AI Extraction** — LLM-powered fact extraction from conversations (optional).
- **🌐 Provider-Agnostic Embeddings** — Gemini, OpenAI, or local models.

## Installation

```bash
# From npm (when published)
openclaw plugins install @openclaw/memory-smart

# From source
openclaw plugins install -l ./memory-smart
```

## Configuration

```json5
{
  plugins: {
    slots: { memory: "memory-smart" },
    entries: {
      "memory-smart": {
        enabled: true,
        config: {
          embedding: {
            provider: "gemini",  // "gemini" | "openai" | "auto"
            apiKey: "${GEMINI_API_KEY}",
            model: "gemini-embedding-001"
          },
          coreMemory: {
            enabled: true,
            maxTokens: 1500,
            filePath: "memory/core.md"
          },
          entities: {
            enabled: true,
            autoCreate: true,
            minMentionsToCreate: 3
          },
          autoRecall: {
            enabled: true,
            maxResults: 5,
            minScore: 0.3
          },
          store: {
            dbPath: "~/.openclaw/memory/smart-memory"
          }
        }
      }
    }
  }
}
```

## Tools

### `memory_recall`
Search through stored memories using semantic similarity.

```
memory_recall(query: "user preferences for dark mode", limit: 5)
```

### `memory_store`
Save important information to long-term memory.

```
memory_store(
  text: "Jack prefers dark mode on all applications",
  category: "preference",
  importance: 0.8
)
```

Categories: `preference`, `decision`, `fact`, `entity`, `rule`, `project`, `relationship`, `other`

### `memory_forget`
Delete specific memories (GDPR-compliant). Supports semantic search or direct ID.

```
memory_forget(query: "dark mode preference")
memory_forget(memoryId: "3e273479")  # partial IDs supported
```

### `core_memory_update`
Update the always-in-context core memory block.

```
core_memory_update(
  section: "rules",
  content: "- Never code on production repos",
  mode: "append"
)
```

Sections: `identity`, `human`, `rules`, `active_context`, `relationships`
Modes: `replace`, `append`, `remove_line`

### `entity_lookup`
Look up everything known about a person, project, or organization.

```
entity_lookup(name: "EverWhen", type: "project")
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    TIER 1: CORE                     │
│         Always in context (~500 tokens)             │
│   Identity, rules, active context, relationships    │
├─────────────────────────────────────────────────────┤
│                TIER 2: ACTIVE INDEX                 │
│         LanceDB vector store (on-demand)            │
│   Structured facts, entity profiles, preferences    │
│   Retrieved via semantic search                     │
├─────────────────────────────────────────────────────┤
│              TIER 3: ARCHIVE (external)             │
│         Markdown files + session transcripts        │
│   Searched via existing memory_search tool          │
└─────────────────────────────────────────────────────┘
```

## Embedding Providers

| Provider | Model | Dimensions | Notes |
|----------|-------|------------|-------|
| Gemini | gemini-embedding-001 | 3072 | Recommended, fast |
| OpenAI | text-embedding-3-large | 3072 | High quality |
| OpenAI | text-embedding-3-small | 1536 | Cost-effective |

## Storage

- **Vector DB**: LanceDB (file-based, no server required)
- **Core Memory**: Markdown file in workspace
- **Location**: `~/.openclaw/memory/smart-memory/` (configurable)

## Requirements

- OpenClaw 2026.1.20+
- Node.js 20+
- API key for embedding provider (Gemini or OpenAI)

## License

AGPL-3.0 (matches OpenClaw)
