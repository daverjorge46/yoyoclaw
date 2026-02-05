# Natural Language API for Analytics & CRM

## The Problem

You want users to ask simple questions like:

- "Give me avg response time"
- "Compare rep A to rep B"
- "What deals are dead"
- "How many messages today"

WITHOUT them knowing about:

- SQL queries
- MCP tools
- Table schemas
- Technical details

## The Solution

**API Wrapper** that automatically adds intelligence to every request.

## Architecture

```
User Query (simple text)
    ↓
API Wrapper (adds system prompt + headers)
    ↓
OpenClaw (with MCP tools)
    ↓
BigQuery / HubSpot / Qdrant
    ↓
Formatted Response
```

## Quick Start

### Option 1: TypeScript/Node.js

```bash
# Install dependencies
npm install express axios
npm install -D @types/express @types/node typescript ts-node

# Run the wrapper
ts-node api-wrapper-example.ts
```

### Option 2: Python/FastAPI

```bash
# Install dependencies
pip install fastapi uvicorn requests pydantic

# Run the wrapper
python api-wrapper-example.py
```

## Usage Examples

### Simple Query

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Give me avg response time",
    "org_id": "902"
  }'
```

**Response:**

```json
{
  "response": "The average response time for organization 902 is approximately 182.49 seconds (3.04 minutes).",
  "org_id": "902",
  "success": true
}
```

### Compare Reps

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Compare rep 14024 to rep 14025",
    "org_id": "902"
  }'
```

### Dead Deals

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What deals are dead",
    "org_id": "902"
  }'
```

### Today's Performance

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How many messages were sent today",
    "org_id": "902"
  }'
```

### Weekly Trend

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Show me response time trend for the last week",
    "org_id": "902"
  }'
```

## Supported Query Types

### Analytics Queries (BigQuery)

✅ Response times (avg, min, max)
✅ Message counts (sent, received, total)
✅ Agent comparisons
✅ Time-based trends (today, week, month)
✅ Top/bottom performers
✅ First response times

### CRM Queries (HubSpot)

✅ Deal searches (dead, open, won)
✅ Contact searches
✅ Company information
✅ Sales rep lookups
✅ Pipeline stages
✅ Deal amounts and dates

### Semantic Search (Qdrant)

✅ Conversation search
✅ Mention finding
✅ Pattern discovery
✅ Documentation search

## How It Works

### 1. System Prompt Intelligence

The wrapper adds a comprehensive system prompt that teaches the agent:

- When to use BigQuery vs HubSpot vs Qdrant
- Available tables and columns
- Common query patterns
- SQL syntax for different question types
- How to format responses

### 2. Automatic Context

The wrapper automatically adds:

- Organization ID (for multi-tenant isolation)
- Workspace ID (for workspace-level data access)
- User ID (optional, for user-specific queries)

### 3. Query Translation

User asks: **"Give me avg response time"**

Agent understands:

1. This is an analytics query → Use BigQuery
2. Response time → avg_agent_response_time_seconds column
3. Organization context → Filter by org_id = '902'
4. Build SQL: `SELECT AVG(avg_agent_response_time_seconds)...`
5. Execute via mcp_call
6. Format result: "182.49 seconds (3.04 minutes)"

## Integration

### Frontend (React/Next.js)

```typescript
const response = await fetch("http://localhost:8000/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    query: userInput,
    org_id: currentOrgId,
    conversation_history: chatHistory,
  }),
});

const data = await response.json();
console.log(data.response); // Show to user
```

### Backend (Express.js)

```typescript
app.post("/user/analytics", async (req, res) => {
  const { question, userId } = req.body;

  // Get user's org_id from your database
  const orgId = await getUserOrganization(userId);

  // Call wrapper
  const result = await axios.post("http://localhost:8000/api/chat", {
    query: question,
    org_id: orgId,
    user_id: userId,
  });

  res.json({ answer: result.data.response });
});
```

### Mobile (React Native)

```typescript
const askAnalytics = async (question: string) => {
  const response = await fetch("http://localhost:8000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: question,
      org_id: user.organizationId,
    }),
  });

  const { response: answer } = await response.json();
  return answer;
};
```

## Configuration

### Environment Variables

```bash
# .env
OPENCLAW_URL=http://ywgssocsg44kckkgsgg0gssk.5.161.117.36.sslip.io/v1/chat/completions
OPENCLAW_TOKEN=103442901b9684c231b41e31c2b938525025bf71020305a0e5a6f31dd015ccc4
PORT=8000
```

### Customization

Edit the `getSystemPrompt()` function to:

- Add new tables/columns as your schema evolves
- Include domain-specific knowledge
- Add example queries for common questions
- Customize response formatting

## Deployment

### Docker

```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8000
CMD ["ts-node", "api-wrapper-example.ts"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: analytics-api-wrapper
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: wrapper
          image: your-registry/api-wrapper:latest
          ports:
            - containerPort: 8000
          env:
            - name: OPENCLAW_URL
              value: "http://openclaw-service:18789/v1/chat/completions"
```

## Benefits

✅ **Simple for end users** - Natural language only
✅ **No SQL knowledge required** - Agent builds queries
✅ **Multi-tenant by default** - org_id automatically applied
✅ **Handles all query types** - Analytics, CRM, semantic search
✅ **Conversation history** - Maintains context across messages
✅ **Extensible** - Easy to add new data sources
✅ **Production-ready** - Error handling, timeouts, logging

## Advanced: Conversation History

```typescript
const chatHistory = [
  { role: "user", content: "Give me avg response time" },
  { role: "assistant", content: "The average is 182.49 seconds" },
  { role: "user", content: "How does that compare to last week?" },
];

await fetch("/api/chat", {
  method: "POST",
  body: JSON.stringify({
    query: "How does that compare to last week?",
    org_id: "902",
    conversation_history: chatHistory,
  }),
});
```

## Troubleshooting

### "Session context missing"

→ Make sure org_id is provided in request

### "Tool not found" errors

→ Check OpenClaw MCP configuration is enabled

### Slow responses

→ Increase timeout (default 90s), optimize SQL queries

### Incorrect results

→ Update system prompt with better examples for that query type

## Next Steps

1. ✅ Deploy the wrapper API
2. ✅ Test with various query types
3. ✅ Integrate into your frontend
4. Add authentication/authorization
5. Add rate limiting
6. Add caching for common queries
7. Monitor query patterns and improve system prompt
8. Add streaming responses for real-time updates

## Alternative: Use REV AGENT Directly

Your existing **REV AGENT** already does this with more sophisticated orchestration:

- Intent classification
- Multi-step reasoning
- Parallel tool execution
- Better error handling

**Consider:** Use REV AGENT as the wrapper instead of OpenClaw, or merge both approaches.
