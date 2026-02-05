# TODO Queue — Sophie Implementation Roadmap
**Version:** v1.0
**Generated:** 2026-02-05
**Purpose:** Ordered work queue for Ralph Loop execution

---

## Queue Rules

**Task Format:**
```markdown
- [STATUS] TASK-ID: Description
  - **Type:** docs | code | test
  - **Prerequisites:** List of required files/tasks
  - **Definition of Done:** Reference to acceptance test or criteria
  - **Estimated Complexity:** S | M | L | XL
  - **Notes:** Additional context
```

**Status Values:**
- `READY` — All prerequisites met; safe to execute
- `BLOCKED` — Prerequisites missing; cannot proceed
- `IN_PROGRESS` — Currently being worked
- `COMPLETED` — Done; archived
- `FAILED` — Attempted but failed; needs review

---

## Phase 1: Foundation (Docs & Contracts)

### DOC-001: Create SOPHIE_STATE_MACHINE.md
- [READY] DOC-001: Document Sophie's operational state machine
  - **Type:** docs
  - **Prerequisites:** None
  - **Definition of Done:** State machine doc exists at `07_OPERATIONS/SOPHIE_STATE_MACHINE.md` with states: IDLE, LISTENING, REASONING, DRAFTING, AWAITING_APPROVAL, EXECUTING
  - **Estimated Complexity:** M
  - **Notes:** Define valid state transitions and triggers

### DOC-002: Create MEMORY_AND_RETENTION_POLICY.md
- [READY] DOC-002: Document memory policy (category-based auto-remember)
  - **Type:** docs
  - **Prerequisites:** None
  - **Definition of Done:** Policy doc exists at `07_OPERATIONS/MEMORY_AND_RETENTION_POLICY.md` defining: what to remember, retention periods, visibility rules, audit requirements
  - **Estimated Complexity:** M
  - **Notes:** Based on user decision: category-based with visibility/audit

### DOC-003: Create COACHING_AND_INTERRUPT_POLICY.md
- [READY] DOC-003: Document coaching mode and interrupt policy
  - **Type:** docs
  - **Prerequisites:** None
  - **Definition of Done:** Policy doc exists at `07_OPERATIONS/COACHING_AND_INTERRUPT_POLICY.md` defining: Socratic default, adjustable intensity, interrupt rules (<=2d, 3-7d, >7d)
  - **Estimated Complexity:** S
  - **Notes:** Based on user decisions from handoff

### DOC-004: Create PERSPECTIVE_FRAMING_GUIDE.md
- [READY] DOC-004: Document perspective framing rules (Elon/Jobs/broker lens)
  - **Type:** docs
  - **Prerequisites:** None
  - **Definition of Done:** Guide exists at `07_OPERATIONS/PERSPECTIVE_FRAMING_GUIDE.md` with situational usage rules and examples
  - **Estimated Complexity:** S
  - **Notes:** Must explain when to use which perspective

---

## Phase 2: Moonshot Provider Integration

### CODE-001: Add Moonshot provider config support
- [BLOCKED] CODE-001: Add Moonshot provider to models config schema
  - **Type:** code
  - **Prerequisites:** `02_CONTRACTS/interfaces_contracts_spec_sophie_moltbot.md` (exists)
  - **Definition of Done:** Zod schema accepts `models.providers.moonshot` with correct shape; passes `US-KIMI-01` smoke test
  - **Estimated Complexity:** M
  - **Notes:** Follow contract spec exactly; no secrets in config
  - **Blocker:** Need to review existing provider registration code first

### CODE-002: Add MOONSHOT_API_KEY auth resolution
- [BLOCKED] CODE-002: Implement auth resolution for Moonshot
  - **Type:** code
  - **Prerequisites:** CODE-001 completed
  - **Definition of Done:** Auth resolver reads `MOONSHOT_API_KEY` from env; fails explicitly if missing; never logs key
  - **Estimated Complexity:** S
  - **Notes:** Follow auth contract; deterministic error messages

### CODE-003: Implement per-model context window enforcement
- [BLOCKED] CODE-003: Add per-model context enforcement (no global clamp for cloud)
  - **Type:** code
  - **Prerequisites:** CODE-001 completed
  - **Definition of Done:** Kimi uses declared 128k/32k window; local models use existing clamp; passes `US-KIMI-03` OverBudget test
  - **Estimated Complexity:** L
  - **Notes:** Critical: MINIMUM_CONTEXT_TOKENS must NOT apply to Moonshot

