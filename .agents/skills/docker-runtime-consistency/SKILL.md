---
name: docker-runtime-consistency
description: Ensures Dockerfile and compose runtime changes are applied and verified
  with consistent PATH/env behavior.
license: MIT
compatibility: Requires Docker/Compose access for build, restart, and verification.
metadata:
  author: openclaw
  version: "1.0"
---

# Docker Runtime Consistency

Use this skill when changes affect Docker runtime behavior (`Dockerfile`, `docker-compose.yml`, PATH/ENV, volumes, entrypoint, runtime deps).

## Required Workflow

1. Apply environment changes, not just source edits.
2. Rebuild/restart the affected services.
3. Run verification commands after apply.

## Mandatory Rules

- Any runtime-impacting change must be applied to the actual runtime environment.
- Validate after apply. "Changed but not verified" is incomplete.
- Keep Dockerfile and compose settings consistent.

## PATH Rule (Important)

If you add executable paths in Dockerfile (Homebrew, CLI bins), mirror them in compose `environment.PATH` for both:

- `openclaw-gateway`
- `openclaw-cli`

Compose may override PATH, so Dockerfile-only PATH edits are insufficient.

## Skills + Homebrew

Some skills depend on brew (`1password`, `goplaces`, `summarize`, `openai-whisper`). Ensure:

- brew is installed in image
- brew path is present in runtime PATH

## Typical Verification

- Rebuild image: `docker compose build`
- Restart/apply: `docker compose up -d <service>`
- PATH/binary check example:
  - `docker compose run --rm --entrypoint sh openclaw-cli -c "which brew && brew --version"`

## Source Mount Note

This repo mounts:

- `.:/app`
- anonymous `/app/node_modules`

After code changes, host-side `pnpm build` + service restart is often enough for verification.
