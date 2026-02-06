/**
 * Data-Service Connector Plugin for OpenClaw
 *
 * Registers 7 connector tools and injects confirmation-workflow guidance
 * into the agent system prompt via the before_agent_start hook.
 *
 * For multi-tenant support, use the `data-service.setContext` gateway method
 * to set orgId/userId before calling the standard `agent` method.
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { resolveDataServiceConfig } from "./src/config.js";
import { createDataServiceTools } from "./src/data-service-tool.js";
import {
  setSessionContext,
  clearSessionContext,
  setCurrentSessionKey,
  clearCurrentSessionKey,
} from "./src/request-context.js";

/** Tool names registered by this plugin */
const TOOL_NAMES = [
  "connector_search",
  "connector_execute",
  "connector_list",
  "connector_actions",
  "connector_schema",
  "connector_lookup",
  "user_connectors",
] as const;

/** Confirmation guidance prepended to the agent prompt */
const CONFIRMATION_GUIDANCE = `## Connector Tools — Operating Rules

### 1. NEVER Hallucinate
- NEVER fabricate, guess, or invent values (emails, IDs, names, URLs, phone numbers, etc.).
- Every value you use in a connector_execute call MUST come from: the user's message, a previous tool response, or another connector lookup.
- If you cannot find a required value through your tools, ASK the user for it. Do NOT make one up.
- Using placeholder domains like "@example.com" counts as hallucination. NEVER do this.

### 2. Discover Before Acting
- ALWAYS call user_connectors first to see what the user has configured.
- Then call connector_search(query, action) to get the EXACT schema (field names, types) before executing ANY action.
- NEVER guess action names or field names — always get them from connector_search or connector_actions.
- You MUST call connector_search for EACH connector you plan to execute, not just one.

### 3. Chain Connectors to Fill Gaps
- If a task requires information you don't have (e.g., an email address from a LinkedIn profile, a ticket ID from Jira, a contact from a CRM), use the user's OTHER configured connectors to look it up.
- Think step by step: what information do I need? → which connector can provide it? → call that connector first → then proceed.
- Be resourceful: the user expects you to use ALL available connectors to complete the task, not just one.
- NEVER ask the user for information you can look up with an available connector. If the user has a search connector, use it to research. If they have LinkedIn, use it to find profiles/emails.

### 4. Plan Multi-Step Tasks
- Before starting, plan the full chain: which connectors provide the data I need, and in what order?
- Do all pull/read operations first to gather information, then compose the push/write action with real data.
- Example: "Send a pitch email to a LinkedIn contact" → 1) user_connectors, 2) LinkedIn connector to get profile+email, 3) Search connector to research the topic, 4) Email connector schema, 5) Draft with real data, 6) Confirm, 7) Send.

### 5. Pull Actions — Be Autonomous
- For read-only actions (search, read, list, get, fetch, lookup, validate, retrieve) — execute immediately without asking permission.
- Summarize results in plain language after execution.

### 6. Push Actions — Always Confirm
- For actions with side effects (send, create, update, delete, upload, reply, post) — ALWAYS show a preview/draft first and ask for user confirmation.
- Show the key parameters that will be used and where each value came from (e.g., "Email: manoj@wexa.ai (from LinkedIn profile lookup)").
- Wait for explicit approval before executing. Skip ONLY if user said "just do it" or similar.

### 7. Handle Errors and Retry
- If a tool call fails, CAREFULLY READ the error response — it usually tells you exactly what went wrong (wrong field name, missing field, wrong action name).
- Immediately retry with corrected parameters. Do NOT give up after the first failure.
- If the error says a field is missing or wrong, check the schema from connector_search and use the EXACT field names it provides.
- If a URL is given and a tool expects an identifier/slug, extract the relevant part from the URL yourself (e.g., from "linkedin.com/in/john-doe-123" extract "john-doe-123" as the identifier).
- If a required connector is not configured, tell the user clearly and suggest they connect it.
- NEVER ask the user to provide data that you already have or can derive from context.

### 8. Always Summarize
- After every tool call, summarize the result to the user in plain language.
- Never leave the user with just raw tool output or silence.
- If a multi-step task is in progress, briefly state what you've done so far and what's next.
`;

