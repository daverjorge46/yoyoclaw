# 📋 Project Initialization Guide

Initialize OpenClaw projects with automatic RACI matrices, agent registries, and team delegation.

---

## Quick Start: Bigbot Week 1

### Step 1: Initialize Project from Template

```bash
cd /Users/juliocezar/Desenvolvimento

# Create project directory
mkdir -p bigbot-week1-qa
cd bigbot-week1-qa

# Copy template
cp /Users/juliocezar/Desenvolvimento/openclawdev/projects/templates/bigbot-week1.yaml ./project.yaml
```

### Step 2: Generate Project Files (Manual for now)

Create `REGISTRY.md`:

```bash
cat > REGISTRY.md << 'EOF'
# 📋 Bigbot Week 1 - Agent Registry

## Quick Reference

| Agent | Role | Status | Responsibility | Hours |
|-------|------|--------|-----------------|-------|
| **qa-lead** | QA Lead (Coordinator) | 🟢 Online | Project coordination, metrics | 40 |
| **devops-engineer** | Infrastructure Lead | 🟢 Online | CI/CD, TypeScript, ESLint setup | 40 |
| **backend-architect** | Backend Testing Lead | 🟢 Online | Unit + integration tests | 40 |
| **frontend-architect** | Frontend Testing Lead | 🟢 Online | Component tests, Jest setup | 40 |
| **main** | Orchestrator | 🟢 Online | Strategic oversight, escalation | 5 |

---

## Detailed Profiles

### qa-lead — Project Lead (Coordinator)

**Status:** 🟢 Online (Bigbot Week 1)
**Role:** QA Lead, Project Coordinator
**Responsibility:** Overall project coordination, metrics, issue tracking

**Tasks:**
- [ ] Create 30 GitHub issues
- [ ] Validate E2E scenarios
- [ ] Create acceptance test cases
- [ ] Consolidate metrics & report

**Accountability:** Project success, deliverables on time
**Works With:** All team members
**Response Time:** < 2 hours
**Hours:** 40/week
**Availability:** Mon-Fri 08:00-18:00 PST

**Escalation Path:**
- Blockers → main
- Strategy → main
- Daily decisions → autonomous

---

### devops-engineer — Infrastructure Lead

**Status:** 🟢 Online (Bigbot Week 1)
**Role:** DevOps, Infrastructure
**Responsibility:** Resolve TypeScript/ESLint blockers, CI/CD setup

**Tasks:**
- [ ] Resolve TypeScript error (TS2688)
- [ ] Fix ESLint configuration
- [ ] Setup pre-commit hooks
- [ ] Configure GitHub Actions

**Accountability:** Infrastructure readiness, CI/CD working
**Works With:** qa-lead (consulted), backend/frontend architects (coordination)
**Response Time:** < 1 hour
**Hours:** 40/week
**Availability:** Mon-Fri 09:00-18:00 PST

**Escalation Path:**
- Low-risk (config changes) → autonomous
- High-risk (infra changes) → qa-lead + main
- Blockers → main (15-min resolution)

---

### backend-architect — Backend Testing Lead

**Status:** 🟢 Online (Bigbot Week 1)
**Role:** Backend Architecture, Testing
**Responsibility:** Unit tests, integration tests, performance benchmarks

**Tasks:**
- [ ] Implement 20 unit tests (65% → 80%)
- [ ] Add 5 integration tests (Trading)
- [ ] Setup performance benchmarks
- [ ] Create test fixtures & mocks standard

**Accountability:** Backend test coverage targets
**Works With:** qa-lead (consulted), frontend-architect (integration)
**Response Time:** < 2 hours
**Hours:** 40/week
**Availability:** Mon-Fri 09:00-18:00 PST

**Escalation Path:**
- Coverage decisions → autonomous
- Test strategy changes → qa-lead
- Performance concerns → main

---

### frontend-architect — Frontend Testing Lead

**Status:** 🟢 Online (Bigbot Week 1)
**Role:** Frontend Architecture, Component Testing
**Responsibility:** Component tests, Jest setup, visual regression

**Tasks:**
- [ ] Implement 80+ component tests
- [ ] Setup Jest + React Testing Library
- [ ] Create snapshot tests
- [ ] Setup visual regression testing

**Accountability:** Frontend test coverage targets, Jest infrastructure
**Works With:** qa-lead (consulted), backend-architect (coordination)
**Response Time:** < 2 hours
**Hours:** 40/week
**Availability:** Mon-Fri 09:00-18:00 PST

**Escalation Path:**
- Component selection → autonomous
- Jest infrastructure → devops-engineer
- Coverage goals → qa-lead

---

### main — Orchestrator

**Status:** 🟢 Online (On-demand)
**Role:** Leadership, Orchestration
**Responsibility:** Strategic oversight, escalation authority, conflict resolution

**Escalation Authority:**
- High-risk infrastructure decisions (🔴)
- Agent conflicts (🟡)
- Strategy changes (🟡)
- Emergency blockers (🔴)

**Hours:** 5/week (on-demand)
**Response Time:** 30 minutes (critical), 2 hours (normal)

**Contact When:**
- Infrastructure changes (high-risk)
- Agent disagreement
- Blocker discovered
- Strategic decision needed

---

## Last Updated
2026-02-06 01:10 PST

## Status
🟢 READY TO START - All agents online, RACI defined
EOF
```

