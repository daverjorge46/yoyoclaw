import { describe, expect, it } from "vitest";
import { parseDeepResearchCommand } from "./command.js";

describe("parseDeepResearchCommand", () => {
  it("extracts topic from /deep", () => {
    const result = parseDeepResearchCommand("/deep AI safety");
    expect(result).toEqual({ topic: "AI safety" });
  });

  it("accepts a matching bot mention", () => {
    const result = parseDeepResearchCommand("/deep@testbot Climate", "testbot");
    expect(result).toEqual({ topic: "Climate" });
  });

  it("rejects a different bot mention", () => {
    const result = parseDeepResearchCommand("/deep@otherbot Climate", "testbot");
    expect(result).toBeNull();
  });

  it("handles separators", () => {
    const result = parseDeepResearchCommand("/deep: topic");
    expect(result).toEqual({ topic: "topic" });
  });

  it("returns null for non-command text", () => {
    const result = parseDeepResearchCommand("deep research on AI");
    expect(result).toBeNull();
  });

  it("returns empty topic for bare command", () => {
    const result = parseDeepResearchCommand("/deep");
    expect(result).toEqual({ topic: "" });
  });
});
