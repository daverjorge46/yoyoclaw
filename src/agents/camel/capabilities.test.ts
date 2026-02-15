import { describe, expect, it } from "vitest";
import {
  capabilityFromQllmOutput,
  createCamelCapability,
  createUserCapability,
  mergeCapabilities,
} from "./capabilities.js";

describe("camel capabilities", () => {
  it("marks qllm outputs as untrusted", () => {
    const output = capabilityFromQllmOutput({
      sourceName: "extracted",
      inputCapability: {
        trusted: true,
        readers: "public",
        sources: ["user"],
      },
    });
    expect(output.trusted).toBe(false);
    expect(output.sources).toContain("qllm:extracted");
  });

  it("treats user/camel literals as public capabilities", () => {
    expect(createUserCapability().readers).toBe("public");
    expect(createCamelCapability().readers).toBe("public");
  });

  it("preserves empty-reader intersections", () => {
    const merged = mergeCapabilities([
      { trusted: false, readers: ["alice@example.com"], sources: ["tool:a"] },
      { trusted: false, readers: ["bob@example.com"], sources: ["tool:b"] },
    ]);
    expect(merged.readers).toEqual([]);
  });
});
