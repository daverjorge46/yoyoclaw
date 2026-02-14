# Docs link health scan (Mintlify)

## Status

- [x] Fixes applied (Done 2026-02-14)

Date: 2026-02-14

## Scope

- Scanned `docs/**/*.md` for internal links containing `.md`.
- Scanned `docs/**/*.md` for absolute links to `https://docs.openclaw.ai` that should be root-relative per Mintlify rules.

## Findings

### Internal links containing `.md`

These appear to be internal doc cross-references and should be converted to root-relative paths without `.md` extensions.

- `docs/security/README.md`
  - `./THREAT-MODEL-ATLAS.md`
  - `./CONTRIBUTING-THREAT-MODEL.md`
- `docs/security/THREAT-MODEL-ATLAS.md`
  - `./CONTRIBUTING-THREAT-MODEL.md`
- `docs/security/CONTRIBUTING-THREAT-MODEL.md`
  - `./THREAT-MODEL-ATLAS.md`

Notes:

- Other `.md` links found in `docs/**` point to external GitHub repos or other external sites and do not violate Mintlify internal-link rules.

### Absolute links that should be root-relative

These point to `https://docs.openclaw.ai/...` inside docs and should be root-relative (e.g. `/hooks#my-hook`).

- `docs/automation/hooks.md`
  - `https://docs.openclaw.ai/hooks#my-hook`
- `docs/cli/browser.md`
  - `https://docs.openclaw.ai`
- `docs/cli/hooks.md`
  - `https://docs.openclaw.ai/hooks#session-memory`
- `docs/concepts/markdown-formatting.md`
  - `https://docs.openclaw.ai`
- `docs/install/exe-dev.md`
  - `https://docs.openclaw.ai/install`
- `docs/pi-dev.md`
  - `https://docs.openclaw.ai/testing`
  - `https://docs.openclaw.ai/start/getting-started`

### Generated zh-CN docs (do not edit unless requested)

The same absolute links appear in `docs/zh-CN/**`, but these files are generated and should not be edited unless explicitly requested.

- `docs/zh-CN/automation/hooks.md`
- `docs/zh-CN/cli/browser.md`
- `docs/zh-CN/cli/hooks.md`
- `docs/zh-CN/concepts/markdown-formatting.md`
- `docs/zh-CN/install/exe-dev.md`
- `docs/zh-CN/pi-dev.md`
