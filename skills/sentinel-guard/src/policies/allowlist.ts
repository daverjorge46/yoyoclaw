import type { Policy, TransactionRequest, PolicyConfig, PolicyViolation, AuditEntry } from "../types.js";

/**
 * Allowlist policy: only approved tokens and contract addresses.
 * Also blocks explicitly banned actions.
 */
export const allowlistPolicy: Policy = {
  name: "allowlist",

  evaluate(
    request: TransactionRequest,
    config: PolicyConfig,
    _recentHistory: AuditEntry[]
  ): PolicyViolation[] {
    const violations: PolicyViolation[] = [];

    // Blocked actions (highest priority — overrides everything)
    if (config.blockedActions.includes(request.action)) {
      violations.push({
        policy: "allowlist",
        message: `Action "${request.action}" is explicitly blocked in policy config`,
        severity: "block",
      });
    }

    // Token allowlist
    if (config.allowlistedTokens.length > 0) {
      const token = extractToken(request);
      if (token && !config.allowlistedTokens.includes(token.toUpperCase())) {
        violations.push({
          policy: "allowlist",
          message: `Token "${token}" is not in the allowlist: [${config.allowlistedTokens.join(", ")}]`,
          severity: "block",
        });
      }
    }

    // Contract allowlist
    if (config.allowlistedContracts.length > 0) {
      const contract = extractContractAddress(request);
      if (contract && !config.allowlistedContracts.includes(contract.toLowerCase())) {
        violations.push({
          policy: "allowlist",
          message: `Contract "${contract}" is not in the allowlist`,
          severity: "block",
        });
      }
    }

    return violations;
  },
};

/** Extract token symbol from request params. */
function extractToken(request: TransactionRequest): string | null {
  const params = request.params;
  return (
    (params["token"] as string) ??
    (params["fromToken"] as string) ??
    (params["symbol"] as string) ??
    null
  );
}

/** Extract contract address from request params. */
function extractContractAddress(request: TransactionRequest): string | null {
  const params = request.params;
  return (
    (params["contractAddress"] as string) ??
    (params["to"] as string) ??
    null
  );
}
