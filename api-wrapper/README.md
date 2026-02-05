# Natural Language API Wrapper for OpenClaw

This wrapper makes OpenClaw accessible via simple natural language queries - no SQL, no technical knowledge required.

## Quick Start

### Start the Wrapper

```bash
pnpm start
# or
pnpm dev  # with auto-reload
```

The wrapper will start on **http://localhost:8000**

### Test a Query

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Give me avg response time", "org_id": "902"}'
```

### Example Response

```json
{
  "response": "The average response time for organization 902 is approximately 182.49 seconds (3.04 minutes).",
  "org_id": "902",
  "success": true
}
```

## How It Works

### 1. User sends simple query

```json
{
  "query": "Give me avg response time",
  "org_id": "902"
}
```

### 2. Wrapper adds comprehensive system prompt

The wrapper automatically injects a system prompt that teaches the agent:

- When to use BigQuery vs HubSpot vs Qdrant
- Available table schemas and columns
- Common query patterns
- SQL syntax examples

### 3. Wrapper forwards to OpenClaw

```json
{
  "model": "openclaw",
  "messages": [
    {
      "role": "system",
      "content": "You are an analytics assistant with access to WhatsApp analytics and CRM data through MCP tools..."
    },
    {
      "role": "user",
      "content": "Give me avg response time"
    }
  ]
}
```

Plus required headers:

- `Authorization: Bearer <token>`
- `X-Organization-Id: 902`
- `X-Workspace-Id: default-workspace`

### 4. OpenClaw executes via MCP tools

Agent automatically:

- Identifies this as a BigQuery analytics query
- Builds correct SQL: `SELECT AVG(avg_agent_response_time_seconds) FROM daily_performance_summary WHERE org_id = '902'`
- Executes via MCP
- Formats response in natural language

## Supported Query Types

### Analytics (BigQuery)

- "Give me avg response time"
- "Compare rep 14024 to rep 14025"
- "How many messages were sent today"
- "Show me top 5 performers this week"
- "What's the response time trend for last 7 days"

### CRM (HubSpot)

- "What deals are dead"
- "Show me open deals in pipeline"
- "Find contacts from Acme Corp"
- "Who are the top sales reps"

### Semantic Search (Qdrant)

- "Find conversations mentioning refunds"
- "Search for complaints about shipping"

## API Reference

### POST /api/chat

**Request:**

```typescript
{
  query: string;              // Natural language question
  org_id: string;            // Organization ID (required)
  workspace_id?: string;     // Optional, defaults to "default-workspace"
  user_id?: string;          // Optional user context
  conversation_history?: Array<{
    role: string;
    content: string;
  }>;
}
```

**Response:**

```typescript
{
  response: string; // Natural language answer
  org_id: string; // Organization ID
  success: boolean; // Whether query succeeded
}
```

### GET /health

Returns `{"status": "healthy"}`

## Configuration

Environment variables (optional):

```bash
# .env
OPENCLAW_URL=http://ywgssocsg44kckkgsgg0gssk.5.161.117.36.sslip.io/v1/chat/completions
OPENCLAW_TOKEN=103442901b9684c231b41e31c2b938525025bf71020305a0e5a6f31dd015ccc4
PORT=8000
```

Or edit directly in `api-wrapper-example.ts`:

```typescript
const OPENCLAW_URL = "http://...";
const OPENCLAW_TOKEN = "...";
```

## Integration Examples

### Frontend (React/Next.js)

```typescript
const askAnalytics = async (question: string, orgId: string) => {
  const response = await fetch("http://localhost:8000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: question,
      org_id: orgId,
    }),
  });

  const { response: answer, success } = await response.json();
  return { answer, success };
};

// Usage
const result = await askAnalytics("Give me avg response time", "902");
console.log(result.answer);
```

### Backend (Express.js)

```typescript
app.post("/user/analytics", async (req, res) => {
  const { question, userId } = req.body;
  const orgId = await getUserOrganization(userId);

  const result = await axios.post("http://localhost:8000/api/chat", {
    query: question,
    org_id: orgId,
  });

  res.json({ answer: result.data.response });
});
```

## Conversation History

For multi-turn conversations:

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How does that compare to last week?",
    "org_id": "902",
    "conversation_history": [
      {"role": "user", "content": "Give me avg response time"},
      {"role": "assistant", "content": "The average is 182.49 seconds"}
    ]
  }'
```

## Testing

Run the full test suite (requires OpenClaw to be online):

```bash
cd ..
./test-wrapper-live.sh
```

Check OpenClaw status:

```bash
cd ..
./check-openclaw-status.sh
```

## Deployment

### Docker

```dockerfile
FROM node:18
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY . .
EXPOSE 8000
CMD ["pnpm", "start"]
```

Build and run:

```bash
docker build -t api-wrapper .
docker run -p 8000:8000 api-wrapper
```

### Production

```bash
# Install dependencies
pnpm install --prod

# Build TypeScript (optional)
pnpm tsc

# Run with PM2
pm2 start "pnpm start" --name api-wrapper

# Or use forever
forever start -c "pnpm start" .
```

## Troubleshooting

### "Error: Request failed with status code 404"

- OpenClaw is offline
- Check: `../check-openclaw-status.sh`

### "Missing required fields: query and org_id"

- Both `query` and `org_id` are required in request body

### Slow responses

- Increase timeout (default 90s)
- Check OpenClaw and MCP server latency
- Optimize queries in system prompt

## Files

- `api-wrapper-example.ts` - Main wrapper implementation
- `package.json` - Dependencies
- `README.md` - This file
- `../NATURAL-LANGUAGE-API-GUIDE.md` - Complete usage guide
- `../test-wrapper-live.sh` - Test suite

## Benefits

✅ **Simple for end users** - Natural language only
✅ **No SQL knowledge required** - Agent builds queries
✅ **Multi-tenant by default** - org_id automatically applied
✅ **Handles all query types** - Analytics, CRM, semantic search
✅ **Conversation history** - Maintains context
✅ **Production-ready** - Error handling, timeouts, logging
