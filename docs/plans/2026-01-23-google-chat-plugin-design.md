# Google Chat Channel Plugin Design

**Date:** 2026-01-23
**Author:** Kirby (Remix Partners)
**Status:** Approved for Implementation

## Overview

Convert the Google Chat provider from RemixPartners' fork (v2026.1.10, old ProviderPlugin architecture) into a modern plugin for upstream Clawdbot (v2026.1.23+, new ChannelPlugin architecture). Submit as a pull request to contribute Google Chat support to the main Clawdbot project.

## Goals

1. **Stay on the edge**: Enable Remix Partners to always run latest Clawdbot without maintaining a fork
2. **Contribute upstream**: Share Google Chat integration with the Clawdbot community
3. **Modern architecture**: Use the new plugin system (ChannelPlugin) introduced in v2026.1.11+
4. **Preserve functionality**: Maintain all existing GChat features (webhooks, message queues, security)
5. **Generic implementation**: Remove RemixPartners-specific customizations for universal use

## Current State Analysis

### RemixPartners Fork (v2026.1.10)

**Location:** `/Users/remixpartners/Projects/clawdbot`

**Architecture:**
- Uses old `ProviderPlugin` interface (monolithic, hardcoded into core)
- Code lives in `src/googlechat/` (7 implementation files)
- Provider wrapper in `src/providers/plugins/googlechat.ts`
- Configuration types hardcoded in `src/config/types.ts`

**Key Files:**
```
src/googlechat/
├── accounts.ts          # Account resolution & multi-account support
├── monitor.ts           # Pub/Sub monitoring (gateway lifecycle)
├── probe.ts             # Health check implementation
├── run-webhook.ts       # Webhook server entry point (port 18792)
├── send.ts              # Message sending (text & media)
├── types.ts             # TypeScript types for GChat API
└── webhook-server.ts    # Express webhook server with message queue
```

**Unique Features:**
- Async message processing with per-space queuing (prevents race conditions)
- Message de-duplication via session IDs
- ANSI log filtering to prevent credential leaks
- Subprocess spawning (no shell escaping issues)
- Support for both ngrok and Tailscale Funnel deployment

**Customizations to Remove:**
- Hardcoded paths: `/Users/justinmassa/chief-of-staff/.venv/bin/python`
- Hardcoded paths: `/Users/justinmassa/chief-of-staff/scripts/gchat_send_file.py`
- RemixPartners branding ("Clawdbot x GChat")
- Custom startup scripts (will become generic docs)

### Upstream Clawdbot (v2026.1.23)

**Location:** `/Users/remixpartners/Projects/clawdbot-upstream`

**Architecture:**
- New `ChannelPlugin` interface (modular, extensions-based)
- Plugins live in `extensions/<plugin-id>/`
- Each plugin has its own `package.json` and manifest
- Plugins register via `api.registerChannel()` in `index.ts`
- Configuration schemas defined in `clawdbot.plugin.json`

**Plugin System:**
- HTTP handlers: `api.registerHttpHandler()` (no separate server needed)
- Runtime injection: `api.runtime` provides utilities
- Config validation: JSON schemas with UI hints
- Onboarding: `ChannelOnboardingAdapter` for setup wizard

**Reference Examples:**
- `extensions/msteams/` - Simple plugin (Bot Framework)
- `extensions/zalouser/` - Complex plugin (external CLI, tools)

## Target Architecture

### File Structure

```
extensions/google-chat/
├── package.json              # Plugin dependencies
├── clawdbot.plugin.json      # Manifest with config schema
├── index.ts                  # Plugin entry point
├── README.md                 # Setup documentation
└── src/
    ├── channel.ts            # ChannelPlugin implementation
    ├── runtime.ts            # Runtime dependency injection
    ├── accounts.ts           # Account resolution (from fork)
    ├── send.ts               # Message sending (from fork)
    ├── webhook.ts            # HTTP webhook handler (from fork)
    ├── probe.ts              # Health checks (from fork)
    ├── monitor.ts            # Gateway monitoring (from fork)
    ├── onboarding.ts         # Setup wizard (NEW)
    └── types.ts              # Google Chat types (from fork)
```

### Plugin Entry Point (`index.ts`)

```typescript
import type { ClawdbotPluginApi } from "clawdbot/plugin-sdk";
import { emptyPluginConfigSchema } from "clawdbot/plugin-sdk";
import { googlechatPlugin } from "./src/channel.js";
import { setGoogleChatRuntime } from "./src/runtime.js";
import { handleGoogleChatWebhook } from "./src/webhook.js";

const plugin = {
  id: "google-chat",
  name: "Google Chat",
  description: "Google Chat channel via Pub/Sub webhooks",
  configSchema: emptyPluginConfigSchema(),
  register(api: ClawdbotPluginApi) {
    setGoogleChatRuntime(api.runtime);
    api.registerChannel({ plugin: googlechatPlugin });
    api.registerHttpHandler(handleGoogleChatWebhook);
  },
};

export default plugin;
```