const dataServicePlugin = {
  id: "data-service",
  name: "Data-Service Connectors",
  description: "Access 70+ external service integrations through the Wexa Data-Service API",

  register(api: OpenClawPluginApi) {
    // Capture plugin config from the api object (available at registration time)
    const dsConfig = resolveDataServiceConfig(api.pluginConfig);

    // Register tool factory -- plugin loader calls this with context at agent start
    api.registerTool(
      () => {
        if (!dsConfig.enabled) {
          return null;
        }
        return createDataServiceTools(dsConfig);
      },
      { names: [...TOOL_NAMES] },
    );

    // Inject confirmation workflow guidance into the agent's system prompt
    api.registerHook(
      "before_agent_start",
      () => {
        return { prependContext: CONFIRMATION_GUIDANCE };
      },
      {
        name: "data-service-confirmation-guidance",
        description: "Injects connector confirmation workflow into system prompt",
      },
    );

    // Set current session key before each tool call so tools can look up context
    api.on("before_tool_call", (_event, ctx) => {
      if (ctx.sessionKey) {
        setCurrentSessionKey(ctx.sessionKey);
      }
    });

    // Clear current session key after each tool call
    api.on("after_tool_call", () => {
      clearCurrentSessionKey();
    });

    // -------------------------------------------------------------------------
    // Multi-tenant gateway methods
    //
    // For Wexa Coworker Web integration, use these methods to set per-user
    // context before calling the standard "agent" method.
    // -------------------------------------------------------------------------

    /**
     * data-service.setContext
     *
     * Set orgId/userId context for a session. Call this BEFORE calling the
     * standard "agent" method. The context will be used by all connector tools.
     *
     * Request params:
     *   - sessionKey: string (required) — Session key to associate context with
     *   - orgId: string (required) — Organization ID
     *   - userId: string (required) — User ID
     *   - projectId?: string — Optional project ID
     *   - apiKey?: string — Optional API key override
     *
     * Example flow:
     *   1. Call data-service.setContext with sessionKey, orgId, userId
     *   2. Call agent with the same sessionKey
     *   3. Tools automatically use the orgId/userId from step 1
     */
    api.registerGatewayMethod("data-service.setContext", ({ params, respond }) => {
      const sessionKey = typeof params?.sessionKey === "string" ? params.sessionKey.trim() : "";
      const orgId = typeof params?.orgId === "string" ? params.orgId.trim() : "";
      const userId = typeof params?.userId === "string" ? params.userId.trim() : "";
      const projectId = typeof params?.projectId === "string" ? params.projectId.trim() : undefined;
      const apiKey = typeof params?.apiKey === "string" ? params.apiKey.trim() : undefined;

      if (!sessionKey) {
        respond(false, { error: "sessionKey is required" });
        return;
      }
      if (!orgId) {
        respond(false, { error: "orgId is required" });
        return;
      }
      if (!userId) {
        respond(false, { error: "userId is required" });
        return;
      }

      // Store context for this session
      setSessionContext(sessionKey, { orgId, userId, projectId, apiKey });

      respond(true, {
        status: "ok",
        sessionKey,
        orgId,
        userId,
        message: "Context set. Now call the 'agent' method with the same sessionKey.",
      });
    });

    /**
     * data-service.clearContext
     *
     * Clear the context for a session. Call this when a session ends or
     * when you want to reset the user context.
     *
     * Request params:
     *   - sessionKey: string (required) — Session key to clear context for
     */
    api.registerGatewayMethod("data-service.clearContext", ({ params, respond }) => {
      const sessionKey = typeof params?.sessionKey === "string" ? params.sessionKey.trim() : "";

      if (!sessionKey) {
        respond(false, { error: "sessionKey is required" });
        return;
      }

      clearSessionContext(sessionKey);

      respond(true, {
        status: "ok",
        sessionKey,
        message: "Context cleared.",
      });
    });

    /**
     * data-service.status
     *
     * Get the current status of the data-service plugin.
     */
    api.registerGatewayMethod("data-service.status", ({ respond }) => {
      respond(true, {
        status: "ok",
        enabled: dsConfig.enabled,
        url: dsConfig.url,
        hasOrgId: !!dsConfig.orgId,
        hasUserId: !!dsConfig.userId,
        hasServerKey: !!dsConfig.serverKey,
        tools: [...TOOL_NAMES],
      });
    });
  },
};

export default dataServicePlugin;
