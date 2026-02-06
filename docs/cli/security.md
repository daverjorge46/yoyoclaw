---
summary: "CLI reference for `openclaw security` (audit, fix, and AI-driven risk assessment)"
read_when:
  - You want to run a quick security audit on config/state
  - You want to apply safe "fix" suggestions (chmod, tighten defaults)
  - You want to understand your agent's risk profile
title: "security"
---

# `openclaw security`

Security tools: static audit, automatic fixes, and AI-driven risk assessment.

Related:

- Security guide: [Security](/gateway/security)
- GRASP framework: [Risk Assessment](/security/grasp)

## Audit

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --fix
```

The audit warns when multiple DM senders share the main session and recommends **secure DM mode**: `session.dmScope="per-channel-peer"` (or `per-account-channel-peer` for multi-account channels) for shared inboxes.
It also warns when small models (`<=300B`) are used without sandboxing and with web/browser tools enabled.

## GRASP (AI Risk Assessment)

```bash
# Run AI-driven self-assessment
openclaw security grasp

# Analyze specific agent
openclaw security grasp --agent my-agent

# Output as JSON
openclaw security grasp --json

# Use a specific model for analysis
openclaw security grasp --model claude-3-5-sonnet

# Force fresh analysis (skip cache)
openclaw security grasp --no-cache
```

GRASP uses your configured AI model to assess risk across 5 dimensions:

| Dimension            | Question                      |
| -------------------- | ----------------------------- |
| **G**overnance       | Can we observe and intervene? |
| **R**each            | What can it touch?            |
| **A**gency           | How autonomous is it?         |
| **S**afeguards       | What limits damage?           |
| **P**otential Damage | What's the worst case?        |

Exit codes reflect overall risk level: `0`=low, `1`=medium, `2`=high, `3`=critical.

See [Risk Assessment (GRASP)](/security/grasp) for full documentation on interpreting results.
