import type { Policy, TransactionRequest, PolicyConfig, PolicyViolation, AuditEntry } from "../types.js";

/**
 * Rate limit policy: restricts transactions per hour and per day.
 * Uses a sliding window over recent audit history.
 */
export const rateLimitPolicy: Policy = {
  name: "rate-limit",

  evaluate(
    _request: TransactionRequest,
    config: PolicyConfig,
    recentHistory: AuditEntry[]
  ): PolicyViolation[] {
    const violations: PolicyViolation[] = [];
    const now = Date.now();

    const approvedEntries = recentHistory.filter(
      (e) => e.verdict === "AUTO_APPROVED" || e.verdict === "APPROVED_HITL" || e.verdict === "EXECUTED"
    );

    // Hourly rate check
    if (config.maxTransactionsPerHour > 0) {
      const oneHourAgo = now - 60 * 60 * 1000;
      const hourlyCount = approvedEntries.filter(
        (e) => e.timestamp > oneHourAgo
      ).length;

      if (hourlyCount >= config.maxTransactionsPerHour) {
        violations.push({
          policy: "rate-limit",
          message: `Hourly limit reached: ${hourlyCount}/${config.maxTransactionsPerHour} transactions in the last hour`,
          severity: "block",
        });
      }
    }

    // Daily rate check
    if (config.maxTransactionsPerDay > 0) {
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const dailyCount = approvedEntries.filter(
        (e) => e.timestamp > oneDayAgo
      ).length;

      if (dailyCount >= config.maxTransactionsPerDay) {
        violations.push({
          policy: "rate-limit",
          message: `Daily limit reached: ${dailyCount}/${config.maxTransactionsPerDay} transactions in the last 24 hours`,
          severity: "block",
        });
      }
    }

    return violations;
  },
};
