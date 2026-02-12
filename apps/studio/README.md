# OpenClaw Studio

OpenClaw Studio is a Mission Control dashboard for managing and visualizing OpenClaw agents.

## Features
- **Launch Control**: Configure and spawn new agent instances (Docker containers).
- **Live Status**: Real-time "Kanban" board showing agent status (Idle/Running).
- **Telemetry**: Live logs and token usage analytics.

## Architecture
- **Frontend**: Next.js 14 (App Router), Tailwind CSS, Recharts.
- **Backend**: Next.js Custom Server (Node.js) with `ws` for WebSocket support.
- **Orchestration**: `dockerode` to manage local Docker containers.

## Prerequisites
- Docker must be running on your machine.
- Node.js 20+ and pnpm.

## Setup & Run

### 1. Build the Agent Image
First, build the Docker image for the OpenClaw agent from the project root. This image will be used by the Studio to spawn instances.

```bash
# In the project root (openclaw/)
docker build -t openclaw-agent:latest .
```

### 2. Start the Studio
Navigate to the studio directory and start the development server.

```bash
cd apps/studio
pnpm install
pnpm dev
```

The Studio will be available at [http://localhost:3000](http://localhost:3000).

### 3. Usage
1.  Go to [http://localhost:3000/dashboard](http://localhost:3000/dashboard).
2.  In the "Launch Control" section:
    *   **Agent ID**: Enter a unique ID (e.g., `agent-001`).
    *   **Model ID**: Enter a model (e.g., `openai/gpt-4o`).
    *   **API Key**: Enter your OpenAI/Anthropic API key.
3.  Click **Launch Agent Instance**.
4.  Observe the "Live Agent Status" card. It should switch to "Running" and show logs.
5.  Watch the "Performance Analytics" chart for token usage updates.

## Troubleshooting
- **Docker Connection**: Ensure Docker is running. The Studio connects via `/var/run/docker.sock` by default.
- **WebSocket**: If real-time updates fail, check the browser console for connection errors.
