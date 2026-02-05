"""
Simple API wrapper for OpenClaw that adds intelligent system prompts automatically.
This makes natural language queries work without users needing to know technical details.
"""

import requests
from typing import Dict, List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

# Load comprehensive system prompt
ANALYTICS_SYSTEM_PROMPT = """You are an analytics assistant with access to WhatsApp analytics and CRM data through MCP tools.

## When to Use MCP Tools

**Analytics/Metrics** → Use mcp_call with service="bigquery"
- Response times, message counts, agent performance
- Comparisons between agents, trends over time
- Tables: whatsapp_analytics.daily_performance_summary, conversation_summary

**CRM/Deals/Contacts** → Use mcp_call with service="hubspot"
- Deals (dead deals, pipeline, amounts)
- Contacts, companies, sales reps
- Tools: search_crm_objects, search_owners

**Semantic Search** → Use mcp_call with service="qdrant"
- Finding conversations, mentions, patterns

## BigQuery Tables

**daily_performance_summary**
- org_id (STRING) - ALWAYS filter: WHERE org_id = '{org_id}'
- user_id (STRING) - Agent identifier
- activity_date (DATE) - Use CURRENT_DATE(), DATE_SUB()
- avg_agent_response_time_seconds (FLOAT64)
- time_to_first_response_seconds (FLOAT64)
- agent_message_count, contact_message_count (INT64)

**conversation_summary**
- org_id (STRING), uid, chat_id, phone_number
- average_response_time (FLOAT)
- first_response_time (FLOAT)
- analytics.messages_sent/received

## Common Query Patterns

"Give me avg response time" →
  SELECT AVG(avg_agent_response_time_seconds) FROM daily_performance_summary WHERE org_id = '{org_id}'

"Compare rep X to Y" →
  SELECT user_id, AVG(avg_agent_response_time_seconds) FROM daily_performance_summary
  WHERE org_id = '{org_id}' AND user_id IN ('X', 'Y') GROUP BY user_id

"What deals are dead" →
  mcp_call(service="hubspot", toolName="search_crm_objects",
    arguments={{"object_type": "deals", "filterGroups": [{{"filters": [{{"propertyName": "dealstage", "operator": "EQ", "value": "closedlost"}}]}}]}})

"How many messages today" →
  SELECT SUM(agent_message_count) FROM daily_performance_summary
  WHERE org_id = '{org_id}' AND activity_date = CURRENT_DATE()

"Top performers this week" →
  SELECT user_id, AVG(avg_agent_response_time_seconds) as avg_response
  FROM daily_performance_summary
  WHERE org_id = '{org_id}' AND activity_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
  GROUP BY user_id ORDER BY avg_response LIMIT 5

## HubSpot Objects

**Deals:** dealstage, amount, closedate, hubspot_owner_id, dealname, pipeline
**Contacts:** email, firstname, lastname, company, hubspot_owner_id, lifecyclestage

## Critical Rules
1. ALWAYS use mcp_call for data queries
2. ALWAYS filter by org_id in BigQuery (it's a STRING, use quotes)
3. Use DATE functions for time ranges
4. Return formatted numbers (e.g., "182.49 seconds" or "3.04 minutes")
"""

OPENCLAW_URL = "http://ywgssocsg44kckkgsgg0gssk.5.161.117.36.sslip.io/v1/chat/completions"
OPENCLAW_TOKEN = "103442901b9684c231b41e31c2b938525025bf71020305a0e5a6f31dd015ccc4"


class ChatRequest(BaseModel):
    query: str
    org_id: str
    workspace_id: Optional[str] = "default-workspace"
    user_id: Optional[str] = None
    conversation_history: Optional[List[Dict]] = None


class ChatResponse(BaseModel):
    response: str
    org_id: str
    success: bool


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Simple chat endpoint that works with natural language queries.

    Examples:
    - "Give me avg response time"
    - "Compare rep John to rep Sarah"
    - "What deals are dead"
    - "How many messages were sent today"
    - "Show me top 5 performers this week"
    """

    # Build messages array with system prompt
    messages = [
        {
            "role": "system",
            "content": ANALYTICS_SYSTEM_PROMPT.format(org_id=request.org_id)
        }
    ]

    # Add conversation history if provided
    if request.conversation_history:
        messages.extend(request.conversation_history)

    # Add current user query
    messages.append({
        "role": "user",
        "content": request.query
    })

    # Call OpenClaw API
    try:
        response = requests.post(
            OPENCLAW_URL,
            headers={
                "Authorization": f"Bearer {OPENCLAW_TOKEN}",
                "Content-Type": "application/json",
                "X-Organization-Id": request.org_id,
                "X-Workspace-Id": request.workspace_id,
                **({"X-User-Id": request.user_id} if request.user_id else {})
            },
            json={
                "model": "openclaw",
                "messages": messages
            },
            timeout=90
        )
        response.raise_for_status()

        data = response.json()
        answer = data["choices"][0]["message"]["content"]

        return ChatResponse(
            response=answer,
            org_id=request.org_id,
            success=True
        )

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"OpenClaw API error: {str(e)}")


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    print("Starting API wrapper on http://localhost:8000")
    print("\nExample usage:")
    print('curl -X POST http://localhost:8000/chat -H "Content-Type: application/json" -d \'{"query": "Give me avg response time", "org_id": "902"}\'')
    uvicorn.run(app, host="0.0.0.0", port=8000)
