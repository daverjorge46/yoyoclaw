import type { Command } from "commander";

import type { AnyAgentTool } from "../agents/tools/common.js";
import type { ClawdbotConfig } from "../config/config.js";
import type { GatewayRequestHandler } from "../gateway/server-methods/types.js";

// ============================================================================
// Plugin Lifecycle Hooks
// ============================================================================

/**
 * Context provided to agent-related hooks.
 */
export type PluginHookAgentContext = {
  agentId: string;
  sessionKey?: string;
  workspaceDir?: string;
  messageProvider?: string;
};

/**
 * Context provided to message-related hooks.
 */
export type PluginHookMessageContext = {
  agentId: string;
  sessionKey?: string;
  messageProvider?: string;
  senderId?: string;
  channelId?: string;
};

/**
 * Context provided to tool-related hooks.
 */
export type PluginHookToolContext = {
  agentId: string;
  sessionKey?: string;
  toolName: string;
  toolCallId: string;
};

/**
 * Context provided to session-related hooks.
 */
export type PluginHookSessionContext = {
  agentId: string;
  sessionKey: string;
  workspaceDir?: string;
};

/**
 * Context provided to gateway-related hooks.
 */
export type PluginHookGatewayContext = {
  port: number;
  mode: string;
};

// ----------------------------------------------------------------------------
// Hook Event Payloads
// ----------------------------------------------------------------------------

/**
 * Event payload for `before_agent_start` hook.
 * Allows plugins to inject context into the system prompt before the agent starts.
 */
export type PluginHookBeforeAgentStartEvent = {
  /** The user's input prompt */
  prompt: string;
  /** Current system prompt (can be modified via return value) */
  systemPrompt?: string;
  /** Messages array (read-only snapshot) - type is flexible to support various agent implementations */
  messages?: readonly unknown[];
};

/**
 * Return type for `before_agent_start` hook.
 * Plugins can modify the system prompt by returning this object.
 */
export type PluginHookBeforeAgentStartResult = {
  /** Modified system prompt with injected context */
  systemPrompt?: string;
  /** Additional context to prepend to the conversation */
  prependContext?: string;
};

/**
 * Event payload for `agent_end` hook.
 * Provides access to the completed conversation for analysis/capture.
 */
export type PluginHookAgentEndEvent = {
  /** All messages from the agent loop - type is flexible to support various agent implementations */
  messages: readonly unknown[];
  /** Whether the agent completed successfully */
  success: boolean;
  /** Error message if the agent failed */
  error?: string;
  /** Duration of the agent loop in milliseconds */
  durationMs?: number;
};

/**
 * Event payload for `before_compaction` hook.
 */
export type PluginHookBeforeCompactionEvent = {
  /** Current message count before compaction */
  messageCount: number;
  /** Current token estimate before compaction */
  tokenEstimate?: number;
};

/**
 * Event payload for `after_compaction` hook.
 */
export type PluginHookAfterCompactionEvent = {
  /** Message count after compaction */
  messageCount: number;
  /** Token estimate after compaction */
  tokenEstimate?: number;
  /** Summary generated during compaction */
  summary?: string;
};

/**
 * Event payload for `message_received` hook.
 */
export type PluginHookMessageReceivedEvent = {
  /** The message content */
  content: string;
  /** Message metadata */
  metadata?: Record<string, unknown>;
};

/**
 * Event payload for `message_sending` hook.
 * Allows plugins to modify the message before it's sent.
 */
export type PluginHookMessageSendingEvent = {
  /** The message content to be sent */
  content: string;
  /** Target recipient/channel */
  target?: string;
};

/**
 * Return type for `message_sending` hook.
 */
export type PluginHookMessageSendingResult = {
  /** Modified message content */
  content?: string;
  /** Set to true to cancel sending */
  cancel?: boolean;
};

/**
 * Event payload for `message_sent` hook.
 */
export type PluginHookMessageSentEvent = {
  /** The message content that was sent */
  content: string;
  /** Target recipient/channel */
  target?: string;
  /** Whether the send was successful */
  success: boolean;
};

