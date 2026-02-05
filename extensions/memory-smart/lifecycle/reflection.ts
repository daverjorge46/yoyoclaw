/**
 * Reflection Job — background service that processes the extraction queue,
 * stores new facts, links entities, consolidates duplicates, and maintains
 * memory quality over time.
 *
 * Runs on a configurable interval (default: 360 minutes / 6 hours).
 * Can also be triggered manually via CLI: `smart-memory reflect`
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { EmbeddingProvider } from "../providers/types.js";
import type { MemoryDB } from "../store/memory-db.js";
import type { EntityDB } from "../store/entity-db.js";
import type { CoreMemoryManager } from "../store/core-memory.js";
import type { ExtractionQueue } from "../extraction/queue.js";
import type { EntityResolver } from "../extraction/entity-resolver.js";
import type { SmartMemoryConfig } from "../config.js";
import { extractFacts } from "../extraction/extractor.js";

// ============================================================================
// Types
// ============================================================================

export type ReflectionStats = {
  conversationsProcessed: number;
  factsExtracted: number;
  factsStored: number;
  duplicatesSkipped: number;
  duplicatesMerged: number;
  entitiesCreated: number;
  entitiesUpdated: number;
  memoriesDecayed: number;
  coreMemoryUpdated: boolean;
  durationMs: number;
};

// ============================================================================
// Reflection Pipeline
// ============================================================================

/**
 * Run the full reflection pipeline once.
 */
