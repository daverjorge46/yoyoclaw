# Security & Threat Model — Sophie / Moltbot
**Version:** v1.0 (Authoritative)
**Date:** 2026-02-04
**Audience:** Founder, core developers, security reviewers

> **Principle:** This is a back‑office operator. Failure modes are legal, financial, and reputational — not UX bugs.

---

## 0) Security Posture (Hard Stance)
- **Fail‑closed by default.** If unsure → block + explain.
- **No silent actions.** Especially outbound comms and data writes.
- **Least privilege everywhere.** Models, tools, plugins, channels.
- **Evidence over inference.** Logs prove what happened.

---

## 1) Threat Model (Concrete)

### 1.1 Prompt Injection via Emails / Attachments / Web Pages

**Threat**
- External content instructs Sophie to ignore rules, exfiltrate data, or take actions.

**Attack Vectors**
- Broker blast emails
- Listing PDFs (hidden instructions)
- Web pages scraped for research
- Attachments with embedded prompts

**Controls**
- Treat **all external content as untrusted input**
- Mandatory SOPHIE_BASE_PROMPT enforces refusal behavior
- Preflight scans for injection phrases (e.g., "ignore previous instructions")
- Tool execution always mediated by Gate (never directly from model output)

**Tests**
- `007_injection_email_refusal.json`

**Residual Risk**
- Low, bounded to draft‑only proposals

---

### 1.2 Token / Secret Leakage (Logs & Outputs)

**Threat**
- API keys, tokens, or sensitive data end up in logs or outbound messages.

**Attack Vectors**
- Misconfigured debug logging
- Error stack traces
- Prompt echoing

**Controls**
- Logging contract forbids raw prompts by default
- SHA256 hashes instead of plaintext
- Secret pattern detection + redaction
- Never log env vars or auth headers

**Tests**
- `010_no_raw_prompt_logs.json`
- `019_secret_redaction.json`

**Residual Risk**
- Low if contracts are enforced

---

### 1.3 Tool Escalation (Unauthorized Side Effects)

**Threat**
- Agent calls high‑risk tools (send email, write DB) without approval.

**Attack Vectors**
- Hallucinated tool calls
- Prompt injection attempts
- Developer mis‑wiring

**Controls**
- Tool allowlist + risk classification
- Gate requires explicit approval for side effects
- No implicit auto‑execution
- Honeypot exception is template‑only + rate‑limited

**Tests**
- `005_send_email_requires_approval.json`
- `006_supabase_write_proposal.json`
- `009_honeypot_template_autosend_phase2.json`

**Residual Risk**
- Medium if dev bypasses gate → blocked by CI

---

### 1.4 Supply‑Chain Risk (Plugins / Extensions)

**Threat**
- Malicious or compromised plugin executes unsafe code or exfiltrates data.

**Attack Vectors**
- Third‑party plugins
- Transitive NPM dependencies
- Workspace misconfiguration

**Controls**
- Plugins must declare capabilities in manifest
- No wildcard permissions
- Review required before enabling new plugin
- Pin dependency versions (no ^/~)
- Never auto‑enable third‑party plugins in prod

**Tests**
- Manual review + limited automated checks

**Residual Risk**
- Medium — controlled via process, not tech alone

---

## 2) Hard Security Rules (Non‑Negotiable)

### 2.1 Outbound Communication
- **Rule:** Never send outbound messages without explicit approval
- **Exception:** Honeypot outbound under Honeypot Policy v1
- **Enforced by:** Gate + CI tests

### 2.2 URL / Domain Controls

**Default:**
- Deny all external URLs

**Allowlist (configurable):**
- Known broker sites
- Government / rate sources

**Forbidden:**
- URL shorteners
- Unknown TLDs

### 2.3 File Type Controls
- Allowed (read‑only): PDF, TXT, MD, CSV
- Blocked: EXE, DMG, ZIP (unless explicitly approved), HTML with scripts

### 2.4 Secret Handling
- Secrets via env vars only
- No secrets in config files
- Rotate keys immediately on suspicion

---

## 3) Incident Response Mini‑Runbook

### 3.1 Suspected Key Leak
1. Revoke key at provider (Moonshot, etc.)
2. Generate new key
3. Update env var
4. Restart gateway
5. Search logs for key hash

### 3.2 Disable Outbound Tools (Kill Switch)
- Set `tools.policy.side_effects = disabled`
- Restart gateway
- Verify gate denies all sends

### 3.3 Disable Provider Quickly
- Set `models.providers.moonshot.enabled = false`
- Gateway continues with locals

### 3.4 What Logs to Check
- `~/.clawdbot/logs/gateway/`
- `~/.clawdbot/logs/moonshot/`
- Gate decision logs

---

## 4) Security Review Checklist (Before Enabling Phase 2)
- [ ] Honeypot templates reviewed
- [ ] Rate limits tested
- [ ] URL/file denylist verified
- [ ] Gate tests passing
- [ ] Logs audited for redaction

---

## 5) Owner Sign‑Off
This document defines the security posture. Changes require explicit approval.