/**
 * Event payload for `before_tool_call` hook.
 * Allows plugins to inspect or modify tool calls.
 */
export type PluginHookBeforeToolCallEvent = {
  /** Tool parameters */
  params: Record<string, unknown>;
};

/**
 * Return type for `before_tool_call` hook.
 */
export type PluginHookBeforeToolCallResult = {
  /** Modified parameters */
  params?: Record<string, unknown>;
  /** Set to true to block the tool call */
  block?: boolean;
  /** Reason for blocking (shown to the agent) */
  blockReason?: string;
};

/**
 * Event payload for `after_tool_call` hook.
 */
export type PluginHookAfterToolCallEvent = {
  /** Tool parameters that were used */
  params: Record<string, unknown>;
  /** Tool result */
  result: unknown;
  /** Whether the tool call succeeded */
  success: boolean;
  /** Error message if the tool call failed */
  error?: string;
};

/**
 * Event payload for `session_start` hook.
 */
export type PluginHookSessionStartEvent = {
  /** Whether this is a new session or resumed */
  isNew: boolean;
};

/**
 * Event payload for `session_end` hook.
 */
export type PluginHookSessionEndEvent = {
  /** Reason for session end */
  reason: "completed" | "timeout" | "error" | "manual";
};

/**
 * Event payload for `gateway_start` hook.
 */
export type PluginHookGatewayStartEvent = {
  /** Timestamp when gateway started */
  startedAt: number;
};

/**
 * Event payload for `gateway_stop` hook.
 */
export type PluginHookGatewayStopEvent = {
  /** Reason for shutdown */
  reason: "manual" | "error" | "signal";
};

// ----------------------------------------------------------------------------
// Hook Handler Types
// ----------------------------------------------------------------------------

export type PluginHookHandler<TEvent, TResult = void> = (
  event: TEvent,
  ctx:
    | PluginHookAgentContext
    | PluginHookMessageContext
    | PluginHookToolContext
    | PluginHookSessionContext
    | PluginHookGatewayContext,
) => TResult | Promise<TResult>;

/**
 * Map of hook names to their handler signatures.
 */
export type PluginHookHandlers = {
  // Agent lifecycle hooks
  before_agent_start: PluginHookHandler<
    PluginHookBeforeAgentStartEvent,
    PluginHookBeforeAgentStartResult | undefined
  >;
  agent_end: PluginHookHandler<PluginHookAgentEndEvent>;
  before_compaction: PluginHookHandler<PluginHookBeforeCompactionEvent>;
  after_compaction: PluginHookHandler<PluginHookAfterCompactionEvent>;

  // Message hooks
  message_received: PluginHookHandler<PluginHookMessageReceivedEvent>;
  message_sending: PluginHookHandler<
    PluginHookMessageSendingEvent,
    PluginHookMessageSendingResult | undefined
  >;
  message_sent: PluginHookHandler<PluginHookMessageSentEvent>;

  // Tool hooks
  before_tool_call: PluginHookHandler<
    PluginHookBeforeToolCallEvent,
    PluginHookBeforeToolCallResult | undefined
  >;
  after_tool_call: PluginHookHandler<PluginHookAfterToolCallEvent>;

  // Session hooks
  session_start: PluginHookHandler<PluginHookSessionStartEvent>;
  session_end: PluginHookHandler<PluginHookSessionEndEvent>;

  // Gateway hooks
  gateway_start: PluginHookHandler<PluginHookGatewayStartEvent>;
  gateway_stop: PluginHookHandler<PluginHookGatewayStopEvent>;
};

/**
 * All available hook names.
 */
export type PluginHookName = keyof PluginHookHandlers;

/**
 * Registration for a plugin hook.
 */
export type PluginHookRegistration<K extends PluginHookName = PluginHookName> =
  {
    pluginId: string;
    hookName: K;
    handler: PluginHookHandlers[K];
    priority?: number;
    source: string;
  };

export type PluginLogger = {
  debug?: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
};

export type PluginConfigUiHint = {
  label?: string;
  help?: string;
  advanced?: boolean;
  sensitive?: boolean;
  placeholder?: string;
};

