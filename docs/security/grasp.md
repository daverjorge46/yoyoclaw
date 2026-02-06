---
title: "Risk Assessment (GRASP)"
description: "AI-driven self-assessment to understand your agent's risk profile"
---

# Risk Assessment with GRASP

The `openclaw security grasp` command helps you understand your agent's risk profile using AI-driven self-assessment. GRASP turns vague concerns about AI agents into concrete, discussable dimensions.

## What is GRASP?

GRASP is a 5-part framework for reasoning about AI agent risk:

| Dimension            | Question                                 |
| -------------------- | ---------------------------------------- |
| **G**overnance       | Can we observe and intervene?            |
| **R**each            | What can it touch?                       |
| **A**gency           | How autonomous is it?                    |
| **S**afeguards       | What limits damage when things go wrong? |
| **P**otential Damage | What's the realistic worst case?         |

GRASP creates a shared language for discussing agent risk across technical and non-technical stakeholders. It's designed to surface trade-offs, not enforce standards. Zero risk means zero reward—the goal is to make risk **explicit, discussable, and owned**.

## Quick Start

```bash
# Run a GRASP assessment
openclaw security grasp

# Analyze a specific agent
openclaw security grasp --agent my-agent

# Output as JSON for tooling
openclaw security grasp --json
```

## How It Works

When you run `openclaw security grasp`, the command uses your configured AI model to perform a self-assessment of **all configured agents** (use `--agent <id>` to assess a specific one).

For each agent:

1. **Per-dimension analysis** — The AI examines configuration for each GRASP dimension
2. **Evidence gathering** — It reads config files, checks settings, and notes what it finds
3. **Risk scoring** — Each dimension receives a score (0-100) and level (low/medium/high/critical)
4. **Findings report** — Specific observations with context and optional remediation suggestions

The AI is essentially asked: "Given this agent's configuration and capabilities, assess its risk profile."

### Assessment Safety

The GRASP assessment agent runs in a **strictly read-only, sandboxed mode**:

- **Read-only access** — Can only read config files, not modify anything
- **No code execution** — Cannot run commands or scripts
- **No network access** — Cannot make outbound requests
- **No messaging** — Cannot send messages to channels
- **Ephemeral session** — No history saved, no context persists
- **Timeout enforced** — Hard limits prevent runaway execution

The assessment cannot affect your system or agent configuration in any way.

<Note>
Results may vary between runs. This is expected—the AI may explore different aspects or weight factors differently. Focus on the overall shape and findings rather than exact scores.
</Note>

## Understanding the Output

The output includes a visual risk profile, AI commentary for each dimension, and specific evidence for areas of concern.

### The Risk Profile

Each agent gets its own risk profile:

```
┌─────────────────────────────────────────────────────────────────┐
│ Agent: main (default)                                           │
├─────────────────────────────────────────────────────────────────┤
│  G  Governance     [████████░░░░░░░░░░░░]  38  LOW              │
│  R  Reach          [████████████░░░░░░░░]  58  MEDIUM           │
│  A  Agency         [██████████████░░░░░░]  72  HIGH             │
│  S  Safeguards     [██████░░░░░░░░░░░░░░]  28  LOW              │
│  P  Potential Dmg  [████████████████░░░░]  85  CRITICAL         │
│                                                                 │
│  Risk: HIGH (62)                                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Agent: cron-worker                                              │
├─────────────────────────────────────────────────────────────────┤
│  G  Governance     [██████░░░░░░░░░░░░░░]  30  LOW              │
│  R  Reach          [████░░░░░░░░░░░░░░░░]  18  LOW              │
│  A  Agency         [██████████████████░░]  90  CRITICAL         │
│  S  Safeguards     [████░░░░░░░░░░░░░░░░]  20  LOW              │
│  P  Potential Dmg  [██████░░░░░░░░░░░░░░]  30  LOW              │
│                                                                 │
│  Risk: MEDIUM (38)                                              │
└─────────────────────────────────────────────────────────────────┘

Overall Risk: HIGH (62)
```

### Dimension Commentary

Each dimension includes AI-generated commentary explaining the assessment:

