# sentinel-guard Reference

## Architecture

The guard evaluates transaction requests through a 4-policy pipeline:

1. **Allowlist** — checks token/contract allowlists and blocked actions
2. **Cooldown** — enforces minimum delay between transactions
3. **Rate Limit** — sliding window limits per hour and per day
4. **Amount Limit** — per-tx USD cap, daily cumulative cap, HITL threshold

## Security Model

- **HMAC-SHA256 integrity hashes** bind verdicts to specific requests, preventing forgery
- **TTL enforcement** (60s) prevents replay attacks with old verdicts
- **Circuit breaker** provides emergency shutdown (manual or auto-trip)
- **Idempotency store** (JSONL-backed) prevents double-execution
- **Fail-closed HITL** — if no human-in-the-loop bridge is available, requests requiring approval are denied

## TransactionDispatcher Interface

```typescript
interface TransactionDispatcher {
  dispatch(tx: TransactionRequest): Promise<ExecutionResult>;
}
```

The executor is transport-agnostic. Implement this interface to connect to any execution backend.

## Audit Log

Every decision is recorded in append-only JSONL format:
- `AUTO_APPROVED` — passed all policies
- `APPROVED_HITL` — human approved
- `REJECTED_HITL` — human rejected
- `BLOCKED` — policy blocked
- `EXECUTED` — successfully dispatched
- `EXECUTION_FAILED` — dispatch failed
