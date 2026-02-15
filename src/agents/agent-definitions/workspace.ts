import fs from "node:fs";
import path from "node:path";
import type { AgentDefinition, AgentDefinitionSource } from "./types.js";
import { parseAgentDefinition } from "./loader.js";

const AGENT_DEFINITIONS_DIR_NAME = "agents";

function loadDefinitionsFromDir(dir: string, source: AgentDefinitionSource): AgentDefinition[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const definitions: AgentDefinition[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    if (!entry.name.endsWith(".md")) {
      continue;
    }
    const filePath = path.join(dir, entry.name);
    const filenameName = entry.name.replace(/\.md$/, "");
    if (!filenameName) {
      continue;
    }
    let content: string;
    try {
      content = fs.readFileSync(filePath, "utf-8");
    } catch {
      continue;
    }
    const definition = parseAgentDefinition(content, {
      filePath,
      source,
      filenameName,
    });
    if (definition) {
      definitions.push(definition);
    }
  }
  return definitions;
}

/**
 * Load agent definitions from workspace and optional bundled directories.
 *
 * Workspace definitions override bundled ones with the same name.
 * Scans `{workspaceDir}/agents/` and optionally `{workspaceDir}/.agents/agents/`.
 */
export function loadAgentDefinitions(
  workspaceDir: string,
  opts?: { bundledDir?: string },
): AgentDefinition[] {
  const byName = new Map<string, AgentDefinition>();

  // 1. Load bundled defaults (lowest precedence)
  if (opts?.bundledDir) {
    for (const def of loadDefinitionsFromDir(opts.bundledDir, "bundled")) {
      byName.set(def.name.toLowerCase(), def);
    }
  }

  // 2. Load from .agents/agents/ (project-scoped, medium precedence)
  const dotAgentsDir = path.join(workspaceDir, ".agents", AGENT_DEFINITIONS_DIR_NAME);
  for (const def of loadDefinitionsFromDir(dotAgentsDir, "workspace")) {
    byName.set(def.name.toLowerCase(), def);
  }

  // 3. Load from agents/ (workspace root, highest precedence)
  const workspaceAgentsDir = path.join(workspaceDir, AGENT_DEFINITIONS_DIR_NAME);
  for (const def of loadDefinitionsFromDir(workspaceAgentsDir, "workspace")) {
    byName.set(def.name.toLowerCase(), def);
  }

  return Array.from(byName.values());
}

/**
 * Resolve a single agent definition by name.
 */
export function resolveAgentDefinition(
  workspaceDir: string,
  name: string,
  opts?: { bundledDir?: string },
): AgentDefinition | undefined {
  const all = loadAgentDefinitions(workspaceDir, opts);
  const normalized = name.trim().toLowerCase();
  return all.find((def) => def.name.toLowerCase() === normalized);
}
