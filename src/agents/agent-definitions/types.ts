/**
 * Declarative agent definition types.
 *
 * Agent definitions are markdown files with YAML frontmatter that define
 * specialized sub-agent types with scoped tools, models, and system prompts.
 */

export type AgentDefinitionToolPolicy = {
  /** Allowlist of tools (supports group names like "group:fs"). */
  allow?: string[];
  /** Denylist of tools. */
  deny?: string[];
};

export type AgentDefinitionFrontmatter = {
  /** Unique agent definition name (must match filename without extension). */
  name: string;
  /** Human-readable description of the agent's purpose. */
  description?: string;
  /** Default model for this agent type (e.g. "google/gemini-2.5-flash"). */
  model?: string;
  /** Tool policy for this agent type. */
  tools?: AgentDefinitionToolPolicy;
};

export type AgentDefinitionSource = "workspace" | "bundled";

export type AgentDefinition = {
  /** Agent definition name (derived from filename). */
  name: string;
  /** Human-readable description. */
  description?: string;
  /** Default model override. */
  model?: string;
  /** Tool policy (allow/deny). */
  tools?: AgentDefinitionToolPolicy;
  /** System prompt (markdown body after frontmatter). */
  systemPrompt?: string;
  /** Where the definition was loaded from. */
  source: AgentDefinitionSource;
  /** Absolute path to the definition file. */
  filePath: string;
};
