---
name: project-coordinator
description: "Initialize and manage project teams with automatic RACI-based delegation. Includes REGISTRY, RESPONSIBILITIES, and agent spawning."
metadata: { "openclaw": { "emoji": "📋", "always": false, "skillKey": "project" } }
user-invocable: true
---

# Project Coordinator — Automated Team Delegation & Project Management

Coordinate multi-agent projects with automatic RACI matrix, agent registration, and task delegation.

## Features

✅ **Project initialization** from templates  
✅ **RACI matrix** auto-generation  
✅ **Agent registry** per project  
✅ **Automatic spawning** based on responsibilities  
✅ **Progress tracking** and status reporting  
✅ **Escalation routing**

---

## Usage

### Initialize a Project

```bash
# From template
openclaw project init bigbot-week1 \
  --template /path/to/template.yaml \
  --output /path/to/project/

# With custom agents
openclaw project init my-project \
  --agents devops-engineer,backend-architect,qa-lead \
  --owner tech-lead
```

### Create REGISTRY + RESPONSIBILITIES

```bash
# Auto-generate from project config
openclaw project generate-raci my-project \
  --output ./RESPONSIBILITIES.md

# Generate agent registry
openclaw project registry my-project \
  --output ./REGISTRY.md
```

### Spawn All Team Members

```bash
# Spawn all agents with briefing
openclaw project spawn my-project \
  --action briefing \
  --model sonnet

# Run daily standup
openclaw project standup my-project \
  --format slack
```

### View Project Status

```bash
# Dashboard
openclaw project status my-project

# Detailed metrics
openclaw project metrics my-project \
  --format json
```

---

## Project Template Format

Create `projects/templates/my-project.yaml`:

```yaml
# Project: Bigbot Quality Week 1
name: bigbot-week1
description: "Increase test maturity 42% → 60%, resolve critical blockers"
startDate: "2026-02-06"
endDate: "2026-02-12"
goal: "Ship production-ready test infrastructure"

# Team structure
team:
  coordinator: qa-lead
  members:
    - id: devops-engineer
      role: "Infrastructure Lead"
      responsibility: "TypeScript/ESLint fixes, CI/CD setup"
      tasks:
        - "Resolve TypeScript error (TS2688)"
        - "Fix ESLint configuration"
        - "Setup pre-commit hooks"
        - "Configure GitHub Actions"

    - id: backend-architect
      role: "Backend Testing Lead"
      responsibility: "Unit + integration tests"
      tasks:
        - "Implement 20 unit tests (65%→80%)"
        - "Add 5 integration tests (Trading)"
        - "Setup performance benchmarks"

    - id: frontend-architect
      role: "Frontend Testing Lead"
      responsibility: "Component tests, Jest setup"
      tasks:
        - "Implement 80+ component tests"
        - "Setup Jest + React Testing Library"
        - "Create snapshot tests"
        - "Setup visual regression"

    - id: qa-lead
      role: "QA Lead (Coordinator)"
      responsibility: "Overall coordination, metrics"
      tasks:
        - "Create 30 GitHub issues"
        - "Validate E2E scenarios"
        - "Create acceptance test cases"
        - "Consolidate metrics & KPIs"

# RACI matrix (who does what)
raci:
  - task: "Resolve TypeScript error"
    responsible: devops-engineer
    accountable: devops-engineer
    consulted: [qa-lead]
    informed: [main]

  - task: "Implement unit tests"
    responsible: backend-architect
    accountable: backend-architect
    consulted: [qa-lead]
    informed: [devops-engineer]

  - task: "Implement component tests"
    responsible: frontend-architect
    accountable: frontend-architect
    consulted: [qa-lead]
    informed: [backend-architect]

  - task: "Create GitHub issues"
    responsible: qa-lead
    accountable: qa-lead
    consulted: [all]
    informed: [all]

# Success criteria
successCriteria:
  - "TypeScript: 0 errors"
  - "ESLint: 0 violations"
  - "Unit test coverage: 65% → 80%"
  - "Component tests: 1 → 80+"
  - "Integration tests: +5 for Trading"
  - "GitHub Actions: Passing"
  - "Issues tracked: 30 created"
  - "Maturities: 42% → 60%"

# Daily schedule
schedule:
  standup: "09:00 PST"
  standup_duration: "15 min"
  standup_format: "slack"
  review: "friday 17:00 PST"
```

---

## Generated REGISTRY.md

Automatically generated from template:

```markdown
# Project Registry: Bigbot Week 1

## Quick Reference

| Agent              | Role                  | Status    | Responsibility           |
| ------------------ | --------------------- | --------- | ------------------------ |
| qa-lead            | QA Lead (Coordinator) | 🟢 Online | Overall coordination     |
| devops-engineer    | Infrastructure Lead   | 🟢 Online | CI/CD, setup             |
| backend-architect  | Backend Testing Lead  | 🟢 Online | Unit + integration tests |
| frontend-architect | Frontend Testing Lead | 🟢 Online | Component tests          |
| main               | Escalation            | 🟢 Online | Arbitration              |

## Detailed Profiles

### qa-lead — QA Lead (Coordinator)

**Status:** 🟢 Online (Bigbot Week 1)  
**Role:** Project coordinator, metrics  
**Tasks:**

- [ ] Create 30 GitHub issues
- [ ] Validate E2E scenarios
- [ ] Create acceptance test cases
- [ ] Consolidate metrics & KPIs

**Accountability:** Project success, metrics delivery  
**Works with:** All team members  
**Response time:** < 2 hours

### devops-engineer — Infrastructure Lead

**Status:** 🟢 Online (Bigbot Week 1)  
**Role:** CI/CD, configuration  
**Tasks:**

- [ ] Resolve TypeScript error (TS2688)
- [ ] Fix ESLint configuration
- [ ] Setup pre-commit hooks
- [ ] Configure GitHub Actions

**Accountability:** Infrastructure readiness  
**Works with:** qa-lead (consulted)  
**Response time:** < 1 hour

[... more profiles ...]
```

