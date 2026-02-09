/**
 * Financial Routing Preset — Rules for the Sentinel Agent.
 *
 * Maps financial intent categories to model tiers:
 * - fast:     Balance checks, price lookups (low stakes, high frequency)
 * - standard: Swaps, transfers (requires careful parameter extraction)
 * - advanced: Portfolio analysis, strategy reasoning (complex multi-step)
 * - critical: Token deployment, contract interactions (irreversible, high risk)
 */

import type { RoutingPreset } from "../types.js";

export const FINANCIAL_PRESET: RoutingPreset = {
  name: "financial",

  rules: [
    // --- Fast tier: read-only, high-frequency queries ---
    {
      category: "balance_check",
      patterns: [
        /\b(balance|balances|how much|holdings?|portfolio value)\b/,
        /\bwhat('s| is) (my|the) (balance|wallet)\b/,
        /\bshow (my |me )?(balance|wallet|holdings)\b/,
      ],
      tier: "fast",
    },
    {
      category: "price_check",
      patterns: [
        /\b(price|worth|value|cost) of\b/,
        /\bhow much is\b/,
        /\b(eth|usdc|btc|sol|token) price\b/,
        /\bwhat('s| is) .{0,20} (trading at|worth|price)\b/,
      ],
      tier: "fast",
    },

    // --- Standard tier: transactional intents ---
    {
      category: "swap_proposal",
      patterns: [
        /\bswap\b/,
        /\bexchange\b.*\b(for|to|into)\b/,
        /\bconvert\b.*\b(to|into)\b/,
        /\btrade\b.*\b(for|to)\b/,
        /\bbuy\b.*\b(with|using)\b/,
        /\bsell\b/,
      ],
      tier: "standard",
    },
    {
      category: "transfer_proposal",
      patterns: [
        /\btransfer\b/,
        /\bsend\b.*\b(to|address)\b/,
        /\bwithdraw\b/,
        /\bmove\b.*\b(to|from)\b.*\b(wallet|address)\b/,
      ],
      tier: "standard",
    },

    // --- Advanced tier: analytical reasoning ---
    {
      category: "portfolio_analysis",
      patterns: [
        /\b(analyz|analysis|rebalanc|diversif|allocat|optimiz)\w*\b/,
        /\b(strategy|strategies)\b/,
        /\b(risk|exposure|hedg)\w*\b/,
        /\bwhat should i\b/,
        /\b(recommend|suggest|advise)\b/,
      ],
      tier: "advanced",
    },
    {
      category: "market_analysis",
      patterns: [
        /\b(market|trend|sentiment|outlook|forecast)\b/,
        /\bwhy (is|did|has)\b.*\b(pump|dump|drop|rise|fall|crash)\b/,
        /\bexplain\b.*\b(movement|volatility|liquidity)\b/,
      ],
      tier: "advanced",
    },

    // --- Critical tier: irreversible high-risk operations ---
    {
      category: "token_deployment",
      patterns: [
        /\bdeploy\b.*\btoken\b/,
        /\bcreate\b.*\btoken\b/,
        /\blaunch\b.*\btoken\b/,
        /\bmint\b.*\btoken\b/,
      ],
      tier: "critical",
    },
    {
      category: "contract_interaction",
      patterns: [
        /\b(interact|call)\b.*\bcontract\b/,
        /\bsign\b.*\b(message|transaction|tx)\b/,
        /\bapprove\b.*\b(contract|spender|allowance)\b/,
      ],
      tier: "critical",
    },
  ],

  escalationKeywords: [
    // "large amount" / "everything" / "all" → bump +1 tier
    {
      pattern: /\b(all|everything|entire|maximum|max|full)\b.*\b(balance|funds|holdings|portfolio)\b/,
      boost: 1,
    },
    // Explicit urgency → bump +1 tier
    {
      pattern: /\b(urgent|immediately|asap|right now|emergency)\b/,
      boost: 1,
    },
    // Multi-step operations → bump +1 tier
    {
      pattern: /\b(then|after that|next|also|and then|followed by)\b/,
      boost: 1,
    },
  ],

  defaultTier: "standard",
  defaultCategory: "general_query",
};
