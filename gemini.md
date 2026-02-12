# Project: OpenClaw Studio (Node.js Edition)

## Target Repository: github.com/openclaw/openclaw

## 1. Project Overview

We are building **OpenClaw Studio**, a container orchestration platform that manages instances of the **OpenClaw** (Node.js/TypeScript) agent.
The goal is to turn the CLI-based OpenClaw into a managed SaaS with a visual dashboard ("Mission Control") and usage analytics.

**Tech Stack:**

- **Agent Runtime:** Node.js (TypeScript) - _Matches OpenClaw source._
- **Studio Frontend:** Next.js 14 (App Router), Tailwind, Shadcn/UI.
- **Studio Backend:** Next.js Server Actions (or separate Express), Dockerode (for container management).
- **Database:** PostgreSQL (Prisma ORM).

## 2. Architecture: The "Config Injection" Pattern

Since OpenClaw already has native support for channels (WhatsApp, etc.) and LLMs, we will not rewrite them. We will **configure** them.

1.  **The Studio (Host):**
    - User fills out a form (e.g., "DeepSeek Key", "WhatsApp Token").
    - Studio generates a valid `openclaw.json` config file.
    - Studio spins up a Docker container, mounting this config and `SOUL.md`.
2.  **The Agent (Container):**
    - Runs the modified OpenClaw source.
    - Uses a custom **Telemetry Plugin** to stream logs back to the Studio via WebSocket.

## 3. Discovered Resources & Configurations

### Supported Models (Built-in)

Based on `src/agents/models-config.providers.ts` and `src/providers/github-copilot-models.ts`:

- **GitHub Copilot**: `gpt-4o`, `gpt-4.1`, `gpt-4.1-mini`, `gpt-4.1-nano`, `o1`, `o1-mini`, `o3-mini`.
- **Minimax**: `MiniMax-M2.1`, `MiniMax-VL-01`.
- **Xiaomi**: `mimo-v2-flash`.
- **Moonshot**: `kimi-k2.5`.
- **Qwen Portal**: `coder-model`, `vision-model`.
- **Qianfan (Baidu)**: `deepseek-v3.2`, `ernie-5.0-thinking-preview`.
- **Standard Providers** (Implied by `pi-agent-core`): OpenAI (`gpt-4o`, `gpt-4o-mini`), Anthropic (`claude-3-5-sonnet`, `claude-3-opus`), Google (`gemini-1.5-pro`).

### Feishu Integration

Based on `extensions/feishu/src/config-schema.ts`:

**Configuration Fields:**

- `appId`: String (Required)
- `appSecret`: String (Required)
- `encryptKey`: String (Optional, for event encryption)
- `verificationToken`: String (Optional, for event verification)
- `domain`: "feishu" | "lark" | Custom URL (Default: "feishu")
- `connectionMode`: "websocket" | "webhook" (Default: "websocket")

## 4. Implementation Steps (Prompt Chain)

### Step 1: Analyze & Dockerize (Node.js Focus)

_Context: OpenClaw is a Node.js application._

1.  **Analyze Source:** Look at `package.json` and `src/index.ts` (or `src/main.ts`). Identify the entry point.
2.  **Create Dockerfile:**
    ```dockerfile
    FROM node:20-alpine
    WORKDIR /app
    COPY package*.json ./
    RUN npm install
    COPY . .
    # Install our custom telemetry hook
    COPY ./studio-telemetry ./src/studio-telemetry
    RUN npm run build
    CMD ["node", "dist/index.js"]
    ```
3.  **Define Config Schema:** Identify the structure of `openclaw.json`. We need to generate this JSON dynamically.

### Step 2: The Telemetry Hook (Modifying Source)

_Goal: Extract Task & Token data without breaking the core loop._
**Action:** Modify the OpenClaw source code to inject a "Spy".

1.  **Locate the "Brain":** Find the main loop where the agent processes messages (likely in `src/core/agent.ts` or similar).
2.  **Inject Token Counter:**
    - Find the LLM call method (e.g., `adapter.chat()`).
    - Wrap it to capture `usage: { input_tokens, output_tokens }`.
    - Send this data via `socket.io-client` to the Studio.
3.  **Inject Task Status:**
    - Find where the agent maintains its "Plan" or "Steps".
    - Emit events: `AGENT_THINKING`, `TOOL_EXECUTION`, `RESPONSE_SENT`.

### Step 3: Studio Backend - Container Manager

1.  **Provisioning Logic:**
    - Input: User ID, API Keys, Channel Config.
    - Action:
      1.  Create a unique folder `volumes/{userId}/config`.
      2.  Write `openclaw.json` with the keys.
      3.  Use `dockerode` to start a container, mapping port `3000` (internal) to a random host port.
      4.  Inject ENV vars: `STUDIO_URL=http://host.docker.internal:8000`.

### Step 4: Frontend - Mission Control & Analytics

1.  **Live Feed:** Connect to the WebSocket room `room-{userId}`. Display log events as they arrive from the container.
2.  **Analytics Dashboard:**
    - **Runtime:** Calculate `Date.now() - containerStartTime`.
    - **Cost:** Sum up the `token_usage` events stored in Postgres.
3.  **Integrations UI:**
    - Create a form for **WhatsApp**. Ask for `Verify Token` and `Phone ID`.
    - Save these to DB.
    - Regenerate `openclaw.json` and restart the container when saved.

## 5. Specific Instructions for Gemini (Code Generation)

- **TypeScript is Mandatory:** OpenClaw is written in TS. All new code (telemetry hooks, dashboard) must be strict TypeScript.
- **Respect the "Soul":** OpenClaw uses a `SOUL.md` file for system prompts. Add a feature in the Dashboard to edit this file directly.
- **Wrapper Pattern:** Do not rewrite the `Agent` class. Extend it or wrap the method calls:
  ```typescript
  // Example Hook
  const originalCall = this.llm.call;
  this.llm.call = async (prompt) => {
    const result = await originalCall(prompt);
    this.telemetry.emit("tokens", result.usage); // Send to Studio
    return result;
  };
  ```
- **Data Persistence:** Use Docker Volumes to persist the user's `workspace/` folder, so they don't lose memory when the container restarts.

## 6. File Structure Expectations

```text
/openclaw-studio (Next.js)
  /src/app/dashboard
  /src/lib/docker-manager.ts (Dockerode logic)

/openclaw-repo (The Agent Source)
  /src/studio-bridge (NEW: Your telemetry logic)
  /Dockerfile (NEW)
  /entrypoint.sh (NEW: Config generator)
```
