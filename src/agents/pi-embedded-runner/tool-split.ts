import type { AgentTool } from "@mariozechner/pi-agent-core";
import { toToolDefinitions } from "../pi-tool-definition-adapter.js";

// We always pass tools via `customTools` so our policy filtering, sandbox integration,
// and extended toolset remain consistent across providers.
type AnyAgentTool = AgentTool;

function normalizeToolSortKey(name: unknown): string {
  return typeof name === "string" ? name.trim().toLowerCase() : "";
}

function sortToolsForStableDefinitions(tools: AnyAgentTool[]): AnyAgentTool[] {
  return tools
    .map((tool, index) => ({ tool, index }))
    .toSorted((a, b) => {
      const aKey = normalizeToolSortKey(a.tool.name);
      const bKey = normalizeToolSortKey(b.tool.name);
      if (aKey !== bKey) {
        return aKey < bKey ? -1 : 1;
      }
      const aName = typeof a.tool.name === "string" ? a.tool.name.trim() : "";
      const bName = typeof b.tool.name === "string" ? b.tool.name.trim() : "";
      if (aName !== bName) {
        return aName < bName ? -1 : 1;
      }
      return a.index - b.index;
    })
    .map(({ tool }) => tool);
}

export function splitSdkTools(options: { tools: AnyAgentTool[]; sandboxEnabled: boolean }): {
  builtInTools: AnyAgentTool[];
  customTools: ReturnType<typeof toToolDefinitions>;
} {
  const stableTools = sortToolsForStableDefinitions(options.tools);
  return {
    builtInTools: [],
    customTools: toToolDefinitions(stableTools),
  };
}
