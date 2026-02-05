# Interfaces & Contracts Spec — Sophie / Moltbot
**Version:** v1.0 (Authoritative)
**Date:** 2026-02-04
**Audience:** Core Moltbot developers, plugin authors, security reviewers

> **Purpose:** Prevent integration hell by defining unbreakable interfaces for providers, prompts, tools, logging, and sessions.

---

## 0) Contract Philosophy (Non-Negotiable)
1. **Determinism beats cleverness.** If behavior cannot be made testable, it is not a contract.
2. **Fail-closed by default.** Missing capability → block + explain.
3. **Side effects are privileged.** They require policy + (usually) approval.
4. **No silent downgrade.** No silent fallback between providers/models.

---

## 1) Provider Contract (Kimi/Moonshot)

### 1.1 Provider Identity
- **providerId:** `moonshot`
- **kind:** `openai_compatible`
- **baseUrl:** `https://api.moonshot.cn/v1`

### 1.2 Config Representation
Provider is represented under `models.providers.moonshot`.

**Config (JSON5) — canonical shape:**
```json5
{
  models: {
    providers: {
      moonshot: {
        enabled: true,
        baseUrl: "https://api.moonshot.cn/v1",
        startupValidation: "warn", // strict|warn|off
        models: {
          "kimi-k1-128k": {
            contextWindow: 131072,
            maxOutputTokens: 4096,
            supportsTools: true,
            supportsStreaming: true
          },
          "kimi-k1-32k": {
            contextWindow: 32768,
            maxOutputTokens: 4096,
            supportsTools: true,
            supportsStreaming: true
          }
        },
        defaults: {
          model: "kimi-k1-128k"
        }
      }
    }
  }
}
```

**Rules:**
- **No secrets in config**. API keys must not be present in config.
- Unknown provider keys are rejected by Zod (fail-closed).

### 1.3 Auth Resolution
- **Env var only:** `MOONSHOT_API_KEY`
- **Resolution order:**
  1) `process.env.MOONSHOT_API_KEY`
  2) Fail with explicit error: `Missing MOONSHOT_API_KEY`

**Contract:**
- Auth resolver must not log the key.
- Auth resolver must not attempt alternate providers.

### 1.4 Model Selection Representation
A model reference is represented as:
- `provider:model` (string) OR structured `{ provider, model }`

**Canonical string form:**
- `moonshot:kimi-k1-128k`

**Contract:**
- `resolveConfiguredModelRef()` must resolve this into:
  - providerId
  - modelId
  - declared capabilities (context window, tool support)

### 1.5 Context Window Discovery & Enforcement

**Rule:** There is **no global context window**.

Each model has:
- `contextWindow` (int tokens)
- `maxOutputTokens` (int tokens)

**Enforcement pipeline (must be deterministic):**
1) Estimate input tokens
2) Reserve output tokens
3) Apply provider/model limits
4) If over budget → raise `OverBudgetError` **before network**

**Local providers only:**
- `MINIMUM_CONTEXT_TOKENS` clamp applies to local providers.
- Clamp must not apply to Moonshot.

**Contract test:**
- OverBudget → no HTTP request performed.

### 1.6 Startup Validation Contract
- `startupValidation` modes: `strict | warn | off`
- Default: `warn`

**Behavior:**
- `warn`: Gateway starts; logs warning if provider unreachable.
- `strict`: Startup fails if default model cannot be validated.
- `off`: Skips provider validation.

**Contract:**
- Startup validation must not leak secrets.
- Startup validation must emit a single actionable error line.

---

## 2) Prompt Contract

### 2.1 Prompt Stack Ordering (Authoritative)
All model calls must use this ordering:
1) **SOPHIE_BASE_PROMPT** (mandatory, hidden)
2) Agent prompt (optional)
3) Channel policy prompt (derived)
4) User messages

**Contract:**
- Order must be invariant across providers.
- Stack must be inspectable via a **manifest** (hashes/versions only).

### 2.2 Versioning
- Base prompt must have:
  - `versionId` (e.g., `SOPHIE_BASE_PROMPT_V1`)
  - `sha256` hash of file contents

### 2.3 Storage Location
- Base prompt stored in repo, not embedded:
  - `src/prompts/sophie_base_prompt_v1.txt`
- Loader exports:
  - `getBasePrompt(): { versionId, sha256, content }`

