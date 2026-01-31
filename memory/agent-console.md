# Agent Console — Complete Reference

> **What:** Real-time operations dashboard for AI agent fleets — "Datadog for AI Agents"
> **Who:** David Hurley (founder), DBH Ventures / WithCandor LLC
> **Contact:** hello@agentconsole.app
> **Founded:** January 2026
> **Status:** MVP COMPLETE January 30, 2026 🚀

## Core Thesis

As organizations deploy multiple AI agents, a critical visibility gap emerges. Existing tools (LangSmith, Arize, AgentOps.ai) are **observability-focused** — they show traces AFTER execution. Nobody is building the **ops console** — the thing you stare at while agents run.

**Key insight:** "Datadog for AI Agents — but real-time, with task context and intervention."

## Key Differentiators

| Solution | Built For | Model | Limitation |
|----------|-----------|-------|------------|
| LangSmith | Developers | Traces | Retrospective, LangChain-first |
| Arize Phoenix | ML Engineers | Metrics | Model focus, not agent focus |
| AgentOps.ai | Developers | Replay | Python-only, no intervention |
| Microsoft Agent 365 | Enterprises | Lifecycle | M365/Azure locked |
| **Agent Console** | **Operators** | **Real-Time Ops** | Built for running fleets |

## Key Features

1. **Real-Time Agent Status** — Live feed of running/paused/idle/errored
2. **Task ↔ Session Linking** — "This task spawned these sessions, cost $X, took Y minutes"
3. **Intervention Capabilities** — Pause, inject context, redirect, kill
4. **Cost/Token Tracking** — Per-agent, per-task, per-model breakdown
5. **Multi-Framework Support** — OpenClaw first, then LangChain, CrewAI, AutoGen

## Business Model

**Pricing Tiers:**
- **Free ($0):** 3 agents
- **Pro ($29/mo):** 10 agents
- **Team ($99/mo):** 50 agents
- **Enterprise:** Custom (unlimited)

---

## Repository

### agent-console (github.com/dbhurley/agent-console) — PRIVATE

- **Path:** ~/Git/agent-console
- **Tech:** Next.js 16, React 19, Tailwind CSS, TypeScript, SSE for real-time
- **Hosting:** Vercel
- **Domains:** agentconsole.app (landing), dashboard.agentconsole.app (app)

**Structure:**
```
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing page
│   │   ├── layout.tsx            # Root layout
│   │   └── dashboard/            # Dashboard pages
│   │       ├── page.tsx          # Main dashboard
│   │       ├── agents/           # Agent management
│   │       ├── sessions/         # Session viewer
│   │       └── settings/         # Settings
│   ├── components/               # UI components
│   ├── lib/                      # Utilities
│   └── styles/                   # Global styles
├── public/                       # Static assets
├── docs/                         # Documentation
└── README.md
```

---

## Infrastructure

### Vercel
- **Project:** agent-console
- **Domains:** agentconsole.app, dashboard.agentconsole.app

### Authentication
- **Password:** AgentConsole2026! (MVP basic auth)
- **Gateway Token:** ac-gateway-2026-secure

### Future Infrastructure (planned)
- SSE/WebSocket for real-time updates
- Postgres for agent/session data
- Stripe for billing

---

## Agent Definitions

Sub-agents defined for incubation work (available for spawning):

| Agent | Role | Icon |
|-------|------|------|
| **Project Manager** | Triage, planning, oversight | 📋 |
| **Builder** | Development, implementation | 🛠️ |
| **Scout** | Research, competitive analysis | 🔍 |
| **Canvas** | Design, UI/UX, visual assets | 🎨 |
| **Scribe** | Content, copywriting, docs | ✍️ |
| **Sentinel** | Security, QA, testing | 🛡️ |
| **Analyst** | Data, financial modeling | 📊 |
| **Tester** | E2E testing, validation | 🧪 |

---

## Domains & URLs

| URL | What | Hosted On |
|-----|------|-----------|
| agentconsole.app | Landing page | Vercel |
| dashboard.agentconsole.app | Dashboard app | Vercel |

---

## Vikunja Project

- **Project ID:** 8
- **URL:** https://projects.timespent.xyz
- **Title:** 🎛️ Agent Ops Console

---

## Current Status (January 2026)

### ✅ Completed
- Landing page with hero, features, pricing
- Dashboard with agent cards, session viewer
- Task ↔ session linking with Vikunja
- Mobile-first responsive design
- Security review completed
- Sub-agent definitions (8 agents)
- Basic auth for MVP

### 🚧 Next Steps
- GitHub Actions CI
- Social handles (@agentconsole)
- SSE for real-time updates
- More gateway integrations
- Stripe checkout

---

## Key Documents

- **Full Spec:** `/Users/steve/clawd/memory/agent-ops-console-spec.md`
- **README:** `/Users/steve/Git/agent-console/README.md`

---

## Relationship to Other Projects

- **OpenClaw:** Primary integration target; Agent Console monitors OpenClaw sessions
- **MeshGuard:** Complementary — MeshGuard governs, Agent Console monitors
- **Mission Control:** Internal predecessor; Agent Console is the productized version

---

*Last updated: January 31, 2026*
