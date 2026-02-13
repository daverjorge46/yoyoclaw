# Phase 4: Platform Abstraction & Thread Delivery Completion

**Status:** Ready for implementation  
**Depends on:** Phases 1–3 (all implemented)  
**Date:** 2026-02-13

---

## Executive Summary

Phases 1–3 built the plumbing: the registry, spawn-time binding, inbound routing, and outbound delivery logic in `dispatch-from-config.ts`. **The system already works end-to-end for the core path**: a sub-agent spawned with `threadBinding` will have its streaming output and final replies routed to the bound Slack thread via `routeReply()`.

What Phase 4 addresses:

1. **The announcer flow** — when a sub-agent _completes_, `runSubagentAnnounceFlow()` sends a summary back to the _requester's_ session/channel. For thread-bound agents, this should go to the bound thread instead (or in addition to the requester).
2. **`ThreadOperations` interface** — formalize per-platform thread operations (create/detect/validate) so `sessions_spawn` mode="create" works beyond Slack.
3. **Missing `to` field** — the `ThreadBinding.to` field isn't populated during `bind` mode, causing thread delivery to fail when `dispatch-from-config.ts` calls `sendToThread()`.
4. **UI build error** — `src/logging/logger.ts` imports `createRequire` from `node:module`, which Vite can't externalize for browser builds.

---

## 1. Fix the `to` Field Gap (Critical)

### Problem

When spawning with `threadBinding.mode === "bind"`, the `to` field (Slack channel ID) is not set:

```typescript
// sessions-spawn-tool.ts, line ~182
resolvedThreadBinding = {
  channel: threadBindingParams.channel,
  accountId: threadBindingParams.accountId,
  threadId: threadBindingParams.threadId!,
  mode: deliveryMode,
  boundAt: Date.now(),
  createdBy: opts?.agentSessionKey,
  label: threadBindingParams.label,
  // ⚠️ `to` is MISSING
};
```

In `dispatch-from-config.ts`, `sendToThread()` checks:

```typescript
const threadTo = threadBinding.to;
if (!threadChannel || !threadTo) return false; // ← fails silently
```

### Fix

**File:** `src/agents/tools/sessions-spawn-tool.ts`

1. Add `to` to `ThreadBindingSpawnParams` (already exists as optional).
2. When `mode === "bind"`, require either:
   - Explicit `to` param, OR
   - Infer `to` from the spawner's `agentTo` (the channel the spawner is running in).
3. When `mode === "create"`, `to` is already captured from `threadBindingParams.to`.

```typescript
// In the "bind" branch:
resolvedThreadBinding = {
  channel: threadBindingParams.channel,
  accountId: threadBindingParams.accountId,
  to: threadBindingParams.to ?? opts?.agentTo, // ← ADD THIS
  threadId: threadBindingParams.threadId!,
  mode: deliveryMode,
  boundAt: Date.now(),
  createdBy: opts?.agentSessionKey,
  label: threadBindingParams.label,
};

// Validate `to` is present
if (!resolvedThreadBinding.to) {
  return jsonResult({
    status: "error",
    error:
      'threadBinding.to (channel/group ID) is required when mode is "bind" and cannot be inferred from context',
  });
}
```

**File:** `src/agents/tools/sessions-spawn-tool.ts` — also fix the "create" branch:

```typescript
// In the "create" branch, `to` is already the channel. After creating the thread:
resolvedThreadBinding = {
  channel: "slack",
  accountId: threadBindingParams.accountId,
  to: threadBindingParams.to, // ← Already correct, verify it's set
  threadId: result.messageId,
  threadRootId: result.messageId,
  mode: deliveryMode,
  // ...
};
```

### Validation

Add `to` to the Typebox schema description:

```typescript
to: Type.Optional(Type.String({
  description: "Channel/group ID where the thread lives (e.g., Slack channel ID). Required for bind mode if not inferrable from context.",
})),
```

