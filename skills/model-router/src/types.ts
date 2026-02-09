/**
 * Model Router — Type Definitions
 *
 * Shared type system for rule-based model selection.
 * Any agent can consume these types to route messages
 * to the most cost-effective model for a given intent.
 */

/** Model tiers ranked by capability and cost. */
export type ModelTier = "fast" | "standard" | "advanced" | "critical";

/** The ordered list of tiers from lowest to highest capability. */
export const TIER_ORDER: readonly ModelTier[] = [
  "fast",
  "standard",
  "advanced",
  "critical",
] as const;

/** Result of classifying a user message. */
export interface ClassifiedIntent {
  /** Matched category name (e.g., "balance_check", "transaction_proposal"). */
  category: string;
  /** The base tier for this category. */
  tier: ModelTier;
  /** Whether escalation keywords bumped the tier. */
  escalated: boolean;
  /** The final tier after escalation (may equal `tier` if no escalation). */
  finalTier: ModelTier;
  /** The pattern that matched, for debugging. */
  matchedPattern?: string;
}

/** Maps each tier to a concrete model ID string. */
export type ModelMap = Record<ModelTier, string>;

/** A single routing rule: pattern → category + tier. */
export interface RoutingRule {
  /** Human-readable category name. */
  category: string;
  /** Regex patterns to match against user input (case-insensitive). */
  patterns: RegExp[];
  /** Base tier for this category. */
  tier: ModelTier;
}

/** Keywords that escalate the tier by one or more levels. */
export interface EscalationKeyword {
  /** Regex pattern to detect escalation intent. */
  pattern: RegExp;
  /** Number of tier levels to bump (1 = one tier up). */
  boost: number;
}

/** Full routing configuration for a domain. */
export interface RoutingPreset {
  /** Human-readable name for this preset. */
  name: string;
  /** Ordered rules — first match wins. */
  rules: RoutingRule[];
  /** Escalation keywords applied after rule matching. */
  escalationKeywords: EscalationKeyword[];
  /** Default tier when no rule matches. */
  defaultTier: ModelTier;
  /** Default category name when no rule matches. */
  defaultCategory: string;
}

/** Result of routing a message: the resolved model + classification details. */
export interface RoutingResult {
  /** The concrete model ID to use. */
  model: string;
  /** The classification details. */
  classification: ClassifiedIntent;
}
