/**
 * Migration/Import Tool — imports existing workspace memory files
 * (MEMORY.md, memory/*.md) into the smart memory system.
 *
 * Process:
 *   1. Scan workspace for MEMORY.md and memory/*.md files
 *   2. Read each file, split into ~500-word chunks (respect markdown headers)
 *   3. Extract structured facts from each chunk via AI (Gemini Flash)
 *   4. Embed and store each fact in memoryDb (with dedup)
 *   5. Resolve entities from facts and create/update entity profiles
 *   6. Generate initial core memory block from SOUL.md, USER.md, IDENTITY.md
 *   7. Return stats
 */

import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import type { EmbeddingProvider } from "../providers/types.js";
import type { MemoryDB } from "../store/memory-db.js";
import type { EntityDB } from "../store/entity-db.js";
import type { CoreMemoryManager } from "../store/core-memory.js";
import { extractFacts } from "../extraction/extractor.js";

// ============================================================================
// Types
// ============================================================================

export type ImportResult = {
  filesProcessed: number;
  chunksProcessed: number;
  factsExtracted: number;
  factsStored: number;
  entitiesCreated: number;
  duplicatesSkipped: number;
  coreMemoryGenerated: boolean;
  errors: string[];
};

type Logger = {
  info: Function;
  warn: Function;
  error: Function;
};

// ============================================================================
// Constants
// ============================================================================

const TARGET_CHUNK_WORDS = 500;
const DEDUP_THRESHOLD = 0.92;

// ============================================================================
// Chunking
// ============================================================================

/**
 * Split markdown text into chunks of ~500 words, respecting header boundaries.
 */
function splitIntoChunks(text: string): string[] {
  const lines = text.split("\n");
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentWordCount = 0;

  for (const line of lines) {
    const isHeader = /^#{1,3}\s/.test(line);
    const lineWords = line.split(/\s+/).filter(Boolean).length;

    // If we hit a header and current chunk is non-trivial, start a new chunk
    if (isHeader && currentWordCount > 100) {
      const chunkText = currentChunk.join("\n").trim();
      if (chunkText) {
        chunks.push(chunkText);
      }
      currentChunk = [line];
      currentWordCount = lineWords;
      continue;
    }

    // If current chunk exceeds target, split here
    if (currentWordCount + lineWords > TARGET_CHUNK_WORDS && currentWordCount > 100) {
      const chunkText = currentChunk.join("\n").trim();
      if (chunkText) {
        chunks.push(chunkText);
      }
      currentChunk = [line];
      currentWordCount = lineWords;
      continue;
    }

    currentChunk.push(line);
    currentWordCount += lineWords;
  }

  // Push remaining chunk
  const remaining = currentChunk.join("\n").trim();
  if (remaining) {
    chunks.push(remaining);
  }

  return chunks;
}

// ============================================================================
// Entity Type Guesser
// ============================================================================

function guessEntityType(
  name: string,
  contextFacts: string[],
): "person" | "project" | "tool" | "place" | "organization" {
  const context = contextFacts.join(" ").toLowerCase();
  const nameLower = name.toLowerCase();

  if (
    /\b(he|she|they|his|her|their|person|friend|brother|sister|wife|husband|colleague)\b/.test(context) ||
    /\b(says?|said|told|asked|wants?|prefers?|likes?|works?)\b/.test(context)
  ) {
    return "person";
  }

  if (
    /\b(project|app|application|website|repo|repository|deployed|build|version)\b/.test(context) ||
    /\b(github|vercel|netlify)\b/.test(context)
  ) {
    return "project";
  }

  if (
    /\b(tool|plugin|extension|library|framework|sdk|api|cli)\b/.test(context)
  ) {
    return "tool";
  }

  if (
    /\b(city|town|state|country|street|address|located|lives?\s+in)\b/.test(context)
  ) {
    return "place";
  }

  if (
    /\b(company|organization|org|team|group|corp|inc|llc|startup)\b/.test(context)
  ) {
    return "organization";
  }

  return "project";
}

// ============================================================================
// Import
// ============================================================================

/**
 * Import existing workspace memory files into the smart memory system.
 */