---

## 2. Thread-Aware Announcer Flow

### Problem

When a sub-agent completes, `subagent-registry.ts` calls `runSubagentAnnounceFlow()`, which:

1. Waits for the agent run to finish
2. Reads the assistant's final reply
3. Sends a summary message to the **requester's session** via `callGateway({ method: "agent", ... })`

The `requesterOrigin` is set to the spawner's delivery context. For thread-bound agents with `threadBinding.mode === "thread-only"`, this means the completion announcement goes to the requester's channel — **not** the bound thread. For `thread+announcer` mode, you'd want it in both places.

### Current Flow (Simplified)

```
Sub-agent completes
  → subagent-registry.ts detects "end" event
  → runSubagentAnnounceFlow()
    → reads reply from child session
    → builds triggerMessage (summary prompt)
    → sends to requester's session (callGateway agent method)
    → requester agent generates human-friendly summary
    → requester's dispatcher routes reply to requester's channel
```

### Proposed Fix

The announce flow should check the child session's `threadBinding` and route accordingly:

**File:** `src/agents/subagent-announce.ts`

Add a new function `resolveAnnounceTargets()` that determines where completion announcements should go:

```typescript
import { getSessionThreadBinding } from "../config/thread-registry.js";
import { resolveStorePath } from "../config/sessions/paths.js";
import { resolveAgentIdFromSessionKey } from "../config/sessions.js";

/**
 * Determine announcement targets based on the child session's thread binding.
 *
 * Returns:
 *   - `thread`: post directly to the bound thread (bypass requester agent)
 *   - `requester`: send to requester agent as today (default)
 *   - `both`: post to thread AND send to requester
 */
type AnnounceTarget = "thread" | "requester" | "both";

async function resolveAnnounceTarget(params: { childSessionKey: string }): Promise<{
  target: AnnounceTarget;
  threadBinding?: ThreadBinding;
}> {
  try {
    const agentId = resolveAgentIdFromSessionKey(params.childSessionKey);
    const storePath = resolveStorePath(undefined, { agentId });
    const binding = await getSessionThreadBinding({
      storePath,
      sessionKey: params.childSessionKey,
    });
    if (!binding || !binding.to) {
      return { target: "requester" };
    }
    switch (binding.mode) {
      case "thread-only":
        return { target: "thread", threadBinding: binding };
      case "thread+announcer":
        return { target: "both", threadBinding: binding };
      case "announcer-only":
        return { target: "requester", threadBinding: binding };
      default:
        return { target: "requester" };
    }
  } catch {
    return { target: "requester" };
  }
}
```

Then modify `runSubagentAnnounceFlow()` to use it:

```typescript
export async function runSubagentAnnounceFlow(params: { ... }): Promise<boolean> {
  let didAnnounce = false;
  try {
    // ... existing: wait for completion, read reply, build stats ...

    const { target, threadBinding } = await resolveAnnounceTarget({
      childSessionKey: params.childSessionKey,
    });

    // --- Thread delivery (direct post, no re-prompting) ---
    if ((target === "thread" || target === "both") && threadBinding) {
      try {
        await postCompletionToThread({
          threadBinding,
          reply,
          statsLine,
          statusLabel,
          taskLabel,
          cfg: loadConfig(),
        });
        didAnnounce = true;
      } catch (err) {
        defaultRuntime.error?.(`Thread announce failed, falling back: ${String(err)}`);
        // Fall through to requester announce as fallback
      }
    }

    // --- Requester delivery (existing behavior) ---
    if (target === "requester" || target === "both" || !didAnnounce) {
      // existing maybeQueueSubagentAnnounce + callGateway logic
      // ...
    }

  } catch (err) { ... }
  // ...
}
```

### Direct Thread Posting

When the target is "thread", we post the completion summary **directly** to the Slack thread rather than routing it through the requester agent. This avoids the indirection of re-prompting the main agent to "summarize naturally."

