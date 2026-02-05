import { describe, it, expect, vi } from "vitest";
import {
  buildSelectionPrompt,
  resolveRouterConfig,
  resolveRouterModel,
  selectDynamicModel,
} from "./model-router.js";
import type { OpenClawConfig } from "../config/config.js";

describe("model-router", () => {
  describe("buildSelectionPrompt", () => {
    it("should build prompt with user input and models", () => {
      const prompt = buildSelectionPrompt({ input: "Help me write code", models: ["model-a", "model-b"] });
      expect(prompt).toContain("Help me write code");
      expect(prompt).toContain("model-a");
      expect(prompt).toContain("model-b");
    });
  });

  describe("resolveRouterConfig", () => {
    it("should return null when router is disabled", () => {
      const cfg: Partial<OpenClawConfig> = {
        agents: {
          defaults: {
            router: { enabled: false },
          },
        },
      };
      expect(resolveRouterConfig(cfg as OpenClawConfig)).toBeNull();
    });

    it("should return config when router is enabled", () => {
      const cfg: Partial<OpenClawConfig> = {
        agents: {
          defaults: {
            router: { enabled: true, classifierModel: "google/gemini-2.0-flash" },
          },
        },
      };
      const result = resolveRouterConfig(cfg as OpenClawConfig);
      expect(result?.enabled).toBe(true);
      expect(result?.classifierModel).toBe("google/gemini-2.0-flash");
    });
  });

  describe("resolveRouterModel", () => {
    it("should return routerUsed: false when disabled", async () => {
      const result = await resolveRouterModel({
        input: "test",
        cfg: {} as OpenClawConfig,
        defaultProvider: "anthropic",
        callClassifier: vi.fn(),
      });

      expect(result.routerUsed).toBe(false);
    });

    it("should resolve model when router is configured and dynamic selection succeeds", async () => {
      const mockCallClassifier = vi.fn().mockResolvedValue("<selected_model>anthropic/claude-sonnet-4-5</selected_model>");

      const cfg: Partial<OpenClawConfig> = {
        agents: {
          defaults: {
            models: { "anthropic/claude-sonnet-4-5": {} },
            router: {
              enabled: true,
              classifierModel: "google/gemini-2.0-flash",
            },
          },
        },
      };

      const result = await resolveRouterModel({
        input: "Write a function",
        cfg: cfg as OpenClawConfig,
        defaultProvider: "anthropic",
        callClassifier: mockCallClassifier,
      });

      expect(result.routerUsed).toBe(true);
      expect(result.provider).toBe("anthropic");
      expect(result.model).toBe("claude-sonnet-4-5");
    });

    it("should fail gracefully if no models available", async () => {
      const cfg: Partial<OpenClawConfig> = {
        agents: {
          defaults: {
            models: {},
            router: { enabled: true },
          },
        },
      };

      const result = await resolveRouterModel({
        input: "test",
        cfg: cfg as OpenClawConfig,
        defaultProvider: "anthropic",
        callClassifier: vi.fn(),
      });

      expect(result.routerUsed).toBe(true);
      expect(result.error).toContain("No model available");
    });
  });
});

describe("selectDynamicModel", () => {
  it("should select model from candidates", async () => {
    const mockCallClassifier = vi.fn().mockResolvedValue("<selected_model>google/gemini-2.0-flash</selected_model>");
    const result = await selectDynamicModel({
      input: "test",
      candidates: ["google/gemini-2.0-flash", "anthropic/claude-3-5-sonnet"],
      callClassifier: mockCallClassifier,
      classifierModel: "google/gemini-2.0-flash",
    });
    expect(result).toBe("google/gemini-2.0-flash");
  });

  it("should parse model without tags if needed", async () => {
    const mockCallClassifier = vi.fn().mockResolvedValue("google/gemini-2.0-flash");
    const result = await selectDynamicModel({
      input: "test",
      candidates: ["google/gemini-2.0-flash", "anthropic/claude-3-5-sonnet"],
      callClassifier: mockCallClassifier,
      classifierModel: "google/gemini-2.0-flash",
    });
    expect(result).toBe("google/gemini-2.0-flash");
  });

  it("should fallback to first candidate if classification is invalid", async () => {
    const mockCallClassifier = vi.fn().mockRejectedValue(new Error("fail"));
    const result = await selectDynamicModel({
      input: "test",
      candidates: ["fallback-model", "other-model"],
      callClassifier: mockCallClassifier,
      classifierModel: "google/gemini-2.0-flash",
    });
    expect(result).toBeNull();
  });
});
