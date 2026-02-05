/**
 * CLI Commands — registers the `smart-memory` command group with all subcommands.
 *
 * Subcommands: stats, search, entities, entity, core, reflect, export, import, reset
 */

import { stat } from "node:fs/promises";
import { join } from "node:path";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { EmbeddingProvider } from "../providers/types.js";
import type { MemoryDB, MemoryEntry } from "../store/memory-db.js";
import type { EntityDB } from "../store/entity-db.js";
import type { CoreMemoryManager } from "../store/core-memory.js";
import type { ExtractionQueue } from "../extraction/queue.js";
import type { EntityResolver } from "../extraction/entity-resolver.js";
import type { SmartMemoryConfig } from "../config.js";
import type { ReflectionStats } from "../lifecycle/reflection.js";
import { importFromWorkspace } from "./import.js";

// ============================================================================
// Types
// ============================================================================

export type RegisterCliOptions = {
  api: OpenClawPluginApi;
  memoryDb: MemoryDB;
  entityDb: EntityDB;
  coreMemory: CoreMemoryManager;
  queue: ExtractionQueue;
  embeddings: EmbeddingProvider;
  entityResolver: EntityResolver;
  cfg: SmartMemoryConfig;
  resolvedDbPath: string;
  triggerReflection: () => Promise<ReflectionStats | null>;
  getLastStats: () => ReflectionStats | null;
};

// ============================================================================
// Helpers
// ============================================================================