export async function runReflection(
  api: OpenClawPluginApi,
  queue: ExtractionQueue,
  memoryDb: MemoryDB,
  entityDb: EntityDB,
  embeddings: EmbeddingProvider,
  entityResolver: EntityResolver,
  coreMemory: CoreMemoryManager,
  cfg: SmartMemoryConfig,
): Promise<ReflectionStats> {
  const startTime = Date.now();
  const stats: ReflectionStats = {
    conversationsProcessed: 0,
    factsExtracted: 0,
    factsStored: 0,
    duplicatesSkipped: 0,
    duplicatesMerged: 0,
    entitiesCreated: 0,
    entitiesUpdated: 0,
    memoriesDecayed: 0,
    coreMemoryUpdated: false,
    durationMs: 0,
  };

  let opsCount = 0;
  const maxOps = cfg.reflection.maxOperationsPerRun;

  try {
    // ======================================================================
    // Step 1: EXTRACT — Dequeue conversations and run AI extraction
    // ======================================================================
    const queuedItems = await queue.dequeue();
    if (queuedItems.length > 0) {
      api.logger.info(
        `memory-smart/reflection: processing ${queuedItems.length} queued conversations`,
      );
    }

    const allExtractedFacts: Array<{
      text: string;
      category: string;
      importance: number;
      entities: string[];
    }> = [];

    for (const item of queuedItems) {
      if (opsCount >= maxOps) break;

      try {
        const conversationText = item.messages.join("\n\n");
        const facts = await extractFacts(
          conversationText,
          cfg.extraction.apiKey,
          cfg.extraction.model,
        );

        stats.conversationsProcessed++;
        stats.factsExtracted += facts.length;
        allExtractedFacts.push(...facts);
        opsCount++;
      } catch (err) {
        api.logger.warn(
          `memory-smart/reflection: extraction failed for session ${item.sessionKey}: ${String(err)}`,
        );
      }
    }

    // ======================================================================
    // Step 2: STORE — Embed and store each extracted fact (with dedup check)
    // ======================================================================
    const dedupThreshold = cfg.reflection.deduplicateThreshold;

    for (const fact of allExtractedFacts) {
      if (opsCount >= maxOps) break;

      try {
        const vector = await embeddings.embed(fact.text);

        // Check for duplicates — search for very similar existing memories
        const existing = await memoryDb.search(vector, 1, dedupThreshold);
        if (existing.length > 0) {
          stats.duplicatesSkipped++;
          continue;
        }

        // Store the new fact
        const entry = await memoryDb.store({
          text: fact.text,
          vector,
          importance: fact.importance,
          category: fact.category as any,
          entities: fact.entities,
          source: "reflection",
        });

        stats.factsStored++;
        opsCount++;

        // ====================================================================
        // Step 3: LINK — Match facts to entities and update profiles
        // ====================================================================
        if (fact.entities.length > 0 && cfg.entities.enabled) {
          for (const entityName of fact.entities) {
            if (opsCount >= maxOps) break;

            try {
              const resolved = await entityResolver.resolve(entityName);

              if (resolved.existing) {
                // Link fact to existing entity
                await entityResolver.linkFact(
                  entry.id,
                  [entityName],
                );
                stats.entitiesUpdated++;
              } else if (resolved.shouldCreate && cfg.entities.autoCreate) {
                // Auto-create new entity
                const entityType = guessEntityType(entityName, fact.text);
                const newEntity = await entityResolver.autoCreateEntity(
                  entityName,
                  entityType,
                  [fact.text],
                );

                // Link the fact to the new entity
                await entityResolver.linkFact(entry.id, [entityName]);
                stats.entitiesCreated++;

                api.logger.info(
                  `memory-smart/reflection: auto-created entity "${entityName}" (${entityType})`,
                );
              }

              opsCount++;
            } catch (err) {
              api.logger.warn(
                `memory-smart/reflection: entity linking failed for "${entityName}": ${String(err)}`,
              );
            }
          }
        }
      } catch (err) {
        api.logger.warn(
          `memory-smart/reflection: storing fact failed: ${String(err)}`,
        );
      }
    }

    // ======================================================================
    // Step 4: CONSOLIDATE — Find and merge near-duplicate memories
    // ======================================================================
    if (opsCount < maxOps) {
      try {
        const allMemories = await memoryDb.getAll(200);

        // For each memory, check similarity against others
        // Use a simple N² approach limited to recent memories
        const recentMemories = allMemories
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 50);

        const mergedIds = new Set<string>();

        for (const memory of recentMemories) {
          if (opsCount >= maxOps) break;
          if (mergedIds.has(memory.id)) continue;

          const similar = await memoryDb.search(
            memory.vector,
            3,
            dedupThreshold,
          );

          for (const match of similar) {
            if (match.entry.id === memory.id) continue;
            if (mergedIds.has(match.entry.id)) continue;

            // Merge: keep the more recent memory, delete the older one
            const keep = memory.createdAt >= match.entry.createdAt ? memory : match.entry;
            const remove = memory.createdAt >= match.entry.createdAt ? match.entry : memory;

            // Update the kept memory's importance (max of both)
            const newImportance = Math.max(keep.importance, remove.importance);
            if (newImportance !== keep.importance) {
              await memoryDb.update(keep.id, { importance: newImportance });
            }

            await memoryDb.delete(remove.id);
            mergedIds.add(remove.id);
            stats.duplicatesMerged++;
            opsCount++;
          }
        }
      } catch (err) {
        api.logger.warn(
          `memory-smart/reflection: consolidation failed: ${String(err)}`,
        );
      }
    }

    // ======================================================================
    // Step 5: DECAY — Reduce importance of stale, unaccessed memories
    // ======================================================================
    if (opsCount < maxOps) {
      try {
        const allMemories = await memoryDb.getAll(500);
        const decayThresholdMs = cfg.reflection.decayDays * 24 * 60 * 60 * 1000;
        const now = Date.now();

        for (const memory of allMemories) {
          if (opsCount >= maxOps) break;

          const age = now - memory.updatedAt;
          if (age > decayThresholdMs && memory.accessCount === 0 && memory.importance > 0) {
            const newImportance = Math.max(0, memory.importance - 0.1);
            await memoryDb.update(memory.id, { importance: newImportance });
            stats.memoriesDecayed++;
            opsCount++;
          }
        }
      } catch (err) {
        api.logger.warn(
          `memory-smart/reflection: decay failed: ${String(err)}`,
        );
      }
    }

    // ======================================================================
    // Step 6: PROMOTE — Surface high-importance facts to core memory
    // ======================================================================
    if (opsCount < maxOps && cfg.coreMemory.enabled) {
      try {
        const allMemories = await memoryDb.getAll(500);

        // Find high-importance, frequently-accessed facts
        const promotable = allMemories
          .filter((m) => m.importance >= 0.8 && m.accessCount >= 2)
          .sort((a, b) => b.importance - a.importance || b.accessCount - a.accessCount)
          .slice(0, 8);

        if (promotable.length > 0) {
          const contextLines = promotable.map(
            (m) => `- ${m.text}`,
          );
          const contextContent = contextLines.join("\n");

          const result = await coreMemory.update(
            "active_context",
            contextContent,
            "replace",
          );

          if (result.success) {
            stats.coreMemoryUpdated = true;
          } else if (result.warning) {
            api.logger.warn(
              `memory-smart/reflection: core memory promotion warning: ${result.warning}`,
            );
          }
        }
      } catch (err) {
        api.logger.warn(
          `memory-smart/reflection: promotion failed: ${String(err)}`,
        );
      }
    }
  } catch (err) {
    api.logger.error(
      `memory-smart/reflection: pipeline error: ${String(err)}`,
    );
  }

  stats.durationMs = Date.now() - startTime;

  // ========================================================================
  // Step 7: LOG STATS
  // ========================================================================
  const totalFacts = await memoryDb.count().catch(() => 0);
  const totalEntities = await entityDb.count().catch(() => 0);

  api.logger.info(
    `memory-smart/reflection: complete in ${stats.durationMs}ms — ` +
    `${stats.conversationsProcessed} conversations, ` +
    `${stats.factsExtracted} extracted, ${stats.factsStored} stored, ` +
    `${stats.duplicatesSkipped} dedup-skipped, ${stats.duplicatesMerged} merged, ` +
    `${stats.entitiesCreated} entities created, ${stats.entitiesUpdated} updated, ` +
    `${stats.memoriesDecayed} decayed | ` +
    `total: ${totalFacts} facts, ${totalEntities} entities`,
  );

  return stats;
}

