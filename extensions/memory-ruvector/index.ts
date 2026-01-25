/**
 * Clawdbot Memory (Ruvector) Plugin
 *
 * Long-term memory with vector search using ruvector as the backend.
 * Provides lifecycle management for the ruvector connection and automatic
 * message indexing via hooks.
 *
 * Supports two modes:
 * 1. Remote service (url-based) - connects to external ruvector server
 * 2. Local database (dbPath-based) - uses local ruvector storage with hooks
 */

import type { ClawdbotPluginApi } from "clawdbot/plugin-sdk";

import { RuvectorService } from "./service.js";
import { createRuvectorSearchTool, createRuvectorFeedbackTool, createRuvectorGraphTool } from "./tool.js";
import { ruvectorConfigSchema, type RuvectorConfig } from "./config.js";
import { createDatabase } from "./db.js";
import { createEmbeddingProvider } from "./embeddings.js";
import { registerHooks } from "./hooks.js";
import type { MessageBatcher } from "./hooks.js";

// ============================================================================
// Config Parsing
// ============================================================================

/**
 * Remote service config (URL-based connection to external ruvector server).
 */
type RemoteServiceConfig = {
  url: string;
  apiKey?: string;
  collection: string;
  timeoutMs: number;
};

type ParsedConfig =
  | { mode: "remote"; remote: RemoteServiceConfig }
  | { mode: "local"; local: RuvectorConfig };

/**
 * Resolve environment variable references in config values.
 * Supports ${VAR_NAME} syntax.
 */
function resolveEnvVars(value: string): string {
  return value.replace(/\$\{([^}]+)\}/g, (_, envVar) => {
    const envValue = process.env[envVar];
    if (!envValue) {
      throw new Error(`ruvector: environment variable ${envVar} is not set`);
    }
    return envValue;
  });
}

/**
 * Parse and validate plugin configuration for ruvector.
 * Supports both remote (URL-based) and local (dbPath-based) modes.
 */
function parseConfig(pluginConfig: Record<string, unknown> | undefined): ParsedConfig {
  if (!pluginConfig || typeof pluginConfig !== "object") {
    throw new Error("ruvector: plugin config required");
  }

  // Detect mode based on config keys
  const hasUrl = typeof pluginConfig.url === "string" && pluginConfig.url.trim();
  const hasEmbedding = pluginConfig.embedding && typeof pluginConfig.embedding === "object";

  // Reject ambiguous config with both url and embedding
  if (hasUrl && hasEmbedding) {
    throw new Error(
      "ruvector: invalid config - cannot specify both 'url' (remote mode) and 'embedding' (local mode). Choose one.",
    );
  }

  // Remote mode: URL-based connection to external ruvector server
  if (hasUrl) {
    const url = pluginConfig.url as string;
    const apiKey = typeof pluginConfig.apiKey === "string"
      ? resolveEnvVars(pluginConfig.apiKey)
      : undefined;
    const collection = typeof pluginConfig.collection === "string"
      ? pluginConfig.collection
      : "clawdbot-memory";
    const timeoutMs = typeof pluginConfig.timeoutMs === "number"
      ? pluginConfig.timeoutMs
      : 5000;

    return {
      mode: "remote",
      remote: {
        url: url.trim(),
        apiKey,
        collection,
        timeoutMs,
      },
    };
  }

  // Local mode: local database with embeddings and hooks
  if (hasEmbedding) {
    let local: RuvectorConfig;
    try {
      local = ruvectorConfigSchema.parse(pluginConfig);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`ruvector: invalid local mode config: ${message}`);
    }
    return {
      mode: "local",
      local,
    };
  }

  throw new Error(
    "ruvector: invalid config - provide either 'url' for remote mode or 'embedding' for local mode",
  );
}

// ============================================================================
// Plugin Registration
// ============================================================================

/**
 * Register the ruvector memory plugin.
 * Sets up the service for lifecycle management and registers hooks for
 * automatic message indexing.
 */
export default function register(api: ClawdbotPluginApi): void {
  const parsed = parseConfig(api.pluginConfig);

  if (parsed.mode === "remote") {
    registerRemoteMode(api, parsed.remote);
  } else {
    registerLocalMode(api, parsed.local);
  }
}

