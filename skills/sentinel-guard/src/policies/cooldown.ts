import type { Policy, TransactionRequest, PolicyConfig, PolicyViolation, AuditEntry } from "../types.js";

/**
 * Cooldown policy: minimum delay between financial actions.
 * Prevents rapid-fire transaction sequences (e.g., from a compromised reasoning loop).
 */
export const cooldownPolicy: Policy = {
  name: "cooldown",

  evaluate(
    _request: TransactionRequest,
    config: PolicyConfig,
    recentHistory: AuditEntry[]
  ): PolicyViolation[] {
    if (config.cooldownSeconds <= 0) return [];

    const now = Date.now();
    const cooldownMs = config.cooldownSeconds * 1000;

    // Find the most recent approved/executed entry
    const lastApproved = recentHistory
      .filter(
        (e) => e.verdict === "AUTO_APPROVED" || e.verdict === "APPROVED_HITL" || e.verdict === "EXECUTED"
      )
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    if (!lastApproved) return [];

    const elapsed = now - lastApproved.timestamp;
    if (elapsed < cooldownMs) {
      const remainingSeconds = Math.ceil((cooldownMs - elapsed) / 1000);
      return [
        {
          policy: "cooldown",
          message: `Cooldown active: ${remainingSeconds}s remaining (minimum ${config.cooldownSeconds}s between transactions)`,
          severity: "block",
        },
      ];
    }

    return [];
  },
};
