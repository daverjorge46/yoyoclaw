# feat(memory): Add ruvector Vector Database Plugin

## Summary

This PR introduces `@clawdbot/memory-ruvector`, a new memory extension that provides high-performance vector storage and semantic search capabilities using [ruvector](https://github.com/ruvnet/ruvector) - a Rust-based vector database with self-learning capabilities.

**Key highlights:**
- Semantic memory for conversation history with automatic indexing
- RAG-ready architecture for knowledge base integration
- Multiple embedding providers (OpenAI, Voyage AI, local)
- Production-ready with graceful degradation and comprehensive error handling

## Motivation

While clawdbot already has excellent memory capabilities via `memory-lancedb`, this implementation includes:

1. **Self-Learning (SONA)**: Graph Neural Networks that improve search accuracy over time based on user feedback - configurable learning rate, trajectory recording, and pattern adaptation
2. **Cypher Query Support**: Neo4j-compatible graph queries for conversation thread traversal, reply chains, and topic relationship discovery
3. **Extreme Compression**: 2-32x memory reduction via adaptive quantization (scalar, int4, product, binary)
4. **Sub-millisecond Queries**: p50 latency of 61μs, 16,400 QPS for k=10 searches
5. **Rust Performance**: Native Rust core with Node.js bindings via NAPI
6. **Automatic Message Linking**: Auto-create graph edges for replies, conversation threads, and user relationships

## Architecture

### Dual-Mode Operation

```yaml
# Remote Mode - Connect to external ruvector server
plugins:
  memory-ruvector:
    url: https://ruvector.example.com
    apiKey: ${RUVECTOR_API_KEY}
    collection: clawdbot-memory

# Local Mode - Embedded database with full hook support
plugins:
  memory-ruvector:
    embedding:
      provider: openai
      apiKey: ${OPENAI_API_KEY}
      model: text-embedding-3-small
    dbPath: ~/.clawdbot/memory/ruvector
    hooks:
      enabled: true
```

### File Structure

```
extensions/memory-ruvector/
├── index.ts          # Plugin registration, dual-mode routing
├── service.ts        # Lifecycle management (start/stop), SONA + Graph init
├── client.ts         # RuvectorClient wrapper for native API
├── db.ts             # High-level database abstraction
├── embeddings.ts     # Multi-provider embedding support
├── hooks.ts          # Auto-indexing via message hooks
├── tool.ts           # Agent tools (search, feedback, graph)
├── config.ts         # Configuration schema with validation
├── types.ts          # TypeScript type definitions
├── index.test.ts     # Vitest test suite (52 tests)
├── package.json      # Dependencies
└── tsconfig.json     # TypeScript config
```

## Features

### 1. Automatic Message Indexing

Messages are automatically indexed via clawdbot hooks:

| Hook | Purpose |
|------|---------|
| `message_received` | Index incoming user messages |
| `message_sent` | Index outgoing bot responses |
| `agent_end` | Index full agent conversation turns |

**Smart Batching**: Messages are batched (default: 10) with debouncing (default: 500ms) to optimize database writes and embedding API calls.

**Content Filtering**: System markers, commands (`/`), and very short/long messages are automatically filtered out.

### 2. Semantic Search Tool

Agents can search conversation history using natural language:

```typescript
// Tool: ruvector_search
{
  query: "What did the user say about their preferences?",
  limit: 5,
  direction: "inbound",  // Optional: filter by direction
  channel: "telegram"    // Optional: filter by channel
}
```

### 3. Manual Indexing Tool

For explicit memory storage:

```typescript
// Tool: ruvector_index
{
  content: "User prefers dark mode and minimal notifications",
  direction: "outbound",
  channel: "system"
}
```

### 4. CLI Commands

```bash
# Show memory statistics
clawdbot ruvector stats

# Search indexed messages
clawdbot ruvector search "user preferences" --limit 10 --direction inbound

# Force flush pending batch
clawdbot ruvector flush
```

### 5. Multiple Embedding Providers

| Provider | Models | Dimensions | Notes |
|----------|--------|------------|-------|
| OpenAI | text-embedding-3-small/large | 1536/3072 | Default |
| Voyage AI | voyage-3, voyage-3-large, voyage-code-3 | 1024 | Best for RAG |
| Local | Any OpenAI-compatible API | Configurable | Self-hosted |

Auto-dimension detection based on model name.

## Implementation Details

### Error Handling

- **Connection failures**: Graceful fallback to in-memory storage
- **Embedding API errors**: 30-second timeout, response validation, dimension checking
- **Service unavailable**: Tools return `disabled: true` response
- **Batch failures**: Retry with limits, reject pending on shutdown

### Resource Management

- **Timer cleanup**: All timers cleared on destroy
- **Promise handling**: Pending promises rejected on shutdown
- **Connection lifecycle**: Proper connect/disconnect with deduplication
- **Batcher shutdown**: `forceFlush()` with 30s timeout and 3 retry limit

### Type Safety

- Zero `any` types
- Custom `RuvectorError` class with error codes
- Comprehensive TypeScript interfaces
- Runtime validation for API responses

### Configuration Validation

- Environment variable resolution (`${VAR_NAME}` syntax)
- Unknown key detection with helpful error messages
- Required field validation (apiKey for non-local providers)
- Dimension auto-detection from model name

## Test Coverage

52 test cases covering:
- RuvectorClient operations (connect, insert, search, delete)
- RuvectorService lifecycle
- Configuration parsing and validation
- EmbeddingProvider API calls
- MessageBatcher batching behavior
- Content filtering logic
- Tool parameter validation
- Error handling paths
- SONA self-learning (enable, feedback recording, pattern finding, stats)
- Graph features (init, edge management, Cypher queries, neighbors, message linking)

## Dependencies

```json
{
  "dependencies": {
    "@sinclair/typebox": "0.34.47",
    "ruvector": "0.1.96"
  },
  "devDependencies": {
    "clawdbot": "workspace:*"
  },
  "peerDependencies": {
    "clawdbot": "*"
  }
}
```

## Performance Characteristics

Based on ruvector benchmarks:
- **Query Latency**: p50 61μs, p99 < 1ms
- **Throughput**: 16,400 QPS (k=10, 1536-dim vectors)
- **Memory**: 200MB for 1M vectors with compression
- **Index Build**: O(n log n) with HNSW

## Migration Path

For users of `memory-lancedb`:
1. Both plugins can coexist - different plugin IDs
2. Similar configuration structure
3. Same embedding provider options
4. Compatible tool interface patterns

## Breaking Changes

None - this is a new optional plugin.

## Checklist

- [x] Plugin follows clawdbot extension patterns
- [x] Comprehensive TypeScript types
- [x] Error handling with graceful degradation
- [x] Test coverage (52 tests)
- [x] CLI commands registered
- [x] Documentation (integration analysis, SONA, Graph queries)
- [x] Configuration validation
- [x] Resource cleanup on shutdown
- [x] SONA self-learning implementation
- [x] Cypher graph query support

## Test Plan

- [ ] Run `pnpm test extensions/memory-ruvector/index.test.ts`
- [ ] Verify plugin loads: `clawdbot config get plugins`
- [ ] Test local mode with OpenAI embeddings
- [ ] Test CLI commands: `clawdbot ruvector stats`
- [ ] Send messages and verify auto-indexing
- [ ] Test search tool via agent interaction
- [ ] Verify graceful shutdown flushes pending batch

## Documentation

- Integration analysis: `docs/ruvector-integration-analysis.md`
- Configuration: See `config.ts` uiHints for all options

---

Generated with [Claude Code](https://claude.ai/code)
