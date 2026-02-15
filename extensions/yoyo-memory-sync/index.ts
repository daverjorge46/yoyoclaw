/**
 * Yoyo Memory Sync Plugin
 *
 * Syncs agent memory with the Yoyo Dev memory system stored in
 * ~/.claude/projects/*/memory/ directories. Provides tools to read
 * and search Claude Code project memories.
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveClaudeMemoryDirs(configDir?: string): string[] {
  const dirs: string[] = [];

  // 1. Explicit config
  if (configDir && fs.existsSync(configDir)) {
    dirs.push(configDir);
    return dirs;
  }

  // 2. Scan ~/.claude/projects/*/memory/
  const claudeProjectsDir = path.join(os.homedir(), ".claude", "projects");
  try {
    const projects = fs.readdirSync(claudeProjectsDir, { withFileTypes: true });
    for (const project of projects) {
      if (project.isDirectory()) {
        const memDir = path.join(claudeProjectsDir, project.name, "memory");
        if (fs.existsSync(memDir)) {
          dirs.push(memDir);
        }
      }
    }
  } catch {
    // No Claude projects directory
  }

  return dirs;
}

function readFileSafe(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

function listMarkdownFiles(dir: string): string[] {
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .sort();
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

const yoyoMemorySyncPlugin = {
  id: "yoyo-memory-sync",
  name: "Yoyo Memory Sync",
  description: "Access Claude Code project memories from Yoyo Claw agent",
  kind: "tools" as const,

  configSchema: {
    type: "object" as const,
    additionalProperties: false as const,
    properties: {
      claudeProjectMemoryDir: {
        type: "string" as const,
        description: "Path to Claude Code project memory directory",
      },
    },
  },

  register(api: OpenClawPluginApi) {
    // ── list-memories ───────────────────────────────────────────────────
    api.registerTool(
      (ctx) => ({
        name: "list_claude_memories",
        description:
          "List all Claude Code project memory directories and their files. " +
          "These contain persistent notes from Claude Code sessions.",
        parameters: { type: "object" as const, properties: {}, required: [] as string[] },
        async execute() {
          const dirs = resolveClaudeMemoryDirs(
            (ctx.config as { claudeProjectMemoryDir?: string })?.claudeProjectMemoryDir,
          );
          if (dirs.length === 0) {
            return { content: "No Claude Code memory directories found." };
          }
          const results = dirs.map((dir) => {
            const files = listMarkdownFiles(dir);
            // Extract project name from path
            const projectName = path.basename(path.dirname(dir));
            return `### ${projectName}\n  Path: ${dir}\n  Files: ${files.join(", ") || "(empty)"}`;
          });
          return {
            content: `## Claude Code Memories (${dirs.length} projects)\n\n${results.join("\n\n")}`,
          };
        },
      }),
      { names: ["list_claude_memories"] },
    );

    // ── read-memory ─────────────────────────────────────────────────────
    api.registerTool(
      (ctx) => ({
        name: "read_claude_memory",
        description:
          "Read a specific Claude Code memory file (e.g. MEMORY.md). " +
          "Specify the project name (directory name) and file name.",
        parameters: {
          type: "object" as const,
          properties: {
            project: {
              type: "string" as const,
              description: "Project directory name under ~/.claude/projects/",
            },
            file: {
              type: "string" as const,
              description: "Memory file name (e.g. MEMORY.md, patterns.md)",
            },
          },
          required: ["project", "file"] as string[],
        },
        async execute(params: { project: string; file: string }) {
          // Validate filename (no path traversal)
          if (
            params.file.includes("..") ||
            params.file.includes("/") ||
            params.project.includes("..")
          ) {
            return { content: "Invalid file or project name." };
          }

          const memDir = path.join(
            os.homedir(),
            ".claude",
            "projects",
            params.project,
            "memory",
          );
          const filePath = path.join(memDir, params.file);

          const content = readFileSafe(filePath);
          if (!content) {
            return {
              content: `Memory file not found: ${params.project}/memory/${params.file}`,
            };
          }
          return { content };
        },
      }),
      { names: ["read_claude_memory"] },
    );

    // ── search-memories ─────────────────────────────────────────────────
    api.registerTool(
      (ctx) => ({
        name: "search_claude_memories",
        description:
          "Search all Claude Code memory files for a keyword or phrase. " +
          "Returns matching lines with file context.",
        parameters: {
          type: "object" as const,
          properties: {
            query: {
              type: "string" as const,
              description: "Search term (case-insensitive substring match)",
            },
          },
          required: ["query"] as string[],
        },
        async execute(params: { query: string }) {
          const dirs = resolveClaudeMemoryDirs(
            (ctx.config as { claudeProjectMemoryDir?: string })?.claudeProjectMemoryDir,
          );
          if (dirs.length === 0) {
            return { content: "No Claude Code memory directories found." };
          }

          const queryLower = params.query.toLowerCase();
          const matches: string[] = [];

          for (const dir of dirs) {
            const projectName = path.basename(path.dirname(dir));
            const files = listMarkdownFiles(dir);

            for (const file of files) {
              const content = readFileSafe(path.join(dir, file));
              if (!content) continue;

              const lines = content.split("\n");
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].toLowerCase().includes(queryLower)) {
                  matches.push(
                    `**${projectName}/${file}:${i + 1}** ${lines[i].trim()}`,
                  );
                }
              }
            }
          }

          if (matches.length === 0) {
            return { content: `No matches found for "${params.query}".` };
          }

          // Limit results
          const shown = matches.slice(0, 20);
          const remaining = matches.length - shown.length;
          let result = `## Search: "${params.query}" (${matches.length} matches)\n\n${shown.join("\n")}`;
          if (remaining > 0) {
            result += `\n\n_...and ${remaining} more matches_`;
          }
          return { content: result };
        },
      }),
      { names: ["search_claude_memories"] },
    );
  },
};

export default yoyoMemorySyncPlugin;
