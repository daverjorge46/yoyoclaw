import { describe, expect, it } from "vitest";
import { extractSingleCodeBlock, parseJsonPayload } from "./parser.js";

describe("camel parser", () => {
  it("parses raw JSON", () => {
    const parsed = parseJsonPayload<{ steps: unknown[] }>('{"steps":[]}', "planner output");
    expect(parsed.steps).toEqual([]);
  });

  it("parses a single fenced JSON code block", () => {
    const parsed = parseJsonPayload<{ ok: boolean }>('```json\n{"ok":true}\n```', "payload");
    expect(parsed.ok).toBe(true);
  });

  it("extracts one fenced block and rejects multiple blocks", () => {
    expect(extractSingleCodeBlock('```json\n{"a":1}\n```')).toBe('{"a":1}');
    expect(() => extractSingleCodeBlock('```json\n{"a":1}\n```\n```json\n{"b":2}\n```')).toThrow(
      "exactly one non-empty code block",
    );
  });
});