```
R  Reach                                                    58  MEDIUM
   The agent has moderate access to external systems. Network binding
   is restricted to loopback, but filesystem access is broad and
   browser automation is enabled.

   Evidence:
   • gateway.bind = "loopback" limits network exposure
   • sandbox.workspaceAccess = "read-write" grants full filesystem
   • browser.enabled = true with no domain restrictions
   • mcp.servers includes 3 external integrations

A  Agency                                                   72  HIGH
   Significant autonomous capability. The agent can execute code
   and respond to triggers without human approval in most cases.

   Evidence:
   • tools.exec.ask = false allows unsupervised code execution
   • cron.enabled = true with 2 scheduled jobs
   • hooks.onMessage configured for auto-responses

P  Potential Damage                                         85  CRITICAL
   High worst-case impact. The agent has access to credentials and
   can send messages on behalf of the user.

   Evidence:
   • tools.exec.host = "gateway" runs on host machine
   • Channel tokens stored in ~/.openclaw/credentials/
   • Can send to all connected channels (Slack, Discord, Telegram)
```

<Note>
Evidence is only shown for dimensions with identified risk. Low-risk dimensions display commentary but omit evidence since there's nothing specific to flag.
</Note>

### Reading the Shape

The shape matters more than absolute values. The example profile shows:

- **Low governance** (38) — Good observability and control mechanisms
- **Medium reach** (58) — Moderate access to systems and data
- **High agency** (72) — Significant autonomy, may need attention
- **Low safeguards risk** (28) — Good protective controls in place
- **Critical potential damage** (85) — High worst-case impact if compromised

### Spotting Tension

Asymmetries highlight tension:

- **High agency + low safeguards** — Autonomous actions without containment
- **Broad reach + weak governance** — Wide access without visibility
- **High potential damage + weak safeguards** — No safety net for worst cases

These patterns surface disagreements early and make trade-offs concrete.

## The Five Dimensions

### Governance — Can we observe and intervene?

Governance assesses your ability to see what the agent is doing and stop it when needed.

**What's examined:**

- Logging settings (level, file output, redaction)
- Diagnostics and monitoring
- Approval requirements for actions
- Control UI availability
- Session logs and audit trails

**Low risk looks like:**

- Full logging enabled with audit trails
- Diagnostics capturing tool calls
- Approval required for sensitive actions
- Control UI accessible with kill switch

**High risk looks like:**

- Minimal or no logging
- No approval workflow
- No way to observe or stop the agent remotely

### Reach — What can it touch?

Reach assesses the systems, data, and networks the agent can access—both explicitly granted and implicitly available.

**What's examined:**

- Network binding (loopback vs LAN vs internet)
- Filesystem access patterns
- Tool profiles and allowlists
- Browser control settings
- Channel connections
- MCP server integrations

**Low risk looks like:**

- Loopback-only network binding
- Minimal tool access
- No filesystem write access
- No browser control

**High risk looks like:**

- Internet-exposed gateway
- Full tool access
- Unrestricted filesystem
- Browser automation enabled

<Warning>
If an agent can run arbitrary CLI commands, assume it can touch anything the host can access. This includes stored credentials, SSH keys, and network-accessible resources.
</Warning>

### Agency — How autonomous is it?

Agency assesses how much the agent can do without human approval.

**What's examined:**

- Sandbox mode settings
- Exec security and approval requirements
- Elevated/sudo capabilities
- Scheduled tasks (cron jobs)
- Hooks and triggers
- Auto-reply settings

**Low risk looks like:**

- All actions require approval
- No scheduled tasks
- No hooks or triggers
- Request-only operation

**High risk looks like:**

- Full autonomy for code execution
- Scheduled tasks running unattended
- Elevated access available
- Auto-responses without review

### Safeguards — What limits damage?

Safeguards assess the mechanisms that contain damage when something goes wrong.

**What's examined:**

- Docker/sandbox isolation
- Network restrictions
- Resource limits (memory, CPU)
- Safe binary allowlists
- Rate limiting
- Content filtering

**Low risk looks like:**

- Full sandbox isolation
- Network isolated or restricted
- Resource limits enforced
- Allowlists for dangerous operations

**High risk looks like:**

- No sandbox
- Unrestricted network access
- No resource limits
- Full exec capabilities

