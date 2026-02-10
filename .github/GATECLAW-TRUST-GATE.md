# GateClaw Trust Gate (v0)

This repository uses a lightweight trust gate to reduce spam/noise on Issues and Pull Requests.

## How it works
- Trusted users in `.github/trust-gate-allowlist.txt` can open Issues/PRs normally.
- Existing collaborators (triage/write/maintain/admin) can open Issues/PRs normally.
- Other users get a polite auto-close message with an intake form link.

## Intake form
https://forms.gle/RkANccxPRtQ32fhk7

## Rollback
Revert the workflow file `.github/workflows/gateclaw-trust-gate.yml`.
