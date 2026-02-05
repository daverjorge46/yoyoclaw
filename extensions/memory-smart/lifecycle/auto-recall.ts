/**
 * Auto-recall lifecycle hook — injects core memory + relevant facts
 * into context before every agent run.
 *
 * On `before_agent_start`:
 *   1. Read core memory block
 *   2. Embed the user's prompt, search facts store for top matches
 *   3. Check if any known entity names appear in the prompt — fetch entity profile
 *   4. Return prependContext with XML-wrapped blocks (max 2,000 tokens)
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { EmbeddingProvider } from "../providers/types.js";
import type { MemoryDB } from "../store/memory-db.js";
import type { EntityDB } from "../store/entity-db.js";
import type { CoreMemoryManager } from "../store/core-memory.js";
import type { AutoRecallConfig, EntitiesConfig } from "../config.js";

const CHARS_PER_TOKEN = 4;

export function registerAutoRecall(
  api: OpenClawPluginApi,
  opts: {
    memoryDb: MemoryDB;
    entityDb: EntityDB;
    coreMemory: CoreMemoryManager;
    embeddings: EmbeddingProvider;
    autoRecallConfig: AutoRecallConfig;
    entitiesConfig: EntitiesConfig;
    coreMemoryEnabled: boolean;
  },
) {
  const {
    memoryDb,
    entityDb,
    coreMemory,
    embeddings,
    autoRecallConfig,
    entitiesConfig,
    coreMemoryEnabled,
  } = opts;

  api.on("before_agent_start", async (event) => {
    if (!event.prompt || event.prompt.length < 5) return;

    try {
      const parts: string[] = [];
      let tokenBudget = autoRecallConfig.maxTokens;

      // 1. Core memory block (always injected if enabled)
      if (coreMemoryEnabled) {
        const coreContent = await coreMemory.readRaw();
        const coreTokens = Math.ceil(coreContent.length / CHARS_PER_TOKEN);

        if (coreContent && coreTokens < tokenBudget) {
          parts.push(`<core-memory>\n${coreContent}\n</core-memory>`);
          tokenBudget -= coreTokens;
        }
      }

      // 2. Semantic search for relevant memories
      const vector = await embeddings.embed(event.prompt);
      const results = await memoryDb.search(
        vector,
        autoRecallConfig.maxResults,
        autoRecallConfig.minScore,
      );

      // 3. Entity boost — check if prompt mentions known entities
      let entityContext = "";
      if (entitiesConfig.enabled && autoRecallConfig.entityBoost) {
        try {
          const allEntities = await entityDb.getAllNames();
          const promptLower = event.prompt.toLowerCase();

          for (const ent of allEntities) {
            const names = [ent.name, ...ent.aliases];
            const mentioned = names.some(
              (n) =>
                n.length >= 3 && promptLower.includes(n.toLowerCase()),
            );

            if (mentioned) {
              const entity = await entityDb.findByName(ent.name);
              if (entity) {
                const aliases = (() => {
                  try {
                    return JSON.parse(entity.aliases) as string[];
                  } catch {
                    return [];
                  }
                })();
                const aliasStr =
                  aliases.length > 0
                    ? ` (aliases: ${aliases.join(", ")})`
                    : "";
                entityContext += `[${entity.type}] ${entity.name}${aliasStr}: ${entity.summary}\n`;
              }
            }
          }
        } catch (err) {
          api.logger.warn(
            `memory-smart: entity lookup during auto-recall failed: ${String(err)}`,
          );
        }
      }

      // 4. Build relevant memories block
      if (results.length > 0 || entityContext) {
        const memoryLines: string[] = [];

        // Add entity context first (higher priority)
        if (entityContext) {
          const entityTokens = Math.ceil(
            entityContext.length / CHARS_PER_TOKEN,
          );
          if (entityTokens < tokenBudget) {
            memoryLines.push(entityContext.trim());
            tokenBudget -= entityTokens;
          }
        }

        // Add memory results, respecting token budget
        for (const r of results) {
          const line = `- [${r.entry.category}] ${r.entry.text} (${(r.score * 100).toFixed(0)}%)`;
          const lineTokens = Math.ceil(line.length / CHARS_PER_TOKEN);
          if (lineTokens > tokenBudget) break;
          memoryLines.push(line);
          tokenBudget -= lineTokens;
        }

        if (memoryLines.length > 0) {
          parts.push(
            `<relevant-memories>\n${memoryLines.join("\n")}\n</relevant-memories>`,
          );
        }
      }

      if (parts.length === 0) return;

      const contextBlock = parts.join("\n\n");

      api.logger.info(
        `memory-smart: injecting ${results.length} memories + core memory into context (${Math.ceil(contextBlock.length / CHARS_PER_TOKEN)} tokens)`,
      );

      return {
        prependContext: contextBlock,
      };
    } catch (err) {
      api.logger.warn(`memory-smart: auto-recall failed: ${String(err)}`);
    }
  });
}