export type PluginConfigValidation =
  | { ok: true; value?: unknown }
  | { ok: false; errors: string[] };

export type ClawdbotPluginConfigSchema = {
  safeParse?: (value: unknown) => {
    success: boolean;
    data?: unknown;
    error?: {
      issues?: Array<{ path: Array<string | number>; message: string }>;
    };
  };
  parse?: (value: unknown) => unknown;
  validate?: (value: unknown) => PluginConfigValidation;
  uiHints?: Record<string, PluginConfigUiHint>;
};

export type ClawdbotPluginToolContext = {
  config?: ClawdbotConfig;
  workspaceDir?: string;
  agentDir?: string;
  agentId?: string;
  sessionKey?: string;
  messageProvider?: string;
  agentAccountId?: string;
  sandboxed?: boolean;
};

export type ClawdbotPluginToolFactory = (
  ctx: ClawdbotPluginToolContext,
) => AnyAgentTool | AnyAgentTool[] | null | undefined;

export type ClawdbotPluginGatewayMethod = {
  method: string;
  handler: GatewayRequestHandler;
};

export type ClawdbotPluginCliContext = {
  program: Command;
  config: ClawdbotConfig;
  workspaceDir?: string;
  logger: PluginLogger;
};

export type ClawdbotPluginCliRegistrar = (
  ctx: ClawdbotPluginCliContext,
) => void | Promise<void>;

export type ClawdbotPluginServiceContext = {
  config: ClawdbotConfig;
  workspaceDir?: string;
  stateDir: string;
  logger: PluginLogger;
};

export type ClawdbotPluginService = {
  id: string;
  start: (ctx: ClawdbotPluginServiceContext) => void | Promise<void>;
  stop?: (ctx: ClawdbotPluginServiceContext) => void | Promise<void>;
};

export type ClawdbotPluginDefinition = {
  id?: string;
  name?: string;
  description?: string;
  version?: string;
  configSchema?: ClawdbotPluginConfigSchema;
  register?: (api: ClawdbotPluginApi) => void | Promise<void>;
  activate?: (api: ClawdbotPluginApi) => void | Promise<void>;
};

export type ClawdbotPluginModule =
  | ClawdbotPluginDefinition
  | ((api: ClawdbotPluginApi) => void | Promise<void>);

export type ClawdbotPluginApi = {
  id: string;
  name: string;
  version?: string;
  description?: string;
  source: string;
  config: ClawdbotConfig;
  pluginConfig?: Record<string, unknown>;
  logger: PluginLogger;
  registerTool: (
    tool: AnyAgentTool | ClawdbotPluginToolFactory,
    opts?: { name?: string; names?: string[] },
  ) => void;
  registerGatewayMethod: (
    method: string,
    handler: GatewayRequestHandler,
  ) => void;
  registerCli: (
    registrar: ClawdbotPluginCliRegistrar,
    opts?: { commands?: string[] },
  ) => void;
  registerService: (service: ClawdbotPluginService) => void;
  resolvePath: (input: string) => string;
  /**
   * Register a lifecycle hook handler.
   *
   * @param hookName - The name of the hook to listen for
   * @param handler - The handler function to call when the hook fires
   * @param opts - Optional configuration for the hook
   *
   * @example
   * ```typescript
   * // Inject memories before agent starts
   * api.on("before_agent_start", async (event, ctx) => {
   *   const memories = await searchMemories(event.prompt);
   *   return { prependContext: formatMemories(memories) };
   * });
   *
   * // Capture important information after agent ends
   * api.on("agent_end", async (event, ctx) => {
   *   await analyzeAndStore(event.messages);
   * });
   * ```
   */
  on: <K extends PluginHookName>(
    hookName: K,
    handler: PluginHookHandlers[K],
    opts?: { priority?: number },
  ) => void;
};

export type PluginOrigin = "global" | "workspace" | "config";

export type PluginDiagnostic = {
  level: "warn" | "error";
  message: string;
  pluginId?: string;
  source?: string;
};
