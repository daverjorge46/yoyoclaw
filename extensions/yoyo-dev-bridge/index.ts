/**
 * Yoyo Dev Bridge Plugin
 *
 * Connects Yoyo Claw agent to Yoyo Dev workflows by providing tools
 * to list and read specs, tasks, and fixes from the .yoyo-dev/ directory.
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveProjectRoot(configRoot?: string): string | null {
  // 1. Explicit config
  if (configRoot && fs.existsSync(path.join(configRoot, ".yoyo-dev"))) {
    return configRoot;
  }

  // 2. Environment variable
  const envRoot = process.env.YOYO_PROJECT_ROOT;
  if (envRoot && fs.existsSync(path.join(envRoot, ".yoyo-dev"))) {
    return envRoot;
  }

  // 3. CWD
  const cwdRoot = path.join(process.cwd(), ".yoyo-dev");
  if (fs.existsSync(cwdRoot)) {
    return process.cwd();
  }

  return null;
}

function listDirs(dirPath: string): string[] {
  try {
    return fs
      .readdirSync(dirPath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()
      .reverse(); // newest first (YYYY-MM-DD prefix)
  } catch {
    return [];
  }
}

function readFileSafe(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

const yoyoDevBridgePlugin = {
  id: "yoyo-dev-bridge",
  name: "Yoyo Dev Bridge",
  description: "Access Yoyo Dev project specs, tasks, and fixes",
  kind: "tools" as const,

  configSchema: {
    type: "object" as const,
    additionalProperties: false as const,
    properties: {
      projectRoot: {
        type: "string" as const,
        description: "Path to the Yoyo Dev project root",
      },
    },
  },

  register(api: OpenClawPluginApi) {
    // ── list-specs ──────────────────────────────────────────────────────
    api.registerTool(
      (ctx) => ({
        name: "list_specs",
        description:
          "List all Yoyo Dev specifications in the current project. " +
          "Returns spec directory names (YYYY-MM-DD-feature-name format).",
        parameters: { type: "object" as const, properties: {}, required: [] as string[] },
        async execute() {
          const root = resolveProjectRoot(
            (ctx.config as { projectRoot?: string })?.projectRoot,
          );
          if (!root) {
            return { content: "No Yoyo Dev project found. Ensure .yoyo-dev/ exists." };
          }
          const specsDir = path.join(root, ".yoyo-dev", "specs");
          const specs = listDirs(specsDir);
          if (specs.length === 0) {
            return { content: "No specs found in .yoyo-dev/specs/" };
          }
          // Read spec-lite.md summary for each
          const summaries = specs.map((name) => {
            const litePath = path.join(specsDir, name, "spec-lite.md");
            const lite = readFileSafe(litePath);
            const firstLine = lite?.split("\n").find((l) => l.trim().length > 0) ?? "";
            return `- ${name}${firstLine ? ": " + firstLine.replace(/^#+\s*/, "") : ""}`;
          });
          return { content: `## Specs (${specs.length})\n\n${summaries.join("\n")}` };
        },
      }),
      { names: ["list_specs"] },
    );

    // ── get-spec ────────────────────────────────────────────────────────
    api.registerTool(
      (ctx) => ({
        name: "get_spec",
        description:
          "Read a specific Yoyo Dev specification. Returns the condensed spec-lite.md " +
          "content (or full spec.md if lite doesn't exist).",
        parameters: {
          type: "object" as const,
          properties: {
            name: {
              type: "string" as const,
              description: "Spec directory name (e.g. 2026-02-15-feature-name)",
            },
          },
          required: ["name"] as string[],
        },
        async execute(params: { name: string }) {
          const root = resolveProjectRoot(
            (ctx.config as { projectRoot?: string })?.projectRoot,
          );
          if (!root) {
            return { content: "No Yoyo Dev project found." };
          }
          const specDir = path.join(root, ".yoyo-dev", "specs", params.name);
          if (!fs.existsSync(specDir)) {
            return { content: `Spec '${params.name}' not found.` };
          }
          // Prefer spec-lite.md, fall back to spec.md
          const content =
            readFileSafe(path.join(specDir, "spec-lite.md")) ??
            readFileSafe(path.join(specDir, "spec.md")) ??
            "Spec files not found in directory.";
          return { content };
        },
      }),
      { names: ["get_spec"] },
    );

    // ── list-tasks ──────────────────────────────────────────────────────
    api.registerTool(
      (ctx) => ({
        name: "list_tasks",
        description:
          "List task status for the most recent spec (or a named spec). " +
          "Reads tasks.md and extracts task items.",
        parameters: {
          type: "object" as const,
          properties: {
            spec: {
              type: "string" as const,
              description: "Optional spec name. Defaults to the most recent.",
            },
          },
          required: [] as string[],
        },
        async execute(params: { spec?: string }) {
          const root = resolveProjectRoot(
            (ctx.config as { projectRoot?: string })?.projectRoot,
          );
          if (!root) {
            return { content: "No Yoyo Dev project found." };
          }
          const specsDir = path.join(root, ".yoyo-dev", "specs");
          const specName = params.spec ?? listDirs(specsDir)[0];
          if (!specName) {
            return { content: "No specs found." };
          }
          const tasksContent = readFileSafe(
            path.join(specsDir, specName, "tasks.md"),
          );
          if (!tasksContent) {
            return { content: `No tasks.md found for spec '${specName}'.` };
          }
          return { content: `## Tasks for ${specName}\n\n${tasksContent}` };
        },
      }),
      { names: ["list_tasks"] },
    );

    // ── list-fixes ──────────────────────────────────────────────────────
    api.registerTool(
      (ctx) => ({
        name: "list_fixes",
        description: "List all Yoyo Dev bug fix records.",
        parameters: { type: "object" as const, properties: {}, required: [] as string[] },
        async execute() {
          const root = resolveProjectRoot(
            (ctx.config as { projectRoot?: string })?.projectRoot,
          );
          if (!root) {
            return { content: "No Yoyo Dev project found." };
          }
          const fixesDir = path.join(root, ".yoyo-dev", "fixes");
          const fixes = listDirs(fixesDir);
          if (fixes.length === 0) {
            return { content: "No fixes found in .yoyo-dev/fixes/" };
          }
          const summaries = fixes.map((name) => {
            const analysis = readFileSafe(path.join(fixesDir, name, "analysis.md"));
            const firstLine = analysis?.split("\n").find((l) => l.trim().length > 0) ?? "";
            return `- ${name}${firstLine ? ": " + firstLine.replace(/^#+\s*/, "") : ""}`;
          });
          return { content: `## Fixes (${fixes.length})\n\n${summaries.join("\n")}` };
        },
      }),
      { names: ["list_fixes"] },
    );
  },
};

export default yoyoDevBridgePlugin;
