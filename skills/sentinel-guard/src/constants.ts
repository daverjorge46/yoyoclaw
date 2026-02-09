/** Defaults for policy engine. */
export const POLICY_DEFAULTS = {
  HITL_TIMEOUT_MS: 5 * 60 * 1000, // 5 minutes
  AUDIT_LOG_ROTATION_SIZE: 10_000, // entries before rotation
} as const;