```typescript
import { isRoutableChannel, routeReply } from "../auto-reply/reply/route-reply.js";

async function postCompletionToThread(params: {
  threadBinding: ThreadBinding;
  reply: string | undefined;
  statsLine: string;
  statusLabel: string;
  taskLabel: string;
  cfg: OpenClawConfig;
}): Promise<void> {
  const { threadBinding, reply, statsLine, statusLabel, taskLabel, cfg } = params;

  if (!threadBinding.to || !isRoutableChannel(threadBinding.channel)) {
    throw new Error(`Thread binding missing 'to' or channel not routable`);
  }

  // Format a concise completion message
  const lines: string[] = [];
  if (statusLabel.includes("completed")) {
    lines.push(`✅ Task "${taskLabel}" completed.`);
  } else if (statusLabel.includes("timed out")) {
    lines.push(`⏱️ Task "${taskLabel}" timed out.`);
  } else if (statusLabel.includes("failed")) {
    lines.push(`❌ Task "${taskLabel}" ${statusLabel}.`);
  } else {
    lines.push(`📋 Task "${taskLabel}" ${statusLabel}.`);
  }

  if (reply) {
    lines.push("");
    lines.push(reply);
  }

  const text = lines.join("\n");

  await routeReply({
    payload: { text },
    channel: threadBinding.channel,
    to: threadBinding.to,
    threadId: threadBinding.threadId,
    accountId: threadBinding.accountId,
    cfg,
  });
}
```

### Design Choice: Direct Post vs Re-prompt

Two options for thread completion announcements:

| Approach                        | Pros                                     | Cons                                       |
| ------------------------------- | ---------------------------------------- | ------------------------------------------ |
| **Direct post** (recommended)   | Faster, no extra LLM call, no token cost | Less "natural" — structured format         |
| **Re-prompt via bound session** | Agent can summarize in its own voice     | Extra LLM call, adds latency, costs tokens |

**Recommendation:** Use **direct post** for thread-bound agents. The sub-agent's final reply IS the output — no need for the requester agent to re-summarize it. The re-prompting pattern exists because the announcer flow was designed for out-of-band background tasks where the user needs a human-friendly notification. In a thread, the user is already watching the thread.

### Backward Compatibility

- No `threadBinding` → `resolveAnnounceTarget()` returns `"requester"` → existing flow unchanged.
- `mode: "announcer-only"` → existing flow unchanged.
- `mode: "thread-only"` → posts to thread, skips requester. If thread post fails, falls back to requester.
- `mode: "thread+announcer"` → posts to both.

---

## 3. `ThreadOperations` Interface

### Purpose

Formalize per-platform thread operations so that:

1. `sessions_spawn` mode="create" works for Discord, Telegram (not just Slack)
2. Thread validation can be used for delivery fallback
3. New platforms can add thread support by implementing one interface

### Interface Definition

**New file:** `src/channels/plugins/types.thread-ops.ts`

```typescript
import type { OpenClawConfig } from "../../config/config.js";

/**
 * Platform-specific thread operations.
 *
 * Implemented per channel plugin. Not all channels support all operations.
 * Methods are optional — callers must check for availability.
 */
export type ChannelThreadOperations = {
  /**
   * Create a new thread by posting an initial message.
   * Returns the thread identifier needed for subsequent replies.
   */
  createThread?: (params: {
    /** Channel/group/DM to create thread in */
    to: string;
    /** Platform account ID */
    accountId?: string;
    /** First message (becomes thread root) */
    initialMessage: string;
    cfg: OpenClawConfig;
  }) => Promise<{
    /** Thread identifier for reply routing (e.g., Slack thread_ts) */
    threadId: string;
    /** Root message ID (may equal threadId) */
    threadRootId?: string;
    /** Message ID of the initial post */
    messageId?: string;
  }>;

  /**
   * Validate that a thread exists and is accessible.
   * Used for delivery fallback when a thread may have been deleted/archived.
   */
  validateThread?: (params: {
    /** Channel/group where thread lives */
    to: string;
    /** Platform account ID */
    accountId?: string;
    /** Thread identifier */
    threadId: string;
    cfg: OpenClawConfig;
  }) => Promise<{
    exists: boolean;
    archived?: boolean;
  }>;

  /**
   * Normalize a thread ID to a canonical string form.
   * Most platforms use strings already; this handles edge cases
   * (e.g., Telegram's numeric IDs).
   */
  normalizeThreadId?: (threadId: string | number) => string;
};
```