// ============================================================================
// Registration
// ============================================================================

/**
 * Register the reflection background job.
 *
 * Returns control functions for CLI integration:
 *   - triggerReflection: manually run the pipeline (with concurrent-run guard)
 *   - getLastStats: retrieve the last reflection run stats
 */
export function registerReflection(
  api: OpenClawPluginApi,
  queue: ExtractionQueue,
  memoryDb: MemoryDB,
  entityDb: EntityDB,
  embeddings: EmbeddingProvider,
  entityResolver: EntityResolver,
  coreMemory: CoreMemoryManager,
  cfg: SmartMemoryConfig,
): { triggerReflection: () => Promise<ReflectionStats | null>; getLastStats: () => ReflectionStats | null } {
  let reflectionTimer: ReturnType<typeof setInterval> | null = null;
  let isRunning = false;
  let lastStats: ReflectionStats | null = null;

  const doReflection = async (): Promise<ReflectionStats | null> => {
    if (isRunning) {
      api.logger.info("memory-smart/reflection: already running, skipping");
      return null;
    }

    isRunning = true;
    try {
      const stats = await runReflection(
        api, queue, memoryDb, entityDb, embeddings, entityResolver, coreMemory, cfg,
      );
      lastStats = stats;
      return stats;
    } finally {
      isRunning = false;
    }
  };

  // Register background interval
  const intervalMs = cfg.reflection.intervalMinutes * 60 * 1000;

  api.registerService({
    id: "memory-smart-reflection",
    start: () => {
      api.logger.info(
        `memory-smart/reflection: service started (interval: ${cfg.reflection.intervalMinutes}min)`,
      );

      // Run first reflection after a 60 second delay (let things settle)
      setTimeout(() => {
        doReflection().catch((err) => {
          api.logger.error(`memory-smart/reflection: initial run failed: ${String(err)}`);
        });
      }, 60_000);

      // Then run on interval
      reflectionTimer = setInterval(() => {
        doReflection().catch((err) => {
          api.logger.error(`memory-smart/reflection: scheduled run failed: ${String(err)}`);
        });
      }, intervalMs);
    },
    stop: () => {
      if (reflectionTimer) {
        clearInterval(reflectionTimer);
        reflectionTimer = null;
      }
      api.logger.info("memory-smart/reflection: service stopped");
    },
  });

  return {
    triggerReflection: doReflection,
    getLastStats: () => lastStats,
  };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Guess entity type from context clues in the fact text.
 */
function guessEntityType(
  name: string,
  factText: string,
): "person" | "project" | "tool" | "place" | "organization" {
  const lower = factText.toLowerCase();
  const nameLower = name.toLowerCase();

  // People indicators
  if (
    /\b(he|she|they|his|her|their|person|user|owner|friend|brother|sister|mother|father|wife|husband|colleague|boss)\b/.test(lower) ||
    /\b(says?|said|told|asked|wants?|prefers?|likes?|works?)\b/.test(lower)
  ) {
    return "person";
  }

  // Project indicators
  if (
    /\b(project|app|application|website|repo|repository|codebase|deployed|build|version)\b/.test(lower) ||
    /\b(github|vercel|netlify|heroku)\b/.test(lower)
  ) {
    return "project";
  }

  // Tool indicators
  if (
    /\b(tool|plugin|extension|library|framework|sdk|api|cli|command)\b/.test(lower)
  ) {
    return "tool";
  }

  // Place indicators
  if (
    /\b(city|town|state|country|street|address|located|lives?\s+in|based\s+in)\b/.test(lower)
  ) {
    return "place";
  }

  // Organization indicators
  if (
    /\b(company|organization|org|team|group|corp|inc|llc|startup)\b/.test(lower)
  ) {
    return "organization";
  }

  // Default to project (most common for AI assistant context)
  return "project";
}
