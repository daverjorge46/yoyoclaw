---
name: sentinel-guard
description: "Evaluate financial transaction requests against configurable policies (allowlist, rate-limit, cooldown, amount-limit). Includes circuit breaker for emergency shutdown and append-only audit log."
metadata:
  {
    "openclaw":
      {
        "emoji": "🔒",
        "requires": { "bins": ["npx"] },
      },
  }
---

# sentinel-guard

Evaluates financial transaction requests against configurable policies (allowlist, rate-limit, cooldown, amount-limit). Includes a circuit breaker for emergency shutdown and an append-only audit log.

## Usage

### Evaluate a transaction against a policy

```bash
echo '{"action":"swap","params":{"fromToken":"ETH","toToken":"USDC","amount":"0.01"},"chain":"base","estimatedValueUsd":10}' | \
  ./scripts/guard-evaluate.sh policy.json
```

Returns JSON with the policy verdict. Exit code 0 = approved, 1 = rejected.

### Check policy configuration

```bash
./scripts/guard-check-policy.sh policy.json
```

Validates the policy JSON and reports configuration summary.

## Policy Configuration

```json
{
  "version": 2,
  "maxPerTransactionUsd": 5,
  "maxDailyUsd": 25,
  "maxTransactionsPerHour": 5,
  "maxTransactionsPerDay": 20,
  "cooldownSeconds": 60,
  "hitlThresholdUsd": 2,
  "allowlistedTokens": ["ETH", "USDC", "WETH"],
  "allowlistedContracts": [],
  "blockedActions": ["deploy_token", "sign_message"],
  "circuitBreakerAutoTripOnConsecutiveFailures": 3
}
```

## Policies

| Policy | Description | Severity |
|--------|-------------|----------|
| allowlist | Token/contract allowlisting, action blocking | block |
| cooldown | Minimum delay between transactions | block |
| rate-limit | Max transactions per hour/day | block |
| amount-limit | Per-tx and daily USD caps, HITL threshold | block/hitl |

## Output Format

```json
{
  "approved": false,
  "decidedBy": "policy_engine",
  "violations": [
    {
      "policy": "amount-limit",
      "message": "Transaction value $150.00 exceeds per-tx limit of $100",
      "severity": "block"
    }
  ],
  "request": {
    "id": "...",
    "action": "swap",
    "estimatedValueUsd": 150
  }
}
```