### Registration on ChannelPlugin

**File:** `src/channels/plugins/types.plugin.ts`

Add to the `ChannelPlugin` type:

```typescript
import type { ChannelThreadOperations } from "./types.thread-ops.js";

export type ChannelPlugin<...> = {
  // ... existing fields ...

  /** Platform-specific thread operations (create, validate, normalize). */
  threadOps?: ChannelThreadOperations;
};
```

### Slack Implementation

**New file:** `src/slack/thread-ops.ts`

```typescript
import type { ChannelThreadOperations } from "../channels/plugins/types.thread-ops.js";
import { sendMessageSlack } from "./send.js";

export const slackThreadOps: ChannelThreadOperations = {
  async createThread(params) {
    const result = await sendMessageSlack(params.to, params.initialMessage, {
      accountId: params.accountId,
    });
    return {
      threadId: result.messageId,
      threadRootId: result.messageId,
      messageId: result.messageId,
    };
  },

  async validateThread(params) {
    try {
      const { createSlackWebClient } = await import("./client.js");
      const { resolveSlackBotToken } = await import("./token.js");
      const { resolveSlackAccount } = await import("./accounts.js");
      const account = resolveSlackAccount({
        cfg: params.cfg,
        accountId: params.accountId,
      });
      const token = resolveSlackBotToken(account.botToken);
      if (!token) return { exists: false };
      const client = createSlackWebClient(token);

      const result = await client.conversations.history({
        channel: params.to,
        latest: params.threadId,
        limit: 1,
        inclusive: true,
      });
      return {
        exists: Boolean(result.ok && result.messages?.length),
        archived: false,
      };
    } catch (err: any) {
      if (err?.data?.error === "channel_not_found") {
        return { exists: false, archived: true };
      }
      // Don't throw — validation is best-effort
      return { exists: true }; // Assume exists on error
    }
  },

  normalizeThreadId(threadId) {
    return String(threadId);
  },
};
```

### Register in Slack Plugin

Find the Slack plugin registration file and add:

```typescript
import { slackThreadOps } from "../../slack/thread-ops.js";

// In the plugin definition:
threadOps: slackThreadOps,
```

### Refactor `sessions_spawn` to Use `ThreadOperations`

Currently `sessions-spawn-tool.ts` hardcodes Slack thread creation:

```typescript
// Current (hardcoded):
if (threadBindingParams.channel === "slack") {
  const { sendMessageSlack } = await import("../../slack/send.js");
  const result = await sendMessageSlack(threadBindingParams.to, initialMessage, { ... });
  // ...
}
```

Refactor to use the plugin interface:

```typescript
// New (generic):
const { loadChannelPlugin } = await import("../../channels/plugins/load.js");
const plugin = loadChannelPlugin(threadBindingParams.channel);
if (!plugin?.threadOps?.createThread) {
  return jsonResult({
    status: "error",
    error: `Thread creation for channel "${threadBindingParams.channel}" is not supported.`,
  });
}

try {
  const result = await plugin.threadOps.createThread({
    to: threadBindingParams.to!,
    accountId: threadBindingParams.accountId,
    initialMessage,
    cfg,
  });
  resolvedThreadBinding = {
    channel: threadBindingParams.channel,
    accountId: threadBindingParams.accountId,
    to: threadBindingParams.to,
    threadId: result.threadId,
    threadRootId: result.threadRootId,
    mode: deliveryMode,
    boundAt: Date.now(),
    createdBy: opts?.agentSessionKey,
    label: threadBindingParams.label,
  };
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  return jsonResult({
    status: "error",
    error: `Failed to create thread: ${msg}`,
  });
}
```