/**
 * Register remote mode - connects to external ruvector server.
 *
 * Note: Remote mode is a legacy configuration pattern. For full feature support
 * including automatic message indexing via hooks, use local mode with 'embedding' config.
 */
function registerRemoteMode(api: ClawdbotPluginApi, config: RemoteServiceConfig): void {
  // Pass remote config to service - it handles the RuvectorServiceConfig type
  const service = new RuvectorService(
    {
      url: config.url,
      apiKey: config.apiKey,
      collection: config.collection,
      timeoutMs: config.timeoutMs,
    },
    api.logger,
  );

  api.logger.info(
    `memory-ruvector: plugin registered in remote mode (url: ${config.url}, collection: ${config.collection})`,
  );
  api.logger.warn(
    "memory-ruvector: remote mode does not support automatic message indexing hooks. " +
    "Use local mode with 'embedding' config for full hook support.",
  );

  // Create embedding function (placeholder for remote mode)
  const embedQuery = async (_text: string): Promise<number[]> => {
    api.logger.debug?.(`memory-ruvector: generating embedding for query`);
    // Placeholder: return dummy 1536-dim vector (OpenAI text-embedding-3-small)
    // Remote mode expects the server to handle embeddings
    return Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
  };

  // Register the ruvector_search tool
  api.registerTool(
    createRuvectorSearchTool({
      api,
      service,
      embedQuery,
    }),
    { name: "ruvector_search", optional: true },
  );

  // Register the service for lifecycle management
  api.registerService({
    id: "memory-ruvector",

    async start(_ctx) {
      await service.start();
      api.logger.info(
        `memory-ruvector: service started (url: ${config.url}, collection: ${config.collection})`,
      );
    },

    async stop(_ctx) {
      await service.stop();
      api.logger.info("memory-ruvector: service stopped");
    },
  });
}

/**
 * Register local mode - local database with embeddings and automatic indexing hooks.
 */