### Step 3: Generate RESPONSIBILITIES.md

```bash
cat > RESPONSIBILITIES.md << 'EOF'
# 📌 RESPONSIBILITIES.md — Bigbot Week 1 RACI Matrix

## RACI Legend

- **R** = Responsible (does the work)
- **A** = Accountable (signs off, single per task)
- **C** = Consulted (provides input)
- **I** = Informed (notified after)

---

## Infrastructure Tasks

| Task | Responsible | Accountable | Consulted | Informed |
|------|-----------|-----------|-----------|---------|
| Resolve TypeScript error (TS2688) | devops-engineer | devops-engineer | qa-lead | main |
| Fix ESLint configuration | devops-engineer | devops-engineer | qa-lead | main |
| Setup pre-commit hooks | devops-engineer | devops-engineer | backend-architect, frontend-architect | qa-lead, main |
| Configure GitHub Actions CI/CD | devops-engineer | devops-engineer | qa-lead, backend-architect, frontend-architect | main |

---

## Backend Testing Tasks

| Task | Responsible | Accountable | Consulted | Informed |
|------|-----------|-----------|-----------|---------|
| Implement 20 unit tests (65%→80%) | backend-architect | backend-architect | qa-lead | devops-engineer, frontend-architect, main |
| Add 5 integration tests (Trading) | backend-architect | backend-architect | qa-lead | devops-engineer, frontend-architect, main |
| Setup performance benchmarks | backend-architect | backend-architect | qa-lead, devops-engineer | frontend-architect, main |
| Create test fixtures & mocks | backend-architect | backend-architect | frontend-architect, qa-lead | devops-engineer, main |

---

## Frontend Testing Tasks

| Task | Responsible | Accountable | Consulted | Informed |
|------|-----------|-----------|-----------|---------|
| Implement 80+ component tests | frontend-architect | frontend-architect | qa-lead | backend-architect, devops-engineer, main |
| Setup Jest + React Testing Library | frontend-architect | frontend-architect | qa-lead, devops-engineer | backend-architect, main |
| Create snapshot tests | frontend-architect | frontend-architect | qa-lead | backend-architect, main |
| Setup visual regression testing | frontend-architect | frontend-architect | qa-lead, devops-engineer | backend-architect, main |

---

## QA Coordination Tasks

| Task | Responsible | Accountable | Consulted | Informed |
|------|-----------|-----------|-----------|---------|
| Create 30 GitHub issues | qa-lead | qa-lead | backend-architect, frontend-architect, devops-engineer | all |
| Assign ownership & track issues | qa-lead | qa-lead | all | main |
| Validate E2E scenarios | qa-lead | qa-lead | backend-architect, frontend-architect | devops-engineer, main |
| Create acceptance test cases | qa-lead | qa-lead | backend-architect, frontend-architect | devops-engineer, main |
| Consolidate metrics & report | qa-lead | qa-lead | all | main |

---

## Escalation Rules

### Low Risk (< 2 hours impact)
**Example:** Writing test for specific function, fixing lint violation
**Rule:** Responsible decides independently
**Notification:** Same day async in Slack

### Medium Risk (2-48 hours impact)
**Example:** New test coverage approach, config changes
**Rule:** Responsible proposes, accountable reviews (< 2 hour turnaround)
**Notification:** Synchronous Slack thread + approval

### High Risk (> 48 hours impact)
**Example:** CI/CD changes, infrastructure overhaul
**Rule:** Responsible proposes, accountable + main approve
**Process:** Synchronous (same-day resolution)
**Escalation:** #bigbot-week1 + @qa-lead + @main

### Blocker (Prevents other work)
**Example:** TypeScript won't compile, ESLint broken, GitHub Actions down
**Rule:** Escalate immediately to main
**Target Resolution:** 15 minutes
**Process:** Escalate immediately to @main + #bigbot-week1

---

## Autonomy Rules

✅ **Can act independently:**
- Writing tests for assigned module
- Fixing ESLint/TypeScript violations
- Creating GitHub issues
- Running local benchmarks
- Updating test fixtures
- Small config changes (< 1 hour impact)

❌ **Requires approval:**
- Changing core TypeScript/ESLint config
- Modifying CI/CD pipeline
- Changing test infrastructure (Jest, testing libraries)
- Changing escalation paths
- Approving test strategy changes

---

## Accountability Chain

```

