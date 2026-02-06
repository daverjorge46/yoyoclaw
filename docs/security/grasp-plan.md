# Implementation Plan: `openclaw security grasp` (AI-Driven Self-Assessment)

## Branch

Create feature branch: `git checkout -b feat/security-grasp`

## Overview

Add a new `openclaw security grasp` command that performs **AI-driven self-assessment** of an OpenClaw agent instance. Unlike static analysis, the AI actively explores configuration, tool definitions, and capabilities to reason about risk across 5 dimensions:

- **G**overnance: Can we observe and intervene?
- **R**each: What can it touch?
- **A**gency: How autonomous is it?
- **S**afeguards: What limits damage?
- **P**otential Damage: What's the worst case?

## How Analysis Works (AI Self-Review)

The GRASP command uses AI introspection:

1. **Per-dimension prompts** - Each GRASP dimension has a dedicated system prompt
2. **AI explores freely** - The agent has access to file/config reading tools
3. **AI reasons about risk** - The model analyzes what it finds and assesses risk
4. **Structured output** - Each dimension returns JSON with score, findings, and commentary
5. **Non-deterministic** - Results may vary between runs (acceptable)

The AI is essentially asked: "Given your current configuration and capabilities, assess your own risk profile for this dimension."

## File Structure

```
src/security/grasp/
  types.ts              # TypeScript types for GRASP assessment
  index.ts              # Main orchestration, exports runGraspAssessment()
  prompts/
    index.ts            # Re-exports all dimension prompts
    governance.md       # Governance prompt content (markdown)
    governance.ts       # Loads governance.md, exports DimensionPrompt
    reach.md            # Reach prompt content (markdown)
    reach.ts            # Loads reach.md, exports DimensionPrompt
    agency.md           # Agency prompt content (markdown)
    agency.ts           # Loads agency.md, exports DimensionPrompt
    safeguards.md       # Safeguards prompt content (markdown)
    safeguards.ts       # Loads safeguards.md, exports DimensionPrompt
    potential-damage.md # Potential damage prompt content (markdown)
    potential-damage.ts # Loads potential-damage.md, exports DimensionPrompt
  runner.ts             # Runs AI analysis for a single dimension
  scoring.ts            # Score aggregation utilities
  format.ts             # Terminal output formatting (bar chart, tables)
  grasp.test.ts         # Unit tests

src/cli/security-cli.ts # Modify: Add 'grasp' subcommand
```

### Prompt File Pattern

Prompts are stored as `.md` files alongside thin `.ts` loaders. This keeps prompt content editable without touching code:

```typescript
// governance.ts - thin loader
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import type { DimensionPrompt } from "../types.js";

const promptPath = new URL("./governance.md", import.meta.url);
const systemPrompt = readFileSync(fileURLToPath(promptPath), "utf-8");

export const GOVERNANCE_PROMPT: DimensionPrompt = {
  dimension: "governance",
  label: "Governance",
  systemPrompt,
};
```

## Data Model (`src/security/grasp/types.ts`)

```typescript
export type GraspDimension = "governance" | "reach" | "agency" | "safeguards" | "potential_damage";
export type GraspRiskLevel = "low" | "medium" | "high" | "critical";
export type GraspSeverity = "info" | "warn" | "critical";

export type GraspFinding = {
  id: string; // e.g., "governance.logging_disabled"
  dimension: GraspDimension;
  severity: GraspSeverity;
  signal: string; // What the AI looked at
  observation: string; // What the AI observed
  riskContribution: number; // 0-100
  title: string;
  detail: string;
  remediation?: string;
};

export type GraspDimensionResult = {
  dimension: GraspDimension;
  label: string; // "Governance", "Reach", etc.
  score: number; // 0-100 (higher = more risk)
  level: GraspRiskLevel;
  findings: GraspFinding[];
  reasoning: string; // AI's reasoning/commentary
  exploredPaths: string[]; // Files/configs the AI examined
};

export type GraspAgentProfile = {
  agentId: string;
  isDefault: boolean;
  dimensions: GraspDimensionResult[];
  overallScore: number;
  overallLevel: GraspRiskLevel;
  summary: string; // AI-generated summary
};

export type GraspReport = {
  ts: number;
  modelUsed: string; // Which model performed the analysis
  agents: GraspAgentProfile[];
  globalFindings: GraspFinding[]; // Gateway/channel findings
  overallScore: number;
  overallLevel: GraspRiskLevel;
  summary: { critical: number; warn: number; info: number };
};

export type GraspOptions = {
  config: OpenClawConfig;
  agentId?: string; // Specific agent (default: all)
  model?: string; // Model to use for analysis
};
```