### CODE-004: Add startup validation WARN mode
- [BLOCKED] CODE-004: Implement startupValidation=WARN for Moonshot
  - **Type:** code
  - **Prerequisites:** CODE-001 completed
  - **Definition of Done:** Gateway starts even when Moonshot unreachable; logs warning; passes `US-KIMI-02`
  - **Estimated Complexity:** M
  - **Notes:** Must not block gateway startup

---

## Phase 3: Prompt Stack Implementation

### CODE-005: Create prompt manifest generator
- [BLOCKED] CODE-005: Implement prompt manifest with SHA256 hashing
  - **Type:** code
  - **Prerequisites:** `05_PROMPTS/prompt_stack_contract.md` (exists)
  - **Definition of Done:** Manifest generated per contract spec; includes layer hashes; passes `US-PROMPT-01`
  - **Estimated Complexity:** M
  - **Notes:** Must hash each layer and produce stack_sha256

### CODE-006: Create SOPHIE_BASE_PROMPT file
- [BLOCKED] CODE-006: Write Sophie base system prompt
  - **Type:** code
  - **Prerequisites:** CODE-005 completed
  - **Definition of Done:** File exists at `src/prompts/sophie_base_prompt_v1.txt`; includes version header; loaded by prompt loader
  - **Estimated Complexity:** L
  - **Notes:** Defines Sophie's core behavior, refusal rules, security stance

### CODE-007: Implement prompt disclosure refusal
- [BLOCKED] CODE-007: Add logic to refuse system prompt disclosure requests
  - **Type:** code
  - **Prerequisites:** CODE-006 completed
  - **Definition of Done:** Agent refuses when asked for system prompt; passes `US-PROMPT-02`
  - **Estimated Complexity:** S
  - **Notes:** Part of base prompt + detection logic

---

## Phase 4: Tool Gate Implementation

### CODE-008: Create tool approval gate
- [BLOCKED] CODE-008: Implement gate for side-effect tools
  - **Type:** code
  - **Prerequisites:** `02_CONTRACTS/tool_authority_matrix.md` (exists)
  - **Definition of Done:** Gate blocks send/write tools without approval; passes `US-GATE-01` and `US-GATE-02`
  - **Estimated Complexity:** L
  - **Notes:** Must enforce authority matrix; fail-closed

### CODE-009: Add proposal/approval workflow
- [BLOCKED] CODE-009: Implement action proposal and approval commands
  - **Type:** code
  - **Prerequisites:** CODE-008 completed
  - **Definition of Done:** Sophie generates proposals with ID; founder approves via `APPROVE <id>`; replay protection works
  - **Estimated Complexity:** XL
  - **Notes:** Critical for L3 autonomy; must log all proposals

### CODE-010: Add approval queue object
- [BLOCKED] CODE-010: Create persistent approval queue with replay protection
  - **Type:** code
  - **Prerequisites:** CODE-009 completed
  - **Definition of Done:** Proposals stored; single-use IDs; audit log maintained
  - **Estimated Complexity:** M
  - **Notes:** Likely uses SQLite or JSONL

---

## Phase 5: Logging & Redaction

### TEST-001: Add "no raw prompts in logs" invariant test
- [READY] TEST-001: Create test to verify no raw prompts in logs
  - **Type:** test
  - **Prerequisites:** `03_TESTS/acceptance_tests_pack_sophie_moltbot_do_d_gwt_fixtures.md` (exists)
  - **Definition of Done:** Test reads log files, asserts no raw prompt content found; passes `US-LOG-01`
  - **Estimated Complexity:** M
  - **Notes:** Check for hashes present, content absent

