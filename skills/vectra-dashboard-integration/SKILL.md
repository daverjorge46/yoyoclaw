---
name: vectra-dashboard-integration
description: Integrate OpenClaw context into Vectra dashboard flows and build dashboard features such as Vectra chat surface, nodes overview, and repositories preview. Trigger when users ask to wire OpenClaw + Vectra together, design dashboard modules, or implement/verify dashboard data pipelines.
metadata:
  {
    "openclaw":
      {
        "emoji": "🛰️",
        "requires": { "bins": ["node", "pnpm"] }
      },
  }
---

# Vectra Dashboard Integration

Use this workflow to implement or update dashboard features that expose OpenClaw-aware Vectra state.

## Integration Workflow

1. Clarify target panel(s): chat, nodes, repositories.
2. Locate source data path in Vectra (`apps/vectra-desktop`, `apps/vectra-server`, `vectra.mjs`).
3. Define contract for each panel (fields, refresh interval, error state).
4. Implement smallest end-to-end slice first (one panel visible with real data).
5. Validate via desktop run and CLI sanity checks.
6. Summarize what shipped and list next slices.

For panel contracts and acceptance checks, read `references/panels.md`.

## Baseline Commands

```bash
pnpm install
pnpm dev:desktop
node vectra.mjs status
node vectra.mjs nodes
node vectra.mjs overmind
```

## Delivery Standard

- Prefer incremental slices over big-bang rewrites.
- Keep loading/empty/error states explicit in UI.
- Keep dashboard data read paths deterministic and debuggable.
- Pair UI changes with at least one reproducible verification step.

## Handoff Format

Report in this structure:

1. Panels implemented/updated.
2. Data sources used.
3. Verification commands run.
4. Known gaps and exact next task.
