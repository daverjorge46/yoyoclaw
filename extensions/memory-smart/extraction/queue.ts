/**
 * Extraction Queue — file-based queue that buffers conversations
 * for batch AI extraction during the reflection pipeline.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

// ============================================================================
// Types
// ============================================================================

export type QueueItem = {
  sessionKey: string;
  messages: string[];
  timestamp: number;
};

// ============================================================================
// Queue
// ============================================================================

export class ExtractionQueue {
  private items: QueueItem[] | null = null;

  constructor(private readonly queuePath: string) {}

  /**
   * Add a conversation to the extraction queue.
   */
  async enqueue(item: QueueItem): Promise<void> {
    const items = await this.load();
    items.push(item);
    await this.save(items);
  }

  /**
   * Remove and return items from the front of the queue.
   * @param count - Number of items to dequeue (default: all)
   */
  async dequeue(count?: number): Promise<QueueItem[]> {
    const items = await this.load();
    if (items.length === 0) return [];

    const n = count ?? items.length;
    const dequeued = items.splice(0, n);
    await this.save(items);
    return dequeued;
  }

  /**
   * Get the number of items in the queue.
   */
  async size(): Promise<number> {
    const items = await this.load();
    return items.length;
  }

  /**
   * Clear all items from the queue.
   */
  async clear(): Promise<void> {
    this.items = [];
    await this.save([]);
  }

  // --------------------------------------------------------------------------
  // Private
  // --------------------------------------------------------------------------

  private async load(): Promise<QueueItem[]> {
    if (this.items !== null) return this.items;

    try {
      const content = await readFile(this.queuePath, "utf-8");
      const parsed = JSON.parse(content);
      this.items = Array.isArray(parsed) ? parsed : [];
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        this.items = [];
      } else {
        // If file is corrupted, start fresh
        this.items = [];
      }
    }

    return this.items;
  }

  private async save(items: QueueItem[]): Promise<void> {
    this.items = items;
    await mkdir(dirname(this.queuePath), { recursive: true });
    await writeFile(this.queuePath, JSON.stringify(items, null, 2), "utf-8");
  }
}
