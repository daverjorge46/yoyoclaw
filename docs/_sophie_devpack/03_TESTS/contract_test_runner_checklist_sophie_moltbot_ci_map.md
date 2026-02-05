# Contract Test Runner Checklist — Sophie / Moltbot (CI Map)
**Version:** v1.0 (Authoritative)
**Date:** 2026-02-04
**Purpose:** Bind every contract to a CI test + fixture IDs so regressions can’t sneak in.

> **Rule:** No contract change ships unless this checklist passes in CI.

---

## 0) Test Harness Overview

### 0.1 Test Suites
- **Unit/Integration:** `pnpm test`
- **E2E (local gateway):** `pnpm test:e2e`
- **Live (real providers):** `pnpm test:live` *(optional; gated)*

### 0.2 Golden Fixtures
Use the canonical fixture pack:
- `acceptance_tests.md`
- `fixtures/cases/*.json`

### 0.3 Golden Test Runner (Required)
Create a small runner:
- Reads `fixtures/cases/*.json`
- Executes each case against a local gateway running in test mode
- Captures:
  - final assistant output
  - tool calls emitted
  - gate decision
  - logs produced
- Diffs against expected

**Recommended location:** `src/test/golden/run-fixtures.test.ts`

---

## 1) Contract → Tests Map (Must Pass)

### 1.1 Provider Contract Tests (Moonshot/Kimi)

#### CT-PROV-001 — Missing key fails (no network)
- **Contract refs:** Contracts §1.3
- **Fixture:** `003_overbudget_preflight.json` (pattern) + add `016_missing_key.json`
- **Test:**
  - Unset `MOONSHOT_API_KEY`
  - Run `moltbot moonshot:smoke`
  - Assert:
    - exit != 0
    - error contains `Missing MOONSHOT_API_KEY`
    - no HTTP requests logged

#### CT-PROV-002 — Startup WARN does not brick gateway
- **Contract refs:** Contracts §1.6
- **Fixture:** `002_kimi_down_warn.json`
- **Test:**
  - Set `startupValidation=warn`
  - Mock DNS/endpoint failure
  - Start gateway
  - Assert:
    - gateway starts
    - warning log present

#### CT-PROV-003 — Per-model context window enforced
- **Contract refs:** Contracts §1.5
- **Fixture:** `003_overbudget_preflight.json`
- **Test:**
  - Provide oversized input
  - Assert OverBudgetError
  - Assert no HTTP call happened

#### CT-PROV-004 — No silent fallback
- **Contract refs:** Contracts §0, §1.3
- **Fixture:** add `017_no_silent_fallback.json`
- **Test:**
  - Force Moonshot failure
  - Ensure system does not call any other provider
  - Ensure user is prompted for approval to switch (if fallback configured)

---

### 1.2 Prompt Contract Tests

#### CT-PROMPT-001 — Deterministic stack ordering
- **Contract refs:** Contracts §2.1
- **Fixture:** `004_prompt_stack_manifest.json`
- **Test:**
  - Run debug manifest
  - Assert ordering metadata exists

#### CT-PROMPT-002 — Base prompt cannot be disclosed
- **Contract refs:** Contracts §2.5
- **Fixture:** `012_refuse_show_system_prompt.json`
- **Test:**
  - Ask for system prompt
  - Assert refusal
  - Assert no base prompt content appears

---

### 1.3 Tool Contract Tests

#### CT-TOOL-001 — Unallowlisted tool denied (fail-closed)
- **Contract refs:** Contracts §3.2
- **Fixture:** add `018_unallowlisted_tool_denied.json`
- **Test:**
  - Invoke a tool not in allowlist
  - Assert gate decision `DENY`
  - Assert tool not executed

#### CT-TOOL-002 — Side effect requires approval (Phase 1)
- **Contract refs:** Contracts §3.3
- **Fixture:** `005_send_email_requires_approval.json`, `006_supabase_write_proposal.json`
- **Test:**
  - Request send
  - Assert draft + “Approve? YES/NO”
  - Assert no send tool called

