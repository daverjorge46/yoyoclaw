---
name: yoyo-token-usage
description: "Track and report API token usage and costs across models and sessions. Monitor spending and optimize model selection."
metadata:
  {
    "openclaw":
      {
        "emoji": "📊",
        "requires": {},
      },
  }
---

# Token Usage Tracker

Monitor API costs and token usage across models and sessions.

## Capabilities

- Track tokens consumed per model and session
- Estimate costs based on model pricing
- Report daily/weekly usage summaries
- Alert when spending exceeds thresholds

## Usage

### Check Current Usage

Read the gateway's usage data from session files:

```bash
# Count tokens in recent sessions
find ~/.yoyo-claw/agents/*/sessions/ -name "*.jsonl" -mtime -1 -exec wc -l {} +
```

### Cost Estimation

Use these approximate rates (per 1M tokens):
- Claude Sonnet: $3 input / $15 output
- Claude Opus: $15 input / $75 output
- GPT-4o: $2.50 input / $10 output
- Gemini 2.0 Flash: $0.075 input / $0.30 output

### Daily Summary

When asked about usage, check session logs and provide:
1. Total messages today
2. Estimated tokens used
3. Breakdown by model
4. Cost estimate

## Guidelines

- Proactively report usage during heartbeats if spending seems high
- Suggest cheaper models when appropriate for the task
- Never expose API keys in usage reports
