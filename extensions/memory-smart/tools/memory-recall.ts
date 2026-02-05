/**
 * memory_recall tool — semantic search through stored facts.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { stringEnum } from "openclaw/plugin-sdk";
import type { EmbeddingProvider } from "../providers/types.js";
import type { MemoryDB } from "../store/memory-db.js";
import { MEMORY_CATEGORIES } from "../config.js";

export function registerMemoryRecallTool(
  api: OpenClawPluginApi,
  memoryDb: MemoryDB,
  embeddings: EmbeddingProvider,
) {
  api.registerTool(
    {
      name: "memory_recall",
      label: "Memory Recall",
      description:
        "Search through long-term memories. Use when you need context about user preferences, past decisions, or previously discussed topics.",
      parameters: Type.Object({
        query: Type.String({ description: "Search query" }),
        limit: Type.Optional(
          Type.Number({ description: "Max results (default: 5)" }),
        ),
        category: Type.Optional(
          stringEnum(MEMORY_CATEGORIES as unknown as readonly string[], {
            description: "Filter by category",
          }),
        ),
      }),
      async execute(_toolCallId, params) {
        const {
          query,
          limit = 5,
          category,
        } = params as {
          query: string;
          limit?: number;
          category?: string;
        };

        try {
          const vector = await embeddings.embed(query);
          let results = await memoryDb.search(vector, limit * 2, 0.1);

          // Filter by category if specified
          if (category) {
            results = results.filter((r) => r.entry.category === category);
          }

          // Trim to requested limit
          results = results.slice(0, limit);

          if (results.length === 0) {
            return {
              content: [{ type: "text" as const, text: "No relevant memories found." }],
              details: { count: 0 },
            };
          }

          const text = results
            .map((r, i) => {
              const entities = (() => {
                try {
                  const parsed = JSON.parse(r.entry.entities) as string[];
                  return parsed.length > 0 ? ` [${parsed.join(", ")}]` : "";
                } catch {
                  return "";
                }
              })();
              return `${i + 1}. [${r.entry.category}] ${r.entry.text}${entities} (${(r.score * 100).toFixed(0)}%)`;
            })
            .join("\n");

          const sanitizedResults = results.map((r) => ({
            id: r.entry.id,
            text: r.entry.text,
            category: r.entry.category,
            importance: r.entry.importance,
            entities: (() => {
              try {
                return JSON.parse(r.entry.entities);
              } catch {
                return [];
              }
            })(),
            score: r.score,
          }));

          return {
            content: [
              {
                type: "text" as const,
                text: `Found ${results.length} memories:\n\n${text}`,
              },
            ],
            details: { count: results.length, memories: sanitizedResults },
          };
        } catch (err) {
          api.logger.error(`memory_recall failed: ${String(err)}`);
          return {
            content: [
              { type: "text" as const, text: `Memory recall failed: ${String(err)}` },
            ],
            details: { error: String(err) },
          };
        }
      },
    },
    { name: "memory_recall" },
  );
}
