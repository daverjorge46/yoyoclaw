---
name: model-router
description: "Route user messages to the most cost-effective AI model tier based on configurable pattern-matching rules and escalation keywords. Supports financial and general-purpose presets."
metadata:
  {
    "openclaw":
      {
        "emoji": "🧭",
        "requires": { "bins": ["npx"] },
      },
  }
---

# model-router

Routes user messages to the most cost-effective AI model tier based on configurable pattern-matching rules and escalation keywords. Supports financial and general-purpose presets.

## Usage

### Route a query

```bash
echo "What is my ETH balance?" | ./scripts/route-query.sh
```

Returns JSON with the routing decision (model tier, category, escalation status).

### Arguments

Text can be provided via stdin or as a command-line argument:

```bash
./scripts/route-query.sh "swap 0.01 ETH to USDC"
```

### Preset selection

By default uses the `financial` preset. Pass `--preset general` for general-purpose routing:

```bash
./scripts/route-query.sh --preset general "help me write a function"
```

## Output Format

```json
{
  "model": "claude-sonnet-4-5-20250929",
  "classification": {
    "category": "balance_check",
    "tier": "fast",
    "escalated": false,
    "finalTier": "fast",
    "matchedPattern": "balance|portfolio|holdings"
  }
}
```

## Model Tiers

| Tier | Use Case | Cost |
|------|----------|------|
| fast | Balance checks, price queries, simple questions | Lowest |
| standard | Swaps, transfers, general tasks | Medium |
| advanced | Portfolio analysis, complex questions | High |
| critical | Multi-step operations, token deployment | Highest |

## Escalation Keywords

Keywords like "all", "everything", "urgent", "multi-step" automatically bump the tier up by one level.
