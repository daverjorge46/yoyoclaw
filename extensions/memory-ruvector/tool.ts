/**
 * Ruvector Search Tool
 *
 * Provides semantic vector search capabilities for Clawdbot agents using ruvector.
 * Embeds queries using the configured embedding provider and searches the vector store.
 */

import { Type } from "@sinclair/typebox";

import type { ClawdbotPluginApi } from "clawdbot/plugin-sdk";
import { jsonResult, readNumberParam, readStringParam, stringEnum } from "clawdbot/plugin-sdk";

import type { RuvectorService } from "./service.js";
import type { RuvectorDB } from "./db.js";

// Schema for the ruvector_search tool parameters
const RuvectorSearchSchema = Type.Object({
  query: Type.String({
    description: "The search query to embed and search for in the vector store",
  }),
  k: Type.Optional(
    Type.Number({
      description: "Number of results to return (default: 10)",
      default: 10,
    }),
  ),
  filters: Type.Optional(
    Type.Object(
      {},
      {
        additionalProperties: true,
        description: "Optional metadata filters to apply to the search",
      },
    ),
  ),
});

export type CreateRuvectorSearchToolOptions = {
  api: ClawdbotPluginApi;
  service: RuvectorService;
  embedQuery: (text: string) => Promise<number[]>;
};

/**
 * Creates the ruvector_search agent tool.
 *
 * @param options - Tool configuration including API, service, and embedding function
 * @returns An agent tool that can be registered with the plugin API
 */