const CHARS_PER_TOKEN = 4;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function relativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 0) return `${diffDay}d ago`;
  if (diffHour > 0) return `${diffHour}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return "just now";
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}

async function getDirSize(dirPath: string): Promise<string> {
  try {
    const { execSync } = await import("node:child_process");
    const output = execSync(`du -sh "${dirPath}" 2>/dev/null`).toString().trim();
    return output.split("\t")[0] || "unknown";
  } catch {
    return "unknown";
  }
}

function parseJsonArray(jsonStr: string): string[] {
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ============================================================================
// Registration
// ============================================================================

/**
 * Register all `smart-memory` CLI subcommands.
 */
export function registerCli(opts: RegisterCliOptions): void {
  const {
    api,
    memoryDb,
    entityDb,
    coreMemory,
    queue,
    embeddings,
    entityResolver,
    cfg,
    resolvedDbPath,
    triggerReflection,
    getLastStats,
  } = opts;

  api.registerCli(
    ({ program }) => {
      const sm = program
        .command("smart-memory")
        .description("Smart memory plugin commands");

      // ==================================================================
      // stats
      // ==================================================================
      sm.command("stats")
        .description("Show comprehensive memory statistics")
        .action(async () => {
          try {
            // Memory stats
            const allMemories = await memoryDb.getAll(10000);
            const memCount = allMemories.length;

            // Category breakdown
            const byCategory: Record<string, number> = {};
            for (const m of allMemories) {
              byCategory[m.category] = (byCategory[m.category] || 0) + 1;
            }

            // Entity stats
            const allEntities = await entityDb.getAll(10000);
            const entCount = allEntities.length;

            // Entity type breakdown
            const byType: Record<string, number> = {};
            for (const e of allEntities) {
              byType[e.type] = (byType[e.type] || 0) + 1;
            }

            // Core memory
            const coreData = await coreMemory.read();
            const coreValidation = coreMemory.validateData(coreData);

            // Queue
            const queueSize = await queue.size();

            // Disk usage
            const diskUsage = await getDirSize(resolvedDbPath);

            console.log(`\n  Memory Smart Stats`);
            console.log(`  ═══════════════════════════════════════`);

            // Memories section
            console.log(`\n  📊 Memories: ${memCount} total`);
            if (Object.keys(byCategory).length > 0) {
              for (const [cat, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
                const bar = "█".repeat(Math.ceil((count / memCount) * 20));
                console.log(`     ${cat.padEnd(14)} ${String(count).padStart(4)}  ${bar}`);
              }
            }

            // Entities section
            console.log(`\n  👤 Entities: ${entCount} total`);
            if (Object.keys(byType).length > 0) {
              for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
                console.log(`     ${type.padEnd(14)} ${count}`);
              }
            }

            // Core memory
            console.log(`\n  🧠 Core Memory: ${coreValidation.tokenCount}/${coreValidation.maxTokens} tokens (${Math.round((coreValidation.tokenCount / coreValidation.maxTokens) * 100)}%)`);

            // Queue
            console.log(`\n  📬 Extraction Queue: ${queueSize} conversations pending`);

            // Last reflection
            const lastStats = getLastStats();
            if (lastStats) {
              console.log(`\n  🔄 Last Reflection`);
              console.log(`     Duration:       ${lastStats.durationMs}ms`);
              console.log(`     Conversations:  ${lastStats.conversationsProcessed}`);
              console.log(`     Facts stored:   ${lastStats.factsStored}`);
              console.log(`     Duplicates:     ${lastStats.duplicatesSkipped} skipped, ${lastStats.duplicatesMerged} merged`);
              console.log(`     Entities:       ${lastStats.entitiesCreated} created, ${lastStats.entitiesUpdated} updated`);
              console.log(`     Decayed:        ${lastStats.memoriesDecayed}`);
            } else {
              console.log(`\n  🔄 Last Reflection: none yet`);
            }

            // Config info
            console.log(`\n  ⚙️  Configuration`);
            console.log(`     Provider:       ${cfg.embedding.provider} (${cfg.embedding.model})`);
            console.log(`     Dimensions:     ${embeddings.dimensions}`);
            console.log(`     Extraction:     ${cfg.extraction.enabled ? `enabled (${cfg.extraction.model})` : "disabled"}`);
            console.log(`     Auto-capture:   ${cfg.autoCapture.enabled ? "enabled" : "disabled"}`);
            console.log(`     Auto-recall:    ${cfg.autoRecall.enabled ? "enabled" : "disabled"}`);
            console.log(`     Reflection:     ${cfg.reflection.enabled ? `enabled (${cfg.reflection.intervalMinutes}min)` : "disabled"}`);
            console.log(`     DB path:        ${resolvedDbPath}`);
            console.log(`     Disk usage:     ${diskUsage}`);
            console.log();
          } catch (err) {
            console.error(`Error: ${String(err)}`);
          }
        });

      // ==================================================================
      // search
      // ==================================================================
      sm.command("search")
        .description("Search memories by semantic similarity")
        .argument("<query>", "Search query")
        .option("--limit <n>", "Maximum results", "10")
        .option("--category <cat>", "Filter by category")
        .option("--min-score <n>", "Minimum similarity score (0-1)", "0.3")
        .action(async (query: string, opts: { limit: string; category?: string; minScore: string }) => {
          try {
            const limit = parseInt(opts.limit) || 10;
            const minScore = parseFloat(opts.minScore) || 0.3;

            const vector = await embeddings.embed(query);
            let results = await memoryDb.search(vector, limit * 2, minScore);

            // Filter by category if specified
            if (opts.category) {
              results = results.filter((r) => r.entry.category === opts.category);
            }

            // Trim to limit
            results = results.slice(0, limit);

            if (results.length === 0) {
              console.log("\n  No memories found matching your query.\n");
              return;
            }

            console.log(`\n  Search Results for "${truncate(query, 50)}" (${results.length} matches)\n`);
            console.log(`  ${"#".padEnd(4)} ${"Score".padEnd(8)} ${"Category".padEnd(14)} ${"Text".padEnd(50)} ${"Entities".padEnd(20)} Age`);
            console.log(`  ${"─".repeat(4)} ${"─".repeat(8)} ${"─".repeat(14)} ${"─".repeat(50)} ${"─".repeat(20)} ${"─".repeat(8)}`);

            for (let i = 0; i < results.length; i++) {
              const r = results[i];
              const entities = parseJsonArray(r.entry.entities);
              const entityStr = entities.length > 0 ? entities.slice(0, 3).join(", ") : "—";
              const scoreStr = `${(r.score * 100).toFixed(0)}%`;
              const age = relativeTime(r.entry.createdAt);

              console.log(
                `  ${String(i + 1).padEnd(4)} ${scoreStr.padEnd(8)} ${r.entry.category.padEnd(14)} ${truncate(r.entry.text, 50).padEnd(50)} ${truncate(entityStr, 20).padEnd(20)} ${age}`,
              );
            }
            console.log();
          } catch (err) {
            console.error(`Error: ${String(err)}`);
          }
        });

      // ==================================================================
      // entities
      // ==================================================================
      sm.command("entities")
        .description("List all entity profiles")
        .option("--type <type>", "Filter by entity type (person|project|tool|place|organization)")
        .option("--sort <field>", "Sort by: mentions|recent|name (default: mentions)", "mentions")
        .action(async (opts: { type?: string; sort: string }) => {
          try {
            let allEntities = await entityDb.getAll(500);

            if (allEntities.length === 0) {
              console.log("\n  No entities found.\n");
              return;
            }

            // Filter by type
            if (opts.type) {
              allEntities = allEntities.filter((e) => e.type === opts.type);
            }

            // Sort
            switch (opts.sort) {
              case "recent":
                allEntities.sort((a, b) => b.lastMentioned - a.lastMentioned);
                break;
              case "name":
                allEntities.sort((a, b) => a.name.localeCompare(b.name));
                break;
              case "mentions":
              default:
                allEntities.sort((a, b) => b.mentionCount - a.mentionCount);
                break;
            }

            console.log(`\n  Entity Profiles (${allEntities.length} total)\n`);
            console.log(`  ${"Name".padEnd(20)} ${"Type".padEnd(14)} ${"Mentions".padEnd(10)} ${"Facts".padEnd(8)} Last Mentioned`);
            console.log(`  ${"─".repeat(20)} ${"─".repeat(14)} ${"─".repeat(10)} ${"─".repeat(8)} ${"─".repeat(14)}`);

            for (const entity of allEntities) {
              const linkedFacts = parseJsonArray(entity.linkedFacts);
              const aliases = parseJsonArray(entity.aliases);
              const aliasStr = aliases.length > 0 ? ` (${aliases.join(", ")})` : "";

              console.log(
                `  ${truncate(entity.name + aliasStr, 20).padEnd(20)} ${entity.type.padEnd(14)} ${String(entity.mentionCount).padEnd(10)} ${String(linkedFacts.length).padEnd(8)} ${relativeTime(entity.lastMentioned)}`,
              );
            }
            console.log();
          } catch (err) {
            console.error(`Error: ${String(err)}`);
          }
        });

      // ==================================================================
      // entity <name>
      // ==================================================================
      sm.command("entity")
        .description("Show detailed entity profile")
        .argument("<name>", "Entity name or alias")
        .action(async (name: string) => {
          try {
            const entity = await entityDb.findByName(name);

            if (!entity) {
              console.log(`\n  Entity "${name}" not found.\n`);
              return;
            }

            const aliases = parseJsonArray(entity.aliases);
            const linkedFactIds = parseJsonArray(entity.linkedFacts);

            console.log(`\n  Entity: ${entity.name}`);
            console.log(`  ═══════════════════════════════════════`);
            console.log(`  Type:           ${entity.type}`);
            console.log(`  Aliases:        ${aliases.length > 0 ? aliases.join(", ") : "none"}`);
            console.log(`  Mentions:       ${entity.mentionCount}`);
            console.log(`  Last mentioned: ${relativeTime(entity.lastMentioned)}`);
            console.log(`  Created:        ${new Date(entity.createdAt).toISOString()}`);
            console.log(`\n  Summary:`);
            console.log(`  ${entity.summary || "(no summary)"}`);

            // If we have linked fact IDs, try to look them up by searching
            if (linkedFactIds.length > 0) {
              console.log(`\n  Linked Facts (${linkedFactIds.length}):`);
              // Search using the entity name to find related facts
              const vector = await embeddings.embed(entity.name);
              const relatedFacts = await memoryDb.search(vector, 20, 0.2);

              // Filter to facts that mention this entity
              const relevantFacts = relatedFacts.filter((r) => {
                const entities = parseJsonArray(r.entry.entities);
                return entities.some(
                  (e) => e.toLowerCase() === entity.name.toLowerCase(),
                );
              });

              if (relevantFacts.length > 0) {
                for (const r of relevantFacts.slice(0, 15)) {
                  console.log(`  - [${r.entry.category}] ${truncate(r.entry.text, 70)} (${(r.score * 100).toFixed(0)}%)`);
                }
              } else {
                console.log(`  (no linked facts found in vector search)`);
              }
            }

            console.log();
          } catch (err) {
            console.error(`Error: ${String(err)}`);
          }
        });

      // ==================================================================
      // core
      // ==================================================================
      sm.command("core")
        .description("Display current core memory contents")
        .action(async () => {
          try {
            const data = await coreMemory.read();
            const validation = coreMemory.validateData(data);

            console.log(`\n  Core Memory (${validation.tokenCount}/${validation.maxTokens} tokens)\n`);

            const sections = [
              { key: "identity", label: "Identity" },
              { key: "human", label: "Human" },
              { key: "rules", label: "Rules" },
              { key: "active_context", label: "Active Context" },
              { key: "relationships", label: "Relationships" },
            ] as const;

            for (const section of sections) {
              const content = data[section.key];
              const tokens = estimateTokens(content);
              console.log(`  ── ${section.label} (${tokens} tokens) ──`);
              const lines = content.split("\n");
              for (const line of lines) {
                console.log(`  ${line}`);
              }
              console.log();
            }

            const pct = Math.round((validation.tokenCount / validation.maxTokens) * 100);
            const bar = "█".repeat(Math.ceil(pct / 5)) + "░".repeat(20 - Math.ceil(pct / 5));
            console.log(`  Usage: [${bar}] ${pct}%\n`);
          } catch (err) {
            console.error(`Error: ${String(err)}`);
          }
        });

      // ==================================================================
      // reflect
      // ==================================================================
      sm.command("reflect")
        .description("Manually trigger the reflection pipeline")
        .action(async () => {
          console.log("  Running reflection pipeline...\n");
          try {
            const stats = await triggerReflection();
            if (!stats) {
              console.log("  Reflection is already running.\n");
              return;
            }

            console.log(`  Reflection Complete (${stats.durationMs}ms)`);
            console.log(`  ─────────────────────────────`);
            console.log(`  Conversations processed: ${stats.conversationsProcessed}`);
            console.log(`  Facts extracted:         ${stats.factsExtracted}`);
            console.log(`  Facts stored (new):      ${stats.factsStored}`);
            console.log(`  Duplicates skipped:      ${stats.duplicatesSkipped}`);
            console.log(`  Duplicates merged:       ${stats.duplicatesMerged}`);
            console.log(`  Entities created:        ${stats.entitiesCreated}`);
            console.log(`  Entities updated:        ${stats.entitiesUpdated}`);
            console.log(`  Memories decayed:        ${stats.memoriesDecayed}`);
            console.log(`  Core memory updated:     ${stats.coreMemoryUpdated ? "yes" : "no"}`);
            console.log();
          } catch (err) {
            console.error(`Reflection failed: ${String(err)}`);
          }
        });

      // ==================================================================
      // export
      // ==================================================================
      sm.command("export")
        .description("Export all memories and entities")
        .option("--format <fmt>", "Output format: json|markdown (default: json)", "json")
        .action(async (opts: { format: string }) => {
          try {
            const allMemories = await memoryDb.getAll(10000);
            const allEntities = await entityDb.getAll(10000);

            if (opts.format === "markdown") {
              // Markdown format
              console.log(`# Memory Smart Export`);
              console.log(`\n*Exported: ${new Date().toISOString()}*`);
              console.log(`*Total facts: ${allMemories.length}, Entities: ${allEntities.length}*\n`);

              // Group memories by category
              const byCategory = new Map<string, MemoryEntry[]>();
              for (const m of allMemories) {
                const cat = m.category || "other";
                if (!byCategory.has(cat)) byCategory.set(cat, []);
                byCategory.get(cat)!.push(m);
              }

              console.log(`## Facts\n`);
              for (const [cat, memories] of byCategory) {
                console.log(`### ${cat.charAt(0).toUpperCase() + cat.slice(1)} (${memories.length})\n`);
                for (const m of memories.sort((a, b) => b.importance - a.importance)) {
                  const entities = parseJsonArray(m.entities);
                  const entityStr = entities.length > 0 ? ` [${entities.join(", ")}]` : "";
                  console.log(`- (${(m.importance * 100).toFixed(0)}%) ${m.text}${entityStr}`);
                }
                console.log();
              }

              console.log(`## Entities\n`);
              for (const e of allEntities.sort((a, b) => b.mentionCount - a.mentionCount)) {
                const aliases = parseJsonArray(e.aliases);
                const aliasStr = aliases.length > 0 ? ` (${aliases.join(", ")})` : "";
                console.log(`### ${e.name}${aliasStr} [${e.type}]\n`);
                console.log(`${e.summary}\n`);
                console.log(`*Mentions: ${e.mentionCount} | Last: ${new Date(e.lastMentioned).toISOString()}*\n`);
              }
            } else {
              // JSON format
              const output = {
                exportedAt: new Date().toISOString(),
                facts: allMemories.map((m) => ({
                  id: m.id,
                  text: m.text,
                  category: m.category,
                  importance: m.importance,
                  entities: parseJsonArray(m.entities),
                  source: m.source,
                  createdAt: new Date(m.createdAt).toISOString(),
                  updatedAt: new Date(m.updatedAt).toISOString(),
                  accessCount: m.accessCount,
                })),
                entities: allEntities.map((e) => ({
                  id: e.id,
                  name: e.name,
                  type: e.type,
                  summary: e.summary,
                  aliases: parseJsonArray(e.aliases),
                  linkedFacts: parseJsonArray(e.linkedFacts),
                  mentionCount: e.mentionCount,
                  lastMentioned: new Date(e.lastMentioned).toISOString(),
                  createdAt: new Date(e.createdAt).toISOString(),
                })),
              };

              console.log(JSON.stringify(output, null, 2));
            }
          } catch (err) {
            console.error(`Error: ${String(err)}`);
          }
        });

      // ==================================================================
      // import
      // ==================================================================
      sm.command("import")
        .description("Import memories from existing workspace files")
        .option("--source <source>", "Import source: workspace", "workspace")
        .action(async (opts: { source: string }) => {
          if (opts.source !== "workspace") {
            console.error(`  Unknown import source: ${opts.source}. Supported: workspace\n`);
            return;
          }

          console.log("\n  Importing from workspace memory files...\n");

          try {
            // Resolve workspace path from the API
            const workspacePath = api.resolvePath(".");

            const result = await importFromWorkspace(
              workspacePath,
              memoryDb,
              entityDb,
              coreMemory,
              embeddings,
              cfg.extraction.apiKey,
              cfg.extraction.model,
              {
                info: (msg: string) => console.log(`  ${msg}`),
                warn: (msg: string) => console.log(`  ⚠ ${msg}`),
                error: (msg: string) => console.error(`  ✗ ${msg}`),
              },
            );

            console.log(`\n  Import Complete`);
            console.log(`  ─────────────────────────────`);
            console.log(`  Files processed:   ${result.filesProcessed}`);
            console.log(`  Chunks processed:  ${result.chunksProcessed}`);
            console.log(`  Facts extracted:   ${result.factsExtracted}`);
            console.log(`  Facts stored:      ${result.factsStored}`);
            console.log(`  Duplicates:        ${result.duplicatesSkipped} skipped`);
            console.log(`  Entities created:  ${result.entitiesCreated}`);
            console.log(`  Core memory:       ${result.coreMemoryGenerated ? "generated" : "not generated"}`);

            if (result.errors.length > 0) {
              console.log(`\n  Errors (${result.errors.length}):`);
              for (const err of result.errors.slice(0, 10)) {
                console.log(`  ✗ ${err}`);
              }
              if (result.errors.length > 10) {
                console.log(`  ... and ${result.errors.length - 10} more`);
              }
            }
            console.log();
          } catch (err) {
            console.error(`  Import failed: ${String(err)}\n`);
          }
        });

      // ==================================================================
      // reset
      // ==================================================================
      sm.command("reset")
        .description("Reset the memory database (deletes all memories and entities)")
        .option("--force", "Skip confirmation")
        .action(async (opts: { force?: boolean }) => {
          if (!opts.force) {
            console.log("\n  ⚠ This will DELETE all memories and entities from the database.");
            console.log("  Core memory file will NOT be deleted.");
            console.log("  Run with --force to confirm.\n");
            return;
          }

          try {
            console.log("\n  Resetting database...");

            // Reset memories
            await memoryDb.reset();
            console.log("  ✓ Memories table reset");

            // Reset entities
            await entityDb.reset();
            console.log("  ✓ Entities table reset");

            // Clear extraction queue
            await queue.clear();
            console.log("  ✓ Extraction queue cleared");

            console.log("\n  Database reset complete.\n");
          } catch (err) {
            console.error(`  Reset failed: ${String(err)}\n`);
          }
        });
    },
    { commands: ["smart-memory"] },
  );
}