## Dimension Prompts

Each dimension has a dedicated prompt stored as a `.md` file. The AI has access to tools for reading files.

### Governance Prompt (`src/security/grasp/prompts/governance.md`)

```markdown
You are performing a security self-assessment of an OpenClaw agent instance.

DIMENSION: Governance
QUESTION: Can operators observe and intervene on this agent's behavior?

Your task is to explore the configuration and assess governance controls.

## What to Explore

Use the file reading tools to examine:

- The main config file (path provided in user message)
- Logging settings: logging.level, logging.file, logging.redactSensitive
- Diagnostic settings: diagnostics.enabled
- Approval settings: approvals.\*, tools.exec.ask
- Gateway control UI: gateway.controlUi.\*
- Agent-specific overrides in agents.\* config
- Session/transcript paths for audit trails

## Risk Signals to Assess

- Can operators see what the agent is doing? (logging verbosity, diagnostics)
- Can operators stop or redirect the agent? (control UI, approval requirements)
- Are there blind spots? (redacted logs, disabled diagnostics, silent mode)
- Is there an audit trail? (session logs, transcripts)
- Are there alerting mechanisms for anomalies?

## Required Output Format

Return ONLY valid JSON matching this structure:
{
"score": <number 0-100, higher = more risk>,
"level": "<low|medium|high|critical>",
"findings": [
{
"id": "governance.<finding_id>",
"severity": "<info|warn|critical>",
"signal": "<config path or area examined>",
"observation": "<what you found>",
"riskContribution": <number 0-100>,
"title": "<short descriptive title>",
"detail": "<detailed explanation>",
"remediation": "<optional suggested fix>"
}
],
"reasoning": "<your analysis explaining the score>",
"exploredPaths": ["<list of files/paths you examined>"]
}

## Scoring Guide

- 0-25 (low): Full observability, approvals required for risky actions, complete audit trail
- 26-50 (medium): Partial observability, some approval mechanisms in place
- 51-75 (high): Limited observability, few intervention controls
- 76-100 (critical): Blind operation, no ability to observe or intervene

Be thorough but concise. Focus on actionable findings.
```

### Reach Prompt (`src/security/grasp/prompts/reach.md`)

```markdown
You are performing a security self-assessment of an OpenClaw agent instance.

DIMENSION: Reach
QUESTION: What systems and data can this agent access?

## What to Explore

- Gateway binding (gateway.bind, gateway.tailscale.mode)
- Workspace access (agents.\*.sandbox.workspaceAccess)
- Tool profiles (tools.profile, tools.allow, tools.deny)
- Browser control (browser.enabled, browser.\*)
- Subagent spawning (agents.\*.subagents.allowAgents)
- Channel connections (channels.\*)
- MCP servers (mcp.servers.\*)
- File system access patterns

## Risk Signals to Assess

- Network exposure (loopback vs LAN vs internet)
- Filesystem scope (none, read-only, read-write)
- Tool breadth (minimal vs full tool access)
- External integrations (browsers, APIs, channels)
- Agent spawning capabilities

## Required Output Format

Return ONLY valid JSON (same structure as governance).

## Scoring Guide

- 0-25 (low): Loopback only, minimal tools, no FS write
- 26-50 (medium): Local network, moderate tools, limited FS
- 51-75 (high): Wide network, many tools, broad FS access
- 76-100 (critical): Internet exposed, full tools, unrestricted FS
```