### CODE-011: Implement secret pattern redaction
- [READY] CODE-011: Add secret pattern detection and redaction in logs
  - **Type:** code
  - **Prerequisites:** None (can be done independently)
  - **Definition of Done:** Known secret patterns (API keys, tokens) redacted in logs; passes `US-LOG-02`
  - **Estimated Complexity:** M
  - **Notes:** Use regex patterns; fail-open (log with redaction mark, don't crash)

### TEST-002: Add streaming block for external channels test
- [READY] TEST-002: Create test to verify streaming disabled for external channels
  - **Type:** test
  - **Prerequisites:** `03_TESTS/acceptance_tests_pack_sophie_moltbot_do_d_gwt_fixtures.md` (exists)
  - **Definition of Done:** Test confirms external channels receive final messages only; passes `US-PROMPT-01` streaming rule
  - **Estimated Complexity:** M
  - **Notes:** Check channel policy enforcement

---

## Phase 6: Test Fixtures Creation

### TEST-003: Create fixture directory structure
- [READY] TEST-003: Set up `03_TESTS/fixtures/` directory
  - **Type:** test
  - **Prerequisites:** None
  - **Definition of Done:** Directory exists with subdirs: `channels/`, `cases/`; README.md explains format
  - **Estimated Complexity:** S
  - **Notes:** Use structure from acceptance tests doc

### TEST-004: Create golden test fixtures (cases 001-015)
- [BLOCKED] TEST-004: Implement 15 golden test fixture files
  - **Type:** test
  - **Prerequisites:** TEST-003 completed; corresponding CODE tasks for functionality
  - **Definition of Done:** All 15 fixture JSON files exist; golden test runner can load and execute them
  - **Estimated Complexity:** L
  - **Notes:** Requires implementing features first; fixtures validate behavior

### CODE-012: Create golden test runner
- [BLOCKED] CODE-012: Implement test runner that loads and executes golden fixtures
  - **Type:** code
  - **Prerequisites:** TEST-003 completed
  - **Definition of Done:** Runner loads fixtures, executes tests, diffs output, asserts invariants; integrated into CI
  - **Estimated Complexity:** L
  - **Notes:** Should support running individual fixtures or full suite

---

## Phase 7: Notes & Daily Workflows

### CODE-013: Implement Nomad note ingestion
- [BLOCKED] CODE-013: Add local folder watcher for Nomad markdown notes
  - **Type:** code
  - **Prerequisites:** Basic Kimi provider working
  - **Definition of Done:** Notes from sync folder are indexed; linked to call logs by timestamp; appears in recap
  - **Estimated Complexity:** L
  - **Notes:** Part of W2 workflow from PRD

### CODE-014: Implement daily market pulse
- [BLOCKED] CODE-014: Create `moltbot sophie:pulse` command
  - **Type:** code
  - **Prerequisites:** CODE-013, Kimi provider working
  - **Definition of Done:** Command generates report from inbox + rate sources; passes W1 acceptance criteria
  - **Estimated Complexity:** XL
  - **Notes:** Read-only; local CLI output

### CODE-015: Implement daily recap
- [BLOCKED] CODE-015: Create `moltbot sophie:recap` command
  - **Type:** code
  - **Prerequisites:** CODE-013, CODE-014 completed
  - **Definition of Done:** Command generates recap with proposals; passes W3 acceptance criteria
  - **Estimated Complexity:** XL
  - **Notes:** Combines call logs, notes, inbox intel

---

## Phase 8: Security & Abuse Cases

### TEST-005: Add prompt injection refusal test
- [READY] TEST-005: Create test for email prompt injection handling
  - **Type:** test
  - **Prerequisites:** `04_SECURITY/abuse_cases_misuse_scenarios_sophie_moltbot.md` (exists)
  - **Definition of Done:** Test sends email with injection attempt; Sophie refuses unsafe instruction; passes `US-REFUSE-01` and AC-01
  - **Estimated Complexity:** M
  - **Notes:** Critical security test

### CODE-016: Implement honeypot template policy (Phase 2)
- [BLOCKED] CODE-016: Add honeypot outbound template enforcement
  - **Type:** code
  - **Prerequisites:** CODE-009 completed
  - **Definition of Done:** Honeypot sends only via allowlisted templates; no links/attachments; rate-limited; passes `US-GATE-03`
  - **Estimated Complexity:** XL
  - **Notes:** Deferred to Phase 2; requires careful policy implementation

---

## Phase 9: CI/CD Integration

### CODE-017: Add CI pipeline for contract tests
- [BLOCKED] CODE-017: Integrate acceptance tests into CI
  - **Type:** code
  - **Prerequisites:** TEST-004, CODE-012 completed
  - **Definition of Done:** CI runs all acceptance tests; blocks merge on failure; reports clearly
  - **Estimated Complexity:** M
  - **Notes:** Use existing CI infrastructure

---

## Archive (Completed)

<!-- Completed tasks moved here -->

---

## Notes

- Total queued tasks: 22
- READY tasks: 7 (all docs/tests that can be done immediately)
- BLOCKED tasks: 15 (awaiting prerequisites)

**Next Steps:**
1. Complete READY doc tasks (DOC-001 through DOC-004)
2. Complete READY test scaffolding tasks (TEST-001, TEST-002, TEST-003, TEST-005)
3. Complete READY security task (CODE-011)
4. Then unblock CODE-001 through CODE-004 (Kimi provider)
5. Then proceed through phases

**Important:** Each completed task should:
- Update this file (move from BLOCKED→READY or READY→COMPLETED)
- Run lint + tests
- Commit with clear message
- Write LOOP_LOG entry