### Discord & Telegram (Stub)

For Phase 4, add stub implementations that throw "not yet supported" for `createThread` but implement `normalizeThreadId`. Full Discord/Telegram thread creation can be Phase 5 work.

---

## 4. UI Build Error Fix

### Problem

```
src/logging/logger.ts (2:9): "createRequire" is not exported by "__vite-browser-external"
```

Vite's browser build can't handle `createRequire` from `node:module`. The UI build (`pnpm ui:build`) fails.

### Root Cause

`src/logging/logger.ts` line 2:

```typescript
import { createRequire } from "node:module";
```

This is a Node.js-only API. The UI bundle (Vite/Rollup for browser) externalizes `node:*` modules but `createRequire` isn't a default export pattern that Vite's externalization handles cleanly.

### Fix Options

**Option A (Recommended): Conditional dynamic import**

Wrap the `createRequire` usage in a runtime check so Vite's static analysis doesn't choke:

```typescript
// Instead of top-level import:
// import { createRequire } from "node:module";

// Use dynamic import or globalThis check:
let createRequire: ((url: string) => NodeRequire) | undefined;
try {
  // Dynamic import — Vite will skip this in browser builds
  const nodeModule = await import("node:module");
  createRequire = nodeModule.createRequire;
} catch {
  // Browser environment — createRequire not available
}
```

However, since `logger.ts` likely uses `createRequire` at module scope for a CJS dependency, the cleanest fix is:

**Option B: Vite externalization config**

In the UI build's Vite config, ensure `node:module` is properly externalized:

```typescript
// vite.config.ts or scripts/ui.js
build: {
  rollupOptions: {
    external: [/^node:/, 'tslog'],  // Externalize all node: and tslog
  }
}
```

**Option C: Guard with `typeof` check**

```typescript
// logger.ts
import fs from "node:fs";
import path from "node:path";
// Move createRequire to a lazy getter
const getRequire = () => {
  if (typeof globalThis.process !== "undefined") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createRequire } = require("node:module");
    return createRequire(import.meta.url);
  }
  return undefined;
};
```

**Recommendation:** Investigate what `createRequire` is used for in `logger.ts`. If it's just loading `tslog` or a CJS dep, Option B (Vite config) is cleanest. If the UI should never import this module at all, add it to the external list or exclude the logger from the UI bundle graph.

### Investigation Step

Check `scripts/ui.js` for the Vite config to determine the right fix:

```bash
grep -n "external\|rollupOptions\|node:" scripts/ui.js
```

---

## 5. Implementation Order

### Step 1: Fix `to` field (30 min)

- Edit `sessions-spawn-tool.ts` to populate `to` in bind mode
- Add validation error if `to` can't be resolved
- Test: spawn with bind mode, verify `threadBinding.to` is set

### Step 2: Thread-aware announcer (2-3 hours)

- Add `resolveAnnounceTarget()` to `subagent-announce.ts`
- Add `postCompletionToThread()` using `routeReply()`
- Modify `runSubagentAnnounceFlow()` to branch on target
- Test: spawn thread-bound sub-agent, verify completion shows in thread
- Test: verify `announcer-only` mode still sends to requester
- Test: verify no binding = existing behavior

### Step 3: `ThreadOperations` interface (1-2 hours)

- Create `src/channels/plugins/types.thread-ops.ts`
- Add `threadOps?` to `ChannelPlugin`
- Implement `src/slack/thread-ops.ts`
- Register in Slack plugin
- Refactor `sessions-spawn-tool.ts` to use `plugin.threadOps.createThread()`
- Test: spawn with mode="create" still works via plugin abstraction