### Core Plugin (`src/channel.ts`)

Implements `ChannelPlugin<ResolvedGoogleChatAccount>` with these adapters:

**Required Adapters:**
1. **config**: Account resolution, enablement, deletion
2. **outbound**: Sending text and media messages
3. **gateway**: Starting/stopping the Pub/Sub monitor
4. **status**: Health probes and runtime snapshots
5. **security**: DM/space policies and allowlists
6. **pairing**: Email-based pairing workflow

**Optional Adapters:**
7. **onboarding**: Interactive setup wizard (NEW)
8. **threading**: Thread reply behavior
9. **capabilities**: Declares support for DMs, spaces, threads, media

### HTTP Webhook Handler

**Old Approach (Fork):**
- Standalone Express server on port 18792
- Managed separately from gateway lifecycle
- Two startup scripts (ngrok vs Tailscale)

**New Approach (Plugin):**
- Register via `api.registerHttpHandler()`
- Gateway's built-in HTTP server handles requests
- No separate server process needed
- Documented deployment (users choose ngrok/Tailscale/Caddy)

**Message Queue Logic (Preserved):**
- Per-space async message queues
- Sequential processing per space
- Immediate webhook ACK to Google Chat
- Background message handling via spawned subprocesses

### Configuration Schema

**Old (hardcoded in `config/types.ts`):**
```typescript
export type GoogleChatConfig = {
  accounts?: Record<string, GoogleChatAccountConfig>;
} & GoogleChatAccountConfig;
```

**New (`clawdbot.plugin.json`):**
```json
{
  "id": "google-chat",
  "configSchema": {
    "schema": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean" },
        "projectId": { "type": "string" },
        "subscriptionName": { "type": "string" },
        "credentialsPath": { "type": "string" },
        "allowFrom": { "type": "array", "items": { "type": "string" } },
        "dmPolicy": { "enum": ["open", "pairing", "closed"] },
        "spacePolicy": { "enum": ["open", "pairing", "closed"] },
        "historyLimit": { "type": "number" }
      }
    },
    "uiHints": {
      "credentialsPath": { "sensitive": true },
      "projectId": { "label": "Google Cloud Project ID" }
    }
  }
}
```

### Dependencies (`package.json`)

```json
{
  "name": "@clawdbot/google-chat",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "googleapis": "^170.0.0",
    "@google-cloud/pubsub": "^5.2.1",
    "body-parser": "^2.2.2"
  },
  "devDependencies": {
    "clawdbot": "workspace:*"
  }
}
```

Note: `clawdbot` stays in `devDependencies` (not `dependencies`) to avoid workspace resolution issues during npm install.

## Migration Strategy

### Phase 1: Setup Plugin Structure
1. Create `extensions/google-chat/` directory
2. Add `package.json`, `index.ts`, `clawdbot.plugin.json`
3. Add `README.md` with setup instructions

### Phase 2: Port Business Logic
1. Copy implementation files from fork to `src/`:
   - `accounts.ts` (minimal changes - update imports)
   - `send.ts` (minimal changes - update imports)
   - `probe.ts` (minimal changes - update imports)
   - `monitor.ts` (minimal changes - update imports)
   - `types.ts` (no changes)
2. Update imports to use `clawdbot/plugin-sdk`
3. Remove hardcoded paths, make configurable

### Phase 3: Implement Adapters
1. Create `src/channel.ts` with `ChannelPlugin` implementation
2. Create `src/runtime.ts` for dependency injection
3. Convert webhook server to HTTP handler in `src/webhook.ts`
4. Map old `ProviderPlugin` sections to new adapters:
   - `config` → `ChannelConfigAdapter`
   - `security` → `ChannelSecurityAdapter`
   - `outbound` → `ChannelOutboundAdapter`
   - `status` → `ChannelStatusAdapter`
   - `gateway` → `ChannelGatewayAdapter`
   - `pairing` → `ChannelPairingAdapter`
   - `threading` → `ChannelThreadingAdapter`

### Phase 4: Add Onboarding
1. Create `src/onboarding.ts` with setup wizard
2. Interactive prompts for:
   - Google Cloud Project ID
   - Pub/Sub subscription name
   - Service account credentials path
   - Initial allowlist (email addresses)
   - DM/space policies
3. Follow pattern from `extensions/msteams/src/onboarding.ts`