### 2.4 Channel Policy Prompts
Channel policy prompts are derived by deterministic channel classifier.

**Examples:**
- `cli_local`: streaming allowed
- `external_email`: streaming disabled; require approval to send
- `external_message`: streaming disabled; final-only

**Contract:**
- channel policy prompt id must be logged in manifest.

### 2.5 Disclosure Rule
- System prompts are never revealed to users.
- If asked, Sophie refuses and explains at a high level.

---

## 3) Tool Contract

### 3.1 Tool Schema Rules
- Tools must define parameters with a stable schema (TypeBox).
- Avoid schema unions where possible; prefer string enums.
- Avoid reserved keyword `format` for property names.

### 3.2 Tool Allowlist
Tools are governed by `tools.policy`.

**Policy primitives:**
- allowlist by tool name
- allowlist by channel
- allowlist by risk class

**Contract:**
- If a tool is not allowlisted, execution is denied (fail-closed).

### 3.3 Approval Policy
Tools are classified as:
- `read_only`
- `draft_only`
- `side_effect`

**Rules:**
- `side_effect` tools require:
  - gate pass
  - approval unless explicit policy exception

**Phase 1:**
- All outbound send/write tools require approval.

**Phase 2 (Honeypot exception):**
- Honeypot send allowed only if:
  - allowlisted template
  - allowlisted recipient type
  - no links
  - no attachments
  - rate limits satisfied

### 3.4 Tool Failure Behavior
- Tool errors must be surfaced as:
  - a single error code
  - an actionable message
  - no stack traces to external channels

**Contract:**
- No partial tool traces to external channels.

---

## 4) Logging Contract

### 4.1 What is Logged (Allowed)
Per request:
- request_id
- timestamp
- providerId + modelId
- token estimates
- latency
- prompt manifest:
  - base prompt version + sha256
  - agent prompt present hash
  - channel policy id
  - user message sha256
- gate outcome:
  - channel, risk, policy id, decision

### 4.2 What is NEVER Logged
- API keys / tokens / credentials
- Raw system prompts
- Raw user message bodies (default)
- Full attachments

### 4.3 Hashing Rules
- SHA256 for:
  - base prompt
  - message bodies
  - rendered outbound drafts

**Contract:**
- Hashing must be stable across platforms.

### 4.4 Retention & Rotation
- Logs stored under:
  - `~/.clawdbot/logs/<provider>/`
  - `~/.clawdbot/logs/gateway/`
- Rotation:
  - size cap per file
  - max N files

### 4.5 Redaction
If content is rendered for debugging:
- redact known secret patterns
- redact email addresses/phones if configured

---

## 5) Session Contract

### 5.1 Session Key Format
Canonical:
`agent:{agentId}:{channel}:{accountId}:dm:{peerId}`

Examples:
- `agent:main:telegram:123456789:dm:987654321`
- `agent:main:whatsapp:+15551234567:dm:+15559876543`

### 5.2 Session Storage Location
Sessions are stored at:
`~/.clawdbot/agents/{agentId}/sessions/{sessionKey}.jsonl`

**Contract:**
- Session path must not change without migration.

### 5.3 Max History + Compaction
- Compaction invoked on context overflow.
- Compaction rules:
  - preserve system/base prompt invariants
  - preserve most recent N turns
  - generate summary as a derived artifact with evidence pointers

**Limits:**
- `maxTurns` configurable per agent
- `maxBytes` configurable per session file

### 5.4 Redaction in Sessions
- Sensitive tokens must be redacted if detected.
- External channel transcripts must not store secrets.

### 5.5 Streaming Rules
- External sessions: store finalized assistant messages only.
- Local sessions: may store partial chunks if explicitly enabled.

---

## 6) Contract Test Matrix (Minimum)
1) Provider contract tests
- missing key fails
- warn startup continues
- per-model context enforced

2) Prompt contract tests
- manifest proves ordering
- user cannot extract base prompt

3) Tool contract tests
- unallowlisted tool denied
- side effect requires approval
- honeypot exception respects templates + rate limits

4) Logging contract tests
- no raw prompts
- hashes present
- rotation caps obeyed

5) Session contract tests
- session key format stable
- storage path correct
- compaction triggers and preserves invariants

---

## 7) Change Control
Any change to a contract requires:
- version bump
- changelog entry
- updated fixtures + acceptance tests
- explicit approval by owner (Andrew)

