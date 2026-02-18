---
description: Get strategic architecture advice or debug complex issues with Oracle agent
---

# Consult Oracle

Ask the Oracle agent for strategic architecture guidance and debugging assistance.

## Usage

```bash
/consult-oracle <question>
```

## Description

Delegates strategic questions to the **Oracle** agent, who provides high-level architecture guidance, debugging analysis, and design decision recommendations.

The Oracle operates at a strategic level - it analyzes, advises, and guides, but **does not write code or execute commands**.

## Examples

```bash
# Architecture decisions
/consult-oracle "Should we use microservices or monolith for a SaaS MVP?"

# State management
/consult-oracle "Best state management pattern for React with Convex backend?"

# Performance optimization
/consult-oracle "Our dashboard is slow. What are the top 3 optimization strategies?"

# Debugging complex issues
/consult-oracle "Auth tests failing with 401 after 3 attempts. What could be the root cause?"

# Design patterns
/consult-oracle "How should we structure our Convex schema for multi-tenancy?"
```

## Output Format

Oracle provides structured advice in three sections:

### 1. Essential (Must-Knows)

Critical information you need immediately:

- Key decision or recommendation
- Main trade-off to consider
- Immediate action item

### 2. Expanded (Context)

Deeper explanation:

- Detailed reasoning
- Alternative approaches
- Comparison of options
- Why this recommendation

### 3. Edge Cases & Risks

What could go wrong:

- Potential failure modes
- Mitigation strategies
- When recommendation doesn't apply
- Warning signs to watch for

## Example Output

**Question:** "Should we use microservices or monolith for our SaaS MVP?"

**Oracle Response:**

```markdown
## Essential

**Recommendation:** Start with modular monolith.

**Key Trade-off:** Speed to market vs. future scalability flexibility.

**Action:** Structure code as distinct modules (auth, billing, core) within single deployment.

## Expanded

**Reasoning:**

- MVP needs rapid iteration (monolith = faster deployment)
- Microservices add operational complexity (monitoring, orchestration, debugging)
- Modular monolith provides future extraction path
- Can split to microservices later when clear boundaries emerge

**Alternatives:**

1. Pure monolith: Fastest but hardest to split later
2. Microservices: Better scalability but slower MVP development
3. Modular monolith: Best of both (recommended)

**Timeline:** Expect 2-3x faster MVP delivery vs. microservices approach.

## Edge Cases & Risks

**When microservices make sense from day 1:**

- Team >20 engineers
- Multiple distinct products
- Proven boundaries already exist
- Regulatory isolation required

**Risks of modular monolith:**

- Module coupling can creep in without discipline
- Shared database becomes bottleneck at scale
- Team may resist future extraction

**Mitigation:**

- Enforce module boundaries via import rules (ESLint)
- Use shared interfaces, not shared implementations
- Monitor module coupling metrics
- Plan extraction points upfront
```

## When to Use

**Use /consult-oracle for:**

- Architecture decisions (monolith vs microservices, state management, etc.)
- Debugging after 3+ failed attempts
- Design pattern selection
- Performance optimization strategy
- Complex trade-off analysis
- Root cause analysis

**Don't use /consult-oracle for:**

- Code implementation (Oracle doesn't write code)
- Simple questions (use your own judgment)
- External research (use /research instead)
- Codebase search (use Grep/Explore instead)

## Oracle Agent Details

**Mode:** Synchronous (waits for response)

**Capabilities:**

- Strategic analysis
- Architecture guidance
- Debugging assistance
- Design pattern recommendations
- Trade-off analysis
- Root cause identification

**Tools Available:**

- `Read` - Analyze code
- `Grep` - Search patterns
- `Glob` - Find files
- `call_agent` - Consult other agents if needed

**Limitations:**

- **NO code writing** (Read only)
- **NO command execution** (No Bash)
- **NO file modification** (No Write/Edit)

**Temperature:** 0.1 (highly analytical, consistent)

## Integration with Yoyo-AI

Oracle is automatically consulted during failure recovery:

```typescript
// Automatic Oracle escalation after 3 failures
if (failureCount >= 3) {
  const advice = await call_agent({
    agent: "oracle",
    prompt: "Debug implementation failure...",
    timeout: 120000,
  });

  // Apply Oracle's recommendation
}
```

**Manual consultation:**

```bash
# Before starting complex implementation
/consult-oracle "Best approach for real-time collaboration features?"

# Get advice, then implement based on recommendation
```

## Response Time

**Typical:** 15-45 seconds (depending on question complexity)

**Timeout:** 2 minutes (120 seconds)

**Cost:** ~2,000-5,000 tokens per consultation

## Best Practices

**Do:**

- ✓ Provide context (what you're building, what you've tried)
- ✓ Ask specific questions
- ✓ Include error messages for debugging
- ✓ Mention constraints (budget, timeline, team size)

**Don't:**

- ✗ Ask open-ended "tell me everything" questions
- ✗ Expect code implementation
- ✗ Consult for trivial decisions
- ✗ Ask multiple unrelated questions at once

**Good Questions:**

```bash
/consult-oracle "We need real-time updates. Should we use WebSockets, SSE, or polling? Context: Convex backend, React frontend, 100-1000 concurrent users."

/consult-oracle "Auth tests failing with 401. Tried: 1) Manual token generation, 2) Library-based tokens, 3) Different signature algorithm. All fail. What's the root cause?"
```

**Bad Questions:**

```bash
/consult-oracle "Tell me about authentication"  # Too broad

/consult-oracle "Write auth code for me"  # Oracle doesn't write code

/consult-oracle "Is React good?"  # Subjective, no context
```

---

**Note:** Oracle provides guidance, not implementation. Use Oracle's advice to inform your implementation decisions and debugging strategy.
