# Security Policy

YoyoClaw is a local, security-hardened fork of [OpenClaw](https://github.com/openclaw/openclaw). Security reporting depends on where the issue originates:

- **Security issues in core OpenClaw functionality** -- Report upstream per OpenClaw's security policy (see below).
- **Security issues in YoyoClaw extensions or local customizations** (e.g., `yoyo-dev-bridge`, `yoyo-memory-sync`, custom skills, UI theming) -- Report to the [Yoyo Dev AI repository](https://github.com/daverjorge46/yoyo-dev-ai).

If you believe you've found a security issue in core OpenClaw, please report it privately.

## Upstream Reporting

Report core OpenClaw vulnerabilities directly to the upstream repository:

- **Core CLI and gateway** -- [openclaw/openclaw](https://github.com/openclaw/openclaw)
- **macOS desktop app** -- [openclaw/openclaw](https://github.com/openclaw/openclaw) (apps/macos)
- **iOS app** -- [openclaw/openclaw](https://github.com/openclaw/openclaw) (apps/ios)
- **Android app** -- [openclaw/openclaw](https://github.com/openclaw/openclaw) (apps/android)

For issues that don't fit a specific repo, or if you're unsure, email the OpenClaw security team via their [Trust page](https://trust.openclaw.ai).

### Required in Reports

1. **Title**
2. **Severity Assessment**
3. **Impact**
4. **Affected Component**
5. **Technical Reproduction**
6. **Demonstrated Impact**
7. **Environment**
8. **Remediation Advice**

Reports without reproduction steps, demonstrated impact, and remediation advice will be deprioritized. Given the volume of AI-generated scanner findings, we must ensure we're receiving vetted reports from researchers who understand the issues.

## Bug Bounties

YoyoClaw is a community project. There is no bug bounty program and no budget for paid reports. Please still disclose responsibly so we can fix issues quickly. The best way to help the project right now is by sending PRs.

## Out of Scope

- Public Internet Exposure
- Using YoyoClaw in ways that the docs recommend not to
- Prompt injection attacks

## Operational Guidance

For threat model and hardening guidance, see the upstream documentation.

### Tool filesystem hardening

- `tools.exec.applyPatch.workspaceOnly: true` (recommended): keeps `apply_patch` writes/deletes within the configured workspace directory.
- `tools.fs.workspaceOnly: true` (optional): restricts `read`/`write`/`edit`/`apply_patch` paths to the workspace directory.
- Avoid setting `tools.exec.applyPatch.workspaceOnly: false` unless you fully trust who can trigger tool execution.

### Web Interface Safety

YoyoClaw's web interface (Gateway Control UI + HTTP endpoints) is intended for **local use only**.

- Recommended: keep the Gateway **loopback-only** (`127.0.0.1` / `::1`).
  - Config: `gateway.bind="loopback"` (default).
  - CLI: `node yoyoclaw.mjs gateway run --bind loopback`.
- Do **not** expose it to the public internet (no direct bind to `0.0.0.0`, no public reverse proxy). It is not hardened for public exposure.
- If you need remote access, prefer an SSH tunnel or Tailscale serve/funnel (so the Gateway still binds to loopback), plus strong Gateway auth.

## Runtime Requirements

### Node.js Version

YoyoClaw requires **Node.js 22.12.0 or later** (LTS). This version includes important security patches:

- CVE-2025-59466: async_hooks DoS vulnerability
- CVE-2026-21636: Permission model bypass vulnerability

Verify your Node.js version:

```bash
node --version  # Should be v22.12.0 or later
```

### Docker Security

When running YoyoClaw in Docker:

1. The official image runs as a non-root user (`yoyoclaw`) for reduced attack surface
2. Use `--read-only` flag when possible for additional filesystem protection
3. Limit container capabilities with `--cap-drop=ALL`

Example secure Docker run:

```bash
docker run --read-only --cap-drop=ALL \
  -v yoyoclaw-data:/app/data \
  yoyoclaw:local
```

## Security Scanning

This project uses `detect-secrets` for automated secret detection in CI/CD.
See `.detect-secrets.cfg` for configuration and `.secrets.baseline` for the baseline.

Run locally:

```bash
pip install detect-secrets==1.5.0
detect-secrets scan --baseline .secrets.baseline
```
