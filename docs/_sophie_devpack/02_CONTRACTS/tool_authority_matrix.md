# Tool Authority & Autonomy Matrix — Sophie / Moltbot
**Version:** v1.0 (Authoritative)
**Date:** 2026-02-05
**Purpose:** Define *who decides*, *what is allowed*, and *how authority is exercised* for every tool invocation.

---

## 0) Why This Exists (Critical)

Permissions alone are insufficient.
This document answers the harder question:

> **Who is allowed to decide that an action happens?**

Without this matrix:
- LLMs will implicitly escalate authority
- Developers will “just let it run”
- Approval logic will drift across code paths

This matrix is the **single source of truth** for tool authority.

---

## 1) Authority Sources (Explicit)

Every tool invocation must be authorized by **exactly one** of the following sources:

| Authority ID | Name | Description |
|---|---|---|
| A0 | Deterministic Gate | Hard-coded policy check (no discretion) |
| A1 | LLM Advisor | Non-binding recommendation only |
| A2 | Human Approval | Explicit founder approval |

**Rule:**
- No tool may rely solely on A1
- Side-effects require A2

---

## 2) Tool Classes

| Class | Description | Side Effects |
|---|---|---|
| READ | Fetch, search, summarize | None |
| DRAFT | Compose content | None |
| WRITE | Modify state (DB, files) | Yes |
| EXECUTE | External irreversible action | Yes (High Risk) |

---

## 3) Global Authority Rules (Non-Negotiable)

1. READ tools may run with A0
2. DRAFT tools may run with A0
3. WRITE tools require **A0 + A2**
4. EXECUTE tools require **A0 + A2**
5. No EXECUTE tool may be auto-approved
6. No tool may escalate its own authority

---

## 4) Canonical Tool Authority Matrix

| Tool | Class | Authority | Approval Required | Notes |
|---|---|---|---|---|
| web.search | READ | A0 | No | Allowlisted domains only |
| web.fetch | READ | A0 | No | Content marked TAINTED |
| email.compose | DRAFT | A0 | No | No send |
| email.send | EXECUTE | A0 + A2 | Yes | Identity-bound |
| db.read | READ | A0 | No | Supabase read-only |
| db.write | WRITE | A0 + A2 | Yes | Diff required |
| file.read | READ | A0 | No | Scoped directory |
| file.write | WRITE | A0 + A2 | Yes | Scoped directory |
| calendar.create | WRITE | A0 + A2 | Yes | Disabled in v1 |
| shell.exec | EXECUTE | ❌ | ❌ | Forbidden |

---

## 5) Identity Constraints

Authority is further constrained by **identity**.

| Identity | Max Tool Class Allowed |
|---|---|
| Sophie-Core | WRITE (with approval) |
| Honeypot-Tenant | EXECUTE (email.send only, approved) |
| Honeypot-Investor | EXECUTE (email.send only, approved) |
| Branded-Internal | WRITE (internal-only, approved) |

---

## 6) Channel Constraints

| Channel | Max Tool Class |
|---|---|
| Local CLI/TUI | WRITE (with approval) |
| Local Voice | DRAFT |
| Email (any) | EXECUTE (approved only) |
| SMS / WhatsApp | DRAFT |
| Slack / Discord | DRAFT |

Channel constraints override identity allowances.

---

## 7) Approval Workflow Contract (A2)

### 7.1 Proposal Requirements

Every approval request must include:
- proposal_id
- tool name
- exact payload (serialized)
- identity used
- risk summary

### 7.2 Approval Commands

| Command | Effect |
|---|---|
| APPROVE <id> | Execute exactly once |
| DENY <id> | Mark denied, never execute |

### 7.3 Replay Protection

- proposal_id is single-use
- replays are rejected

---

## 8) LLM Advisor Role (A1)

The LLM may:
- suggest whether an action *should* occur
- flag risk
- suggest alternatives

The LLM may not:
- approve itself
- override denial
- bypass gates

---

## 9) Failure & Refusal Behavior

If authority is insufficient:
- return `TOOL_AUTHORITY_DENIED`
- explain missing approval
- offer to draft proposal

---

## 10) Enforcement Points

This matrix is enforced by:
- Tool registry
- Gateway middleware
- Prompt tool policy
- Acceptance tests

Violations = critical bug.

---

## Owner Sign-Off

Authority must be explicit.
Implicit power is forbidden.