### Phase 5: Testing
1. Test plugin loads correctly
2. Test webhook receiving (mock Google Chat events)
3. Test message sending (text & media)
4. Test pairing workflow
5. Test multi-account configuration
6. Test health probes

### Phase 6: Documentation & PR
1. Write comprehensive README with:
   - Google Cloud Console setup steps
   - Bot creation instructions
   - Pub/Sub configuration
   - Webhook URL setup (ngrok/Tailscale/Caddy examples)
   - Configuration examples
2. Add channel docs to `docs/channels/google-chat.md` (if needed for PR)
3. Add changelog entry
4. Submit pull request to `clawdbot/clawdbot`

## Technical Decisions

### 1. HTTP Handler vs Standalone Server
**Decision:** Use `api.registerHttpHandler()`
**Rationale:**
- Native to new plugin architecture
- Simpler lifecycle management
- No port conflicts
- Easier for users (one gateway process)

### 2. Configuration Location
**Decision:** `channels.googlechat` in main config
**Rationale:**
- Follows pattern of other channel plugins (msteams, etc.)
- Allows multi-account via `channels.googlechat.accounts.<id>`
- Standard config validation via JSON schema

### 3. Hardcoded Path Removal
**Decision:** Make Python script path configurable (or remove Python dependency)
**Analysis:** The fork uses Python for sending messages via Google Chat API. Need to investigate if this can be replaced with Node.js googleapis library.
**Action:** Review `send.ts` - if Python is truly needed, make it optional/configurable; otherwise migrate to pure Node.js.

### 4. Message Queue Implementation
**Decision:** Keep async per-space queue logic
**Rationale:**
- Solves real race condition issues
- Well-tested in production (RemixPartners fork)
- Unique to Google Chat's async webhook model
- Adds value to upstream

### 5. Plugin ID
**Decision:** Use `google-chat` (hyphenated)
**Rationale:**
- Follows upstream naming convention (`microsoft-teams` → `msteams`)
- Internal ID: `googlechat` (no hyphen, matches other providers)
- Display name: "Google Chat"

## Implementation Checklist

- [ ] Create plugin directory structure
- [ ] Add `package.json` with dependencies
- [ ] Add `clawdbot.plugin.json` manifest
- [ ] Port `types.ts` (no changes needed)
- [ ] Port `accounts.ts` (update imports)
- [ ] Port `send.ts` (update imports, remove Python dependency if possible)
- [ ] Port `probe.ts` (update imports)
- [ ] Port `monitor.ts` (update imports)
- [ ] Create `runtime.ts` for dependency injection
- [ ] Create `channel.ts` with ChannelPlugin implementation
- [ ] Create `webhook.ts` HTTP handler (from webhook-server.ts)
- [ ] Create `onboarding.ts` setup wizard
- [ ] Create `index.ts` plugin entry point
- [ ] Write `README.md`
- [ ] Test plugin registration
- [ ] Test webhook receiving
- [ ] Test message sending
- [ ] Test pairing workflow
- [ ] Test health probes
- [ ] Add changelog entry
- [ ] Submit upstream PR

## Success Criteria

1. **Plugin loads successfully** in Clawdbot v2026.1.23+
2. **Webhooks work** - receives and processes Google Chat events
3. **Sending works** - can send text and media messages
4. **Pairing works** - email-based allowlist and approval flow
5. **Onboarding works** - new users can set up via interactive wizard
6. **Generic** - no RemixPartners-specific code or hardcoded paths
7. **Documented** - clear README with setup instructions
8. **PR accepted** - upstream Clawdbot maintainers approve and merge

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Python dependency blocks pure Node.js implementation | Medium | Investigate if googleapis can replace Python script; make configurable fallback |
| HTTP handler integration differs from standalone Express | Medium | Study msteams/zalo examples; preserve message queue logic |
| Upstream maintainers request architecture changes | Low | Follow existing plugin patterns closely; be responsive to feedback |
| Multi-account configuration breaks | Medium | Test thoroughly; reference Discord/Telegram multi-account patterns |
| Webhook deployment complexity confuses users | Low | Provide clear docs with ngrok/Tailscale/Caddy examples |

## Post-Implementation

Once PR is merged:
1. RemixPartners can `npm install -g clawdbot@latest` and get GChat support automatically
2. No more fork maintenance needed
3. Benefit from all upstream improvements
4. Community contributions improve GChat support over time
5. RemixPartners can add local customizations via config (Python paths, etc.) without forking

## Notes

- This design assumes the Python dependency in `send.ts` can be eliminated or made optional
- If Python is required, we need to document it as a system prerequisite
- The message queue implementation is a key differentiator and should be highlighted in PR description
- RemixPartners' production experience with this integration adds credibility to the PR
