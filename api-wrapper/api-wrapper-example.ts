/**
 * Simple API wrapper for OpenClaw - Makes natural language queries work seamlessly
 *
 * Usage:
 *   POST /api/chat
 *   { "query": "Give me avg response time", "org_id": "902" }
 *
 * Works with ANY query:
 *   - "Compare rep A to rep B"
 *   - "What deals are dead"
 *   - "How many messages today"
 *   - "Show me top performers this week"
 */

import axios from "axios";
import express, { Request, Response } from "express";

const app = express();
app.use(express.json());

const OPENCLAW_URL = "http://ywgssocsg44kckkgsgg0gssk.5.161.117.36.sslip.io/v1/chat/completions";
const OPENCLAW_TOKEN = "103442901b9684c231b41e31c2b938525025bf71020305a0e5a6f31dd015ccc4";

// Comprehensive system prompt that teaches OpenClaw about your data
const getSystemPrompt = (
  orgId: string,
) => `You are an analytics assistant with access to WhatsApp analytics and CRM data through MCP tools.

## When to Use MCP Tools

**Analytics/Metrics** → Use mcp_call with service="bigquery"
- Response times, message counts, agent performance, comparisons, trends

**CRM/Deals/Contacts** → Use mcp_call with service="hubspot"
- Deals (dead deals, pipeline, amounts), contacts, companies, sales reps

**Semantic Search** → Use mcp_call with service="qdrant"
- Finding conversations, mentions, patterns

## BigQuery Tables & Columns

**whatsapp_analytics.daily_performance_summary**
- org_id (STRING) - ALWAYS filter: WHERE org_id = '${orgId}'
- user_id (STRING) - Agent/rep identifier
- activity_date (DATE)
- avg_agent_response_time_seconds (FLOAT64) - Average response time
- time_to_first_response_seconds (FLOAT64)
- agent_message_count, contact_message_count (INT64)

**whatsapp_analytics.conversation_summary**
- org_id (STRING), uid, chat_id, phone_number
- average_response_time (FLOAT)
- first_response_time (FLOAT)
- analytics.messages_sent/received

## Query Examples

"Give me avg response time" →
  SELECT AVG(avg_agent_response_time_seconds) FROM whatsapp_analytics.daily_performance_summary WHERE org_id = '${orgId}'

"Compare rep X to Y" →
  SELECT user_id, AVG(avg_agent_response_time_seconds), SUM(agent_message_count)
  FROM whatsapp_analytics.daily_performance_summary
  WHERE org_id = '${orgId}' AND user_id IN ('X', 'Y') GROUP BY user_id

"What deals are dead" →
  Use mcp_call with service="hubspot", toolName="search_crm_objects",
  arguments: {object_type: "deals", filterGroups: [{filters: [{propertyName: "dealstage", operator: "EQ", value: "closedlost"}]}]}

"Messages today" →
  SELECT SUM(agent_message_count) FROM whatsapp_analytics.daily_performance_summary
  WHERE org_id = '${orgId}' AND activity_date = CURRENT_DATE()

"Top performers this week" →
  SELECT user_id, AVG(avg_agent_response_time_seconds) as avg FROM whatsapp_analytics.daily_performance_summary
  WHERE org_id = '${orgId}' AND activity_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
  GROUP BY user_id ORDER BY avg LIMIT 5

## HubSpot CRM

**Deals**: dealstage, amount, closedate, hubspot_owner_id, dealname, pipeline
**Contacts**: email, firstname, lastname, company, hubspot_owner_id
**Search Owners**: Use search_owners to find rep IDs by name

## Rules
1. ALWAYS use mcp_call for data queries - never say you don't have access
2. ALWAYS filter by org_id in BigQuery (STRING type, use quotes)
3. Format responses clearly with numbers, tables for comparisons
4. Use DATE functions: CURRENT_DATE(), DATE_SUB() for time ranges`;

interface ChatRequest {
  query: string;
  org_id: string;
  workspace_id?: string;
  user_id?: string;
  conversation_history?: Array<{ role: string; content: string }>;
}

interface ChatResponse {
  response: string;
  org_id: string;
  success: boolean;
}

app.post("/api/chat", async (req: Request<{}, {}, ChatRequest>, res: Response<ChatResponse>) => {
  const {
    query,
    org_id,
    workspace_id = "default-workspace",
    user_id,
    conversation_history = [],
  } = req.body;

  if (!query || !org_id) {
    return res.status(400).json({
      response: "Missing required fields: query and org_id",
      org_id: org_id || "",
      success: false,
    } as any);
  }

  // Build messages with system prompt
  const messages = [
    {
      role: "system",
      content: getSystemPrompt(org_id),
    },
    ...conversation_history,
    {
      role: "user",
      content: query,
    },
  ];

  try {
    const response = await axios.post(
      OPENCLAW_URL,
      {
        model: "openclaw",
        messages,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENCLAW_TOKEN}`,
          "Content-Type": "application/json",
          "X-Organization-Id": org_id,
          "X-Workspace-Id": workspace_id,
          ...(user_id ? { "X-User-Id": user_id } : {}),
        },
        timeout: 90000,
      },
    );

    const answer = response.data.choices[0].message.content;

    res.json({
      response: answer,
      org_id,
      success: true,
    });
  } catch (error: any) {
    console.error("OpenClaw API error:", error.message);
    res.status(500).json({
      response: `Error: ${error.message}`,
      org_id,
      success: false,
    });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy" });
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`\n🚀 API Wrapper running on http://localhost:${PORT}`);
  console.log("\nExample usage:");
  console.log(`curl -X POST http://localhost:${PORT}/api/chat \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"query": "Give me avg response time", "org_id": "902"}'`);
  console.log("\nSupports ANY natural language query:");
  console.log('  - "Compare rep John to rep Sarah"');
  console.log('  - "What deals are dead"');
  console.log('  - "How many messages were sent today"');
  console.log('  - "Show me top 5 performers this week"');
});

export default app;