main (Orchestrator)
├── qa-lead (Project Coordinator)
│ ├── devops-engineer (Infrastructure)
│ ├── backend-architect (Backend Testing)
│ └── frontend-architect (Frontend Testing)

```

**Rule:** Each agent is accountable to `qa-lead` or `main` for their domain.
**Disputes:** Escalate to `main` for final decision.

---

## Decision-Making Process

### Day 1 (Monday)
**Kickoff:** 09:00 PST (30 min)
- Introduce all agents
- Review RACI + escalation rules
- Clarify blockers
- Distribute task assignments

### Daily (Mon-Fri)
**Standup:** 09:00 PST (15 min)
- What I completed yesterday
- What I'm doing today
- Any blockers → escalate immediately
- Format: Slack message in #bigbot-week1

### Friday (End of Week)
**Review:** 17:00 PST (30 min)
- Progress metrics vs targets
- Completed deliverables
- Blockers & risks
- Plan for next phase

---

## Success Criteria

All of these must be met by 2026-02-12 18:00 PST:

- ✅ TypeScript: 0 compilation errors
- ✅ ESLint: 0 violations
- ✅ Unit test coverage: 65% → 80%
- ✅ Component tests: 1 → 80+
- ✅ Integration tests: +5 for Trading module
- ✅ GitHub Actions: All checks passing
- ✅ GitHub issues: 30 created + tracked
- ✅ Overall maturity: 42% → 60%
- ✅ FINAL_REPORT.md: Submitted by Friday 17:00

---

## Version History

| Date | Change | Updated By |
|------|--------|-----------|
| 2026-02-06 | Initial RACI matrix created | qa-lead |

---

**Last Updated:** 2026-02-06 01:10 PST
**Next Review:** 2026-02-13 (weekly)
**Status:** 🟢 ACTIVE - Ready for kickoff Monday 09:00 PST
EOF
```

### Step 4: Create ACTION_PLAN_WEEK1.md

See template at `/Users/juliocezar/.openclaw/workspace-qa-lead/ACTION_PLAN_WEEK1.md` (already created).

Copy it:

```bash
cp /Users/juliocezar/.openclaw/workspace-qa-lead/ACTION_PLAN_WEEK1.md ./
```

### Step 5: Ready to Delegate!

Once the files are created, you can:

```bash
# Check project status
cd bigbot-week1-qa
ls -la

# Expected files:
# - project.yaml (template)
# - REGISTRY.md (agent profiles)
# - RESPONSIBILITIES.md (RACI matrix)
# - ACTION_PLAN_WEEK1.md (day-by-day plan)
```

---

## Spawn Agents for Briefing

In OpenClaw, use the `team-coordinator` skill to spawn all agents:

```bash
# Spawn all team members with briefing
sessions_spawn({
  agentId: "qa-lead",
  task: "Lead Bigbot Week 1 project coordination...",
  label: "Bigbot Week 1: QA Lead",
  model: "sonnet"
});

sessions_spawn({
  agentId: "devops-engineer",
  task: "Bigbot Week 1: Resolve TypeScript/ESLint blockers...",
  label: "Bigbot Week 1: Infrastructure",
  model: "sonnet"
});

sessions_spawn({
  agentId: "backend-architect",
  task: "Bigbot Week 1: Implement unit + integration tests...",
  label: "Bigbot Week 1: Backend Tests",
  model: "sonnet"
});

sessions_spawn({
  agentId: "frontend-architect",
  task: "Bigbot Week 1: Implement component tests...",
  label: "Bigbot Week 1: Frontend Tests",
  model: "sonnet"
});
```

---

## Next Steps

1. ✅ Create project directory & files (this guide)
2. 🔜 Spawn agents for briefing & kickoff
3. 🔜 Daily standups (09:00 PST Mon-Fri)
4. 🔜 Friday review & metrics
5. 🔜 Final report & wrap-up

---

## References

- **Skill:** `project-coordinator` (/openclawdev/skills/project-coordinator/SKILL.md)
- **Template:** `bigbot-week1.yaml` (/openclawdev/projects/templates/bigbot-week1.yaml)
- **Analysis:** BIGBOT_QUALITY_ANALYSIS_REPORT.md (130+ pages)
- **Team:** REGISTRY.md + RESPONSIBILITIES.md (this guide)

---

**Created:** 2026-02-06 01:10 PST  
**Status:** 🟢 Ready to initialize Bigbot Week 1
