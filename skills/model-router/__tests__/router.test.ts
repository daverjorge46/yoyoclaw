import { describe, it, expect } from "vitest";
import {
  ModelRouter,
  FINANCIAL_PRESET,
  GENERAL_PRESET,
  TIER_ORDER,
} from "../src/index.js";
import type { ModelMap, RoutingPreset, ModelTier } from "../src/index.js";

/** Standard model map for all tests. */
const TEST_MODEL_MAP: ModelMap = {
  fast: "claude-haiku-4-5-20251001",
  standard: "claude-sonnet-4-5-20250929",
  advanced: "claude-opus-4-6",
  critical: "claude-opus-4-6",
};

describe("ModelRouter", () => {
  describe("Financial preset — classification", () => {
    const router = new ModelRouter(FINANCIAL_PRESET, TEST_MODEL_MAP);

    // --- Fast tier ---
    it("routes balance checks to fast tier", () => {
      const result = router.route("What's my balance?");
      expect(result.classification.category).toBe("balance_check");
      expect(result.classification.finalTier).toBe("fast");
      expect(result.model).toBe("claude-haiku-4-5-20251001");
    });

    it("routes portfolio value check to fast tier", () => {
      const result = router.route("Show me my holdings");
      expect(result.classification.category).toBe("balance_check");
      expect(result.classification.finalTier).toBe("fast");
    });

    it("routes price lookups to fast tier", () => {
      const result = router.route("What's the price of ETH?");
      expect(result.classification.category).toBe("price_check");
      expect(result.classification.finalTier).toBe("fast");
      expect(result.model).toBe("claude-haiku-4-5-20251001");
    });

    it("routes 'ETH price' to fast tier", () => {
      const result = router.route("ETH price");
      expect(result.classification.category).toBe("price_check");
      expect(result.classification.finalTier).toBe("fast");
    });

    // --- Standard tier ---
    it("routes swap intents to standard tier", () => {
      const result = router.route("Swap 0.5 ETH to USDC");
      expect(result.classification.category).toBe("swap_proposal");
      expect(result.classification.finalTier).toBe("standard");
      expect(result.model).toBe("claude-sonnet-4-5-20250929");
    });

    it("routes 'exchange ETH for USDC' to standard tier", () => {
      const result = router.route("exchange my ETH for USDC");
      expect(result.classification.category).toBe("swap_proposal");
      expect(result.classification.finalTier).toBe("standard");
    });

    it("routes sell intents to standard tier", () => {
      const result = router.route("sell my ETH");
      expect(result.classification.category).toBe("swap_proposal");
      expect(result.classification.finalTier).toBe("standard");
    });

    it("routes transfer intents to standard tier", () => {
      const result = router.route("Send 10 USDC to 0xabc123");
      expect(result.classification.category).toBe("transfer_proposal");
      expect(result.classification.finalTier).toBe("standard");
      expect(result.model).toBe("claude-sonnet-4-5-20250929");
    });

    it("routes withdraw to standard tier", () => {
      const result = router.route("withdraw my USDC");
      expect(result.classification.category).toBe("transfer_proposal");
      expect(result.classification.finalTier).toBe("standard");
    });

    // --- Advanced tier ---
    it("routes portfolio analysis to advanced tier", () => {
      const result = router.route("Analyze my portfolio rebalancing strategy");
      expect(result.classification.category).toBe("portfolio_analysis");
      expect(result.classification.finalTier).toBe("advanced");
      expect(result.model).toBe("claude-opus-4-6");
    });

    it("routes 'what should I do' to advanced tier", () => {
      const result = router.route("What should I do with my ETH?");
      expect(result.classification.category).toBe("portfolio_analysis");
      expect(result.classification.finalTier).toBe("advanced");
    });

    it("routes market analysis to advanced tier", () => {
      const result = router.route("Why did ETH dump today?");
      expect(result.classification.category).toBe("market_analysis");
      expect(result.classification.finalTier).toBe("advanced");
    });

    // --- Critical tier ---
    it("routes token deployment to critical tier", () => {
      const result = router.route("Deploy a new token called SENTINEL");
      expect(result.classification.category).toBe("token_deployment");
      expect(result.classification.finalTier).toBe("critical");
      expect(result.model).toBe("claude-opus-4-6");
    });

    it("routes contract interaction to critical tier", () => {
      const result = router.route("Sign this transaction for the contract");
      expect(result.classification.category).toBe("contract_interaction");
      expect(result.classification.finalTier).toBe("critical");
    });

    // --- Default ---
    it("routes unrecognized messages to standard (default) tier", () => {
      const result = router.route("Hello, how are you?");
      expect(result.classification.category).toBe("general_query");
      expect(result.classification.finalTier).toBe("standard");
      expect(result.model).toBe("claude-sonnet-4-5-20250929");
    });
  });

  describe("Escalation keywords", () => {
    const router = new ModelRouter(FINANCIAL_PRESET, TEST_MODEL_MAP);

    it("escalates 'all balance' from fast to standard", () => {
      const result = router.route("Show me all my balance");
      expect(result.classification.tier).toBe("fast");
      expect(result.classification.escalated).toBe(true);
      expect(result.classification.finalTier).toBe("standard");
    });

    it("escalates 'swap immediately' from standard to advanced", () => {
      const result = router.route("Swap ETH to USDC immediately");
      expect(result.classification.tier).toBe("standard");
      expect(result.classification.escalated).toBe(true);
      expect(result.classification.finalTier).toBe("advanced");
    });

    it("escalates multi-step from standard to advanced", () => {
      const result = router.route("Swap ETH to USDC and then send to my wallet");
      expect(result.classification.category).toBe("swap_proposal");
      expect(result.classification.tier).toBe("standard");
      // Escalation keywords ("and then") bump the tier
      expect(result.classification.escalated).toBe(true);
      expect(result.classification.finalTier).toBe("advanced");
    });

    it("clamps escalation to max tier (critical)", () => {
      // token deployment (critical) + urgent → still critical, not beyond
      const result = router.route("Deploy token urgently right now");
      expect(result.classification.tier).toBe("critical");
      expect(result.classification.escalated).toBe(true);
      expect(result.classification.finalTier).toBe("critical");
    });

    it("does not escalate when no keywords match", () => {
      const result = router.route("Swap 0.1 ETH to USDC");
      expect(result.classification.escalated).toBe(false);
      expect(result.classification.tier).toBe(result.classification.finalTier);
    });
  });

  describe("General preset", () => {
    const router = new ModelRouter(GENERAL_PRESET, TEST_MODEL_MAP);

    it("routes greetings to fast tier", () => {
      const result = router.route("Hello!");
      expect(result.classification.category).toBe("greeting");
      expect(result.classification.finalTier).toBe("fast");
    });

    it("routes status checks to fast tier", () => {
      const result = router.route("What's the system status?");
      expect(result.classification.category).toBe("status_check");
      expect(result.classification.finalTier).toBe("fast");
    });

    it("routes task execution to standard tier", () => {
      const result = router.route("Create a new user account");
      expect(result.classification.category).toBe("task_execution");
      expect(result.classification.finalTier).toBe("standard");
    });

    it("routes deployment to critical tier", () => {
      const result = router.route("Deploy this to production");
      expect(result.classification.category).toBe("system_admin");
      expect(result.classification.finalTier).toBe("critical");
    });
  });

  describe("Core router mechanics", () => {
    it("first-match-wins: earlier rules take priority", () => {
      // A message that could match both balance_check and portfolio_analysis
      const router = new ModelRouter(FINANCIAL_PRESET, TEST_MODEL_MAP);
      const result = router.route("How much is my portfolio value?");
      // "portfolio value" matches balance_check first (patterns include "portfolio value")
      expect(result.classification.category).toBe("balance_check");
      expect(result.classification.finalTier).toBe("fast");
    });

    it("classify() works without model resolution", () => {
      const router = new ModelRouter(FINANCIAL_PRESET, TEST_MODEL_MAP);
      const classification = router.classify("Swap ETH to USDC");
      expect(classification.category).toBe("swap_proposal");
      expect(classification.tier).toBe("standard");
      // classify doesn't return a model — just classification data
      expect(classification).not.toHaveProperty("model");
    });

    it("presetName returns the preset identifier", () => {
      const router = new ModelRouter(FINANCIAL_PRESET, TEST_MODEL_MAP);
      expect(router.presetName).toBe("financial");

      const general = new ModelRouter(GENERAL_PRESET, TEST_MODEL_MAP);
      expect(general.presetName).toBe("general");
    });

    it("getModelForTier returns correct model", () => {
      const router = new ModelRouter(FINANCIAL_PRESET, TEST_MODEL_MAP);
      expect(router.getModelForTier("fast")).toBe("claude-haiku-4-5-20251001");
      expect(router.getModelForTier("standard")).toBe("claude-sonnet-4-5-20250929");
      expect(router.getModelForTier("advanced")).toBe("claude-opus-4-6");
      expect(router.getModelForTier("critical")).toBe("claude-opus-4-6");
    });

    it("case insensitive matching", () => {
      const router = new ModelRouter(FINANCIAL_PRESET, TEST_MODEL_MAP);
      const result = router.route("SWAP ETH TO USDC");
      expect(result.classification.category).toBe("swap_proposal");
    });

    it("trims whitespace before matching", () => {
      const router = new ModelRouter(FINANCIAL_PRESET, TEST_MODEL_MAP);
      const result = router.route("  swap ETH to USDC  ");
      expect(result.classification.category).toBe("swap_proposal");
    });
  });

  describe("TIER_ORDER", () => {
    it("has 4 tiers in ascending capability order", () => {
      expect(TIER_ORDER).toEqual(["fast", "standard", "advanced", "critical"]);
    });
  });

  describe("Custom preset", () => {
    it("works with a minimal custom preset", () => {
      const custom: RoutingPreset = {
        name: "custom",
        rules: [
          {
            category: "greeting",
            patterns: [/^hello$/],
            tier: "fast",
          },
        ],
        escalationKeywords: [],
        defaultTier: "standard",
        defaultCategory: "unknown",
      };

      const router = new ModelRouter(custom, TEST_MODEL_MAP);

      expect(router.route("hello").classification.category).toBe("greeting");
      expect(router.route("hello").classification.finalTier).toBe("fast");
      expect(router.route("anything else").classification.category).toBe("unknown");
      expect(router.route("anything else").classification.finalTier).toBe("standard");
    });
  });
});
