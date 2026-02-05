# Sophie / Moltbot — Developer Pack Index
**Version:** v1.0
**Generated:** 2026-02-05
**Purpose:** Single navigation map for all Sophie governance, contracts, tests, and operational docs.

---

## YOU ARE HERE

This folder (`docs/_sophie_devpack/`) is the **canonical source of truth** for Sophie's governance, contracts, and acceptance criteria.

**For Claude Code sessions:**
Start at `CLAUDE_CONTEXT.md` in the repo root.

**For developers:**
Read `01_AUTHORITIES.md` next to understand precedence and change control.

---

## Directory Structure

```
docs/_sophie_devpack/
├── 00_INDEX.md                 ← YOU ARE HERE
├── 01_AUTHORITIES.md            ← Binding docs + priority order
├── 02_CONTRACTS/                ← Interfaces, tool authority, permissions
├── 03_TESTS/                    ← Acceptance tests + fixtures
├── 04_SECURITY/                 ← Threat model + abuse cases
├── 05_PROMPTS/                  ← Prompt stack contract
├── 06_COOKBOOKS/                ← Setup guides (Kimi, operations)
├── 07_OPERATIONS/               ← Routing, context policy, defaults
├── 90_ARCHIVE/                  ← Old versions + legacy pulls
├── TODO_QUEUE.md                ← Work queue for Ralph loop
├── LOOP_RULES.md                ← Loop execution rules
└── LOOP_LOG.md                  ← Loop execution log
```

---

## Quick Reference

### Binding Contracts (Fail-Closed)
- `02_CONTRACTS/tool_authority_matrix.md`
- `02_CONTRACTS/permissions_matrix.md`
- `02_CONTRACTS/interfaces_contracts_spec_sophie_moltbot.md`
- `05_PROMPTS/prompt_stack_contract.md`
- `07_OPERATIONS/model_routing_and_context_policy.md`

### Acceptance Tests
- `03_TESTS/acceptance_tests_pack_sophie_moltbot_do_d_gwt_fixtures.md`
- `03_TESTS/contract_test_runner_checklist_sophie_moltbot_ci_map.md`
- `03_TESTS/fixtures/` ← (to be created during implementation)

### Security
- `04_SECURITY/security_threat_model_sophie_moltbot.md`
- `04_SECURITY/security_threat_model_sophie_moltbot_solo_founder.md`
- `04_SECURITY/abuse_cases_misuse_scenarios_sophie_moltbot.md`

### Setup & Operations
- `06_COOKBOOKS/sophie_moltbot_prd_developer_handoff_kimi_setup_gates_notes_email.md`

---

## How to Use This Pack

### For Development Work
1. Read `01_AUTHORITIES.md` to understand precedence
2. Identify relevant contracts in `02_CONTRACTS/`
3. Find corresponding acceptance tests in `03_TESTS/`
4. Implement to satisfy both contract + test
5. Never modify a contract without updating tests + version bump

### For Code Review
1. Check: Does PR satisfy acceptance tests?
2. Check: Does PR preserve contract invariants?
3. Check: Are security controls maintained?
4. Check: Are logging rules followed?

### For Debugging
1. Check `LOOP_LOG.md` for recent loop activity
2. Verify prompt manifest (hashes only)
3. Check gate decision logs
4. Confirm no raw prompts in logs

---

## Change Control

**All documents in this pack are version-controlled.**

To modify any governance doc:
1. Increment version in doc header
2. Update corresponding acceptance tests
3. Update this INDEX if structure changes
4. Commit with descriptive message
5. Founder (Andrew) approval required for contract changes

---

## Notes

- This pack was bootstrapped on 2026-02-05
- No product features were implemented during bootstrap
- Scaffolding only: docs, loop structure, entrypoint
- Implementation work starts after bootstrap approval

---

## Contact

**Owner:** Andrew (Solo Founder)
**Repo:** ~/Documents/clawdbot
**Session:** Claude Code
