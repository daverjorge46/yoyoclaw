/**
 * memory_store tool — manually store a fact in long-term memory.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { stringEnum } from "openclaw/plugin-sdk";
import type { EmbeddingProvider } from "../providers/types.js";
import type { MemoryDB } from "../store/memory-db.js";
import { MEMORY_CATEGORIES } from "../config.js";

export function registerMemoryStoreTool(
  api: OpenClawPluginApi,
  memoryDb: MemoryDB,
  embeddings: EmbeddingProvider,
) {
  api.registerTool(
    {
      name: "memory_store",
      label: "Memory Store",
      description:
        "Save important information in long-term memory. Use for preferences, facts, decisions, or when the user says 'remember this'.",
      parameters: Type.Object({
        text: Type.String({
          description: "Information to remember (self-contained, narrative sentence)",
        }),
        importance: Type.Optional(
          Type.Number({
            description: "Importance 0-1 (default: 0.7)",
            minimum: 0,
            maximum: 1,
          }),
        ),
        category: Type.Optional(
          stringEnum(MEMORY_CATEGORIES as unknown as readonly string[], {
            description: "Category: preference, decision, fact, entity, rule, project, relationship, other",
          }),
        ),
        entities: Type.Optional(
          Type.Array(Type.String(), {
            description: "Entity names mentioned (people, projects, tools)",
          }),
        ),
      }),
      async execute(_toolCallId, params) {
        const {
          text,
          importance = 0.7,
          category = "other",
          entities = [],
        } = params as {
          text: string;
          importance?: number;
          category?: string;
          entities?: string[];
        };

        try {
          const vector = await embeddings.embed(text);

          // Check for duplicates (high similarity threshold)
          const existing = await memoryDb.search(vector, 1, 0.95);
          if (existing.length > 0) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Similar memory already exists: "${existing[0].entry.text}"`,
                },
              ],
              details: {
                action: "duplicate",
                existingId: existing[0].entry.id,
                existingText: existing[0].entry.text,
              },
            };
          }

          const entry = await memoryDb.store({
            text,
            vector,
            importance,
            category: category as any,
            entities,
          });

          return {
            content: [
              {
                type: "text" as const,
                text: `Stored: "${text.length > 100 ? text.slice(0, 100) + "..." : text}"`,
              },
            ],
            details: { action: "created", id: entry.id },
          };
        } catch (err) {
          api.logger.error(`memory_store failed: ${String(err)}`);
          return {
            content: [
              { type: "text" as const, text: `Memory store failed: ${String(err)}` },
            ],
            details: { error: String(err) },
          };
        }
      },
    },
    { name: "memory_store" },
  );
}