---

## Generated RESPONSIBILITIES.md (RACI)

Automatically generated matrix:

```markdown
# RESPONSIBILITIES.md — Bigbot Week 1 RACI

## RACI Matrix

| Task                      | Responsible        | Accountable        | Consulted | Informed          |
| ------------------------- | ------------------ | ------------------ | --------- | ----------------- |
| Resolve TypeScript error  | devops-engineer    | devops-engineer    | qa-lead   | main              |
| Implement unit tests      | backend-architect  | backend-architect  | qa-lead   | devops-engineer   |
| Implement component tests | frontend-architect | frontend-architect | qa-lead   | backend-architect |
| Create GitHub issues      | qa-lead            | qa-lead            | all       | all               |

## Escalation Rules

**Low Risk:** Responsible decides, notify same day  
**Medium Risk:** Accountable reviews (< 2 hours)  
**High Risk:** Accountable + main approve  
**Blocker:** Escalate immediately to main

## Success Criteria

- TypeScript: 0 errors ✅
- ESLint: 0 violations ✅
- Unit coverage: 65% → 80% 🎯
- Component tests: 1 → 80+ ✅
- Maturities: 42% → 60% 🎯
```

---

## Automatic Agent Spawning

When you run `openclaw project spawn`:

```bash
# Spawns all team members with briefing
sessions_spawn({
  agentId: "devops-engineer",
  task: "Bigbot Week 1: Fix TypeScript & ESLint...",
  label: "Bigbot: Infrastructure Setup",
  model: "sonnet"
});

sessions_spawn({
  agentId: "backend-architect",
  task: "Bigbot Week 1: Implement unit tests...",
  label: "Bigbot: Backend Tests",
  model: "sonnet"
});

sessions_spawn({
  agentId: "frontend-architect",
  task: "Bigbot Week 1: Implement component tests...",
  label: "Bigbot: Frontend Tests",
  model: "sonnet"
});

sessions_spawn({
  agentId: "qa-lead",
  task: "Bigbot Week 1: Coordinate QA & metrics...",
  label: "Bigbot: QA Coordination",
  model: "sonnet"
});
```

---

## Daily Standup Generation

Auto-generates daily standups from RACI:

```bash
openclaw project standup bigbot-week1 --date 2026-02-06

# Output:
# 📋 BIGBOT WEEK 1 - DAILY STANDUP
# Date: Feb 6, 2026 | Day: 1/5
#
# 🎯 Today's Priorities
# - devops-engineer: Validate TypeScript setup
# - backend-architect: Analyze Trading module gaps
# - frontend-architect: Map untested components
# - qa-lead: Create GitHub issues
#
# 📊 Progress
# - Team readiness: 100%
# - Blockers: None yet
#
# 🚀 Next: Kickoff meeting 09:00 PST
```

---

## Project Status Dashboard

```bash
openclaw project status bigbot-week1

# Output:
# 📊 PROJECT: Bigbot Week 1
# Status: 🟢 ACTIVE (Day 1/5)
# Goal: 42% → 60% maturity
#
# 👥 TEAM (4 agents)
# ✅ qa-lead (coordinator)
# ✅ devops-engineer
# ✅ backend-architect
# ✅ frontend-architect
#
# 📈 PROGRESS
# Maturities: [████░░░░░░] 42%
# Test coverage: [███░░░░░░░] 30%
# Success criteria: 3/8 met
#
# ⏳ TIMELINE
# Days remaining: 5
# Standups: 5/5 planned
# Deliverables: 8 tracked
#
# 🔴 BLOCKERS: None
# 🟡 RISKS: TypeScript setup (high)
#
# Next standup: Tomorrow 09:00 PST
```

---

## Integration with OpenClaw

This skill integrates with:

- **team-coordinator** — For agent spawning
- **sessions_spawn** — To delegate tasks
- **message tool** — For status updates to Slack/Telegram
- **cron** — For scheduled standups
- **REGISTRY.md** — Central agent discovery
- **RESPONSIBILITIES.md** — RACI matrix enforcement

---

## Best Practices

1. **Template first** — Always use templates for consistency
2. **RACI clarity** — Define clear ownership before spawning
3. **Escalation paths** — Know who to contact for blockers
4. **Daily standups** — Keep team synchronized
5. **Metrics tracked** — Measure progress against success criteria
6. **Documentation** — Generate REGISTRY + RESPONSIBILITIES early

---

## Examples

### Bigbot Quality Week 1

```bash
openclaw project init bigbot-week1 \
  --template projects/templates/bigbot-week1.yaml \
  --output workspace/bigbot-week1/

# Auto-generates:
# - workspace/bigbot-week1/REGISTRY.md
# - workspace/bigbot-week1/RESPONSIBILITIES.md
# - workspace/bigbot-week1/ACTION_PLAN_WEEK1.md

# Spawn all agents
openclaw project spawn bigbot-week1 \
  --action briefing \
  --model sonnet
```

---

## See Also

- **team-coordinator** — Hierarchical agent delegation
- **delegate** — Simple task delegation
- **session-logs** — Track agent activity
- **workflow** — Project workflow management