export async function importFromWorkspace(
  workspacePath: string,
  memoryDb: MemoryDB,
  entityDb: EntityDB,
  coreMemory: CoreMemoryManager,
  embeddings: EmbeddingProvider,
  extractionApiKey: string,
  extractionModel: string,
  logger: Logger,
): Promise<ImportResult> {
  const result: ImportResult = {
    filesProcessed: 0,
    chunksProcessed: 0,
    factsExtracted: 0,
    factsStored: 0,
    entitiesCreated: 0,
    duplicatesSkipped: 0,
    coreMemoryGenerated: false,
    errors: [],
  };

  // ======================================================================
  // Step 1: Scan workspace for memory files
  // ======================================================================
  const filesToProcess: Array<{ path: string; name: string }> = [];

  // Check MEMORY.md
  const memoryMdPath = join(workspacePath, "MEMORY.md");
  try {
    await stat(memoryMdPath);
    filesToProcess.push({ path: memoryMdPath, name: "MEMORY.md" });
  } catch {
    // File doesn't exist
  }

  // Check memory/*.md
  const memoryDirPath = join(workspacePath, "memory");
  try {
    const memoryDirStat = await stat(memoryDirPath);
    if (memoryDirStat.isDirectory()) {
      const files = await readdir(memoryDirPath);
      for (const file of files) {
        if (file.endsWith(".md") && file !== "core.md") {
          filesToProcess.push({
            path: join(memoryDirPath, file),
            name: `memory/${file}`,
          });
        }
      }
    }
  } catch {
    // Directory doesn't exist
  }

  if (filesToProcess.length === 0) {
    logger.warn("memory-smart/import: No memory files found in workspace");
    return result;
  }

  logger.info(
    `memory-smart/import: found ${filesToProcess.length} files to process`,
  );

  // ======================================================================
  // Step 2-5: Process each file
  // ======================================================================
  // Track all entities across files for bulk creation
  const entityMentions = new Map<string, { count: number; facts: string[] }>();

  for (const file of filesToProcess) {
    try {
      const content = await readFile(file.path, "utf-8");
      if (!content || content.trim().length < 50) {
        logger.info(`memory-smart/import: skipping ${file.name} (too short)`);
        continue;
      }

      const chunks = splitIntoChunks(content);
      logger.info(
        `memory-smart/import: processing ${file.name} (${chunks.length} chunks)`,
      );

      for (const chunk of chunks) {
        result.chunksProcessed++;

        try {
          // Step 3: Extract facts from chunk
          const facts = await extractFacts(chunk, extractionApiKey, extractionModel);
          result.factsExtracted += facts.length;

          // Step 4: Embed and store each fact
          for (const fact of facts) {
            try {
              const vector = await embeddings.embed(fact.text);

              // Dedup check
              const existing = await memoryDb.search(vector, 1, DEDUP_THRESHOLD);
              if (existing.length > 0) {
                result.duplicatesSkipped++;
                continue;
              }

              // Store
              const entry = await memoryDb.store({
                text: fact.text,
                vector,
                importance: fact.importance,
                category: fact.category as any,
                entities: fact.entities,
                source: file.name,
              });

              result.factsStored++;

              // Step 5: Track entity mentions
              for (const entityName of fact.entities) {
                const key = entityName.toLowerCase();
                const existing = entityMentions.get(key) ?? { count: 0, facts: [] };
                existing.count++;
                existing.facts.push(fact.text);
                entityMentions.set(key, existing);
              }
            } catch (err) {
              result.errors.push(`Failed to store fact: ${String(err)}`);
            }
          }
        } catch (err) {
          result.errors.push(
            `Extraction failed for chunk in ${file.name}: ${String(err)}`,
          );
        }

        // Small delay between chunks to avoid rate limiting
        await new Promise((r) => setTimeout(r, 200));
      }

      result.filesProcessed++;
    } catch (err) {
      result.errors.push(`Failed to read ${file.name}: ${String(err)}`);
    }
  }

  // ======================================================================
  // Step 5 (continued): Create entity profiles for entities with 2+ mentions
  // ======================================================================
  for (const [key, data] of entityMentions) {
    if (data.count < 2) continue;

    // Check if entity already exists
    const existing = await entityDb.findByName(key);
    if (existing) continue;

    try {
      // Find the original-case name from the first fact
      const originalName = key.charAt(0).toUpperCase() + key.slice(1);
      const entityType = guessEntityType(originalName, data.facts);
      const summary = data.facts.slice(0, 3).join(". ");
      const truncatedSummary = summary.length > 300 ? summary.slice(0, 297) + "..." : summary;

      const vector = await embeddings.embed(`${originalName}: ${truncatedSummary}`);

      await entityDb.create({
        name: originalName,
        type: entityType,
        summary: truncatedSummary,
        aliases: [],
        linkedFacts: [],
        vector,
      });

      result.entitiesCreated++;

      logger.info(
        `memory-smart/import: created entity "${originalName}" (${entityType}, ${data.count} mentions)`,
      );
    } catch (err) {
      result.errors.push(`Failed to create entity "${key}": ${String(err)}`);
    }
  }

  // ======================================================================
  // Step 6: Generate initial core memory block
  // ======================================================================
  try {
    const sections: Record<string, string> = {};

    // Read SOUL.md
    try {
      const soulPath = join(workspacePath, "SOUL.md");
      const soulContent = await readFile(soulPath, "utf-8");
      if (soulContent) {
        // Extract first ~200 words as identity
        const lines = soulContent.split("\n").filter((l) => l.trim());
        sections.identity = lines.slice(0, 5).join("\n");
      }
    } catch {
      // SOUL.md doesn't exist
    }

    // Read USER.md
    try {
      const userPath = join(workspacePath, "USER.md");
      const userContent = await readFile(userPath, "utf-8");
      if (userContent) {
        const lines = userContent.split("\n").filter((l) => l.trim());
        sections.human = lines.slice(0, 5).join("\n");
      }
    } catch {
      // USER.md doesn't exist
    }

    // Read IDENTITY.md
    try {
      const identityPath = join(workspacePath, "IDENTITY.md");
      const identityContent = await readFile(identityPath, "utf-8");
      if (identityContent && !sections.identity) {
        const lines = identityContent.split("\n").filter((l) => l.trim());
        sections.identity = lines.slice(0, 5).join("\n");
      }
    } catch {
      // IDENTITY.md doesn't exist
    }

    // Write core memory sections
    let coreUpdated = false;
    if (sections.identity) {
      const r = await coreMemory.update("identity", sections.identity, "replace");
      if (r.success) coreUpdated = true;
    }
    if (sections.human) {
      const r = await coreMemory.update("human", sections.human, "replace");
      if (r.success) coreUpdated = true;
    }

    // Add top entities to relationships section
    const topEntities = [...entityMentions.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([name, data]) => `- ${name.charAt(0).toUpperCase() + name.slice(1)} (${data.count} mentions)`);

    if (topEntities.length > 0) {
      const r = await coreMemory.update(
        "relationships",
        topEntities.join("\n"),
        "replace",
      );
      if (r.success) coreUpdated = true;
    }

    result.coreMemoryGenerated = coreUpdated;
  } catch (err) {
    result.errors.push(`Core memory generation failed: ${String(err)}`);
  }

  return result;
}
