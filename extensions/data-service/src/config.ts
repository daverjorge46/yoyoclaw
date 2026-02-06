/**
 * Data-Service configuration types and resolution.
 *
 * Reads from:
 * 1. Request context (per-request orgId/userId via AsyncLocalStorage) — highest priority
 * 2. Plugin config
 * 3. Environment variables
 */

import { getRequestContext } from "./request-context.js";

/** Configuration for the Data-Service connector tools */
export type DataServiceConfig = {
  /** Enable/disable the Data-Service connector tools */
  enabled?: boolean;
  /** Base URL for the Data-Service API */
  url?: string;
  /** Default organization ID */
  orgId?: string;
  /** Default project ID */
  projectId?: string;
  /** Default user ID */
  userId?: string;
  /** Server key for system calls (optional) */
  serverKey?: string;
  /** API key for user calls (optional) */
  apiKey?: string;
  /** Pre-configured connector IDs by connector type (optional overrides) */
  connectorIds?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeoutMs?: number;
};

const DEFAULT_DATA_SERVICE_URL = "https://dev.api.wexa.ai";

/**
 * Resolve Data-Service configuration from plugin config and env vars.
 *
 * Priority: request context > pluginConfig values > environment variables > defaults
 */
export function resolveDataServiceConfig(
  pluginConfig?: Record<string, unknown>,
): DataServiceConfig {
  const pc = pluginConfig as DataServiceConfig | undefined;

  return {
    enabled: pc?.enabled ?? !!process.env.DATA_SERVICE_URL,
    url: pc?.url ?? process.env.DATA_SERVICE_URL ?? DEFAULT_DATA_SERVICE_URL,
    orgId: pc?.orgId ?? process.env.DATA_SERVICE_ORG_ID,
    projectId: pc?.projectId ?? process.env.DATA_SERVICE_PROJECT_ID,
    userId: pc?.userId ?? process.env.DATA_SERVICE_USER_ID,
    serverKey: pc?.serverKey ?? process.env.DATA_SERVICE_SERVER_KEY,
    apiKey: pc?.apiKey ?? process.env.DATA_SERVICE_API_KEY,
    connectorIds: pc?.connectorIds,
    timeoutMs: pc?.timeoutMs ?? 30000,
  };
}

/**
 * Get effective orgId/userId for the current request.
 *
 * Priority: request context (AsyncLocalStorage or session store) > base config
 *
 * This is called at tool execution time to get the per-request values.
 *
 * @param baseConfig - The base configuration from plugin config/env vars
 * @param sessionKey - Optional session key to look up context from session store
 */
export function getEffectiveUserContext(
  baseConfig: DataServiceConfig,
  sessionKey?: string,
): {
  orgId?: string;
  userId?: string;
  projectId?: string;
  apiKey?: string;
} {
  const reqCtx = getRequestContext(sessionKey);

  return {
    orgId: reqCtx?.orgId ?? baseConfig.orgId,
    userId: reqCtx?.userId ?? baseConfig.userId,
    projectId: reqCtx?.projectId ?? baseConfig.projectId,
    apiKey: reqCtx?.apiKey ?? baseConfig.apiKey,
  };
}
