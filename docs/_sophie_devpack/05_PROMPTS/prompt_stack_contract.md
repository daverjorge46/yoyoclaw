# Prompt Stack Contract — Sophie / Moltbot
**Version:** v1.0 (Authoritative)
**Date:** 2026-02-05
**Purpose:** Define the *mechanical*, testable prompt layering system. Prevent prompt drift, layer reordering, and accidental disclosure.

---

## 0) Non-Negotiables (Invariants)

1. **Base prompt is mandatory** and cannot be removed.
2. **Layer order is deterministic** and cannot vary by provider.
3. **Lower layers are non-introspectable** (user cannot view base/system prompts).
4. **No raw prompt logging** — only hashes and manifests.
5. **Channel policy is authoritative** for streaming + formatting.
6. **Tool policy is authoritative** for approvals and refusals.

If any invariant is violated → hard failure + test failure.

---

## 1) Definitions

### 1.1 Prompt Layers

| Layer | ID | Type | Required | Visibility |
|---|---|---:|---:|---|
| L1 | base_system | system | ✅ | hidden |
| L2 | agent_role | system | ✅ | hidden |
| L3 | channel_policy | system | ✅ | hidden |
| L4 | tool_policy | system | ✅ | hidden |
| L5 | task_instruction | system | optional | hidden |
| L6 | user_input | user | ✅ | visible |

**Rule:** Only L6 is user-visible.

### 1.2 Prompts as Files

All prompt layers except `user_input` are sourced from **versioned files** under:

```
/prompts/
  base/
  agents/
  channels/
  tools/
  tasks/
```

---

## 2) Layering Order (Deterministic)

### 2.1 Canonical Stack

```
PromptStack = [
  BaseSystemPrompt,       // L1
  AgentRolePrompt,        // L2
  ChannelPolicyPrompt,    // L3
  ToolPolicyPrompt,       // L4
  TaskInstructionPrompt?, // L5 optional
  UserInput               // L6
]
```

### 2.2 Prohibited Variations

- No provider-specific reordering
- No channel-specific removal of base/system layers
- No user-supplied content may be inserted above L6

---

## 3) Prompt Manifest (Hash-Only)

Every turn must produce a manifest object that is recorded with the session (and optionally logs).

### 3.1 Manifest JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "PromptManifest",
  "type": "object",
  "required": ["version", "stack"],
  "properties": {
    "version": {"type": "string"},
    "stack": {
      "type": "array",
      "minItems": 5,
      "items": {
        "type": "object",
        "required": ["layer", "id", "file", "sha256"],
        "properties": {
          "layer": {"type": "string", "enum": ["L1","L2","L3","L4","L5","L6"]},
          "id": {"type": "string"},
          "file": {"type": "string"},
          "sha256": {"type": "string", "pattern": "^[a-f0-9]{64}$"},
          "bytes": {"type": "integer", "minimum": 0},
          "tokens_est": {"type": "integer", "minimum": 0},
          "source": {"type": "string", "enum": ["file","inline","user"]}
        }
      }
    },
    "stack_sha256": {"type": "string", "pattern": "^[a-f0-9]{64}$"},
    "notes": {"type": "array", "items": {"type": "string"}}
  }
}
```

### 3.2 Stack Hash Rule

`stack_sha256` = SHA-256 hash of the concatenated `(layer,id,sha256)` tuples in order.

This detects:
- ordering changes
- missing layers
- swapped prompts

---

## 4) Runtime Assembly Contract

### 4.1 Assembly Inputs

- agent id
- channel id
- tool policy id
- optional task id
- user message content

### 4.2 Assembly Output

- `messages[]` sent to model provider (provider-specific format)
- `PromptManifest`

### 4.3 Provider Adaptation

- Providers may require different message formats (chat vs completions)
- **The stack order must remain unchanged**

---

## 5) Introspection & Disclosure Rules

### 5.1 Mandatory Refusal

If user asks for system prompts, hidden policies, or manifests:
- refuse with `REFUSE_SYSTEM_PROMPT`
- do not reveal content

### 5.2 Allowed Disclosure

- The system may disclose:
  - that a base prompt exists
  - that policies exist
  - the **versions** of policies

It may not disclose:
- exact prompt text
- hashes that enable reconstruction (optional: hash disclosure disabled)

---

## 6) Logging Rules

### 6.1 Must Log

- `stack_sha256`
- per-layer sha256
- total bytes/tokens estimate

### 6.2 Must Never Log

- raw prompt text
- user message bodies (unless explicitly enabled for local-only debug)

---

## 7) Acceptance Tests (Binding)

This contract is enforced by:
- `US-PROMPT-001` deterministic stack order
- `US-PROMPT-002` no base prompt disclosure
- `US-LOG-001` no raw prompt in logs

Any failure blocks merge.

---

## 8) Change Control

Any modification requires:
- version bump
- fixture updates
- founder approval

---

## Owner Sign-Off

Prompt stack is governance.
Breaking it breaks safety.