#### CT-TOOL-003 — Honeypot template exception (Phase 2)
- **Contract refs:** Contracts §3.3 + Honeypot policy
- **Fixture:** `009_honeypot_template_autosend_phase2.json`
- **Test:**
  - Enable honeypot outbound
  - Assert allowlisted template send executes

#### CT-TOOL-004 — Honeypot links/attachments denied
- **Contract refs:** Contracts §3.3
- **Fixtures:** `014_url_block_honeypot.json`, `015_attachment_block_honeypot.json`
- **Test:**
  - Provide link/attachment
  - Assert DENY

#### CT-TOOL-005 — Rate limit enforced
- **Contract refs:** Contracts §3.3
- **Fixture:** `013_rate_limit_honeypot.json`
- **Test:**
  - Simulate rate limit hit
  - Assert DENY

---

### 1.4 Logging Contract Tests

#### CT-LOG-001 — No raw prompts in logs
- **Contract refs:** Contracts §4.2
- **Fixture:** `010_no_raw_prompt_logs.json`
- **Test:**
  - Execute a run with known user text
  - Dump logs
  - Assert:
    - hashes present
    - known plaintext not present

#### CT-LOG-002 — Secrets redacted
- **Contract refs:** Contracts §4.5
- **Fixture:** add `019_secret_redaction.json`
- **Test:**
  - Input contains fake key pattern
  - Ensure output/log redacts

#### CT-LOG-003 — Rotation caps enforced
- **Contract refs:** Contracts §4.4
- **Fixture:** add `020_log_rotation.json`
- **Test:**
  - Generate logs above cap
  - Assert:
    - file count <= max
    - file sizes <= cap

---

### 1.5 Session Contract Tests

#### CT-SESS-001 — Session key format stable
- **Contract refs:** Contracts §5.1
- **Fixture:** add `021_session_key_format.json`
- **Test:**
  - Create session via channel
  - Assert key matches canonical pattern

#### CT-SESS-002 — Session file path correct
- **Contract refs:** Contracts §5.2
- **Fixture:** add `022_session_storage_path.json`
- **Test:**
  - Run a conversation
  - Assert file exists at `~/.clawdbot/agents/{agentId}/sessions/{sessionKey}.jsonl`

#### CT-SESS-003 — Compaction preserves invariants
- **Contract refs:** Contracts §5.3
- **Fixture:** add `023_compaction_invariants.json`
- **Test:**
  - Force overflow
  - Assert:
    - compaction occurs
    - base prompt invariants preserved
    - derived summary stored separately with evidence pointers

#### CT-SESS-004 — External sessions store finalized only
- **Contract refs:** Contracts §5.5
- **Fixture:** `011_streaming_block_external.json`
- **Test:**
  - Run external message with streaming requested
  - Assert session stores final response only

---

## 2) CI Wiring Checklist

### 2.1 Required CI Jobs
- [ ] **lint**: `pnpm lint`
- [ ] **typecheck/build**: `pnpm build`
- [ ] **unit/integration**: `pnpm test`
- [ ] **e2e**: `pnpm test:e2e`
- [ ] **golden fixtures**: `pnpm test -t golden` (or dedicated script)

### 2.2 Optional CI Jobs
- [ ] **live provider** (manual/secure): `pnpm test:live` with secrets in CI vault

### 2.3 Merge Gates
- No merge if any contract test fails.
- No merge if fixtures updated without updating expected outputs.
- Any contract change requires:
  - version bump
  - changelog entry
  - fixture update

---

## 3) Immediate Additions (to complete 10–20 fixtures)
Add these fixtures to close the gaps:
- `016_missing_key.json`
- `017_no_silent_fallback.json`
- `018_unallowlisted_tool_denied.json`
- `019_secret_redaction.json`
- `020_log_rotation.json`
- `021_session_key_format.json`
- `022_session_storage_path.json`
- `023_compaction_invariants.json`

---

## 4) Owner Sign-Off
This checklist is binding. If a dev wants to bypass it, the answer is **no**.

