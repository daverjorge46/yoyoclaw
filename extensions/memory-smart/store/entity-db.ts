/**
 * LanceDB entity profiles store.
 *
 * Table schema:
 *   id, name, type, summary, aliases (JSON string[]), linkedFacts (JSON string[]),
 *   mentionCount, lastMentioned, vector, createdAt, updatedAt
 */

import * as lancedb from "@lancedb/lancedb";
import { randomUUID } from "node:crypto";
import type { EntityType } from "../config.js";

// ============================================================================
// Types
// ============================================================================

export type EntityEntry = {
  id: string;
  name: string;
  type: EntityType;
  summary: string;
  aliases: string;        // JSON-encoded string[]
  linkedFacts: string;    // JSON-encoded string[]
  mentionCount: number;
  lastMentioned: number;
  vector: number[];
  createdAt: number;
  updatedAt: number;
};

export type EntitySearchResult = {
  entry: EntityEntry;
  score: number;
};

export type CreateEntityInput = {
  name: string;
  type: EntityType;
  summary: string;
  aliases?: string[];
  linkedFacts?: string[];
  vector: number[];
};

// ============================================================================
// Entity DB
// ============================================================================

const TABLE_NAME = "entities";

export class EntityDB {
  private db: lancedb.Connection | null = null;
  private table: lancedb.Table | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(
    private readonly dbPath: string,
    private readonly vectorDim: number,
  ) {}

  private async ensureInitialized(): Promise<void> {
    if (this.table) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    this.db = await lancedb.connect(this.dbPath);
    const tables = await this.db.tableNames();

    if (tables.includes(TABLE_NAME)) {
      this.table = await this.db.openTable(TABLE_NAME);
    } else {
      this.table = await this.db.createTable(TABLE_NAME, [
        {
          id: "__schema__",
          name: "",
          type: "person",
          summary: "",
          aliases: "[]",
          linkedFacts: "[]",
          mentionCount: 0,
          lastMentioned: 0,
          vector: new Array(this.vectorDim).fill(0),
          createdAt: 0,
          updatedAt: 0,
        },
      ]);
      await this.table.delete('id = "__schema__"');
    }
  }

  async create(input: CreateEntityInput): Promise<EntityEntry> {
    await this.ensureInitialized();

    const now = Date.now();
    const entry: EntityEntry = {
      id: randomUUID(),
      name: input.name,
      type: input.type,
      summary: input.summary,
      aliases: JSON.stringify(input.aliases ?? []),
      linkedFacts: JSON.stringify(input.linkedFacts ?? []),
      mentionCount: 1,
      lastMentioned: now,
      vector: input.vector,
      createdAt: now,
      updatedAt: now,
    };

    await this.table!.add([entry]);
    return entry;
  }

  async searchByVector(
    vector: number[],
    limit = 5,
    minScore = 0.3,
  ): Promise<EntitySearchResult[]> {
    await this.ensureInitialized();

    const results = await this.table!.vectorSearch(vector).limit(limit).toArray();

    const mapped = results.map((row) => {
      const distance = (row._distance as number) ?? 0;
      const score = 1 / (1 + distance);
      return {
        entry: this.rowToEntity(row),
        score,
      };
    });

    return mapped.filter((r) => r.score >= minScore);
  }

  /**
   * Look up an entity by name or alias (case-insensitive text match).
   */
  async findByName(name: string): Promise<EntityEntry | null> {
    await this.ensureInitialized();

    const lowerName = name.toLowerCase();

    // LanceDB doesn't support LIKE queries on JSON fields well,
    // so we scan and filter. For small entity sets this is fine.
    const results = await this.table!.query().limit(200).toArray();

    for (const row of results) {
      const entityName = (row.name as string).toLowerCase();
      if (entityName === lowerName) {
        return this.rowToEntity(row);
      }

      // Check aliases
      try {
        const aliases = JSON.parse(row.aliases as string) as string[];
        for (const alias of aliases) {
          if (alias.toLowerCase() === lowerName) {
            return this.rowToEntity(row);
          }
        }
      } catch {
        // skip malformed
      }
    }

    return null;
  }

  /**
   * Get all known entity names (for auto-recall matching).
   */
  async getAllNames(): Promise<Array<{ name: string; aliases: string[] }>> {
    await this.ensureInitialized();
    const results = await this.table!.query().limit(500).toArray();
    return results.map((row) => ({
      name: row.name as string,
      aliases: (() => {
        try {
          return JSON.parse(row.aliases as string) as string[];
        } catch {
          return [];
        }
      })(),
    }));
  }

  async delete(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new Error(`Invalid entity ID format: ${id}`);
    }
    await this.table!.delete(`id = '${id}'`);
    return true;
  }

  async count(): Promise<number> {
    await this.ensureInitialized();
    return this.table!.countRows();
  }

  /**
   * Get all entities (for reflection pipeline).
   */
  async getAll(limit = 500): Promise<EntityEntry[]> {
    await this.ensureInitialized();
    const results = await this.table!.query().limit(limit).toArray();
    return results.map((row) => this.rowToEntity(row));
  }

  /**
   * Drop and recreate the entities table (for reset).
   */
  async reset(): Promise<void> {
    await this.ensureInitialized();
    try {
      await this.db!.dropTable(TABLE_NAME);
    } catch {
      // Table might not exist
    }
    this.table = null;
    this.initPromise = null;
    await this.ensureInitialized();
  }

  /**
   * Update fields on an existing entity.
   * Deletes old row and inserts updated one (LanceDB doesn't support in-place update).
   */
  async update(id: string, fields: Partial<Pick<EntityEntry, "summary" | "aliases" | "linkedFacts" | "mentionCount" | "lastMentioned" | "vector">>): Promise<void> {
    await this.ensureInitialized();

    const all = await this.table!.query().limit(500).toArray();
    const existing = all.find((r) => r.id === id);
    if (!existing) return;

    const updated: EntityEntry = {
      id: existing.id as string,
      name: existing.name as string,
      type: existing.type as EntityType,
      summary: fields.summary ?? existing.summary as string,
      aliases: fields.aliases ?? existing.aliases as string,
      linkedFacts: fields.linkedFacts ?? existing.linkedFacts as string,
      mentionCount: fields.mentionCount ?? existing.mentionCount as number,
      lastMentioned: fields.lastMentioned ?? existing.lastMentioned as number,
      vector: fields.vector ?? existing.vector as number[],
      createdAt: existing.createdAt as number,
      updatedAt: Date.now(),
    };

    await this.table!.delete(`id = '${id}'`);
    await this.table!.add([updated]);
  }

  private rowToEntity(row: Record<string, unknown>): EntityEntry {
    return {
      id: row.id as string,
      name: row.name as string,
      type: row.type as EntityType,
      summary: row.summary as string,
      aliases: row.aliases as string,
      linkedFacts: row.linkedFacts as string,
      mentionCount: row.mentionCount as number,
      lastMentioned: row.lastMentioned as number,
      vector: row.vector as number[],
      createdAt: row.createdAt as number,
      updatedAt: row.updatedAt as number,
    };
  }
}
