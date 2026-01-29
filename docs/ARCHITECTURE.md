# Moltbot Architecture Documentation

## Table of Contents
1. [Overview](#overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Core Components](#core-components)
4. [Data Flow](#data-flow)
5. [Message Routing](#message-routing)
6. [Agent Execution Model](#agent-execution-model)
7. [Plugin Architecture](#plugin-architecture)
8. [Security Model](#security-model)
9. [Storage & Persistence](#storage--persistence)
10. [Network Architecture](#network-architecture)

---

## Overview

Moltbot is designed as a **local-first, extensible AI assistant platform** with a microkernel-inspired architecture. The system consists of a central Gateway (control plane) and modular components (channels, tools, plugins) that communicate through well-defined interfaces.

### Design Principles

1. **Local-First**: Everything runs on user's devices; no central server dependency
2. **Privacy-Focused**: User data never leaves their control
3. **Extensible**: Plugin system for adding channels, tools, and functionality
4. **Multi-Platform**: Works on macOS, iOS, Android, Linux, Windows (WSL2)
5. **Resilient**: Graceful degradation; continues working when components fail
6. **Developer-Friendly**: Clear APIs, TypeScript types, comprehensive testing

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      User Interfaces                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────────┐ │
│  │  macOS   │  │   iOS    │  │ Android  │  │   CLI / Web UI  │ │
│  │   App    │  │   App    │  │   App    │  │                 │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓ WebSocket / HTTP
┌─────────────────────────────────────────────────────────────────┐
│                         Gateway Server                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              WebSocket Control Plane                        ││
│  │  • Session Management                                       ││
│  │  • Message Routing                                          ││
│  │  • Model Catalog                                            ││
│  │  • Discovery Service (mDNS)                                 ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│  ┌──────────────┬───────────┴───────────┬──────────────────┐  │
│  │              │                        │                  │  │
│  ▼              ▼                        ▼                  ▼  │
│ ┌──────┐  ┌──────────┐  ┌───────────┐  ┌─────────────────┐   │
│ │ Chat │  │  Model   │  │  Browser  │  │  Cron Scheduler │   │
│ │Registry│ │ Catalog │  │   Tool    │  │                 │   │
│ └──────┘  └──────────┘  └───────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Agent Runtime Layer                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Pi Agent (RPC Mode)                            ││
│  │  • Tool Streaming                                           ││
│  │  • Block Streaming                                          ││
│  │  • Model Failover                                           ││
│  │  • Auth Profile Rotation                                    ││
│  │  • Session Context Management                               ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│  ┌──────────────┬───────────┴───────────┬──────────────────┐  │
│  │              │                        │                  │  │
│  ▼              ▼                        ▼                  ▼  │
│ ┌──────┐  ┌──────────┐  ┌───────────┐  ┌─────────────────┐   │
│ │ Tool │  │ Session  │  │   Memory  │  │   Sandbox       │   │
│ │Registry│ │ Manager │  │   Store   │  │  (Optional)     │   │
│ └──────┘  └──────────┘  └───────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Channel Layer (Multi-Protocol)                │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────────┐  │
│  │ WhatsApp │ Telegram │  Signal  │ Discord  │    Slack     │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────────┘  │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────────┐  │
│  │ iMessage │   Teams  │  Matrix  │   Zalo   │  BlueBubbles │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────────┘  │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────────┐  │
│  │  Twitch  │Mattermost│   LINE   │   Nostr  │  Voice Call  │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      External Services                           │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────────┐  │
│  │ Anthropic│  OpenAI  │   AWS    │  Ollama  │    Google    │  │
│  │  Claude  │   GPT    │ Bedrock  │  (Local) │  Gemini      │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Gateway Server

**Responsibility**: Central control plane for all communication and orchestration.

**Key Modules**:
- `server.ts` - Main WebSocket server
- `chat-registry.ts` - Active chat session registry
- `model-catalog.ts` - Available AI models catalog
- `browser-tool.ts` - Shared browser automation tool
- `discovery.ts` - mDNS service discovery

**APIs**:
```typescript
interface GatewayServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  registerChat(chat: ChatSession): void;
  unregisterChat(chatId: string): void;
  routeMessage(message: InboundMessage): Promise<void>;
  getModelCatalog(): ModelCatalog;
  getBrowserTool(): BrowserTool;
}
```

**Communication**:
- WebSocket (ws://) for real-time bidirectional communication
- HTTP REST API for management operations
- mDNS for local network discovery

### 2. Agent Runtime

**Responsibility**: Execute AI models and manage agent sessions.

**Key Modules**:
- `pi-embedded-runner.ts` - Pi Agent executor
- `session-manager.ts` - Session lifecycle management
- `tool-registry.ts` - Available tools catalog
- `model-auth.ts` - Model authentication and failover

**Execution Flow**:
```typescript
interface AgentRuntime {
  createSession(config: SessionConfig): AgentSession;
  executeMessage(session: AgentSession, message: string): AsyncGenerator<AgentEvent>;
  executeTools(session: AgentSession, tools: ToolCall[]): Promise<ToolResult[]>;
  streamResponse(session: AgentSession): AsyncGenerator<ResponseChunk>;
}
```

**Session Management**:
- **Main Session**: Primary agent for user interactions
- **Group Sessions**: Isolated agents for group chats
- **Sub-Sessions**: Spawned agents for specific tasks
- **Queue Modes**: Serial (one at a time) vs Concurrent (parallel)

### 3. Channel Layer

**Responsibility**: Handle messaging protocol specifics and normalize messages.

**Channel Interface**:
```typescript
interface Channel {
  name: string;
  type: ChannelType;
  
  // Lifecycle
  init(config: ChannelConfig): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  
  // Messaging
  send(message: OutboundMessage): Promise<void>;
  receive(handler: MessageHandler): void;
  
  // Status
  getStatus(): ChannelStatus;
  getConnections(): Connection[];
}
```

**Message Normalization**:
```typescript
interface NormalizedMessage {
  id: string;
  channel: string;
  from: string;
  to: string;
  text: string;
  media?: MediaAttachment[];
  replyTo?: string;
  timestamp: number;
  metadata: Record<string, unknown>;
}
```

**Channel Types**:
- **Built-in**: WhatsApp, Telegram, Signal, Discord, Slack, iMessage
- **Extensions**: Teams, Matrix, Zalo, BlueBubbles, Twitch, etc.

### 4. Tool System

**Responsibility**: Provide capabilities to agents beyond text generation.

**Tool Interface**:
```typescript
interface Tool {
  name: string;
  description: string;
  schema: JSONSchema;
  
  execute(params: unknown, context: ToolContext): Promise<ToolResult>;
}
```

**Built-in Tools**:
- **Browser Tool**: Web automation, screenshots, form filling
- **Canvas Tool**: Visual workspace with A2UI
- **Image Tool**: Image analysis and generation
- **Message Tool**: Send messages across channels
- **Session Tool**: Spawn sub-agents
- **Bash Tool**: Execute shell commands
- **Web Tool**: Fetch URLs, web search, readability
- **Memory Tool**: Store and retrieve context
- **Cron Tool**: Schedule tasks

**Tool Execution Pipeline**:
```
User Message → Agent → Tool Call → Tool Execute → Tool Result → Agent → Response
```

### 5. Plugin System

**Responsibility**: Enable extensibility through modular plugins.

**Plugin Types**:
1. **Channel Plugins**: Add new messaging integrations
2. **Tool Plugins**: Add custom agent tools
3. **Auth Plugins**: Add OAuth handlers
4. **Memory Plugins**: Add storage backends
5. **Hook Plugins**: Add global event handlers

**Plugin Lifecycle**:
```typescript
interface Plugin {
  manifest: PluginManifest;
  
  // Lifecycle
  init(services: PluginServices): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  
  // Hooks
  hooks?: Record<string, HookHandler>;
}
```

**Plugin Discovery**:
- Auto-detect from `extensions/` directory
- Auto-detect from `node_modules/@moltbot/` packages
- Validate manifest and config schema
- Load and initialize plugins

---

## Data Flow

### Inbound Message Flow

```
External Channel (WhatsApp, Telegram, etc.)
         ↓
  Channel Handler
         ↓
  Message Normalization
         ↓
  Allowlist Check
         ↓
  Gateway Router
         ↓
  Session Selection
         ↓
  Agent Execution
         ↓
  Tool Streaming
         ↓
  Response Generation
         ↓
  Channel Formatting
         ↓
  Outbound Message
         ↓
External Channel
```

### Detailed Flow Steps

1. **Channel Receives Message**
   - Raw message from external protocol
   - Protocol-specific handling (e.g., Baileys for WhatsApp)

2. **Message Normalization**
   - Convert to `NormalizedMessage` format
   - Extract text, media, reply context
   - Add metadata

3. **Allowlist Check**
   - Verify sender is allowed
   - Check pairing status for DMs
   - Validate group membership

4. **Gateway Routing**
   - Determine target session
   - Check activation mode (mention, reply, always-on)
   - Queue or execute immediately

5. **Agent Execution**
   - Load session context
   - Execute model with tools
   - Stream tool calls and responses

6. **Tool Execution**
   - Execute tools as needed
   - Stream tool results back to agent
   - Handle tool errors gracefully

7. **Response Generation**
   - Agent generates response
   - Apply thinking mode (low/high/always)
   - Format for target channel

8. **Channel Formatting**
   - Convert to channel-specific format
   - Chunk long messages if needed
   - Add reactions/typing indicators

9. **Outbound Message**
   - Send via channel handler
   - Track delivery status
   - Handle errors and retries

---

## Message Routing

### Routing Rules

```typescript
interface RoutingConfig {
  // Main session routing
  mainSession: {
    activationMode: 'always' | 'mention' | 'reply' | 'dm-only';
    replyBack: boolean;
    allowedChannels: string[];
  };
  
  // Group session routing
  groupSessions: {
    enabled: boolean;
    isolateByGroup: boolean;
    activationMode: 'mention' | 'reply';
  };
  
  // Cross-channel routing
  crossChannel: {
    enabled: boolean;
    routes: ChannelRoute[];
  };
}
```

### Activation Modes

1. **Always-On**: Every message triggers agent
2. **Mention**: Only messages mentioning bot trigger agent
3. **Reply**: Only replies to bot messages trigger agent
4. **DM-Only**: Only direct messages trigger agent

### Session Isolation

- **Main Session**: Primary agent for user
- **Group Session**: Separate agent per group chat
- **Workspace Session**: Separate agent per workspace

---

## Agent Execution Model

### Session Context

```typescript
interface SessionContext {
  sessionId: string;
  chatId: string;
  channel: string;
  
  // Context window
  messages: Message[];
  maxTokens: number;
  
  // Configuration
  model: string;
  temperature: number;
  thinkingMode: 'low' | 'high' | 'always';
  
  // Tools
  availableTools: Tool[];
  toolResults: ToolResult[];
  
  // Memory
  memory: MemoryStore;
  skills: Skill[];
}
```

### Execution Pipeline

```
Message → Load Context → Execute Model → Stream Tools → Generate Response → Save Context
```

### Tool Streaming

```typescript
interface ToolStreamEvent {
  type: 'tool_call' | 'tool_result' | 'text_chunk' | 'thinking';
  data: unknown;
}

async function* streamAgentExecution(
  session: SessionContext,
  message: string
): AsyncGenerator<ToolStreamEvent> {
  // Stream tool calls and results in real-time
  yield* piAgent.execute(session, message);
}
```

### Model Failover

```typescript
interface ModelFailoverConfig {
  primary: ModelConfig;
  fallbacks: ModelConfig[];
  retryAttempts: number;
  retryDelay: number;
}

async function executeWithFailover(
  config: ModelFailoverConfig,
  request: ModelRequest
): Promise<ModelResponse> {
  // Try primary model
  try {
    return await execute(config.primary, request);
  } catch (error) {
    // Try fallback models
    for (const fallback of config.fallbacks) {
      try {
        return await execute(fallback, request);
      } catch (fallbackError) {
        continue;
      }
    }
    throw error;
  }
}
```

---

## Plugin Architecture

### Plugin System Design

```
┌──────────────────────────────────────┐
│       Plugin Discovery               │
│  • extensions/                       │
│  • node_modules/@moltbot/            │
└──────────────────────────────────────┘
                │
                ↓
┌──────────────────────────────────────┐
│       Plugin Loader                  │
│  • Validate manifest                 │
│  • Load config schema                │
│  • Initialize plugin                 │
└──────────────────────────────────────┘
                │
                ↓
┌──────────────────────────────────────┐
│       Plugin Runtime                 │
│  • Register hooks                    │
│  • Inject services                   │
│  • Execute plugin logic              │
└──────────────────────────────────────┘
```

### Plugin Manifest

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "type": "channel",
  "exports": {
    ".": "./dist/index.js",
    "./config-schema": "./dist/config-schema.js"
  },
  "hooks": ["channel", "message:received", "message:sent"],
  "permissions": ["network", "fs", "env"],
  "dependencies": {
    "some-lib": "^1.0.0"
  }
}
```

### Plugin Services

```typescript
interface PluginServices {
  gateway: GatewayClient;
  config: ConfigProvider;
  logger: Logger;
  http: HttpClient;
  storage: StorageProvider;
}
```

### Plugin Hooks

```typescript
interface PluginHooks {
  'plugin:init': (plugin: Plugin) => Promise<void>;
  'plugin:start': (plugin: Plugin) => Promise<void>;
  'plugin:stop': (plugin: Plugin) => Promise<void>;
  
  'message:received': (message: NormalizedMessage) => Promise<void>;
  'message:sent': (message: NormalizedMessage) => Promise<void>;
  
  'agent:before': (session: SessionContext) => Promise<void>;
  'agent:after': (session: SessionContext, response: string) => Promise<void>;
  
  'tool:before': (tool: Tool, params: unknown) => Promise<void>;
  'tool:after': (tool: Tool, result: ToolResult) => Promise<void>;
}
```

---

## Security Model

### Authentication

1. **Pairing System**
   - Code-based pairing for DMs
   - One-time pairing codes
   - Allowlist management

2. **Channel Authentication**
   - OAuth tokens (Discord, Slack, etc.)
   - Bot tokens (Telegram)
   - Session persistence (WhatsApp, Signal)

3. **Model Authentication**
   - API keys (Anthropic, OpenAI)
   - OAuth (Google, AWS)
   - Profile rotation on failure

### Authorization

1. **Allowlists**
   - Per-channel allowlists
   - Phone numbers for WhatsApp
   - User IDs for Telegram
   - Handle-based for Discord

2. **Group Policies**
   - Mention-only mode
   - Reply-only mode
   - Admin-only commands

3. **Tool Permissions**
   - Per-tool enable/disable
   - Execution timeouts
   - Resource limits

### Privacy

1. **Local-First**
   - All data stored locally
   - No external server dependency
   - User controls all data

2. **Session Isolation**
   - Separate sessions per chat
   - No cross-session data leaks
   - Clear session boundaries

3. **Media Handling**
   - Temporary storage with lifecycle
   - Automatic cleanup
   - Optional media redaction

---

## Storage & Persistence

### File System Layout

```
~/.clawdbot/
├── config/
│   ├── .moltbot.yaml          # Main config
│   ├── models.json            # Model profiles
│   └── skills/                # Skill configs
├── credentials/
│   ├── anthropic.json         # OAuth tokens
│   ├── openai.json
│   └── channels/              # Channel credentials
├── sessions/
│   ├── main/                  # Main session data
│   ├── groups/                # Group sessions
│   └── agents/                # Agent-specific data
├── media/
│   ├── audio/                 # Audio files
│   ├── images/                # Image files
│   └── videos/                # Video files
├── memory/
│   ├── vectors/               # Vector embeddings
│   └── cache/                 # Cached data
└── logs/
    ├── gateway.log            # Gateway logs
    ├── agent.log              # Agent logs
    └── channels/              # Per-channel logs
```

### Session Storage

```typescript
interface SessionStore {
  // Session CRUD
  create(session: SessionContext): Promise<void>;
  read(sessionId: string): Promise<SessionContext>;
  update(session: SessionContext): Promise<void>;
  delete(sessionId: string): Promise<void>;
  
  // Message history
  addMessage(sessionId: string, message: Message): Promise<void>;
  getMessages(sessionId: string, limit: number): Promise<Message[]>;
  
  // Context management
  getContext(sessionId: string): Promise<SessionContext>;
  saveContext(sessionId: string, context: SessionContext): Promise<void>;
}
```

### Memory Store

```typescript
interface MemoryStore {
  // Vector storage
  addEmbedding(key: string, embedding: number[]): Promise<void>;
  searchEmbeddings(query: number[], k: number): Promise<SearchResult[]>;
  
  // Key-value storage
  set(key: string, value: unknown): Promise<void>;
  get(key: string): Promise<unknown>;
  delete(key: string): Promise<void>;
  
  // Context retrieval
  recall(query: string): Promise<MemoryResult[]>;
}
```

---

## Network Architecture

### Local Mode

```
┌───────────────────────┐
│   User Device         │
│  ┌─────────────────┐  │
│  │  Gateway Server │  │
│  │  (localhost)    │  │
│  └─────────────────┘  │
│          ↓            │
│  ┌─────────────────┐  │
│  │  Agent Runtime  │  │
│  └─────────────────┘  │
│          ↓            │
│  ┌─────────────────┐  │
│  │    Channels     │  │
│  └─────────────────┘  │
└───────────────────────┘
         ↓
  External Services
  (Anthropic, OpenAI)
```

### Remote Gateway Mode

```
┌───────────────────────┐        ┌───────────────────────┐
│   Client Device       │        │   Remote Server       │
│  ┌─────────────────┐  │   WS   │  ┌─────────────────┐  │
│  │  Gateway Client │──┼────────┼──│  Gateway Server │  │
│  │  (Control UI)   │  │        │  │  (Headless)     │  │
│  └─────────────────┘  │        │  └─────────────────┘  │
└───────────────────────┘        │          ↓            │
                                 │  ┌─────────────────┐  │
                                 │  │  Agent Runtime  │  │
                                 │  └─────────────────┘  │
                                 │          ↓            │
                                 │  ┌─────────────────┐  │
                                 │  │    Channels     │  │
                                 │  └─────────────────┘  │
                                 └───────────────────────┘
                                          ↓
                                   External Services
```

### Service Discovery

```typescript
interface DiscoveryService {
  // mDNS advertisement
  advertise(service: ServiceInfo): Promise<void>;
  stopAdvertise(): Promise<void>;
  
  // Discovery
  discover(serviceType: string): Promise<ServiceInfo[]>;
  watch(serviceType: string, handler: ServiceHandler): void;
}
```

---

## Scalability Considerations

### Vertical Scaling
- Single-user design (no multi-tenancy)
- Resource limits per tool
- Session cleanup policies
- Media file size limits

### Horizontal Scaling
- Not applicable (personal assistant)
- Remote Gateway for headless servers
- Multiple client devices connecting to single gateway

### Performance Optimizations
- Message chunking for large responses
- Lazy loading of plugins
- Caching of model responses
- Connection pooling for channels
- Parallel tool execution (where safe)

---

## Reliability & Fault Tolerance

### Error Handling
- Graceful degradation when components fail
- Model failover on API errors
- Channel reconnection on disconnect
- Tool timeout handling

### Monitoring
- Gateway status endpoint
- Channel connection status
- Agent execution metrics
- Tool execution tracing

### Logging
- Structured logging with tslog
- Per-component log levels
- Configurable log output (file, console)
- Log rotation and retention

---

## Future Architecture Considerations

### Planned Enhancements
- Distributed tracing
- Performance profiling
- Advanced memory systems (RAG, embeddings)
- Multi-agent coordination
- Enhanced sandbox isolation

### Extensibility Points
- Custom model providers
- Custom channel protocols
- Custom tool implementations
- Custom memory backends
- Custom authentication providers

---

**End of Architecture Documentation**