### Step 4: UI build fix (30 min)

- Investigate `scripts/ui.js` Vite config
- Apply appropriate fix for `createRequire` externalization
- Verify `pnpm ui:build` passes

### Step 5: Integration testing (1-2 hours)

- End-to-end test: spawn → thread creation → agent runs → completion posted to thread
- Test all three delivery modes
- Test fallback when thread is unavailable
- Test backward compat (no threadBinding = unchanged behavior)

---

## 6. File Change Summary

| File                                                           | Change                                                                                        | Priority |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------- |
| `src/agents/tools/sessions-spawn-tool.ts`                      | Add `to` field in bind mode; refactor create to use `threadOps`                               | P0       |
| `src/agents/subagent-announce.ts`                              | Add `resolveAnnounceTarget()`, `postCompletionToThread()`; modify `runSubagentAnnounceFlow()` | P0       |
| `src/channels/plugins/types.thread-ops.ts`                     | **NEW** — `ChannelThreadOperations` interface                                                 | P1       |
| `src/channels/plugins/types.plugin.ts`                         | Add `threadOps?` field                                                                        | P1       |
| `src/slack/thread-ops.ts`                                      | **NEW** — Slack implementation                                                                | P1       |
| `src/channels/plugins/slack.actions.ts` or plugin registration | Register `threadOps`                                                                          | P1       |
| `src/logging/logger.ts` or Vite config                         | Fix `createRequire` externalization                                                           | P2       |

**Total estimated effort:** 1 day

---

## 7. Test Plan

### Unit Tests

| Test                                                             | File                          |
| ---------------------------------------------------------------- | ----------------------------- |
| `resolveAnnounceTarget` returns "requester" when no binding      | `subagent-announce.test.ts`   |
| `resolveAnnounceTarget` returns "thread" for thread-only mode    | `subagent-announce.test.ts`   |
| `resolveAnnounceTarget` returns "both" for thread+announcer mode | `subagent-announce.test.ts`   |
| `postCompletionToThread` calls routeReply with correct params    | `subagent-announce.test.ts`   |
| spawn bind mode sets `to` from param                             | `sessions-spawn-tool.test.ts` |
| spawn bind mode infers `to` from agentTo                         | `sessions-spawn-tool.test.ts` |
| spawn bind mode errors without `to`                              | `sessions-spawn-tool.test.ts` |
| `slackThreadOps.createThread` returns threadId                   | `slack/thread-ops.test.ts`    |

### Integration Tests

| Scenario                                                 | Expected                                   |
| -------------------------------------------------------- | ------------------------------------------ |
| Spawn with `threadBinding` bind mode → agent completes   | Completion posted in bound thread          |
| Spawn with `threadBinding` create mode → agent completes | Thread created, completion posted there    |
| Spawn without `threadBinding` → agent completes          | Existing announcer flow (unchanged)        |
| `thread+announcer` mode → agent completes                | Completion in thread AND requester channel |
| `announcer-only` mode → agent completes                  | Only requester gets announcement           |
| Thread deleted before completion                         | Fallback to requester announce             |

---

## 8. Risks & Mitigations

| Risk                                              | Impact                                  | Mitigation                                                                                 |
| ------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------ |
| `routeReply` fails silently for thread post       | Completion lost                         | Fallback to requester announce on any thread delivery error                                |
| `to` field migration for existing bindings        | Existing bound sessions missing `to`    | `sendToThread()` already returns `false` when `to` is missing → falls through to announcer |
| Race between agent completion and thread creation | Agent finishes before thread is created | Thread is created synchronously during spawn, before agent starts                          |
| UI build fix breaks Node.js logger                | Logging broken                          | Option B (Vite config) doesn't touch Node.js code at all                                   |