### Agency Prompt (`src/security/grasp/prompts/agency.md`)

```markdown
You are performing a security self-assessment of an OpenClaw agent instance.

DIMENSION: Agency
QUESTION: How autonomous is this agent?

## What to Explore

- Sandbox mode (agents.\*.sandbox.mode)
- Exec security (tools.exec.security, tools.exec.ask)
- Elevated mode (tools.elevated.enabled, tools.elevated.allowFrom)
- Cron/scheduled tasks (cron.enabled, cron.jobs)
- Hooks (hooks.enabled, hooks.\*)
- Auto-reply settings (autoReply.\*)
- Approval requirements

## Risk Signals to Assess

- Can it execute code without approval?
- Can it run scheduled tasks autonomously?
- Can it respond to triggers without human review?
- Does it have elevated/sudo capabilities?
- Are there guardrails on autonomous actions?

## Required Output Format

Return ONLY valid JSON (same structure as governance).

## Scoring Guide

- 0-25 (low): All actions require approval, no cron, no hooks
- 26-50 (medium): Some approved actions, limited automation
- 51-75 (high): Significant autonomy, automated responses
- 76-100 (critical): Full autonomy, elevated access, no approvals
```

### Safeguards Prompt (`src/security/grasp/prompts/safeguards.md`)

```markdown
You are performing a security self-assessment of an OpenClaw agent instance.

DIMENSION: Safeguards
QUESTION: What mechanisms limit potential damage?

## What to Explore

- Docker/sandbox isolation (sandbox.docker.\*)
- Network restrictions (sandbox.docker.network, sandbox.docker.capDrop)
- Resource limits (sandbox.docker.memory, sandbox.docker.cpu)
- Safe binary lists (tools.exec.safeBins)
- DM policies (channels.\*.dmPolicy)
- Rate limiting (rateLimit.\*)
- Content filtering/redaction

## Risk Signals to Assess

- Is code execution sandboxed?
- Are network capabilities restricted?
- Are resources capped?
- Are there allowlists for dangerous operations?
- Is sensitive content filtered?

## Required Output Format

Return ONLY valid JSON (same structure as governance).

## Scoring Guide

- 0-25 (low): Full sandbox, network isolated, resource limited
- 26-50 (medium): Partial sandbox, some network access
- 51-75 (high): Minimal isolation, broad access
- 76-100 (critical): No sandbox, unrestricted access
```

### Potential Damage Prompt (`src/security/grasp/prompts/potential-damage.md`)

```markdown
You are performing a security self-assessment of an OpenClaw agent instance.

DIMENSION: Potential Damage
QUESTION: What is the worst-case impact if this agent is compromised?

## What to Explore

- Exec host (tools.exec.host - sandbox vs gateway vs node)
- Workspace access level (sandbox.workspaceAccess)
- Browser host control (sandbox.browser.allowHostControl)
- Elevated access scope (tools.elevated.allowFrom.\*)
- Credential access (stored tokens, API keys)
- Channel access (what can it message/control)
- Data access (what files/DBs can it read/write)

## Worst-Case Scenarios to Assess

- Could it exfiltrate sensitive data?
- Could it modify/delete critical files?
- Could it send messages as the user?
- Could it access credentials or secrets?
- Could it pivot to other systems?

## Required Output Format

Return ONLY valid JSON (same structure as governance).

## Scoring Guide

- 0-25 (low): Sandboxed, no credentials, limited data access
- 26-50 (medium): Some data access, no credentials
- 51-75 (high): Broad data access, some credentials
- 76-100 (critical): Full system access, credentials, messaging
```

## AI Runner (`src/security/grasp/runner.ts`)

Runs a single dimension analysis:

```typescript
import { runEmbeddedPiAgent } from "../../agents/pi-embedded.js";
import type { OpenClawConfig } from "../../config/config.js";
import type { GraspDimension, GraspDimensionResult } from "./types.js";

export type DimensionPrompt = {
  dimension: GraspDimension;
  label: string;
  systemPrompt: string;
};

export async function runDimensionAnalysis(params: {
  config: OpenClawConfig;
  prompt: DimensionPrompt;
  agentId?: string;
  model?: string;
  workspaceDir: string;
  configPath: string;
  stateDir: string;
}): Promise<GraspDimensionResult> {
  // Create a temporary session for this analysis
  const sessionKey = `grasp:${params.prompt.dimension}:${Date.now()}`;

  // Build the user message that kicks off analysis
  const userMessage = `
Analyze the ${params.prompt.label} dimension for this OpenClaw instance.

Key paths to examine:
- Config: ${params.configPath}
- State: ${params.stateDir}
- Workspace: ${params.workspaceDir}

Return your analysis as JSON.
`;

  // Run the agent with the dimension prompt
  const result = await runEmbeddedPiAgent({
    sessionKey,
    config: params.config,
    systemPrompt: params.prompt.systemPrompt,
    message: userMessage,
    model: params.model,
    tools: ["read", "glob", "grep"], // Limited tool set for exploration
    maxTurns: 10, // Limit exploration depth
    outputFormat: "json",
  });

  // Parse the JSON response
  return parseDimensionResult(result, params.prompt);
}

function parseDimensionResult(
  result: /* agent result type */,
  prompt: DimensionPrompt
): GraspDimensionResult {
  // Extract JSON from agent response
  // Validate and normalize the structure
  // Return typed result
}
```

## Main Orchestration (`src/security/grasp/index.ts`)

```typescript
import { loadConfig, type OpenClawConfig } from "../../config/config.js";
import { resolveConfigPath, resolveStateDir } from "../../config/paths.js";
import { runDimensionAnalysis } from "./runner.js";
import { GOVERNANCE_PROMPT } from "./prompts/governance.js";
import { REACH_PROMPT } from "./prompts/reach.js";
import { AGENCY_PROMPT } from "./prompts/agency.js";
import { SAFEGUARDS_PROMPT } from "./prompts/safeguards.js";
import { POTENTIAL_DAMAGE_PROMPT } from "./prompts/potential-damage.js";
import { aggregateScores, levelFromScore } from "./scoring.js";
import type { GraspOptions, GraspReport, GraspAgentProfile } from "./types.js";

const DIMENSION_PROMPTS = [
  GOVERNANCE_PROMPT,
  REACH_PROMPT,
  AGENCY_PROMPT,
  SAFEGUARDS_PROMPT,
  POTENTIAL_DAMAGE_PROMPT,
];

export async function runGraspAssessment(opts: GraspOptions): Promise<GraspReport> {
  const configPath = resolveConfigPath();
  const stateDir = resolveStateDir();
  const workspaceDir = opts.config.agents?.defaults?.workspace ?? process.cwd();

  const agents: GraspAgentProfile[] = [];

  // For each agent (or just the specified one)
  const agentIds = opts.agentId ? [opts.agentId] : resolveAllAgentIds(opts.config);

  for (const agentId of agentIds) {
    const dimensions = [];

    // Run each dimension analysis
    for (const prompt of DIMENSION_PROMPTS) {
      const result = await runDimensionAnalysis({
        config: opts.config,
        prompt,
        agentId,
        model: opts.model,
        workspaceDir,
        configPath,
        stateDir,
      });
      dimensions.push(result);
    }

    const overallScore = aggregateScores(dimensions.map((d) => d.score));

    agents.push({
      agentId,
      isDefault: agentId === resolveDefaultAgentId(opts.config),
      dimensions,
      overallScore,
      overallLevel: levelFromScore(overallScore),
      summary: generateAgentSummary(dimensions),
    });
  }

  const overallScore = Math.max(...agents.map((a) => a.overallScore));

  return {
    ts: Date.now(),
    modelUsed: opts.model ?? "default",
    agents,
    globalFindings: [], // Extracted from governance/reach for gateway-level
    overallScore,
    overallLevel: levelFromScore(overallScore),
    summary: countBySeverity(agents.flatMap((a) => a.dimensions.flatMap((d) => d.findings))),
  };
}
```