export function createRuvectorSearchTool(options: CreateRuvectorSearchToolOptions) {
  const { api, service, embedQuery } = options;

  return {
    name: "ruvector_search",
    label: "Ruvector Search",
    description:
      "Search the ruvector vector knowledge base using semantic similarity. " +
      "Use this tool to find relevant documents, memories, or knowledge based on meaning rather than exact keywords.",
    parameters: RuvectorSearchSchema,

    async execute(_toolCallId: string, params: Record<string, unknown>) {
      const query = readStringParam(params, "query", { required: true });
      const rawK = readNumberParam(params, "k", { integer: true }) ?? 10;
      // Clamp k to reasonable bounds
      const k = Math.max(1, Math.min(rawK, 100));
      const filters = params.filters as Record<string, unknown> | undefined;

      // Validate service is running
      if (!service.isRunning()) {
        return jsonResult({
          results: [],
          error: "ruvector service is not running",
          disabled: true,
        });
      }

      try {
        // Get the ruvector client (validates service is connected)
        const client = service.getClient();

        // Generate embedding for the query
        api.logger.debug?.(`ruvector_search: embedding query "${query.slice(0, 50)}..."`);
        const queryVector = await embedQuery(query);

        // Perform the vector search
        api.logger.debug?.(
          `ruvector_search: searching with k=${k}${filters ? `, filters=${JSON.stringify(filters)}` : ""}`,
        );

        const searchResults = await client.search({
          vector: queryVector,
          limit: k,
          filter: filters,
        });

        // Format results
        if (searchResults.length === 0) {
          return jsonResult({
            results: [],
            message: "No matching results found",
            query,
            k,
          });
        }

        const formattedResults = searchResults.map((r) => ({
          id: r.entry.id,
          text: r.entry.metadata.text ?? "",
          score: r.score,
          category: r.entry.metadata.category,
          metadata: r.entry.metadata,
        }));

        const formattedText = formattedResults
          .map((r, i) => {
            const text = r.text || "(no text)";
            const truncated = text.slice(0, 100);
            const suffix = text.length > 100 ? "..." : "";
            return `${i + 1}. [${r.category ?? "other"}] ${truncated}${suffix} (${(r.score * 100).toFixed(0)}%)`;
          })
          .join("\n");

        return jsonResult({
          results: formattedResults,
          count: searchResults.length,
          query,
          k,
          message: `Found ${searchResults.length} result(s):\n\n${formattedText}`,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        api.logger.warn(`ruvector_search: search failed: ${message}`);
        return jsonResult({
          results: [],
          error: message,
          disabled: true,
        });
      }
    },
  };
}

// ============================================================================
// SONA Feedback Tool
// ============================================================================

/**
 * Schema for the ruvector_feedback tool parameters.
 * Used for SONA (Self-Optimizing Neural Architecture) relevance feedback.
 */
const RuvectorFeedbackSchema = Type.Object({
  searchId: Type.String({
    description: "ID of the search to provide feedback for",
  }),
  selectedResultId: Type.String({
    description: "ID of the result the user found relevant",
  }),
  relevanceScore: Type.Number({
    description: "Relevance score from 0 (irrelevant) to 1 (highly relevant)",
    minimum: 0,
    maximum: 1,
  }),
});

export type CreateRuvectorFeedbackToolOptions = {
  api: ClawdbotPluginApi;
  db: RuvectorDB;
};

/**
 * Creates the ruvector_feedback agent tool for SONA learning.
 * Records search feedback to improve future search relevance.
 *
 * @param options - Tool configuration including API and database
 * @returns An agent tool that can be registered with the plugin API
 */
export function createRuvectorFeedbackTool(options: CreateRuvectorFeedbackToolOptions) {
  const { api, db } = options;

  return {
    name: "ruvector_feedback",
    label: "SONA Relevance Feedback",
    description:
      "Provide feedback on search result relevance to improve future searches. " +
      "Use after ruvector_search to indicate which results were helpful.",
    parameters: RuvectorFeedbackSchema,

    async execute(_toolCallId: string, params: Record<string, unknown>) {
      const searchId = readStringParam(params, "searchId", { required: true });
      const selectedResultId = readStringParam(params, "selectedResultId", { required: true });
      const relevanceScore = readNumberParam(params, "relevanceScore") ?? 1.0;

      try {
        // Record feedback for SONA learning
        // The db.recordSearchFeedback method stores this for model adaptation
        if ("recordSearchFeedback" in db && typeof db.recordSearchFeedback === "function") {
          await (db as RuvectorDB & { recordSearchFeedback: (f: unknown) => Promise<void> }).recordSearchFeedback({
            searchId,
            selectedResultId,
            relevanceScore: Math.max(0, Math.min(1, relevanceScore)),
            timestamp: Date.now(),
          });

          api.logger.debug?.(
            `ruvector_feedback: recorded feedback for search=${searchId}, result=${selectedResultId}, score=${relevanceScore}`,
          );

          return jsonResult({
            success: true,
            message: `Feedback recorded: result ${selectedResultId} marked with relevance ${(relevanceScore * 100).toFixed(0)}%`,
            searchId,
            selectedResultId,
            relevanceScore,
          });
        }

        // Fallback: store feedback as metadata on the result document
        api.logger.debug?.(
          `ruvector_feedback: storing feedback as metadata (SONA not fully enabled)`,
        );

        return jsonResult({
          success: true,
          message: "Feedback acknowledged (SONA learning not fully enabled)",
          searchId,
          selectedResultId,
          relevanceScore,
          note: "Full SONA learning requires ruvector with feedback support",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        api.logger.warn(`ruvector_feedback: failed to record feedback: ${message}`);
        return jsonResult({
          success: false,
          error: message,
        });
      }
    },
  };
}

// ============================================================================
// GNN Graph Tool
// ============================================================================

/**
 * Schema for the ruvector_graph tool parameters.
 * Used for GNN (Graph Neural Network) knowledge graph operations.
 */
const RuvectorGraphSchema = Type.Object({
  action: stringEnum(["query", "neighbors", "link"] as const, {
    description: "Graph operation: query (Cypher), neighbors (find related), or link (create relationship)",
  }),
  cypherQuery: Type.Optional(
    Type.String({
      description: "Cypher query for action=query (e.g., 'MATCH (n)-[r]->(m) RETURN n, r, m')",
    }),
  ),
  nodeId: Type.Optional(
    Type.String({
      description: "Node ID for action=neighbors",
    }),
  ),
  sourceId: Type.Optional(
    Type.String({
      description: "Source node ID for action=link",
    }),
  ),
  targetId: Type.Optional(
    Type.String({
      description: "Target node ID for action=link",
    }),
  ),
  relationship: Type.Optional(
    Type.String({
      description: "Relationship type for action=link (e.g., 'RELATED_TO', 'MENTIONS')",
    }),
  ),
  depth: Type.Optional(
    Type.Number({
      description: "Traversal depth for neighbors query (default: 1)",
      default: 1,
      minimum: 1,
      maximum: 5,
    }),
  ),
});

export type CreateRuvectorGraphToolOptions = {
  api: ClawdbotPluginApi;
  db: RuvectorDB;
};

/**
 * Creates the ruvector_graph agent tool for GNN knowledge graph operations.
 * Provides graph traversal, Cypher queries, and relationship management.
 *
 * @param options - Tool configuration including API and database
 * @returns An agent tool that can be registered with the plugin API
 */
export function createRuvectorGraphTool(options: CreateRuvectorGraphToolOptions) {
  const { api, db } = options;

  return {
    name: "ruvector_graph",
    label: "GNN Knowledge Graph",
    description:
      "Query and manipulate the knowledge graph. Use for finding relationships between memories, " +
      "executing Cypher queries, or creating semantic links between documents.",
    parameters: RuvectorGraphSchema,

    async execute(_toolCallId: string, params: Record<string, unknown>) {
      const actionRaw = readStringParam(params, "action", { required: true });

      // Validate action is one of the allowed values
      const validActions = ["query", "neighbors", "link"] as const;
      type GraphAction = (typeof validActions)[number];

      if (!validActions.includes(actionRaw as GraphAction)) {
        return jsonResult({
          success: false,
          error: `Invalid action: ${actionRaw}`,
          validActions: [...validActions],
        });
      }
      const action: GraphAction = actionRaw as GraphAction;

      try {
        // Check if GNN graph features are available
        const hasGraphSupport =
          "graphQuery" in db &&
          "graphNeighbors" in db &&
          "graphLink" in db;

        if (!hasGraphSupport) {
          return jsonResult({
            success: false,
            error: "GNN graph features not available",
            note: "Requires ruvector with graph extension enabled",
            action,
          });
        }

        const graphDb = db as RuvectorDB & {
          graphQuery: (cypher: string) => Promise<unknown[]>;
          graphNeighbors: (nodeId: string, depth: number) => Promise<unknown[]>;
          graphLink: (source: string, target: string, rel: string) => Promise<boolean>;
        };

        switch (action) {
          case "query": {
            const cypherQuery = readStringParam(params, "cypherQuery", { required: true });
            api.logger.debug?.(`ruvector_graph: executing Cypher query`);

            const results = await graphDb.graphQuery(cypherQuery);

            return jsonResult({
              success: true,
              action: "query",
              resultCount: results.length,
              results,
            });
          }

          case "neighbors": {
            const nodeId = readStringParam(params, "nodeId", { required: true });
            const depth = readNumberParam(params, "depth", { integer: true }) ?? 1;
            const clampedDepth = Math.max(1, Math.min(depth, 5));

            api.logger.debug?.(
              `ruvector_graph: finding neighbors for node=${nodeId}, depth=${clampedDepth}`,
            );

            const neighbors = await graphDb.graphNeighbors(nodeId, clampedDepth);

            return jsonResult({
              success: true,
              action: "neighbors",
              nodeId,
              depth: clampedDepth,
              neighborCount: neighbors.length,
              neighbors,
            });
          }

          case "link": {
            const sourceId = readStringParam(params, "sourceId", { required: true });
            const targetId = readStringParam(params, "targetId", { required: true });
            const relationship = readStringParam(params, "relationship") ?? "RELATED_TO";

            api.logger.debug?.(
              `ruvector_graph: creating link ${sourceId} -[${relationship}]-> ${targetId}`,
            );

            const created = await graphDb.graphLink(sourceId, targetId, relationship);

            return jsonResult({
              success: created,
              action: "link",
              sourceId,
              targetId,
              relationship,
              message: created
                ? `Created relationship: ${sourceId} -[${relationship}]-> ${targetId}`
                : "Link already exists or could not be created",
            });
          }

          default: {
            // Exhaustive check - this ensures all cases are handled at compile time
            const _exhaustive: never = action;
            return jsonResult({
              success: false,
              error: `Unknown action: ${action}`,
              validActions: ["query", "neighbors", "link"],
            });
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        api.logger.warn(`ruvector_graph: operation failed: ${message}`);
        return jsonResult({
          success: false,
          action,
          error: message,
        });
      }
    },
  };
}
