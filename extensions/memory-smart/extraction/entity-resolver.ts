/**
 * Entity Resolver — matches extracted entity names against existing
 * entity profiles in the entity DB. Handles fuzzy matching via
 * embedding similarity and auto-creation of new entities.
 */

import type { EmbeddingProvider } from "../providers/types.js";
import type { EntityDB, EntityEntry } from "../store/entity-db.js";

// ============================================================================
// Types
// ============================================================================

export type ResolveResult = {
  existing: EntityEntry | null;
  shouldCreate: boolean;
};

// Track mention counts for auto-creation decisions
type MentionTracker = Map<string, number>;

// ============================================================================
// Entity Resolver
// ============================================================================

export class EntityResolver {
  /**
   * In-memory mention counter — tracks how many times an unresolved entity name
   * has been seen across extractions. Persists for the lifetime of the resolver
   * instance (i.e., one gateway session). When count exceeds the threshold,
   * shouldCreate is flagged.
   */
  private mentionCounts: MentionTracker = new Map();

  constructor(
    private readonly entityDb: EntityDB,
    private readonly embeddings: EmbeddingProvider,
    private readonly minMentionsToCreate: number = 3,
  ) {}

  /**
   * Resolve an entity name to an existing profile or suggest creating a new one.
   *
   * Resolution strategy:
   * 1. Exact name match on existing entities
   * 2. Alias match (check all aliases)
   * 3. Fuzzy matching via embedding similarity on names/aliases (threshold 0.85)
   * 4. If no match and entity has been mentioned 3+ times, flag for auto-create
   */
  async resolve(name: string): Promise<ResolveResult> {
    if (!name || name.trim().length < 2) {
      return { existing: null, shouldCreate: false };
    }

    const normalizedName = name.trim();

    // 1. Exact name/alias match
    const exactMatch = await this.entityDb.findByName(normalizedName);
    if (exactMatch) {
      return { existing: exactMatch, shouldCreate: false };
    }

    // 2. Fuzzy match via embedding similarity
    try {
      const nameVector = await this.embeddings.embed(normalizedName);
      const similar = await this.entityDb.searchByVector(nameVector, 3, 0.85);

      if (similar.length > 0) {
        // Return the best match above threshold
        return { existing: similar[0].entry, shouldCreate: false };
      }
    } catch {
      // Embedding search failed, continue with mention tracking
    }

    // 3. No match found — track mentions for auto-creation
    const lowerName = normalizedName.toLowerCase();
    const currentCount = (this.mentionCounts.get(lowerName) ?? 0) + 1;
    this.mentionCounts.set(lowerName, currentCount);

    const shouldCreate = currentCount >= this.minMentionsToCreate;

    return { existing: null, shouldCreate };
  }

  /**
   * Link a fact to entities by updating their linkedFacts arrays
   * and incrementing mention counts.
   */
  async linkFact(
    factId: string,
    entityNames: string[],
  ): Promise<void> {
    for (const name of entityNames) {
      const entity = await this.entityDb.findByName(name.trim());
      if (!entity) continue;

      // Parse existing linked facts
      let linkedFacts: string[];
      try {
        linkedFacts = JSON.parse(entity.linkedFacts) as string[];
      } catch {
        linkedFacts = [];
      }

      // Add fact ID if not already linked
      if (!linkedFacts.includes(factId)) {
        linkedFacts.push(factId);
      }

      // Update entity
      await this.entityDb.update(entity.id, {
        linkedFacts: JSON.stringify(linkedFacts),
        mentionCount: entity.mentionCount + 1,
        lastMentioned: Date.now(),
      });
    }
  }

  /**
   * Update an entity's summary by re-embedding based on its linked facts.
   */
  async updateSummary(
    entityId: string,
    facts: string[],
  ): Promise<void> {
    if (facts.length === 0) return;

    // Get the existing entity
    const allEntities = await this.entityDb.getAll();
    const entity = allEntities.find((e) => e.id === entityId);
    if (!entity) return;

    // Build a new summary from the most recent facts (last 5)
    const recentFacts = facts.slice(-5);
    const summaryText = recentFacts.join(". ");

    // Truncate to reasonable length
    const summary = summaryText.length > 300
      ? summaryText.slice(0, 297) + "..."
      : summaryText;

    // Re-embed the summary
    const vector = await this.embeddings.embed(`${entity.name}: ${summary}`);

    await this.entityDb.update(entityId, {
      summary,
      vector,
    });
  }

  /**
   * Auto-create a new entity profile.
   * Called when shouldCreate is true from resolve().
   */
  async autoCreateEntity(
    name: string,
    type: "person" | "project" | "tool" | "place" | "organization",
    initialFacts: string[] = [],
  ): Promise<EntityEntry> {
    const summary = initialFacts.length > 0
      ? initialFacts.slice(0, 3).join(". ")
      : `Entity: ${name}`;

    const vector = await this.embeddings.embed(`${name}: ${summary}`);

    const entity = await this.entityDb.create({
      name,
      type,
      summary: summary.length > 300 ? summary.slice(0, 297) + "..." : summary,
      aliases: [],
      linkedFacts: [],
      vector,
    });

    // Reset mention counter after creation
    this.mentionCounts.delete(name.toLowerCase());

    return entity;
  }

  /**
   * Get the current mention count for an unresolved entity name.
   */
  getMentionCount(name: string): number {
    return this.mentionCounts.get(name.toLowerCase()) ?? 0;
  }
}