## CLI Integration (`src/cli/security-cli.ts`)

Add the `grasp` subcommand:

```typescript
security
  .command("grasp")
  .description("AI-driven self-assessment of agent risk profile (GRASP)")
  .option("--agent <id>", "Analyze specific agent only")
  .option("--model <model>", "Model to use for analysis (default: configured model)")
  .option("--json", "Output as JSON")
  .option("--no-cache", "Force fresh analysis (skip cache)")
  .action(async (opts: GraspOptions) => {
    const cfg = loadConfig();
    const report = await runGraspAssessment({
      config: cfg,
      agentId: opts.agent,
      model: opts.model,
    });

    if (opts.json) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    console.log(formatGraspReport(report));
  });
```

## Output Format

The default output includes:

1. Visual risk profile (bar chart) for each agent
2. AI commentary for each dimension
3. Evidence bullets for risk areas only (low-risk dimensions show commentary but no evidence)

### Default View

```
OpenClaw GRASP Self-Assessment

Model: claude-3-5-sonnet (analyzed at 2024-01-15 10:30:00)

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

R  Reach                                                    58  MEDIUM
   The agent has moderate access to external systems. Network binding
   is restricted to loopback, but filesystem access is broad and
   browser automation is enabled.

   Evidence:
   • gateway.bind = "loopback" limits network exposure
   • sandbox.workspaceAccess = "read-write" grants full filesystem
   • browser.enabled = true with no domain restrictions

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

Overall Risk: HIGH (62)
Summary: 1 critical · 2 warn · 5 info
```

Note: Low-risk dimensions (Governance, Safeguards in this example) show only commentary, not evidence bullets.

## CLI Options

```
openclaw security grasp [options]

Options:
  --agent <id>    Analyze specific agent only (default: all configured agents)
  --model <model> Model to use for analysis (default: configured model)
  --json          Output as JSON
  --no-cache      Force fresh analysis (skip cache)
```

Exit codes: 0=low, 1=medium, 2=high, 3=critical

## Implementation Steps

1. **Create `src/security/grasp/types.ts`** - Type definitions
2. **Create dimension prompts** (`src/security/grasp/prompts/*.ts`) - One file per dimension
3. **Create `src/security/grasp/runner.ts`** - Single dimension AI runner
4. **Create `src/security/grasp/scoring.ts`** - Score aggregation utilities
5. **Create `src/security/grasp/format.ts`** - Terminal output formatting
6. **Create `src/security/grasp/index.ts`** - Main orchestration
7. **Modify `src/cli/security-cli.ts`** - Add `grasp` subcommand
8. **Create `src/security/grasp/grasp.test.ts`** - Unit tests

## Key Implementation Details

### AI Runner Integration

The runner needs to:

1. Create a temporary/ephemeral session (no persistence needed)
2. Give the AI limited tools: `read`, `glob`, `grep` (no exec, no write)
3. Enforce structured JSON output
4. Parse and validate the response
5. Handle timeouts/failures gracefully

### Security Constraints

**CRITICAL: The GRASP assessment agent must be strictly read-only and sandboxed.**

#### Allowed Tools (Read-Only)

| Tool   | Purpose                      | Constraints                                |
| ------ | ---------------------------- | ------------------------------------------ |
| `read` | Read config files, logs      | Path restrictions apply (see below)        |
| `glob` | Find files matching patterns | No symlink following outside allowed paths |
| `grep` | Search file contents         | Read-only search                           |

#### Explicitly Denied Tools

The assessment agent must NOT have access to:

