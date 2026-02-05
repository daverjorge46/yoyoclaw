# Permissions Matrix — Sophie / Moltbot
**Version:** v1.0 (Authoritative)
**Owner:** Andrew (Solo Founder)
**Status:** Enforced via contracts + tests

---

## Purpose (Non‑Negotiable)
This document is the **single source of truth** for what Sophie is allowed to do.

If a behavior is not explicitly allowed here, it is **denied by default**.

This matrix exists to prevent:
- silent permission creep
- accidental autonomy
- security regressions
- legal / reputational exposure

---

## Autonomy Levels (Global)

| Level | Name | Description |
|---|---|---|
| L0 | Observe | Read-only. No side effects. |
| L1 | Draft | Can prepare outputs but not execute. |
| L2 | Propose | Can generate a structured action proposal. |
| L3 | Execute (Approved) | Can execute only after explicit approval. |
| L4 | Autonomous | Executes without approval (❌ disallowed in v1). |

**Rule:**
- Maximum allowed autonomy in v1 = **L3**
- **L4 is explicitly forbidden** for all tools and channels

---

## Identities

| Identity | Description |
|---|---|
| Founder | Andrew (human operator) |
| Sophie-Core | Internal reasoning agent |
| Honeypot‑Tenant | Undercover rent‑inquiry Gmail |
| Honeypot‑Investor | Undercover OM / broker‑inquiry Gmail |
| Branded‑Internal | Sophie@SpecialtyOne (internal only) |

---

## Channels

| Channel | Type | Notes |
|---|---|---|
| Local CLI / TUI | Internal | Safe for streaming |
| Local Voice | Internal | Read‑only or draft |
| Email (Branded) | External | Internal‑only recipients |
| Email (Honeypot) | External | Undercover only |
| WhatsApp / SMS | External | Draft‑only |
| Slack / Discord | External | Draft‑only |

---

## Tool Categories

| Category | Examples |
|---|---|
| Read Tools | search, fetch, summarize |
| Draft Tools | compose email, outline OM |
| Write Tools | database update, file write |
| Execute Tools | send email, API side‑effects |

---

## Core Permission Matrix

### Data Access

| Resource | Access | Autonomy | Notes |
|---|---|---|---|
| Supabase | Read | L0 | Default allowed |
| Supabase | Write | L3 | Proposal + approval only |
| Local Files (Scoped) | Read | L0 | Approved directory only |
| Local Files | Write | L3 | Proposal + approval |
| Email Inbox (Honeypot) | Read | L0 | Allowed |
| Email Inbox (Founder) | Any | ❌ | Forbidden |

---

### Communications

| Action | Channel | Autonomy | Notes |
|---|---|---|---|
| Draft email | Any | L1 | Default |
| Send email | Honeypot | L3 | Explicit approval required |
| Send email | Branded | L3 | Internal recipients only |
| Send SMS / WhatsApp | Any | ❌ | Draft‑only |
| Phone call | Any | ❌ | Never automated |

---

### Research & Monitoring

| Action | Autonomy | Notes |
|---|---|---|
| Web research | L0 | Read‑only |
| Broker site monitoring | L0 | Passive only |
| Deep research (Parallel) | L3 | Budget + approval gate |

---

### System Actions

| Action | Autonomy | Notes |
|---|---|---|
| Install plugin | ❌ | Manual review only |
| Execute shell | ❌ | Forbidden |
| Modify config | ❌ | Forbidden |
| Rotate keys | ❌ | Human only |

---

## Explicit Prohibitions (Hard Deny)

- No autonomous outbound communications
- No shell execution
- No credential access or export
- No branded messaging from honeypots
- No client pricing guidance
- No escrow, legal, or contract execution

---

## Approval Workflow (L3)

1. Sophie generates **Action Proposal**
2. Proposal includes:
   - action type
   - identity
   - target
   - exact payload
   - risk notes
3. Founder approves explicitly (`APPROVE <id>`)
4. Action executed
5. Full audit log written

---

## Enforcement

- Enforced in:
  - Tool registry
  - Prompt base rules
  - Gateway middleware
  - Acceptance tests

Any deviation = **bug**.

---

## Change Control

- Changes require:
  - version bump
  - updated tests
  - founder sign‑off

---

## Founder Sign‑Off

This matrix defines Sophie’s authority surface.
Nothing outside it is allowed.

