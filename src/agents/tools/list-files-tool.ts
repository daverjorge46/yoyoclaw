import fs from "node:fs/promises";
import path from "node:path";

import { Type } from "@sinclair/typebox";

import type { MoltbotConfig } from "../../config/config.js";
import { resolveAgentWorkspaceDir, resolveSessionAgentId } from "../agent-scope.js";
import type { AnyAgentTool } from "./common.js";
import { jsonResult, readNumberParam, readStringParam } from "./common.js";
import { resolveIngestAllowlistRoot } from "./ingest-tool.js";

const ListFilesSchema = Type.Object({
  root: Type.String(),
  glob: Type.Optional(Type.String()),
  max_results: Type.Optional(Type.Number()),
});

const DEFAULT_MAX_RESULTS = 100;
const ABSOLUTE_MAX_RESULTS = 1000;

function isUnderAllowlist(resolvedPath: string, allowlistRoots: string[]): boolean {
  return allowlistRoots.some(
    (root) => resolvedPath.startsWith(root + path.sep) || resolvedPath === root,
  );
}

function matchesGlob(filename: string, glob: string): boolean {
  if (glob.startsWith("*.")) {
    const ext = glob.slice(1);
    return filename.endsWith(ext);
  }
  return filename.includes(glob);
}

export type ListFilesEntry = { path: string; size: number; modifiedAt: string };
export type ListFilesError = { path: string; code: string; message: string };

export function createListLocalFilesTool(options: {
  config?: MoltbotConfig;
  agentSessionKey?: string;
  workspaceDir?: string;
}): AnyAgentTool | null {
  const cfg = options.config;
  if (!cfg || !options.workspaceDir) return null;

  const agentId = resolveSessionAgentId({
    sessionKey: options.agentSessionKey,
    config: cfg,
  });
  const workspaceDir = options.workspaceDir || resolveAgentWorkspaceDir(cfg, agentId);

  return {
    label: "List Local Files",
    name: "list_local_files",
    description:
      'List files in an allowlisted local directory. Only directories under the agent workspace or SOPHIE_INGEST_ROOT are permitted. Returns file paths (relative to root), sizes, and modification times. Use glob parameter (e.g. "*.md") to filter by extension.',
    parameters: ListFilesSchema,
    execute: async (_toolCallId, params) => {
      const rootParam = readStringParam(params, "root", { required: true });
      const glob = readStringParam(params, "glob");
      const rawMax = readNumberParam(params, "max_results", { integer: true });
      const maxResults = Math.min(rawMax ?? DEFAULT_MAX_RESULTS, ABSOLUTE_MAX_RESULTS);

      // 1. Resolve and validate allowlist
      const resolvedRoot = path.resolve(rootParam);
      const allowlistRoots = [
        path.resolve(workspaceDir),
        path.resolve(resolveIngestAllowlistRoot()),
      ];

      if (!isUnderAllowlist(resolvedRoot, allowlistRoots)) {
        throw new Error(
          `Path outside allowlist. Directory must be under: ${allowlistRoots.join(" or ")}`,
        );
      }

      // 2. Verify root exists and is a directory (fail-closed)
      let rootStat;
      try {
        rootStat = await fs.lstat(resolvedRoot);
      } catch {
        throw new Error(`Directory not found: ${rootParam}`);
      }
      if (!rootStat.isDirectory()) {
        throw new Error(`Not a directory: ${rootParam}`);
      }

      // 3. Walk directory with manual stack (deterministic, no recursive flag)
      const files: ListFilesEntry[] = [];
      const errors: ListFilesError[] = [];
      const stack: string[] = [""];

      while (stack.length > 0 && files.length < maxResults) {
        const relDir = stack.pop()!;
        const absDir = relDir ? path.join(resolvedRoot, relDir) : resolvedRoot;

        let entries;
        try {
          entries = await fs.readdir(absDir, { withFileTypes: true });
        } catch (err) {
          const code = (err as NodeJS.ErrnoException).code ?? "UNKNOWN";
          errors.push({
            path: relDir || ".",
            code,
            message: `readdir failed: ${code}`,
          });
          continue;
        }

        for (const entry of entries) {
          if (files.length >= maxResults) break;

          const relPath = relDir ? path.join(relDir, entry.name) : entry.name;

          if (entry.isSymbolicLink()) {
            errors.push({ path: relPath, code: "symlink_skipped", message: "symlink_skipped" });
            continue;
          }

          if (entry.isDirectory()) {
            stack.push(relPath);
            continue;
          }

          if (!entry.isFile()) continue;

          if (glob && !matchesGlob(entry.name, glob)) continue;

          const fullPath = path.join(resolvedRoot, relPath);
          try {
            const stat = await fs.lstat(fullPath);
            files.push({
              path: relPath,
              size: stat.size,
              modifiedAt: stat.mtime.toISOString(),
            });
          } catch (err) {
            const code = (err as NodeJS.ErrnoException).code ?? "UNKNOWN";
            errors.push({ path: relPath, code, message: `stat failed: ${code}` });
          }
        }
      }

      return jsonResult({
        root: rootParam,
        files,
        count: files.length,
        truncated: files.length >= maxResults,
        ...(errors.length > 0 ? { errors } : {}),
      });
    },
  };
}
