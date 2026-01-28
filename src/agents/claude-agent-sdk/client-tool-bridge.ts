/**
 * Bridge for converting client-provided tools (OpenResponses hosted tools)
 * to the AnyAgentTool format used by the Claude Agent SDK runtime.
 *
 * These tools return "pending" results when called - execution is delegated
 * back to the client that provided the tool definitions.
 */

import type { ClientToolDefinition } from "../runtime-result-types.js";
import type { AnyAgentTool } from "../tools/common.js";
import { jsonResult } from "../tools/common.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("agents/claude-agent-sdk/client-tool-bridge");

/**
 * Callback type for when a client tool is invoked.
 * Allows callers to track which tools were called and with what parameters.
 */
export type OnClientToolCallCallback = (toolName: string, params: Record<string, unknown>) => void;

/**
 * Convert ClientToolDefinition array to AnyAgentTool array for CCSDK.
 *
 * These tools return "pending" results indicating that execution should be
 * delegated to the client. This matches the behavior in the Pi runtime's
 * toClientToolDefinitions() function.
 *
 * @param clientTools - Array of client-provided tool definitions
 * @param onClientToolCall - Optional callback invoked when a client tool is called
 * @returns Array of AnyAgentTool compatible with the CCSDK tool bridge
 */
export function convertClientToolsForSdk(
  clientTools: ClientToolDefinition[],
  onClientToolCall?: OnClientToolCallCallback,
): AnyAgentTool[] {
  return clientTools.map((tool) => {
    const func = tool.function;
    const toolName = func.name;

    log.debug(`Converting client tool for CCSDK: ${toolName}`);

    return {
      name: toolName,
      label: toolName,
      description: func.description ?? "",
      // Pass through the JSON Schema parameters directly
      // The tool-bridge will serialize this for MCP
      parameters: func.parameters ?? { type: "object", properties: {} },

      execute: async (
        _toolCallId: string,
        params: Record<string, unknown>,
        _signal?: AbortSignal,
        _onUpdate?: unknown,
      ) => {
        log.debug(`Client tool "${toolName}" called with params`, {
          paramKeys: Object.keys(params),
        });

        // Notify callback that a client tool was invoked
        if (onClientToolCall) {
          onClientToolCall(toolName, params);
        }

        // Return a pending result - the client will handle actual execution
        // This matches the behavior of toClientToolDefinitions in pi-tool-definition-adapter.ts
        return jsonResult({
          status: "pending",
          tool: toolName,
          message: "Tool execution delegated to client",
        });
      },
    } as AnyAgentTool;
  });
}
