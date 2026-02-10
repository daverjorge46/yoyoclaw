/**
 * MCP Bridge Prototype
 *
 * Converts MCP server tool schemas into OpenClaw SKILL.md format.
 * This enables MCP tools to be surfaced as skills in the OpenClaw agent system.
 *
 * Usage (future CLI integration):
 *   mcporter list <server> --schema --output json → SKILL.md
 */

import fs from "node:fs";
import path from "node:path";
import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("mcp-bridge");

export type McpToolSchema = {
  name: string;
  description?: string;
  inputSchema?: {
    type: string;
    properties?: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
};

export type McpServerInfo = {
  name: string;
  version?: string;
  tools: McpToolSchema[];
};

/**
 * Generate a SKILL.md content string from an MCP server's tool listing.
 */
export function generateSkillFromMcpServer(server: McpServerInfo): string {
  const toolDescriptions = server.tools
    .map((tool) => {
      const params = tool.inputSchema?.properties
        ? Object.entries(tool.inputSchema.properties)
            .map(([key, val]) => `  - \`${key}\` (${val.type}): ${val.description ?? ""}`)
            .join("\n")
        : "  (no parameters)";
      return `### ${tool.name}\n${tool.description ?? "(no description)"}\n\n**Parameters:**\n${params}`;
    })
    .join("\n\n");

  const skillName = `mcp-${server.name}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const description = server.tools
    .slice(0, 3)
    .map((t) => t.name)
    .join(", ");

  return `---
name: ${skillName}
description: "MCP bridge for ${server.name}. Tools: ${description}${server.tools.length > 3 ? ` (+${server.tools.length - 3} more)` : ""}"
metadata: {"openclaw":{"emoji":"🔌","version":"0.1.0"}}
---

# ${server.name} (MCP Bridge)

Auto-generated skill from MCP server \`${server.name}\`${server.version ? ` v${server.version}` : ""}.

## Available Tools

${toolDescriptions}
`;
}

/**
 * Write a generated SKILL.md to the target skill directory.
 */
export function writeMcpBridgeSkill(params: { server: McpServerInfo; targetDir: string }): string {
  const content = generateSkillFromMcpServer(params.server);
  const skillDir = path.join(
    params.targetDir,
    `mcp-${params.server.name}`.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
  );
  fs.mkdirSync(skillDir, { recursive: true });
  const filePath = path.join(skillDir, "SKILL.md");
  fs.writeFileSync(filePath, content, "utf-8");
  log.info(`MCP bridge skill written: ${filePath}`);
  return filePath;
}

/**
 * Parse a JSON tool listing (e.g. from `mcporter list <server> --schema --output json`)
 * into an McpServerInfo structure.
 */
export function parseMcpToolListing(json: unknown, serverName: string): McpServerInfo {
  if (!json || typeof json !== "object") {
    return { name: serverName, tools: [] };
  }
  const obj = json as Record<string, unknown>;
  const toolsRaw = Array.isArray(obj.tools) ? obj.tools : [];
  const tools: McpToolSchema[] = toolsRaw
    .filter((t): t is Record<string, unknown> => t !== null && typeof t === "object")
    .map((t) => ({
      name: typeof t.name === "string" ? t.name : "unknown",
      description: typeof t.description === "string" ? t.description : undefined,
      inputSchema:
        t.inputSchema && typeof t.inputSchema === "object"
          ? (t.inputSchema as McpToolSchema["inputSchema"])
          : undefined,
    }));
  return {
    name: serverName,
    version: typeof obj.version === "string" ? obj.version : undefined,
    tools,
  };
}
