---
summary: "memory-ruvector plugin: High-performance vector memory with ruvector (semantic search, auto-indexing, RAG)"
read_when:
  - You want semantic vector search for conversation history
  - You want automatic message indexing with hooks
  - You are configuring the ruvector memory plugin
---

# Memory Ruvector (plugin)

High-performance vector memory for Clawdbot using [ruvector](https://github.com/ruvnet/ruvector) - a Rust-based vector database with self-learning capabilities (SONA), Cypher query support, and extreme compression.

Use cases:
- **Semantic memory**: recall past conversations by meaning, not keywords
- **RAG integration**: build knowledge bases from indexed messages
- **Intent detection**: find similar user requests across sessions
- **Pattern analysis**: discover recurring themes in conversations

Performance characteristics (from ruvector benchmarks):
- Query latency: p50 61us, p99 < 1ms
- Throughput: 16,400 QPS (k=10, 1536-dim vectors)
- Memory: 200MB for 1M vectors with compression
- Index build: O(n log n) with HNSW

## Install

```bash
clawdbot plugins install @clawdbot/memory-ruvector
```

Restart the Gateway afterwards.

## Config

Set config under `plugins.entries.memory-ruvector.config`:

### Local mode (recommended)

Local mode runs an embedded ruvector database with full hook support for automatic message indexing.

```json5
{
  plugins: {
    entries: {
      "memory-ruvector": {
        enabled: true,
        config: {
          embedding: {
            provider: "openai",           // "openai" | "voyage" | "local"
            apiKey: "${OPENAI_API_KEY}",  // supports env var syntax
            model: "text-embedding-3-small"
          },
          dbPath: "~/.clawdbot/memory/ruvector",  // optional
          metric: "cosine",               // "cosine" | "euclidean" | "dot"
          hooks: {
            enabled: true,
            indexInbound: true,           // index user messages
            indexOutbound: true,          // index bot responses
            indexAgentResponses: true,    // index full agent turns
            batchSize: 10,                // messages per batch
            debounceMs: 500               // delay before flushing
          }
        }
      }
    }
  }
}
```

### Remote mode

Remote mode connects to an external ruvector server. Note: remote mode does not support automatic message indexing hooks.

```json5
{
  plugins: {
    entries: {
      "memory-ruvector": {
        enabled: true,
        config: {
          url: "https://ruvector.example.com",
          apiKey: "${RUVECTOR_API_KEY}",
          collection: "clawdbot-memory",
          timeoutMs: 5000
        }
      }
    }
  }
}
```

## Embedding providers

| Provider | Models | Dimensions | Notes |
|----------|--------|------------|-------|
| OpenAI | text-embedding-3-small, text-embedding-3-large | 1536, 3072 | Default, reliable |
| Voyage AI | voyage-3, voyage-3-large, voyage-code-3 | 1024 | Best for RAG |
| Local | Any OpenAI-compatible API | Configurable | Self-hosted |

Dimension is auto-detected from the model name. Override with the `dimension` config key if needed.

### Voyage AI example

```json5
{
  embedding: {
    provider: "voyage",
    apiKey: "${VOYAGE_API_KEY}",
    model: "voyage-3"
  }
}
```

### Local (OpenAI-compatible) example

```json5
{
  embedding: {
    provider: "local",
    baseUrl: "http://localhost:11434/v1",
    model: "nomic-embed-text"
  },
  dimension: 768  // must match your local model
}
```

## Automatic message indexing

When hooks are enabled (default in local mode), messages are automatically indexed:

| Hook | What gets indexed |
|------|-------------------|
| `message_received` | Incoming user messages |
| `message_sent` | Outgoing bot responses |
| `agent_end` | Full agent conversation turns |

**Smart batching**: Messages are batched (default: 10) with debouncing (default: 500ms) to optimize database writes and embedding API calls.

**Content filtering**: System markers, commands (`/`), and very short/long messages are automatically filtered out.

## CLI

```bash
# Show memory statistics
clawdbot ruvector stats

# Search indexed messages
clawdbot ruvector search "user preferences" --limit 10

# Filter by direction
clawdbot ruvector search "bug reports" --direction inbound

# Filter by channel
clawdbot ruvector search "feature requests" --channel telegram

# Force flush pending batch
clawdbot ruvector flush
```

## Agent tools

### ruvector_search

Search through indexed conversation history using semantic similarity.

```json5
{
  query: "What did the user say about their preferences?",
  limit: 5,              // max results (default: 5)
  direction: "inbound",  // optional: "inbound" | "outbound"
  channel: "telegram",   // optional: filter by channel
  sessionKey: "abc123"   // optional: filter by session
}
```

Returns matching messages with similarity scores. Results are formatted with direction, content preview, and match percentage.

### ruvector_index

Manually index a message or piece of information for future retrieval.

```json5
{
  content: "User prefers dark mode and minimal notifications",
  direction: "outbound",  // optional: "inbound" | "outbound" (default: outbound)
  channel: "manual"       // optional: channel identifier
}
```

Automatically detects and skips duplicates (>95% similarity).

## Coexistence with memory-core

This plugin can run alongside the built-in `memory-core` plugin:
- Different plugin IDs, no conflicts
- Similar configuration patterns
- Both can be enabled simultaneously for different use cases

Use `memory-ruvector` when you need:
- Sub-millisecond query latency
- Extreme memory efficiency (compressed vectors)
- Self-learning search improvements (SONA)
- Cypher-style graph queries (advanced)

## SONA Self-Learning

SONA (Self-Organizing Neural Architecture) improves search accuracy over time by learning from user feedback without manual retraining.

### Configuration

```json5
{
  plugins: {
    entries: {
      "memory-ruvector": {
        enabled: true,
        config: {
          embedding: {
            provider: "openai",
            apiKey: "${OPENAI_API_KEY}"
          },
          sona: {
            enabled: true,              // Enable self-learning
            hiddenDim: 256,             // Hidden dimension for neural architecture
            learningRate: 0.01,         // How quickly to adapt (0.001-0.1)
            qualityThreshold: 0.5,      // Minimum quality for learning (0-1)
            backgroundIntervalMs: 30000 // Background learning interval
          }
        }
      }
    }
  }
}
```

### How it works

1. **Trajectory Recording**: Every search query and its results are recorded as a trajectory
2. **Feedback Collection**: When users interact with results (click, use, dismiss), feedback is recorded
3. **Pattern Learning**: Graph Neural Networks analyze feedback to identify patterns
4. **Adaptive Ranking**: Future searches are re-ranked based on learned patterns

### ruvector_feedback tool

Record feedback on search results to improve future searches.

```json5
{
  searchId: "search-abc123",       // The original search ID
  selectedResultId: "result-456",  // The result being evaluated
  relevanceScore: 0.95             // Relevance score from 0 to 1
}
```

### CLI

```bash
# View SONA learning statistics
clawdbot ruvector sona-stats

# Output includes:
# - Total feedback recorded
# - Patterns learned
# - Accuracy improvement (%)
# - Recent trajectory count
```

## Graph Queries (Cypher)

Query message relationships using Neo4j-compatible Cypher syntax. This enables finding conversation threads, reply chains, and topic relationships.

### Configuration

```json5
{
  plugins: {
    entries: {
      "memory-ruvector": {
        enabled: true,
        config: {
          embedding: {
            provider: "openai",
            apiKey: "${OPENAI_API_KEY}"
          },
          graph: {
            enabled: true,              // Enable graph features
            autoLink: true,             // Auto-create edges for replies/threads
            maxDepth: 5                 // Maximum traversal depth
          }
        }
      }
    }
  }
}
```

### Linking messages

**Automatic linking** (when `autoLink: true`):
- Messages in the same conversation are linked with `IN_CONVERSATION`
- Reply messages are linked with `REPLIED_BY`
- Messages from the same user are linked with `FROM_USER`

**Manual linking** via the `ruvector_graph` tool:

```json5
{
  action: "link",
  sourceId: "msg-123",
  targetId: "msg-456",
  relationship: "RELATES_TO",
  properties: { reason: "same topic" }
}
```

### ruvector_graph tool

Execute graph operations on the message store.

**Actions:**

| Action | Description | Parameters |
|--------|-------------|------------|
| `query` | Execute Cypher query | `cypher`, `params` |
| `neighbors` | Find connected nodes | `nodeId`, `depth`, `relationship` |
| `link` | Create edge between nodes | `sourceId`, `targetId`, `relationship`, `properties` |

**Query example:**

```json5
{
  action: "query",
  cypher: "MATCH (n)-[:REPLIED_BY]->(m) WHERE n.channel = $channel RETURN m.content LIMIT 10",
  params: { channel: "telegram" }
}
```

**Neighbors example:**

```json5
{
  action: "neighbors",
  nodeId: "msg-123",
  depth: 2,
  relationship: "IN_CONVERSATION"
}
```

### Cypher examples

Find all replies to a message:

```cypher
MATCH (original {id: $messageId})-[:REPLIED_BY*1..3]->(reply)
RETURN reply.content, reply.timestamp
ORDER BY reply.timestamp ASC
```

Find conversation threads by topic:

```cypher
MATCH (n)-[:IN_CONVERSATION]->(m)
WHERE n.content CONTAINS $topic
RETURN DISTINCT n.conversationId, COUNT(m) AS messageCount
ORDER BY messageCount DESC
LIMIT 10
```

Find user interaction patterns:

```cypher
MATCH (u:User)-[:SENT]->(m)-[:REPLIED_BY]->(r)
WHERE u.id = $userId
RETURN m.content AS original, r.content AS reply, r.timestamp
ORDER BY r.timestamp DESC
LIMIT 20
```

Get messages between two time ranges:

```cypher
MATCH (n)
WHERE n.timestamp >= $startTime AND n.timestamp <= $endTime
RETURN n.content, n.channel, n.direction
ORDER BY n.timestamp ASC
```

### CLI

```bash
# Execute a Cypher query
clawdbot ruvector graph "MATCH (n)-[:REPLIED_BY]->(m) RETURN m.content LIMIT 5"

# Find neighbors of a message
clawdbot ruvector neighbors msg-123 --depth 2 --relationship IN_CONVERSATION

# Link two messages manually
clawdbot ruvector link msg-123 msg-456 --relationship RELATES_TO
```

## Error handling

The plugin handles failures gracefully:
- **Connection failures**: Falls back to in-memory storage
- **Embedding API errors**: 30-second timeout, response validation
- **Service unavailable**: Tools return `disabled: true`
- **Batch failures**: Retry with limits, reject pending on shutdown

## Config reference

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `embedding.provider` | string | `"openai"` | Embedding provider |
| `embedding.apiKey` | string | - | API key (supports `${ENV_VAR}`) |
| `embedding.model` | string | `"text-embedding-3-small"` | Embedding model |
| `embedding.baseUrl` | string | - | Custom API base URL |
| `dbPath` | string | `~/.clawdbot/memory/ruvector` | Database directory |
| `dimension` | number | auto | Vector dimension |
| `metric` | string | `"cosine"` | Distance metric |
| `hooks.enabled` | boolean | `true` | Enable auto-indexing |
| `hooks.indexInbound` | boolean | `true` | Index user messages |
| `hooks.indexOutbound` | boolean | `true` | Index bot messages |
| `hooks.indexAgentResponses` | boolean | `true` | Index agent turns |
| `hooks.batchSize` | number | `10` | Messages per batch |
| `hooks.debounceMs` | number | `500` | Batch flush delay |
