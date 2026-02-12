import { describe, expect, it } from "vitest";
import { classifyTokenKind } from "./token-classify.js";

describe("classifyTokenKind", () => {
  it("classifies sk-ant-oat01- prefix as oauth", () => {
    expect(classifyTokenKind("sk-ant-oat01-ACCESS-TOKEN-1234567890")).toBe("oauth");
  });

  it("classifies sk-ant-api03- prefix as api_key", () => {
    expect(classifyTokenKind("sk-ant-api03-0123456789abcdefghijklmnopqrstuvwxyz")).toBe("api_key");
  });

  it("classifies other sk-ant- prefixes as generic token", () => {
    expect(classifyTokenKind("sk-ant-sid01-SOMETHING")).toBe("token");
  });

  it("classifies non-Anthropic tokens as generic token", () => {
    expect(classifyTokenKind("eyJhbGciOi-ACCESS-TOKEN")).toBe("token");
    expect(classifyTokenKind("oai-some-token")).toBe("token");
  });

  it("classifies empty string as generic token", () => {
    expect(classifyTokenKind("")).toBe("token");
  });

  it("handles exact prefix match (no trailing content)", () => {
    expect(classifyTokenKind("sk-ant-oat01-")).toBe("oauth");
    expect(classifyTokenKind("sk-ant-api03-")).toBe("api_key");
  });

  it("does not match partial prefixes", () => {
    expect(classifyTokenKind("sk-ant-oat01")).toBe("token");
    expect(classifyTokenKind("sk-ant-api03")).toBe("token");
    expect(classifyTokenKind("sk-ant-oat0")).toBe("token");
  });
});
