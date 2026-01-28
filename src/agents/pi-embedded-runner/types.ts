/**
 * Pi runtime-specific types.
 *
 * For shared agent result types, see ../runtime-result-types.ts
 */

/**
 * Result from a Pi session compaction operation.
 */
export type EmbeddedPiCompactResult = {
  ok: boolean;
  compacted: boolean;
  reason?: string;
  result?: {
    summary: string;
    firstKeptEntryId: string;
    tokensBefore: number;
    tokensAfter?: number;
    details?: unknown;
  };
};

// Re-export shared types for convenience
export {
  type AgentRunMeta,
  type AgentRunResultMeta,
  type AgentRunPayload,
  type AgentRunResult,
  type AgentRuntimeKind,
  type AgentSandboxInfo,
} from "../runtime-result-types.js";