function registerLocalMode(api: ClawdbotPluginApi, config: RuvectorConfig): void {
  const resolvedDbPath = api.resolvePath(config.dbPath);
  const db = createDatabase({ ...config, dbPath: resolvedDbPath });
  const embeddings = createEmbeddingProvider(config.embedding, config.dimension);

  api.logger.info(
    `memory-ruvector: plugin registered in local mode (db: ${resolvedDbPath}, dim: ${config.dimension})`,
  );

  // Track batcher for cleanup
  let batcher: MessageBatcher | null = null;

  // =========================================================================
  // Register Hooks for Automatic Message Indexing
  // =========================================================================

  const hookResult = registerHooks(api, db, embeddings, config.hooks);
  batcher = hookResult.batcher;

  // =========================================================================
  // Register Tools
  // =========================================================================

  // Search tool
  api.registerTool(
    {
      name: "ruvector_search",
      label: "Vector Memory Search",
      description:
        "Search through indexed conversation history using semantic similarity. Use to recall past conversations, find relevant context, or understand user patterns.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query text" },
          limit: { type: "number", description: "Max results (default: 5)" },
          direction: {
            type: "string",
            enum: ["inbound", "outbound"],
            description: "Filter by message direction",
          },
          channel: { type: "string", description: "Filter by channel ID" },
          sessionKey: { type: "string", description: "Filter by session key" },
        },
        required: ["query"],
      },
      async execute(_toolCallId, params) {
        const {
          query,
          limit = 5,
          direction,
          channel,
          sessionKey,
        } = params as {
          query: string;
          limit?: number;
          direction?: "inbound" | "outbound";
          channel?: string;
          sessionKey?: string;
        };

        try {
          const vector = await embeddings.embed(query);
          const results = await db.search(vector, {
            limit,
            minScore: 0.1,
            filter: { direction, channel, sessionKey },
          });

          if (results.length === 0) {
            return {
              content: [{ type: "text", text: "No relevant messages found." }],
              details: { count: 0 },
            };
          }

          const text = results
            .map(
              (r, i) =>
                `${i + 1}. [${r.document.direction}] ${r.document.content.slice(0, 200)}${
                  r.document.content.length > 200 ? "..." : ""
                } (${(r.score * 100).toFixed(0)}%)`,
            )
            .join("\n");

          const sanitizedResults = results.map((r) => ({
            id: r.document.id,
            content: r.document.content,
            direction: r.document.direction,
            channel: r.document.channel,
            user: r.document.user,
            timestamp: r.document.timestamp,
            score: r.score,
          }));

          return {
            content: [
              { type: "text", text: `Found ${results.length} messages:\n\n${text}` },
            ],
            details: { count: results.length, messages: sanitizedResults },
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          api.logger.warn(`ruvector_search: search failed: ${message}`);
          return {
            content: [{ type: "text", text: `Search failed: ${message}` }],
            details: { error: message },
          };
        }
      },
    },
    { name: "ruvector_search", optional: true },
  );

  // Index tool (manual indexing)
  api.registerTool(
    {
      name: "ruvector_index",
      label: "Index Message",
      description:
        "Manually index a message or piece of information for future retrieval.",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "Text content to index" },
          direction: {
            type: "string",
            enum: ["inbound", "outbound"],
            description: "Message direction (default: outbound)",
          },
          channel: { type: "string", description: "Channel identifier" },
        },
        required: ["content"],
      },
      async execute(_toolCallId, params, ctx) {
        const {
          content,
          direction = "outbound",
          channel = "manual",
        } = params as {
          content: string;
          direction?: "inbound" | "outbound";
          channel?: string;
        };

        try {
          const vector = await embeddings.embed(content);

          // Check for duplicates
          const existing = await db.search(vector, { limit: 1, minScore: 0.95 });
          if (existing.length > 0) {
            return {
              content: [
                {
                  type: "text",
                  text: `Similar message already indexed: "${existing[0].document.content.slice(0, 100)}..."`,
                },
              ],
              details: { action: "duplicate", existingId: existing[0].document.id },
            };
          }

          const id = await db.insert({
            content,
            vector,
            direction,
            channel,
            sessionKey: ctx?.sessionKey,
            agentId: ctx?.agentId,
            timestamp: Date.now(),
          });

          return {
            content: [
              { type: "text", text: `Indexed: "${content.slice(0, 100)}..."` },
            ],
            details: { action: "created", id },
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          api.logger.warn(`ruvector_index: indexing failed: ${message}`);
          return {
            content: [{ type: "text", text: `Indexing failed: ${message}` }],
            details: { error: message },
          };
        }
      },
    },
    { name: "ruvector_index", optional: true },
  );

  // SONA feedback tool
  api.registerTool(
    createRuvectorFeedbackTool({
      api,
      db,
    }),
    { name: "ruvector_feedback", optional: true },
  );

  // GNN graph tool
  api.registerTool(
    createRuvectorGraphTool({
      api,
      db,
    }),
    { name: "ruvector_graph", optional: true },
  );

  // =========================================================================
  // Register CLI Commands
  // =========================================================================

  api.registerCli(
    ({ program }) => {
      const rv = program
        .command("ruvector")
        .description("ruvector memory plugin commands");

      rv.command("stats")
        .description("Show memory statistics")
        .action(async () => {
          const count = await db.count();
          console.log(`Total indexed messages: ${count}`);
          console.log(`Database path: ${resolvedDbPath}`);
          console.log(`Vector dimension: ${config.dimension}`);
          console.log(`Distance metric: ${config.metric}`);
          console.log(`Hooks enabled: ${config.hooks.enabled}`);
        });

      rv.command("search")
        .description("Search indexed messages")
        .argument("<query>", "Search query")
        .option("--limit <n>", "Max results", "5")
        .option("--direction <dir>", "Filter by direction (inbound/outbound)")
        .option("--channel <ch>", "Filter by channel")
        .action(async (query, opts) => {
          const parsedLimit = parseInt(opts.limit, 10);
          const limit = Number.isNaN(parsedLimit) ? 5 : Math.max(1, Math.min(parsedLimit, 100));
          const vector = await embeddings.embed(query);
          const results = await db.search(vector, {
            limit,
            minScore: 0.1,
            filter: {
              direction: opts.direction,
              channel: opts.channel,
            },
          });

          const output = results.map((r) => ({
            id: r.document.id,
            content: r.document.content,
            direction: r.document.direction,
            channel: r.document.channel,
            timestamp: new Date(r.document.timestamp).toISOString(),
            score: r.score.toFixed(3),
          }));
          console.log(JSON.stringify(output, null, 2));
        });

      rv.command("flush")
        .description("Force flush pending batch")
        .action(async () => {
          if (batcher !== null) {
            await batcher.forceFlush();
            api.logger.info?.("Batch flushed.");
          } else {
            api.logger.info?.("No active batcher (hooks may be disabled).");
          }
        });

      // SONA learning statistics
      rv.command("sona-stats")
        .description("Show SONA learning statistics")
        .action(async () => {
          const hasSONASupport = "getSONAStats" in db && typeof (db as Record<string, unknown>).getSONAStats === "function";

          if (hasSONASupport) {
            const sonaDb = db as typeof db & { getSONAStats: () => Promise<{
              totalFeedbackEntries: number;
              averageRelevanceScore: number;
              learningIterations: number;
              lastTrainingTime: number | null;
              modelVersion: string;
            }> };
            const stats = await sonaDb.getSONAStats();
            console.log("SONA Learning Statistics:");
            console.log(`  Total feedback entries: ${stats.totalFeedbackEntries}`);
            console.log(`  Average relevance score: ${(stats.averageRelevanceScore * 100).toFixed(1)}%`);
            console.log(`  Learning iterations: ${stats.learningIterations}`);
            console.log(`  Last training: ${stats.lastTrainingTime ? new Date(stats.lastTrainingTime).toISOString() : "Never"}`);
            console.log(`  Model version: ${stats.modelVersion}`);
          } else {
            const count = await db.count();
            console.log("SONA Learning Statistics (limited - full SONA not enabled):");
            console.log(`  Total indexed documents: ${count}`);
            console.log(`  Feedback collection: Not available`);
            console.log(`  Note: Enable ruvector with SONA extension for full learning statistics`);
          }
        });

      // GNN graph query
      rv.command("graph")
        .description("Execute a Cypher query on the knowledge graph")
        .argument("<query>", "Cypher query to execute")
        .action(async (query) => {
          const hasGraphSupport = "graphQuery" in db && typeof (db as Record<string, unknown>).graphQuery === "function";

          if (!hasGraphSupport) {
            console.log("GNN graph features not available.");
            console.log("Requires ruvector with graph extension enabled.");
            return;
          }

          const graphDb = db as typeof db & { graphQuery: (cypher: string) => Promise<unknown[]> };
          const results = await graphDb.graphQuery(query);

          if (results.length === 0) {
            console.log("No results found.");
          } else {
            console.log(JSON.stringify(results, null, 2));
          }
        });

      // GNN neighbors lookup
      rv.command("neighbors")
        .description("Show related nodes for a given document ID")
        .argument("<id>", "Document/node ID to find neighbors for")
        .option("--depth <n>", "Traversal depth (1-5)", "1")
        .action(async (id, opts) => {
          const hasGraphSupport = "graphNeighbors" in db && typeof (db as Record<string, unknown>).graphNeighbors === "function";

          if (!hasGraphSupport) {
            console.log("GNN graph features not available.");
            console.log("Requires ruvector with graph extension enabled.");
            return;
          }

          const parsedDepth = parseInt(opts.depth, 10);
          const depth = Number.isNaN(parsedDepth) ? 1 : Math.max(1, Math.min(parsedDepth, 5));
          const graphDb = db as typeof db & { graphNeighbors: (nodeId: string, depth: number) => Promise<unknown[]> };
          const neighbors = await graphDb.graphNeighbors(id, depth);

          if (neighbors.length === 0) {
            console.log(`No neighbors found for node ${id} at depth ${depth}.`);
          } else {
            console.log(`Found ${neighbors.length} neighbor(s) at depth ${depth}:`);
            console.log(JSON.stringify(neighbors, null, 2));
          }
        });
    },
    { commands: ["ruvector"] },
  );

  // =========================================================================
  // Register Service
  // =========================================================================

  api.registerService({
    id: "memory-ruvector",

    start() {
      api.logger.info(
        `memory-ruvector: service started (hooks: ${config.hooks.enabled ? "enabled" : "disabled"})`,
      );
    },

    async stop() {
      // Flush any pending messages before shutdown and clean up batcher
      if (batcher !== null) {
        await batcher.forceFlush();
        batcher.destroy();
      }
      await db.close();
      api.logger.info("memory-ruvector: service stopped");
    },
  });
}
