import type { AnyAgentTool } from "../agents/tools/common.js";
import type {
  GatewayRequestHandler,
  GatewayRequestHandlers,
} from "../gateway/server-methods/types.js";
import { resolveUserPath } from "../utils.js";
import type {
  ClawdbotPluginApi,
  ClawdbotPluginCliRegistrar,
  ClawdbotPluginService,
  ClawdbotPluginToolContext,
  ClawdbotPluginToolFactory,
  PluginConfigUiHint,
  PluginDiagnostic,
  PluginHookHandlers,
  PluginHookName,
  PluginHookRegistration,
  PluginLogger,
  PluginOrigin,
} from "./types.js";

export type PluginToolRegistration = {
  pluginId: string;
  factory: ClawdbotPluginToolFactory;
  names: string[];
  source: string;
};

export type PluginCliRegistration = {
  pluginId: string;
  register: ClawdbotPluginCliRegistrar;
  commands: string[];
  source: string;
};

export type PluginServiceRegistration = {
  pluginId: string;
  service: ClawdbotPluginService;
  source: string;
};

export type PluginRecord = {
  id: string;
  name: string;
  version?: string;
  description?: string;
  source: string;
  origin: PluginOrigin;
  workspaceDir?: string;
  enabled: boolean;
  status: "loaded" | "disabled" | "error";
  error?: string;
  toolNames: string[];
  gatewayMethods: string[];
  cliCommands: string[];
  services: string[];
  hooks: PluginHookName[];
  configSchema: boolean;
  configUiHints?: Record<string, PluginConfigUiHint>;
};

export type PluginRegistry = {
  plugins: PluginRecord[];
  tools: PluginToolRegistration[];
  gatewayHandlers: GatewayRequestHandlers;
  cliRegistrars: PluginCliRegistration[];
  services: PluginServiceRegistration[];
  hooks: PluginHookRegistration[];
  diagnostics: PluginDiagnostic[];
};

export type PluginRegistryParams = {
  logger: PluginLogger;
  coreGatewayHandlers?: GatewayRequestHandlers;
};

export function createPluginRegistry(registryParams: PluginRegistryParams) {
  const registry: PluginRegistry = {
    plugins: [],
    tools: [],
    gatewayHandlers: {},
    cliRegistrars: [],
    services: [],
    hooks: [],
    diagnostics: [],
  };
  const coreGatewayMethods = new Set(
    Object.keys(registryParams.coreGatewayHandlers ?? {}),
  );

  const pushDiagnostic = (diag: PluginDiagnostic) => {
    registry.diagnostics.push(diag);
  };

  const registerTool = (
    record: PluginRecord,
    tool: AnyAgentTool | ClawdbotPluginToolFactory,
    opts?: { name?: string; names?: string[] },
  ) => {
    const names = opts?.names ?? (opts?.name ? [opts.name] : []);
    const factory: ClawdbotPluginToolFactory =
      typeof tool === "function"
        ? tool
        : (_ctx: ClawdbotPluginToolContext) => tool;

    if (typeof tool !== "function") {
      names.push(tool.name);
    }

    const normalized = names.map((name) => name.trim()).filter(Boolean);
    if (normalized.length > 0) {
      record.toolNames.push(...normalized);
    }
    registry.tools.push({
      pluginId: record.id,
      factory,
      names: normalized,
      source: record.source,
    });
  };

  const registerGatewayMethod = (
    record: PluginRecord,
    method: string,
    handler: GatewayRequestHandler,
  ) => {
    const trimmed = method.trim();
    if (!trimmed) return;
    if (coreGatewayMethods.has(trimmed) || registry.gatewayHandlers[trimmed]) {
      pushDiagnostic({
        level: "error",
        pluginId: record.id,
        source: record.source,
        message: `gateway method already registered: ${trimmed}`,
      });
      return;
    }
    registry.gatewayHandlers[trimmed] = handler;
    record.gatewayMethods.push(trimmed);
  };

  const registerCli = (
    record: PluginRecord,
    registrar: ClawdbotPluginCliRegistrar,
    opts?: { commands?: string[] },
  ) => {
    const commands = (opts?.commands ?? [])
      .map((cmd) => cmd.trim())
      .filter(Boolean);
    record.cliCommands.push(...commands);
    registry.cliRegistrars.push({
      pluginId: record.id,
      register: registrar,
      commands,
      source: record.source,
    });
  };

  const registerService = (
    record: PluginRecord,
    service: ClawdbotPluginService,
  ) => {
    const id = service.id.trim();
    if (!id) return;
    record.services.push(id);
    registry.services.push({
      pluginId: record.id,
      service,
      source: record.source,
    });
  };

  const registerHook = <K extends PluginHookName>(
    record: PluginRecord,
    hookName: K,
    handler: PluginHookHandlers[K],
    opts?: { priority?: number },
  ) => {
    if (!record.hooks.includes(hookName)) {
      record.hooks.push(hookName);
    }
    registry.hooks.push({
      pluginId: record.id,
      hookName,
      handler,
      priority: opts?.priority ?? 0,
      source: record.source,
    });
  };

  const normalizeLogger = (logger: PluginLogger): PluginLogger => ({
    info: logger.info,
    warn: logger.warn,
    error: logger.error,
    debug: logger.debug,
  });

  const createApi = (
    record: PluginRecord,
    params: {
      config: ClawdbotPluginApi["config"];
      pluginConfig?: Record<string, unknown>;
    },
  ): ClawdbotPluginApi => {
    return {
      id: record.id,
      name: record.name,
      version: record.version,
      description: record.description,
      source: record.source,
      config: params.config,
      pluginConfig: params.pluginConfig,
      logger: normalizeLogger(registryParams.logger),
      registerTool: (tool, opts) => registerTool(record, tool, opts),
      registerGatewayMethod: (method, handler) =>
        registerGatewayMethod(record, method, handler),
      registerCli: (registrar, opts) => registerCli(record, registrar, opts),
      registerService: (service) => registerService(record, service),
      resolvePath: (input: string) => resolveUserPath(input),
      on: (hookName, handler, opts) =>
        registerHook(record, hookName, handler, opts),
    };
  };

  return {
    registry,
    createApi,
    pushDiagnostic,
    registerTool,
    registerGatewayMethod,
    registerCli,
    registerService,
    registerHook,
  };
}