- **`exec` / `bash`** — No command execution whatsoever
- **`write` / `edit`** — No file modifications
- **`browser`** — No web access or automation
- **`mcp`** — No MCP server connections
- **`subagent`** — Cannot spawn other agents
- **`message` / `channel`** — Cannot send messages
- **`network`** — No outbound network requests
- **`elevated`** — No elevated/sudo operations

#### Path Restrictions

The assessment agent can only read from:

- `~/.openclaw/` — Config, credentials metadata (NOT credential values), state
- `~/.config/openclaw/` — Alternate config location
- Current workspace (if configured) — Read-only access
- `/etc/openclaw/` — System-wide config (if exists)

The assessment agent must NOT read:

- Credential file contents (tokens, API keys) — Only check existence/permissions
- Private keys (`~/.ssh/`, `*.pem`, etc.)
- Environment variable values containing secrets
- Files outside the allowed paths

#### Session Isolation

- **Ephemeral session** — No session persistence, no history saved
- **No context carryover** — Each dimension assessment starts fresh
- **Timeout enforcement** — Hard timeout per dimension (default: 60s)
- **Turn limit** — Maximum 10 tool calls per dimension
- **No hooks** — Assessment runs with hooks disabled
- **No auto-reply** — Cannot trigger message responses

#### Resource Limits

- **Max turns per dimension**: 10
- **Timeout per dimension**: 60 seconds
- **Total assessment timeout**: 10 minutes
- **No parallel tool execution** — Sequential only for auditability

#### Implementation Checklist

```typescript
// Runner must enforce these constraints:
const GRASP_AGENT_CONFIG = {
  tools: ["read", "glob", "grep"], // Allowlist only
  sandbox: {
    mode: "strict",
    workspaceAccess: "read-only",
  },
  exec: { enabled: false },
  browser: { enabled: false },
  mcp: { enabled: false },
  subagents: { enabled: false },
  hooks: { enabled: false },
  autoReply: { enabled: false },
  elevated: { enabled: false },
  maxTurns: 10,
  timeout: 60_000,
  session: { ephemeral: true },
};
```

### Error Handling

- If AI fails to return valid JSON, retry once with clarifying prompt
- If dimension analysis times out, mark as "unable to assess"
- If no model available, fail with clear error message
- If AI attempts to use a denied tool, log warning and continue

## Testing Strategy

### Unit Tests (`src/security/grasp/grasp.test.ts`)

1. **Prompt Tests**
   - Verify each prompt is well-formed
   - Test that prompts produce expected JSON structure

2. **Runner Tests** (mocked)
   - Mock `runEmbeddedPiAgent` to return test responses
   - Test JSON parsing and validation
   - Test error handling for malformed responses

3. **Scoring Tests**
   - Test `levelFromScore` thresholds
   - Test `aggregateScores` with various inputs

4. **Format Tests**
   - Test bar chart rendering
   - Test commentary and evidence output formatting
   - Test JSON output structure

### Integration Tests

Due to AI non-determinism, integration tests should:

- Verify the command runs without error
- Verify output structure is valid
- NOT assert on specific scores/findings

## Design Decisions

1. **Model Selection** - Use the user's configured model (respects their choice)

2. **Caching** - Cache results to avoid repeated expensive analysis. Cache key: hash of config + agent ID. Cache location: `~/.openclaw/cache/grasp/`. Default TTL: 1 hour. Use `--no-cache` to force fresh analysis.

3. **Parallel Execution** - Run all 5 dimensions in parallel for speed

## Verification

1. Create branch: `git checkout -b feat/security-grasp`
2. Run `pnpm build` - Type check passes
3. Run `pnpm check` - Lint/format passes
4. Run `pnpm test src/security/grasp` - Unit tests pass
5. Manual test:
   - `openclaw security grasp` - Shows assessment with bar charts, commentary, and evidence
   - `openclaw security grasp --json` - Valid JSON output
   - `openclaw security grasp --agent main` - Single agent only
   - `openclaw security grasp --no-cache` - Force fresh analysis
