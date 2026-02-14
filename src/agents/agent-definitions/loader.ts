import YAML from "yaml";
import type {
  AgentDefinition,
  AgentDefinitionFrontmatter,
  AgentDefinitionSource,
  AgentDefinitionToolPolicy,
} from "./types.js";

function normalizeStringList(input: unknown): string[] | undefined {
  if (!input) {
    return undefined;
  }
  if (Array.isArray(input)) {
    const result = input.map((v) => String(v).trim()).filter(Boolean);
    return result.length > 0 ? result : undefined;
  }
  if (typeof input === "string") {
    const result = input
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    return result.length > 0 ? result : undefined;
  }
  return undefined;
}

function parseToolPolicy(raw: unknown): AgentDefinitionToolPolicy | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const obj = raw as Record<string, unknown>;
  const allow = normalizeStringList(obj.allow);
  const deny = normalizeStringList(obj.deny);
  if (!allow && !deny) {
    return undefined;
  }
  return { allow, deny };
}

function parseFrontmatterYaml(block: string): Record<string, unknown> | null {
  try {
    const parsed = YAML.parse(block) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractFrontmatterBlock(content: string): { block: string; body: string } | null {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!normalized.startsWith("---")) {
    return null;
  }
  const endIndex = normalized.indexOf("\n---", 3);
  if (endIndex === -1) {
    return null;
  }
  const block = normalized.slice(4, endIndex);
  const body = normalized.slice(endIndex + 4).trim();
  return { block, body };
}

export function parseAgentDefinitionFrontmatter(
  raw: Record<string, unknown>,
): AgentDefinitionFrontmatter | null {
  const name = typeof raw.name === "string" ? raw.name.trim() : undefined;
  if (!name) {
    return null;
  }
  return {
    name,
    description:
      typeof raw.description === "string" ? raw.description.trim() || undefined : undefined,
    model: typeof raw.model === "string" ? raw.model.trim() || undefined : undefined,
    tools: parseToolPolicy(raw.tools),
  };
}

export function parseAgentDefinition(
  content: string,
  opts: { filePath: string; source: AgentDefinitionSource; filenameName?: string },
): AgentDefinition | null {
  const extracted = extractFrontmatterBlock(content);
  if (!extracted) {
    return null;
  }
  const raw = parseFrontmatterYaml(extracted.block);
  if (!raw) {
    return null;
  }
  const frontmatter = parseAgentDefinitionFrontmatter(raw);
  if (!frontmatter) {
    // Fall back to filename-based name if frontmatter has no name field
    if (opts.filenameName) {
      const nameFromFile = opts.filenameName;
      return {
        name: nameFromFile,
        description:
          typeof raw.description === "string" ? raw.description.trim() || undefined : undefined,
        model: typeof raw.model === "string" ? raw.model.trim() || undefined : undefined,
        tools: parseToolPolicy(raw.tools),
        systemPrompt: extracted.body || undefined,
        source: opts.source,
        filePath: opts.filePath,
      };
    }
    return null;
  }
  return {
    name: frontmatter.name,
    description: frontmatter.description,
    model: frontmatter.model,
    tools: frontmatter.tools,
    systemPrompt: extracted.body || undefined,
    source: opts.source,
    filePath: opts.filePath,
  };
}
