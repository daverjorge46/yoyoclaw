# sentinel-guard Threat Model

## Threats Mitigated

### T1: Verdict Forgery
**Attack**: Attacker crafts a PolicyVerdict with `approved: true` without going through the PolicyEngine.
**Mitigation**: HMAC-SHA256 integrity hash computed with a shared secret. WalletExecutor verifies the hash before execution.

### T2: Verdict Replay
**Attack**: Attacker captures an old approved verdict and replays it.
**Mitigation**: TTL enforcement (60s). Verdicts expire and cannot be reused.

### T3: Verdict Tampering
**Attack**: Attacker flips `approved` from false to true on an existing verdict.
**Mitigation**: The integrity hash includes the `approved` boolean. Changing it invalidates the hash.

### T4: Rapid-Fire Drain
**Attack**: Compromised reasoning loop submits many small transactions that individually pass limits.
**Mitigation**: Rate limiting (per-hour, per-day), cooldown policy, and daily cumulative USD caps.

### T5: Token/Contract Injection
**Attack**: LLM is tricked into interacting with malicious tokens or contracts.
**Mitigation**: Allowlist policy — only pre-approved tokens and contracts can be used.

### T6: Double Execution
**Attack**: Same verdict is submitted twice, executing the transaction twice.
**Mitigation**: HMAC-based idempotency keys. The idempotency store returns cached results for duplicate keys.

### T7: TOCTOU (Time-of-Check-to-Time-of-Use)
**Attack**: Circuit breaker trips between policy evaluation and wallet execution.
**Mitigation**: WalletExecutor re-checks the circuit breaker immediately before dispatch.

### T8: Cascading Failures
**Attack**: External service failures cause repeated failed transactions.
**Mitigation**: Circuit breaker auto-trips after N consecutive failures, halting all operations until manual resume.

## Trust Boundaries

- **LLM → PolicyEngine**: Untrusted. LLM output is treated as adversarial input.
- **PolicyEngine → WalletExecutor**: Trusted via HMAC integrity hash.
- **WalletExecutor → TransactionDispatcher**: Trusted (within process boundary).
- **External APIs**: Untrusted. USD valuations are computed independently, never from LLM claims.
