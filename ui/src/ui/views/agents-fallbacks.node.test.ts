import { describe, expect, it } from "vitest";
import { resolveModelFallbacks } from "./agents.ts";

describe("resolveModelFallbacks", () => {
  it("returns null for undefined model", () => {
    expect(resolveModelFallbacks(undefined)).toBeNull();
  });

  it("returns null for string model (no fallbacks)", () => {
    expect(resolveModelFallbacks("anthropic/claude-sonnet-4-5")).toBeNull();
  });

  it("extracts fallbacks from object model with fallbacks array", () => {
    const model = {
      primary: "anthropic/claude-sonnet-4-5",
      fallbacks: ["openai/gpt-4o", "anthropic/claude-haiku-4-5-20241022"],
    };
    expect(resolveModelFallbacks(model)).toEqual([
      "openai/gpt-4o",
      "anthropic/claude-haiku-4-5-20241022",
    ]);
  });

  it("extracts fallbacks from object model with fallback (singular) array", () => {
    const model = {
      primary: "anthropic/claude-sonnet-4-5",
      fallback: ["openai/gpt-4o"],
    };
    expect(resolveModelFallbacks(model)).toEqual(["openai/gpt-4o"]);
  });

  it("returns null for object model without fallbacks", () => {
    expect(resolveModelFallbacks({ primary: "anthropic/claude-sonnet-4-5" })).toBeNull();
  });

  it("filters out non-string entries", () => {
    const model = {
      primary: "anthropic/claude-sonnet-4-5",
      fallbacks: ["openai/gpt-4o", 42, null, "anthropic/claude-haiku-4-5-20241022"],
    };
    expect(resolveModelFallbacks(model)).toEqual([
      "openai/gpt-4o",
      "anthropic/claude-haiku-4-5-20241022",
    ]);
  });
});
