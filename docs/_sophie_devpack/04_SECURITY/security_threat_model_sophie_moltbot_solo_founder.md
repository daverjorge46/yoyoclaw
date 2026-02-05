# Security & Threat Model — Sophie / Moltbot
**Version:** v2.0 (Authoritative)
**Date:** 2026-02-04
**Audience:** Solo Founder / High‑Value Individual
**Scope:** This document defines the **non‑negotiable security posture** for Sophie/Moltbot as an *agentic AI system* with execution capability. It supersedes any prior generic LLM security assumptions.

---

## 0) Executive Security Posture (Read This First)

Sophie/Moltbot is **not a chatbot**. It is **agentic software** capable of reading files, calling tools, making network requests, and influencing business actions.

**Security stance:**

- Treat Moltbot as **untrusted code operating with privileged access**
- Assume **all inbound content is hostile**
- Assume **LLMs cannot distinguish intent** between you and an attacker
- Default to **fail‑closed + human‑in‑the‑loop (HITL)**

Failure modes are **financial loss, data exfiltration, reputation damage, and legal exposure**.

---

## 1) Threat Model (Solo Founder Reality)

### Assets at Risk

- API keys (LLMs, Dialpad, email, Supabase)
- Client communications (emails, call notes)
- Proprietary deal data
- Contact databases (owners, buyers)
- Reputation and regulatory standing

### Threat Actors

- Opportunistic attackers (drive‑by prompt injection)
- Malicious brokers / competitors
- Malware already on host (infostealers)
- Supply‑chain attackers (plugins, fake releases)

---

## 2) Core Vulnerability Class: Agentic AI Instruction Confusion

**Root problem:** LLMs cannot reliably distinguish between:

- your instructions
- malicious instructions embedded in emails, PDFs, websites, or messages

Therefore:

> **No external content may ever directly trigger tools or actions.**

External content may only be:

- read
- summarized
- extracted into *non‑actionable* data structures

---

## 3) Critical Vulnerabilities & Required Mitigations

### A) Remote Code Execution (RCE)

**Risk:** Exec/shell tools can run arbitrary commands if influenced by injected prompts.

**Rules:**

- Exec / shell tools are **DISABLED by default**
- Enabling requires:
  - explicit compile‑time flag
  - per‑execution approval
  - command allowlist
  - sandboxed runtime

**Never:**
- pass LLM output directly to shell
- allow free‑form command strings

---

### B) Plaintext Credential Exposure

**Risk:** API keys and session tokens stored on disk are prime infostealer targets.

**Rules:**

- Secrets via **environment variables only**
- Never written to disk
- Never logged
- Never sent to LLM context
- Automatic redaction + hashing in logs

---

### C) Excessive Host Permissions

**Risk:** Bot runs with full user privileges.

**Rules:**

- Moltbot must run in:
  - Docker **or**
  - Dedicated VM
- No access to:
  - home directory
  - browser data
  - SSH keys
  - cloud credentials

---

### D) Localhost Trust Bypass

**Risk:** Reverse proxies can make remote attackers appear as localhost.

**Rules:**

- **No localhost trust**
- All connections require authentication
- Gateway never infers trust from IP alone

---

### E) Unauthenticated WebSockets

**Risk:** Local or browser‑based WS hijacking.

**Rules:**

- All WS connections require token auth
- Origin validation enforced
- No anonymous WS endpoints

---

### F) Prompt Injection (Direct & Indirect)

**Risk:** Hidden instructions in emails, PDFs, websites.

**Rules:**

- All external content marked **TAINTED**
- Tainted content:
  - cannot call tools
  - cannot modify state
  - cannot send messages
  - cannot make network requests

---

### G) Plugin / Supply‑Chain Attacks

**Risk:** Malicious or compromised plugins.

**Rules:**

- No auto‑install
- Manual review required
- Signed plugins only
- Dependency pinning required
- Kill‑switch available

---

## 4) Network & Deployment Hardening

### Mandatory Deployment Model

- Run Moltbot in **isolated Docker or VM**
- No direct internet exposure
- Access via **VPN only** (Tailscale/WireGuard)
- Firewall allowlist by IP

### Authentication

- Gateway auth always enabled
- MFA via external auth proxy if exposed

---

## 5) Human‑in‑the‑Loop (HITL) Rules

**Non‑negotiable:**

Sophie **never executes outbound actions autonomously**.

### Actions Requiring Approval

- Sending emails/messages
- Writing to databases
- Executing commands
- Uploading files
- Triggering workflows

Sophie may only:

- draft
- propose
- queue for approval

---

## 6) Logging & Telemetry (Safe by Design)

**Logged:**

- timestamps
- event types
- tool names
- hashed identifiers

**Never logged:**

- raw prompts
- secrets
- credentials
- full message bodies

Logs are:

- rotated
- retained minimally
- stored locally

---

## 7) Incident Response Mini‑Runbook

### Suspected Compromise

1. Stop Moltbot immediately
2. Disconnect network
3. Rotate **all** API keys
4. Revoke session tokens
5. Inspect logs for:
   - unexpected tool calls
   - outbound attempts

### Recovery

- Rebuild sandbox
- Restore known‑good config
- Re‑enable tools selectively

---

## 8) Final Verdict

Until proven otherwise:

> **Assume Moltbot is always one prompt away from doing something stupid.**

The architecture must make that stupidity harmless.

---

**Owner Acknowledgement:**
These rules are mandatory before expanding Sophie’s autonomy.

