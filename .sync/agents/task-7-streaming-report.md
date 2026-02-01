# Task 7: Draft Streaming + Chunking Analysis Report

## Current State

### Streaming Architecture
- `subscribeEmbeddedPiSession()` in `pi-embedded-subscribe.ts` handles all streaming events
- DM channel streaming is controlled per-session via `blockReplyBreak` param (`text_end` | `message_end`)
- Block reply chunking uses `EmbeddedBlockChunker` (pi-embedded-block-chunker.ts)

### Chunking Modes
The `BlockReplyChunking` config supports:
- **breakPreference**: `paragraph` (default) | `newline` | `sentence`
- **minChars / maxChars**: soft/hard boundaries for chunk splits
- Config path: `agents.defaults.blockStreamingChunk`

### Current Behavior
1. **Text streaming**: Delta events accumulate in `deltaBuffer` + `blockBuffer`
2. **Block chunker**: Splits at paragraph/newline/sentence boundaries within min/max range
3. **Fence-aware**: Code blocks are handled via `parseFenceSpans()` - safe fence breaks close/reopen fences
4. **Think/Final tags**: Stripped across chunk boundaries (stateful `blockState.thinking`/`blockState.final`)
5. **Duplicate suppression**: Messaging tool sent texts are tracked to avoid double-delivery

### Streaming Control
- `reasoningMode`: `off` | `on` | `stream` - controls thinking output
- `shouldEmitPartialReplies`: gates delta streaming when reasoning is on
- `blockReplyBreak`: `text_end` (before tools) or `message_end` (after full message)
- Compaction retry: waits via promise chain when context window overflows

## Optimization Opportunities

### 1. Adaptive Chunking (Recommended)
Currently, `breakPreference` is static per-session. An adaptive approach would:
- **Code blocks**: Use block-unit chunking (emit entire fenced blocks as single chunks)
- **Prose**: Use paragraph-level chunking
- **Lists**: Use list-item boundaries

Implementation: Extend `EmbeddedBlockChunker` to detect content type and adjust `breakPreference` per-segment. Low complexity, high UX impact.

### 2. Token-Aware Chunking
Current chunking is character-based (`minChars`/`maxChars`). Token-based limits would be more accurate for LLM context management but adds overhead. Not recommended unless char-based becomes a bottleneck.

### 3. Streaming Latency
First-chunk latency is gated by `minChars`. For interactive DM channels, reducing `minChars` for first chunk only would improve perceived responsiveness. Could add `firstChunkMinChars` config option.

## Recommendation
- **Priority 1**: Adaptive chunking per content type (fence-aware already exists; extend to prefer block-level for code)
- **Priority 2**: First-chunk fast-path (lower minChars for initial chunk)
- No critical issues found; current implementation is robust with proper fence splitting, duplicate suppression, and stateful tag stripping.
