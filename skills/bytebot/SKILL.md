---
name: bytebot
description: "Control a virtual desktop (ByteBot) to autonomously operate any GUI application — browsers, office suites, image editors, etc. Send tasks, take screenshots, and retrieve results via the ByteBot container API."
metadata: {"openclaw":{"emoji":"🖥️","requires":{"services":["bytebot"]}}}
---

# ByteBot — Virtual Desktop Control

## Overview

ByteBot runs a containerized Linux desktop (XFCE + noVNC) with an AI agent that can operate any GUI application. Use this skill to send natural-language tasks to the virtual desktop and receive results (text + screenshots).

## Prerequisites

- ByteBot container running (`docker-compose -f docker/docker-compose.yml up -d`)
- Ports: `9990` (Desktop API), `9991` (Task API), `9992` (Web UI / noVNC)

## Configuration

Set the ByteBot base URL (defaults to `http://localhost`):

```
openclaw config set bytebot.host http://localhost
```

## API Endpoints

| Port | Path | Purpose |
|------|------|---------|
| 9991 | `POST /tasks` | Create a new task |
| 9991 | `GET /tasks` | List all tasks |
| 9991 | `GET /tasks/:id` | Get task status + result |
| 9990 | `POST /computer-use` | Direct desktop actions (screenshot, click, type, etc.) |
| 9992 | `/` | noVNC web viewer |

## Actions

### Send a task (natural language)

```bash
curl -X POST http://localhost:9991/tasks \
  -H "Content-Type: application/json" \
  -d '{"description": "Open Firefox and navigate to google.com"}'
```

Response:
```json
{
  "id": "task_abc123",
  "status": "pending",
  "description": "Open Firefox and navigate to google.com"
}
```

### Send a high-priority task

```bash
curl -X POST http://localhost:9991/tasks \
  -H "Content-Type: application/json" \
  -d '{"description": "Take a screenshot of the current desktop", "priority": "HIGH"}'
```

### Check task status

```bash
curl http://localhost:9991/tasks/task_abc123
```

Response:
```json
{
  "id": "task_abc123",
  "status": "completed",
  "result": "Opened Firefox and navigated to google.com successfully.",
  "screenshot": "/screenshots/task_abc123.png"
}
```

### List all tasks

```bash
curl http://localhost:9991/tasks
```

### Take a screenshot (direct)

```bash
curl -X POST http://localhost:9990/computer-use \
  -d '{"action": "screenshot"}'
```

### Click at coordinates

```bash
curl -X POST http://localhost:9990/computer-use \
  -d '{"action": "click", "x": 500, "y": 300}'
```

### Type text

```bash
curl -X POST http://localhost:9990/computer-use \
  -d '{"action": "type", "text": "Hello World"}'
```

### Key press

```bash
curl -X POST http://localhost:9990/computer-use \
  -d '{"action": "key", "key": "Return"}'
```

## Typical Workflow

1. **Create task** — send a natural-language description to `/tasks`
2. **Poll status** — check `/tasks/:id` until `status` is `completed` or `failed`
3. **Get result** — read `result` text and optionally fetch the screenshot
4. **Report back** — return the result text and/or screenshot to the user

## Polling Pattern

```bash
# Create task
TASK_ID=$(curl -s -X POST http://localhost:9991/tasks \
  -H "Content-Type: application/json" \
  -d '{"description": "Open LibreOffice Writer and type Hello"}' | jq -r '.id')

# Poll until done (max 60 attempts, 5s interval)
for i in $(seq 1 60); do
  STATUS=$(curl -s http://localhost:9991/tasks/$TASK_ID | jq -r '.status')
  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
    curl -s http://localhost:9991/tasks/$TASK_ID | jq .
    break
  fi
  sleep 5
done
```

## Health Check

Verify ByteBot is running:

```bash
curl -sf http://localhost:9991/tasks > /dev/null && echo "ByteBot OK" || echo "ByteBot DOWN"
```

## Example Use Cases

- **Web automation**: "Open Firefox, go to example.com, take a screenshot"
- **Office tasks**: "Open LibreOffice Calc, create a table with monthly sales data, export as PDF"
- **Image editing**: "Open GIMP, resize image.png to 800x600, save as resized.png"
- **Monitoring**: "Open browser, navigate to dashboard URL, screenshot the metrics panel"
- **Data entry**: "Open the spreadsheet at ~/data.ods, enter today's figures in row 15"

## Error Handling

- If ByteBot container is not running, the API calls will fail with connection refused
- Tasks that fail will have `status: "failed"` with an error message in `result`
- Timeout: if a task doesn't complete within 5 minutes, consider it stuck and check the noVNC viewer at `http://localhost:9992`

## Security Notes

- ByteBot runs inside a Docker container, isolated from the host
- API is only exposed on localhost (not accessible externally)
- For sensitive operations (login, payment), require manual user confirmation before proceeding
