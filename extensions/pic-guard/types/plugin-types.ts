/**
 * Local type definitions for OpenClaw plugin API.
 * These match the real OpenClaw types but don't override the global module.
 */

export type PluginHookName =
  | "before_agent_start"
  | "agent_end"
  | "before_compaction"
  | "after_compaction"
  | "message_received"
  | "message_sending"
  | "message_sent"
  | "before_tool_call"
  | "after_tool_call"
  | "tool_result_persist"
  | "session_start"
  | "session_end"
  | "gateway_start"
  | "gateway_stop";

export type PluginHookHandler = (
  event: any,
  ctx: Record<string, unknown>,
) => unknown | Promise<unknown>;

export interface OpenClawPluginApi {
  id: string;
  name: string;
  version?: string;
  description?: string;
  source: string;
  config: Record<string, unknown>;
  pluginConfig?: Record<string, unknown>;

  on<K extends PluginHookName>(
    hookName: K,
    handler: PluginHookHandler,
    opts?: { priority?: number },
  ): void;

  registerHook(
    events: string | string[],
    handler: PluginHookHandler,
    opts?: { name?: string; priority?: number },
  ): void;

  resolvePath(input: string): string;
}
