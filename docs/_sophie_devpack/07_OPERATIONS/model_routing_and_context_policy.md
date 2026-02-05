# Model Routing & Context Policy — Sophie / Moltbot
**Version:** v1.0 (Authoritative)
**Date:** 2026-02-05
**Purpose:** Define non-negotiable rules for model selection, context usage, and routing.

---

## 0) Why This Exists (Non‑Optional)

This document prevents:
- global context clamps leaking into capable models
- silent regressions when new providers are added
- Cursor/LLMs “simplifying” routing logic
- cost explosions or degraded reasoning

If behavior is not defined here, routing must **fail closed**.

---

## 1) Core Principles (Invariants)

1. **No global context window** — context is a per‑model property.
2. **Routing is explicit** — no implicit provider switching.
3. **Capability‑aware first** — choose the *smallest sufficient* model.
4. **Context safety margin is mandatory** — never consume 100%.
5. **Local ≠ Cloud** — local constraints never apply to cloud models.

---

## 2) Model Policy Table (Authoritative)

```yaml
model_policies:
  moonshot:kimi:
    class: cloud_reasoning
    context_window: 200000
    reserve_tokens: 8000
    max_effective_context: 192000
    chunking: semantic+score
    summarization: allowed
    streaming:
      internal: allowed
      external: forbidden
    fallback: forbidden

  ollama:llama3.1:32k:
    class: local_chat
    context_window: 32768
    reserve_tokens: 4000
    max_effective_context: 28768
    chunking: strict
    summarization: discouraged
    streaming:
      internal: allowed
      external: forbidden
    fallback: forbidden

  ollama:phi4-extractor:
    class: extraction
    context_window: 16384
    reserve_tokens: 2000
    max_effective_context: 14384
    chunking: strict
    summarization: forbidden
    streaming:
      internal: allowed
      external: forbidden
    fallback: forbidden
```

**Rules:**
- `max_effective_context` is enforced at runtime.
- Reserve tokens are non‑negotiable.

---

## 3) Routing Decision Flow

### 3.1 Deterministic Routing Steps

1. Classify task intent (router model)
2. Determine required capabilities:
   - reasoning depth
   - context size
   - side‑effects
3. Select **lowest‑cost model** that satisfies requirements
4. Verify model policy exists
5. Enforce context + reserve
6. Execute or refuse

If any step fails → **REFUSE with explanation**.

---

## 4) Context Budget Enforcement

### 4.1 Budget Formula

```
max_input_tokens = context_window - reserve_tokens
```

### 4.2 Over‑Budget Behavior

- Never auto‑truncate silently
- Offer:
  - summarization
  - scope narrowing
  - document selection

Produces `OVER_BUDGET` error code.

---

## 5) Streaming Policy

| Channel Type | Streaming Allowed |
|-------------|------------------|
| Local CLI/TUI | Yes |
| Local Voice | Partial (configurable) |
| Email | No |
| SMS/WhatsApp | No |
| Slack/Discord | No |

Streaming violations = test failure.

---

## 6) Fallback Rules

- **No silent fallback** — ever.
- If primary model fails:
  - Sophie must ask before switching
  - alternate model must be explicitly named

---

## 7) Logging Requirements

Each turn must log:
- selected model id
- policy hash
- effective context size
- reserve used

Never log:
- raw prompts
- content bodies

---

## 8) Change Control

Any change requires:
- version bump
- updated acceptance tests
- founder approval

---

## Owner Sign‑Off

This document defines how intelligence is allocated.
Violating it breaks the system.

