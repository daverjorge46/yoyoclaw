/**
 * ModelRouter — Rule-based intent classification and model selection.
 *
 * Routes user messages to the most cost-effective model tier
 * based on configurable pattern-matching rules and escalation keywords.
 *
 * Design:
 * - First-match-wins rule evaluation
 * - Escalation keywords can bump the tier up (never down)
 * - Tier is clamped to the highest available tier
 * - Thread-safe (stateless per-call)
 */

import type {
  ModelMap,
  RoutingPreset,
  RoutingResult,
  ClassifiedIntent,
  ModelTier,
} from "./types.js";
import { TIER_ORDER } from "./types.js";

export class ModelRouter {
  private readonly preset: RoutingPreset;
  private readonly modelMap: ModelMap;

  constructor(preset: RoutingPreset, modelMap: ModelMap) {
    this.preset = preset;
    this.modelMap = modelMap;
  }

  /**
   * Route a user message to the appropriate model.
   *
   * @param message - The raw user message text
   * @returns The resolved model ID and classification details
   */
  route(message: string): RoutingResult {
    const classification = this.classify(message);
    return {
      model: this.modelMap[classification.finalTier],
      classification,
    };
  }

  /**
   * Classify a message without resolving to a model.
   * Useful for logging/analytics without needing the model map.
   */
  classify(message: string): ClassifiedIntent {
    const normalized = message.toLowerCase().trim();

    // 1. First-match-wins rule evaluation
    let category = this.preset.defaultCategory;
    let tier = this.preset.defaultTier;
    let matchedPattern: string | undefined;

    for (const rule of this.preset.rules) {
      for (const pattern of rule.patterns) {
        if (pattern.test(normalized)) {
          category = rule.category;
          tier = rule.tier;
          matchedPattern = pattern.source;
          break;
        }
      }
      if (matchedPattern) break;
    }

    // 2. Apply escalation keywords (additive, clamped to max tier)
    let totalBoost = 0;
    for (const esc of this.preset.escalationKeywords) {
      if (esc.pattern.test(normalized)) {
        totalBoost += esc.boost;
      }
    }

    const escalated = totalBoost > 0;
    const finalTier = escalated ? bumpTier(tier, totalBoost) : tier;

    return {
      category,
      tier,
      escalated,
      finalTier,
      matchedPattern,
    };
  }

  /** Get the preset name (for logging). */
  get presetName(): string {
    return this.preset.name;
  }

  /** Get the model for a specific tier (for diagnostics). */
  getModelForTier(tier: ModelTier): string {
    return this.modelMap[tier];
  }
}

/**
 * Bump a tier up by `boost` levels, clamped to the highest tier.
 */
function bumpTier(tier: ModelTier, boost: number): ModelTier {
  const currentIndex = TIER_ORDER.indexOf(tier);
  const newIndex = Math.min(currentIndex + boost, TIER_ORDER.length - 1);
  return TIER_ORDER[newIndex]!;
}
