/**
 * General Routing Preset — Generic rules for non-financial agents.
 *
 * Provides a baseline routing configuration that covers common
 * conversational patterns. Agents with domain-specific needs
 * should use a specialized preset (e.g., FINANCIAL_PRESET).
 *
 * Tier mapping:
 * - fast:     Greetings, simple questions, status checks
 * - standard: Task execution, content generation, code help
 * - advanced: Complex reasoning, multi-step planning, creative work
 * - critical: System administration, destructive operations
 */

import type { RoutingPreset } from "../types.js";

export const GENERAL_PRESET: RoutingPreset = {
  name: "general",

  rules: [
    // --- Fast tier: trivial interactions ---
    {
      category: "greeting",
      patterns: [
        /^(hi|hello|hey|good (morning|afternoon|evening)|sup|yo)\b/,
        /^(thanks|thank you|thx|ty)\b/,
      ],
      tier: "fast",
    },
    {
      category: "simple_question",
      patterns: [
        /^(what|when|where|who) (is|was|are|were)\b/,
        /\b(define|meaning of|what does .{1,30} mean)\b/,
      ],
      tier: "fast",
    },
    {
      category: "status_check",
      patterns: [
        /\b(status|health|uptime|version|ping)\b/,
      ],
      tier: "fast",
    },

    // --- Standard tier: typical work tasks ---
    {
      category: "task_execution",
      patterns: [
        /\b(create|make|build|generate|write|draft|compose)\b/,
        /\b(update|modify|change|edit|fix)\b/,
        /\b(delete|remove|clear)\b/,
      ],
      tier: "standard",
    },
    {
      category: "code_help",
      patterns: [
        /\b(code|function|class|method|bug|error|exception|debug)\b/,
        /\b(implement|refactor|optimize)\b/,
      ],
      tier: "standard",
    },

    // --- Advanced tier: complex reasoning ---
    {
      category: "complex_reasoning",
      patterns: [
        /\b(explain|analyze|compare|evaluate|assess)\b.*\b(in detail|thoroughly|comprehensive)\b/,
        /\b(plan|design|architect|strategy)\b/,
        /\b(pros? and cons?|trade-?offs?|alternatives?)\b/,
      ],
      tier: "advanced",
    },
    {
      category: "creative_work",
      patterns: [
        /\b(brainstorm|ideate|creative|novel|innovative)\b/,
        /\b(story|narrative|essay|article)\b.*\b(write|create|draft)\b/,
      ],
      tier: "advanced",
    },

    // --- Critical tier: system operations ---
    {
      category: "system_admin",
      patterns: [
        /\b(deploy|rollback|migrate|scale)\b/,
        /\b(production|prod)\b.*\b(change|update|modify)\b/,
        /\b(database|db)\b.*\b(drop|delete|truncate|migrate)\b/,
      ],
      tier: "critical",
    },
  ],

  escalationKeywords: [
    {
      pattern: /\b(critical|urgent|important|high priority)\b/,
      boost: 1,
    },
    {
      pattern: /\b(step by step|detailed|thorough|comprehensive)\b/,
      boost: 1,
    },
  ],

  defaultTier: "standard",
  defaultCategory: "general_query",
};
