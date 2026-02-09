import type { Policy, TransactionRequest, PolicyConfig, PolicyViolation, AuditEntry } from "../types.js";

/**
 * Amount limit policy: per-transaction and daily cumulative USD caps.
 * USD values are computed independently by the guard (never trusting the LLM).
 */
export const amountLimitPolicy: Policy = {
  name: "amount-limit",

  evaluate(
    request: TransactionRequest,
    config: PolicyConfig,
    recentHistory: AuditEntry[]
  ): PolicyViolation[] {
    const violations: PolicyViolation[] = [];

    // Per-transaction limit
    if (config.maxPerTransactionUsd > 0 && request.estimatedValueUsd > config.maxPerTransactionUsd) {
      violations.push({
        policy: "amount-limit",
        message: `Transaction value $${request.estimatedValueUsd.toFixed(2)} exceeds per-tx limit of $${config.maxPerTransactionUsd}`,
        severity: "block",
      });
    }

    // Daily cumulative limit
    if (config.maxDailyUsd > 0) {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const dailySpend = recentHistory
        .filter(
          (e) =>
            e.timestamp > oneDayAgo &&
            (e.verdict === "AUTO_APPROVED" || e.verdict === "APPROVED_HITL" || e.verdict === "EXECUTED")
        )
        .reduce((sum, e) => sum + e.txRequest.estimatedValueUsd, 0);

      const projectedTotal = dailySpend + request.estimatedValueUsd;

      if (projectedTotal > config.maxDailyUsd) {
        violations.push({
          policy: "amount-limit",
          message: `Daily spend would be $${projectedTotal.toFixed(2)}, exceeding limit of $${config.maxDailyUsd} (already spent: $${dailySpend.toFixed(2)})`,
          severity: "block",
        });
      }
    }

    // HITL threshold (warn, don't block)
    if (
      config.hitlThresholdUsd > 0 &&
      request.estimatedValueUsd > config.hitlThresholdUsd
    ) {
      violations.push({
        policy: "amount-limit",
        message: `Transaction value $${request.estimatedValueUsd.toFixed(2)} exceeds HITL threshold of $${config.hitlThresholdUsd}`,
        severity: "hitl",
      });
    }

    return violations;
  },
};
