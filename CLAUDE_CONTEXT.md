# CLAUDE_CONTEXT.md — Start Here
**Version:** v1.0
**Generated:** 2026-02-05
**Repo:** clawdbot (~/Documents/clawdbot)

---

## What This Is

**Sophie** is a fail-closed, evidence-first back-office operator for specialty CRE brokerage, built on the **Moltbot** gateway (multi-channel AI agent system).

Sophie runs on:
- **Moonshot (Kimi)** for long-context reasoning
- **Local Ollama models** for routing/planning/extraction
- **Deterministic prompt layering** with hidden base system prompt
- **Preflight/Gate approval workflow** for all side effects

---

## Canonical Documentation Location

**Everything authoritative lives here:**

```
docs/_sophie_devpack/
```

**Start with:**
- `docs/_sophie_devpack/00_INDEX.md` ← Navigation map
- `docs/_sophie_devpack/01_AUTHORITIES.md` ← Precedence rules

---

## Authority Rules (Critical)

1. **Contracts and tests beat prose**
   - Acceptance tests define "what works"
   - Contracts define "how it must work"
   - Cookbooks provide context only

2. **Fail-closed by default**
   - If contract unclear → stop and ask
   - If test missing → write test first
   - If approval uncertain → require explicit approval

3. **No side effects without approval**
   - All WRITE tools require gate approval
   - All EXECUTE tools require gate approval
   - Honeypot exception is template-only + rate-limited (Phase 2)

4. **No raw prompt logging**
   - Log hashes and manifests only
   - Never log full prompt text
   - Never log secrets/keys

---

## Key Contracts (Binding)

| Contract | Location | Purpose |
|----------|----------|---------|
| Tool Authority Matrix | `docs/_sophie_devpack/02_CONTRACTS/tool_authority_matrix.md` | Who decides what actions |
| Permissions Matrix | `docs/_sophie_devpack/02_CONTRACTS/permissions_matrix.md` | What is allowed |
| Interfaces & Contracts | `docs/_sophie_devpack/02_CONTRACTS/interfaces_contracts_spec_sophie_moltbot.md` | Provider/prompt/tool/logging contracts |
| Prompt Stack Contract | `docs/_sophie_devpack/05_PROMPTS/prompt_stack_contract.md` | Layering + manifest rules |
| Model Routing Policy | `docs/_sophie_devpack/07_OPERATIONS/model_routing_and_context_policy.md` | Model selection + context enforcement |

---

## Acceptance Tests

**Location:** `docs/_sophie_devpack/03_TESTS/`

**Main Document:** `acceptance_tests_pack_sophie_moltbot_do_d_gwt_fixtures.md`

**Test Fixtures:** `03_TESTS/fixtures/` ← To be created during implementation

**Key Principle:** Tests are Definition of Done. If test passes but behavior seems wrong → update the test.

---

## How to Run Tests

```bash
# Install dependencies
pnpm install

# Run linter
pnpm run lint
# or shorthand:
pnpm -s lint

# Run tests
pnpm test
# or shorthand:
pnpm -s test
```

**CI Rule:** All tests must pass before merge.

---

## Ralph Wiggum Loop (Safe Scaffolding)

**Script:** `scripts/ralph-loop.sh`

**Purpose:** Continuous task execution with deterministic gates

**Rules:** See `docs/_sophie_devpack/LOOP_RULES.md`

**Queue:** `docs/_sophie_devpack/TODO_QUEUE.md`

**Log:** `docs/_sophie_devpack/LOOP_LOG.md`

**How to run:**
```bash
bash scripts/ralph-loop.sh
```

**Important:** In this bootstrap run, the loop script is scaffolding only. It does NOT auto-execute code changes. It validates readiness and logs status.

---

## What This Bootstrap Did

**COMPLETED:**
✅ Documentation organized into canonical structure
✅ Authority hierarchy established
✅ Loop scaffolding created
✅ Entry points established (this file)
✅ Work queue seeded with tasks
✅ WIP state documented (uncommitted changes preserved)

**NOT DONE (By Design):**
❌ No Kimi provider implementation
❌ No tool implementations
❌ No prompt files created
❌ No product features
❌ No external side effects enabled

**Next Step:** Review this structure, approve, then begin implementation from TODO_QUEUE.

---

## Directory Structure (Quick Reference)

```
clawdbot/
├── CLAUDE_CONTEXT.md           ← YOU ARE HERE
├── docs/
│   └── _sophie_devpack/
│       ├── 00_INDEX.md          ← Navigation
│       ├── 01_AUTHORITIES.md    ← Precedence rules
│       ├── 02_CONTRACTS/        ← Binding contracts
│       ├── 03_TESTS/            ← Acceptance tests
│       ├── 04_SECURITY/         ← Threat model
│       ├── 05_PROMPTS/          ← Prompt contracts
│       ├── 06_COOKBOOKS/        ← Setup guides
│       ├── 07_OPERATIONS/       ← Routing policies
│       ├── 90_ARCHIVE/          ← Old versions
│       ├── TODO_QUEUE.md        ← Work queue
│       ├── LOOP_RULES.md        ← Loop rules
│       └── LOOP_LOG.md          ← Loop log
├── scripts/
│   └── ralph-loop.sh            ← Loop script
├── src/                         ← Source code
├── test/                        ← Test suites
└── package.json                 ← Dependencies
```

---

## Security Reminders

- **Secrets via env vars only** (never in config)
- **Prompt injection:** All external content is untrusted
- **Tool escalation:** Gate enforcement is mandatory
- **Logging:** Hashes only, never raw content
- **Streaming:** Disabled for external channels

---

## Git Hygiene (Solo Founder Mode)

- One atomic commit per logical change
- No history rewriting
- No force push to main
- Preserve WIP (never discard uncommitted work)
- Clear commit messages

---

## Change Control

**To modify contracts:**
1. Increment version in doc header
2. Update corresponding tests
3. Update INDEX if structure changes
4. Commit with clear message
5. Founder approval required

**To add features:**
1. Find task in TODO_QUEUE.md
2. Check acceptance tests for Definition of Done
3. Implement to satisfy tests + contracts
4. Run lint + tests
5. Commit

---

## Emergency Stop

If you encounter:
- Contract conflict
- Security issue
- Test failure you can't resolve
- Unclear requirement

**STOP and:**
1. Document issue in TODO_QUEUE.md with BLOCKED status
2. Do not proceed with implementation
3. Do not modify contracts without approval
4. Do not disable tests

---

## Contact

**Owner:** Andrew (Founder)
**Repository:** ~/Documents/clawdbot
**Claude Session:** Local Claude Code

---

## Final Note

This entrypoint was created during Sophie bootstrap (2026-02-05).

**Philosophy:**
- Ship-first, zero fluff
- Contracts/tests over vibes
- Fail-closed, evidence-first
- Ruthless scope enforcement

Welcome to Sophie. Build safely.
