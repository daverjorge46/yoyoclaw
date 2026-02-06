/**
 * Shared HTTP helpers for Data-Service API calls.
 */

import type { DataServiceConfig } from "./config.js";
import { getEffectiveUserContext } from "./config.js";

/** Standard API response wrapper */
export type ApiResult = {
  success: boolean;
  data?: unknown;
  error?: string;
  status?: number;
};

/** Make an authenticated request to the Data-Service API. */
export async function makeDataServiceRequest(
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
    config: DataServiceConfig;
  },
): Promise<ApiResult> {
  const { method = "GET", body, config } = options;

  // Get effective user context (request context takes priority over base config)
  const userCtx = getEffectiveUserContext(config);

  const url = `${config.url}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (config.serverKey) {
    headers["x-server-key"] = config.serverKey;
  }
  // Use effective apiKey (request context > base config)
  const effectiveApiKey = userCtx.apiKey ?? config.apiKey;
  if (effectiveApiKey) {
    headers["Authorization"] = `Bearer ${effectiveApiKey}`;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs ?? 30000);

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseText = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }

    if (!response.ok) {
      return {
        success: false,
        error:
          typeof data === "object" && data && "error" in data
            ? String((data as { error: unknown }).error)
            : `HTTP ${response.status}: ${responseText.slice(0, 200)}`,
        status: response.status,
      };
    }

    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: message.includes("abort") ? "Request timed out" : message,
    };
  }
}

/**
 * Look up a user's connector_id from Data-Service.
 * Returns the connector_id if found, or null if not configured.
 *
 * Uses effective orgId/userId from request context if available.
 */
export async function lookupUserConnector(
  connector: string,
  config: DataServiceConfig,
): Promise<{ connectorId: string | null; error?: string; notConfigured?: boolean }> {
  // Get effective user context (request context takes priority)
  const userCtx = getEffectiveUserContext(config);
  const orgId = userCtx.orgId;
  const userId = userCtx.userId;

  if (!orgId || !userId) {
    return {
      connectorId: null,
      error:
        "Missing org_id or user_id. Please configure DATA_SERVICE_ORG_ID and DATA_SERVICE_USER_ID, or pass them via the data-service.agent gateway method.",
    };
  }

  const endpoint = `/retrieve/connectors/${orgId}/user/${userId}/category/${connector}`;
  const result = await makeDataServiceRequest(endpoint, {
    method: "POST",
    config,
  });

  if (!result.success) {
    if (result.status === 404 || result.error?.toLowerCase().includes("not found")) {
      return { connectorId: null, notConfigured: true };
    }
    return { connectorId: null, error: result.error };
  }

  const data = result.data as { _id?: string; connectorID?: string } | null;
  if (!data) {
    return { connectorId: null, notConfigured: true };
  }

  const connectorId = data._id ?? data.connectorID;
  if (!connectorId) {
    return { connectorId: null, notConfigured: true };
  }

  return { connectorId };
}
