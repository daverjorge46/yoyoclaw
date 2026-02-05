/**
 * entity_lookup tool — look up entity profiles.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { stringEnum } from "openclaw/plugin-sdk";
import type { EmbeddingProvider } from "../providers/types.js";
import type { EntityDB } from "../store/entity-db.js";
import type { MemoryDB } from "../store/memory-db.js";
import { ENTITY_TYPES } from "../config.js";

export function registerEntityLookupTool(
  api: OpenClawPluginApi,
  entityDb: EntityDB,
  memoryDb: MemoryDB,
  embeddings: EmbeddingProvider,
) {
  api.registerTool(
    {
      name: "entity_lookup",
      label: "Entity Lookup",
      description:
        "Look up everything known about a person, project, tool, place, or organization. Returns entity summary and all linked facts.",
      parameters: Type.Object({
        name: Type.String({
          description: "Entity name or alias to look up",
        }),
        type: Type.Optional(
          stringEnum(ENTITY_TYPES as unknown as readonly string[], {
            description: "Optional filter by entity type: person, project, tool, place, organization",
          }),
        ),
      }),
      async execute(_toolCallId, params) {
        const { name, type } = params as {
          name: string;
          type?: string;
        };

        try {
          // First try exact name/alias match
          let entity = await entityDb.findByName(name);

          // If not found, try semantic search
          if (!entity) {
            const vector = await embeddings.embed(name);
            const results = await entityDb.searchByVector(vector, 3, 0.5);

            if (type) {
              const filtered = results.filter((r) => r.entry.type === type);
              if (filtered.length > 0) {
                entity = filtered[0].entry;
              }
            } else if (results.length > 0) {
              entity = results[0].entry;
            }
          }

          if (!entity) {
            // Fall back to searching memories for the entity name
            const vector = await embeddings.embed(name);
            const memResults = await memoryDb.search(vector, 5, 0.3);
            const entityMemories = memResults.filter((r) => {
              try {
                const entities = JSON.parse(r.entry.entities) as string[];
                return entities.some(
                  (e) => e.toLowerCase() === name.toLowerCase(),
                );
              } catch {
                return false;
              }
            });

            if (entityMemories.length > 0) {
              const factsText = entityMemories
                .map(
                  (r, i) =>
                    `${i + 1}. [${r.entry.category}] ${r.entry.text} (${(r.score * 100).toFixed(0)}%)`,
                )
                .join("\n");

              return {
                content: [
                  {
                    type: "text" as const,
                    text: `No entity profile for "${name}", but found ${entityMemories.length} related memories:\n\n${factsText}`,
                  },
                ],
                details: {
                  found: false,
                  relatedMemories: entityMemories.length,
                },
              };
            }

            return {
              content: [
                {
                  type: "text" as const,
                  text: `No entity profile or memories found for "${name}".`,
                },
              ],
              details: { found: false },
            };
          }

          // If entity found, also fetch linked facts from memory
          const aliases = (() => {
            try {
              return JSON.parse(entity.aliases) as string[];
            } catch {
              return [];
            }
          })();

          const linkedFactIds = (() => {
            try {
              return JSON.parse(entity.linkedFacts) as string[];
            } catch {
              return [];
            }
          })();

          // Also search for memories mentioning this entity
          const vector = await embeddings.embed(entity.name + " " + entity.summary);
          const relatedMemories = await memoryDb.search(vector, 10, 0.3);

          const factsText =
            relatedMemories.length > 0
              ? relatedMemories
                  .map(
                    (r, i) =>
                      `  ${i + 1}. [${r.entry.category}] ${r.entry.text}`,
                  )
                  .join("\n")
              : "  (no linked facts)";

          const profileText = [
            `**${entity.name}** (${entity.type})`,
            entity.summary,
            aliases.length > 0 ? `Aliases: ${aliases.join(", ")}` : null,
            `Mentions: ${entity.mentionCount}`,
            `\nRelated facts:\n${factsText}`,
          ]
            .filter(Boolean)
            .join("\n");

          return {
            content: [{ type: "text" as const, text: profileText }],
            details: {
              found: true,
              entity: {
                id: entity.id,
                name: entity.name,
                type: entity.type,
                summary: entity.summary,
                aliases,
                mentionCount: entity.mentionCount,
              },
              relatedMemories: relatedMemories.length,
            },
          };
        } catch (err) {
          api.logger.error(`entity_lookup failed: ${String(err)}`);
          return {
            content: [
              {
                type: "text" as const,
                text: `Entity lookup failed: ${String(err)}`,
              },
            ],
            details: { error: String(err) },
          };
        }
      },
    },
    { name: "entity_lookup" },
  );
}