### Potential Damage — What's the worst case?

Potential Damage assesses the realistic worst-case impact if the agent is compromised or makes a serious mistake.

**What's examined:**

- Exec host (sandbox vs gateway vs node)
- Workspace access level
- Browser host control
- Credential access
- Channel access (messaging capabilities)
- Data access scope

**Low risk looks like:**

- Sandboxed execution
- No credential access
- Limited data access
- No messaging capabilities

**High risk looks like:**

- Full system access
- Credential access available
- Can message as the user
- Access to sensitive data

## Example Profiles

### Development Workstation Agent

Running a coding agent on your primary development machine:

| Dimension        | Score | Notes                                          |
| ---------------- | ----- | ---------------------------------------------- |
| Governance       | 45    | Some logging, manual approval                  |
| Reach            | 75    | Full filesystem, stored credentials, CLI tools |
| Agency           | 30    | Human approval on all actions                  |
| Safeguards       | 50    | Version control provides rollback              |
| Potential Damage | 70    | Database access, cloud credentials             |

**Risk shape:** High reach and potential damage, offset by low agency (human in the loop).

### Sandboxed CI Agent

Same agent running in an ephemeral sandbox:

| Dimension        | Score | Notes                                   |
| ---------------- | ----- | --------------------------------------- |
| Governance       | 40    | Limited logging, remote kill switch     |
| Reach            | 20    | Local filesystem only, no network       |
| Agency           | 80    | Fully autonomous within sandbox         |
| Safeguards       | 15    | VM can be destroyed, commits reversible |
| Potential Damage | 25    | Worst case is wasted compute            |

**Risk shape:** High agency acceptable because reach and damage are tightly bounded.

## Interpreting Results

GRASP is a **risk profile**, not a pass/fail test.

- **Scores closer to center** = more conservative design
- **Scores further out** = deliberate trade-offs for capability

Risk isn't inherently bad. A high agency score might be exactly what you want for an autonomous coding assistant—as long as you've made that choice deliberately and have appropriate safeguards.

### Questions to Ask

After running GRASP, consider:

1. **Does this profile match the agent's intended role?**
2. **Are the high-risk dimensions intentional trade-offs?**
3. **Do asymmetries (high agency + low safeguards) need attention?**
4. **Would non-technical stakeholders accept this risk profile?**

### When to Re-assess

GRASP profiles are temporal—they describe your agent at a moment in time. Re-run assessment when:

- Adding new tools or integrations
- Changing network exposure
- Enabling scheduled tasks
- Granting elevated permissions
- Before production deployment

## CLI Reference

```bash
openclaw security grasp [options]

Options:
  --agent <id>    Analyze specific agent only (default: all)
  --model <model> Model to use for analysis
  --json          Output as JSON
  --no-cache      Force fresh analysis (skip cache)
```

Exit codes:

- `0` — Low overall risk
- `1` — Medium overall risk
- `2` — High overall risk
- `3` — Critical overall risk

## JSON Output

Use `--json` for integration with other tools. The `agents` array contains results for all assessed agents:

```json
{
  "ts": 1707200000000,
  "modelUsed": "claude-3-5-sonnet",
  "agents": [
    {
      "agentId": "main",
      "isDefault": true,
      "dimensions": [
        {
          "dimension": "governance",
          "label": "Governance",
          "score": 38,
          "level": "low",
          "findings": [...],
          "reasoning": "..."
        }
      ],
      "overallScore": 62,
      "overallLevel": "high"
    },
    {
      "agentId": "cron-worker",
      "isDefault": false,
      "dimensions": [...],
      "overallScore": 38,
      "overallLevel": "medium"
    }
  ],
  "overallScore": 62,
  "overallLevel": "high",
  "summary": { "critical": 1, "warn": 3, "info": 5 }
}
```

## Related

- [Security Audit](/cli/security) — Static security checks
- [Sandboxing](/gateway/sandboxing) — Isolation controls
- [Gateway Security](/gateway/security) — Security configuration

---

GRASP was created by [Hamish Songsmith](https://hsongsmith.com/?post=get-a-grasp) as a framework for aligning technical and non-technical stakeholders on AI agent risk.
