/**
 * Convert MCP tool schemas to Anthropic SDK format
 */

import type { MCPTool } from "./types.js";

interface Logger {
  warn(msg: string): void;
}

/**
 * Deep clone a JSON schema object to handle nested structures
 */
function deepCloneSchema(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepCloneSchema(item));
  }

  const cloned: Record<string, unknown> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepCloneSchema((obj as Record<string, unknown>)[key]);
    }
  }

  return cloned;
}

/**
 * Convert MCP JSON Schema to Anthropic SDK tool format with error handling
 */
export function convertMCPToolSchema(
  mcpTool: MCPTool,
  serverName: string,
  logger?: Logger,
): {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties?: Record<string, unknown>;
    required?: string[];
  };
} | null {
  try {
    // Validate required fields
    if (!mcpTool.inputSchema || typeof mcpTool.inputSchema !== "object") {
      logger?.warn(`Skipping tool ${serverName}__${mcpTool.name}: missing or invalid inputSchema`);
      return null;
    }

    // Namespace the tool name with server name to avoid collisions
    const toolName = `${serverName}__${mcpTool.name}`;

    // Deep clone the schema to handle nested objects/arrays
    const clonedSchema = deepCloneSchema(mcpTool.inputSchema) as {
      properties?: Record<string, unknown>;
      required?: string[];
      [key: string]: unknown;
    };

    return {
      name: toolName,
      description: mcpTool.description || `Tool from MCP server: ${serverName}`,
      input_schema: {
        type: "object",
        properties: clonedSchema.properties || {},
        required: clonedSchema.required || [],
        // Preserve additional schema fields (additionalProperties, etc.)
        ...Object.fromEntries(
          Object.entries(clonedSchema).filter(
            ([key]) => key !== "properties" && key !== "required" && key !== "type",
          ),
        ),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    logger?.warn(`Failed to convert schema for tool ${serverName}__${mcpTool.name}: ${message}`);
    return null;
  }
}

/**
 * Convert multiple MCP tools to Anthropic format
 * Filters out tools that fail conversion
 */
export function convertMCPTools(
  tools: MCPTool[],
  serverName: string,
  logger?: Logger,
): Array<{
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties?: Record<string, unknown>;
    required?: string[];
  };
}> {
  return tools
    .map((tool) => convertMCPToolSchema(tool, serverName, logger))
    .filter((schema): schema is NonNullable<typeof schema> => schema !== null);
}
