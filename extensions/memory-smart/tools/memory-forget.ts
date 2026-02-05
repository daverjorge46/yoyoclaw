/**
 * memory_forget tool — delete specific memories (GDPR-compliant).
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { EmbeddingProvider } from "../providers/types.js";
import type { MemoryDB } from "../store/memory-db.js";

export function registerMemoryForgetTool(
  api: OpenClawPluginApi,
  memoryDb: MemoryDB,
  embeddings: EmbeddingProvider,
) {
  api.registerTool(
    {
      name: "memory_forget",
      label: "Memory Forget",
      description:
        "Delete specific memories. GDPR-compliant. Provide either a search query to find the memory, or a specific memory ID.",
      parameters: Type.Object({
        query: Type.Optional(
          Type.String({ description: "Search query to find memory to delete" }),
        ),
        memoryId: Type.Optional(
          Type.String({ description: "Specific memory ID to delete" }),
        ),
      }),
      async execute(_toolCallId, params) {
        const { query, memoryId } = params as {
          query?: string;
          memoryId?: string;
        };

        try {
          if (memoryId) {
            // Support partial IDs (prefix match)
            const isFullUuid =
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                memoryId,
              );

            if (isFullUuid) {
              await memoryDb.delete(memoryId);
              return {
                content: [
                  { type: "text" as const, text: `Memory ${memoryId.slice(0, 8)}... forgotten.` },
                ],
                details: { action: "deleted", id: memoryId },
              };
            }

            // Partial ID: search and find matching full ID
            const allMemories = await memoryDb.getAll();
            const matches = allMemories.filter((m) =>
              m.id.toLowerCase().startsWith(memoryId.toLowerCase()),
            );

            if (matches.length === 0) {
              return {
                content: [
                  { type: "text" as const, text: `No memory found with ID starting with "${memoryId}".` },
                ],
                details: { found: 0 },
              };
            }

            if (matches.length === 1) {
              await memoryDb.delete(matches[0].id);
              return {
                content: [
                  { type: "text" as const, text: `Forgotten: "${matches[0].text.slice(0, 60)}..."` },
                ],
                details: { action: "deleted", id: matches[0].id },
              };
            }

            // Multiple matches - list them
            const list = matches
              .map((m) => `- [${m.id.slice(0, 8)}] ${m.text.slice(0, 60)}...`)
              .join("\n");
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Multiple memories match prefix "${memoryId}":\n${list}\nProvide a longer prefix.`,
                },
              ],
              details: { action: "ambiguous", count: matches.length },
            };
          }

          if (query) {
            const vector = await embeddings.embed(query);
            const results = await memoryDb.search(vector, 5, 0.5);

            if (results.length === 0) {
              return {
                content: [
                  { type: "text" as const, text: "No matching memories found." },
                ],
                details: { found: 0 },
              };
            }

            // Auto-delete if single high-confidence match
            if (results.length === 1 && results[0].score > 0.65) {
              await memoryDb.delete(results[0].entry.id);
              return {
                content: [
                  {
                    type: "text" as const,
                    text: `Forgotten: "${results[0].entry.text}"`,
                  },
                ],
                details: { action: "deleted", id: results[0].entry.id },
              };
            }

            const list = results
              .map(
                (r) =>
                  `- [${r.entry.id.slice(0, 8)}] ${r.entry.text.slice(0, 80)}... (${(r.score * 100).toFixed(0)}%)`,
              )
              .join("\n");

            const sanitizedCandidates = results.map((r) => ({
              id: r.entry.id,
              text: r.entry.text,
              category: r.entry.category,
              score: r.score,
            }));

            return {
              content: [
                {
                  type: "text" as const,
                  text: `Found ${results.length} candidates. Specify memoryId to delete:\n${list}`,
                },
              ],
              details: { action: "candidates", candidates: sanitizedCandidates },
            };
          }

          return {
            content: [
              { type: "text" as const, text: "Provide a query or memoryId." },
            ],
            details: { error: "missing_param" },
          };
        } catch (err) {
          api.logger.error(`memory_forget failed: ${String(err)}`);
          return {
            content: [
              { type: "text" as const, text: `Memory forget failed: ${String(err)}` },
            ],
            details: { error: String(err) },
          };
        }
      },
    },
    { name: "memory_forget" },
  );
}
