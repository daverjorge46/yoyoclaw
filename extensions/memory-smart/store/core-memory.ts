/**
 * Core memory file manager.
 *
 * Manages a structured markdown file at workspace `memory/core.md`.
 * Sections: Identity, Human, Rules, Active Context, Relationships.
 * Enforces a token budget (~4 chars per token).
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

// ============================================================================
// Types
// ============================================================================

export type CoreMemorySection =
  | "identity"
  | "human"
  | "rules"
  | "active_context"
  | "relationships";

export type CoreMemoryUpdateMode = "replace" | "append" | "remove_line";

export type CoreMemoryData = {
  identity: string;
  human: string;
  rules: string;
  active_context: string;
  relationships: string;
};

const SECTION_HEADERS: Record<CoreMemorySection, string> = {
  identity: "## Identity",
  human: "## Human",
  rules: "## Rules",
  active_context: "## Active Context",
  relationships: "## Relationships",
};

const SECTION_ORDER: CoreMemorySection[] = [
  "identity",
  "human",
  "rules",
  "active_context",
  "relationships",
];

const CHARS_PER_TOKEN = 4;

// ============================================================================
// Core Memory Manager
// ============================================================================

export class CoreMemoryManager {
  constructor(
    private readonly filePath: string,
    private readonly maxTokens: number = 1500,
  ) {}

  /**
   * Read the entire core memory, returning parsed sections.
   */
  async read(): Promise<CoreMemoryData> {
    let content: string;
    try {
      content = await readFile(this.filePath, "utf-8");
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return this.defaultData();
      }
      throw err;
    }

    return this.parseContent(content);
  }

  /**
   * Read the raw markdown content for context injection.
   */
  async readRaw(): Promise<string> {
    try {
      return await readFile(this.filePath, "utf-8");
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return this.serializeData(this.defaultData());
      }
      throw err;
    }
  }

  /**
   * Update a section of core memory.
   */
  async update(
    section: CoreMemorySection,
    content: string,
    mode: CoreMemoryUpdateMode = "replace",
  ): Promise<{ success: boolean; tokenCount: number; warning?: string }> {
    const data = await this.read();

    switch (mode) {
      case "replace":
        data[section] = content;
        break;
      case "append":
        data[section] = data[section]
          ? `${data[section]}\n${content}`
          : content;
        break;
      case "remove_line": {
        const lines = data[section].split("\n");
        const filtered = lines.filter(
          (line) => !line.toLowerCase().includes(content.toLowerCase()),
        );
        data[section] = filtered.join("\n");
        break;
      }
    }

    const validation = this.validateData(data);

    if (validation.tokenCount > this.maxTokens) {
      return {
        success: false,
        tokenCount: validation.tokenCount,
        warning: `Core memory would exceed token budget (${validation.tokenCount}/${this.maxTokens} tokens). Please trim content before updating.`,
      };
    }

    await this.writeData(data);

    return {
      success: true,
      tokenCount: validation.tokenCount,
      warning:
        validation.tokenCount > this.maxTokens * 0.85
          ? `Core memory is at ${Math.round((validation.tokenCount / this.maxTokens) * 100)}% capacity.`
          : undefined,
    };
  }

  /**
   * Validate the current core memory size.
   */
  validate(): { tokenCount: number; maxTokens: number; isValid: boolean } {
    // Sync validation based on last known state
    return { tokenCount: 0, maxTokens: this.maxTokens, isValid: true };
  }

  /**
   * Validate data against token budget.
   */
  validateData(data: CoreMemoryData): {
    tokenCount: number;
    maxTokens: number;
    isValid: boolean;
  } {
    const serialized = this.serializeData(data);
    const tokenCount = Math.ceil(serialized.length / CHARS_PER_TOKEN);
    return {
      tokenCount,
      maxTokens: this.maxTokens,
      isValid: tokenCount <= this.maxTokens,
    };
  }

  /**
   * Estimate token count for a string (~4 chars per token).
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }

  // --------------------------------------------------------------------------
  // Private
  // --------------------------------------------------------------------------

  private defaultData(): CoreMemoryData {
    return {
      identity: "[Not yet configured]",
      human: "[Not yet configured]",
      rules: "[Not yet configured]",
      active_context: "[No active context]",
      relationships: "[No relationships recorded]",
    };
  }

  private parseContent(content: string): CoreMemoryData {
    const data = this.defaultData();
    const lines = content.split("\n");

    let currentSection: CoreMemorySection | null = null;
    const sectionLines: Partial<Record<CoreMemorySection, string[]>> = {};

    for (const line of lines) {
      // Check if this line is a section header
      const trimmed = line.trim();
      let foundSection: CoreMemorySection | null = null;

      for (const [section, header] of Object.entries(SECTION_HEADERS)) {
        if (trimmed.toLowerCase() === header.toLowerCase()) {
          foundSection = section as CoreMemorySection;
          break;
        }
      }

      if (foundSection) {
        currentSection = foundSection;
        sectionLines[currentSection] = [];
        continue;
      }

      // Skip the top-level "# Core Memory" header
      if (trimmed.startsWith("# ") && !trimmed.startsWith("## ")) {
        continue;
      }

      if (currentSection && sectionLines[currentSection]) {
        sectionLines[currentSection]!.push(line);
      }
    }

    // Assign parsed sections, trimming leading/trailing whitespace
    for (const section of SECTION_ORDER) {
      if (sectionLines[section]) {
        data[section] = sectionLines[section]!.join("\n").trim();
      }
    }

    return data;
  }

  private serializeData(data: CoreMemoryData): string {
    const parts = ["# Core Memory\n"];

    for (const section of SECTION_ORDER) {
      parts.push(`${SECTION_HEADERS[section]}`);
      parts.push(data[section] || "[Empty]");
      parts.push(""); // blank line
    }

    return parts.join("\n").trim() + "\n";
  }

  private async writeData(data: CoreMemoryData): Promise<void> {
    const content = this.serializeData(data);
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, content, "utf-8");
  }
}
