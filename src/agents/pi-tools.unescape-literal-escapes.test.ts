import { describe, expect, it } from "vitest";
import {
  normalizeEditContent,
  normalizeWriteContent,
  unescapeLiteralEscapes,
} from "./pi-tools.read.js";

describe("unescapeLiteralEscapes", () => {
  it("returns text unchanged when no backslashes present", () => {
    expect(unescapeLiteralEscapes("hello world")).toBe("hello world");
  });

  it("returns text unchanged when backslash present but no \\n", () => {
    expect(unescapeLiteralEscapes("path\\to\\file")).toBe("path\\to\\file");
  });

  it("converts literal \\n to real newlines when no real newlines exist", () => {
    expect(unescapeLiteralEscapes("Line1\\nLine2\\nLine3")).toBe("Line1\nLine2\nLine3");
  });

  it("converts literal \\t to real tabs", () => {
    expect(unescapeLiteralEscapes("col1\\tcol2\\nrow2")).toBe("col1\tcol2\nrow2");
  });

  it("converts literal \\r to real carriage return", () => {
    expect(unescapeLiteralEscapes("line1\\r\\nline2")).toBe("line1\r\nline2");
  });

  it("handles escaped backslashes (\\\\n stays as backslash + newline)", () => {
    // \\n in source = the model intended a literal backslash followed by n
    expect(unescapeLiteralEscapes("regex: \\\\n pattern\\n")).toBe("regex: \\n pattern\n");
  });

  it("leaves text unchanged when real newlines already exist", () => {
    // Mixed content: model sent some real newlines and some literal \\n.
    // Assume the literal ones are intentional (e.g. code with escape sequences).
    const input = "line1\nconst s = 'hello\\nworld';";
    expect(unescapeLiteralEscapes(input)).toBe(input);
  });

  it("handles empty string", () => {
    expect(unescapeLiteralEscapes("")).toBe("");
  });

  it("handles escaped quotes", () => {
    expect(unescapeLiteralEscapes('say \\"hello\\"\\nbye')).toBe('say "hello"\nbye');
  });

  it("handles content that is only \\n", () => {
    expect(unescapeLiteralEscapes("\\n")).toBe("\n");
  });

  it("handles multiple consecutive \\n", () => {
    expect(unescapeLiteralEscapes("a\\n\\n\\nb")).toBe("a\n\n\nb");
  });
});

describe("normalizeWriteContent", () => {
  it("unescapes literal \\n in content field", () => {
    const params = { path: "test.txt", content: "Line1\\nLine2" };
    const result = normalizeWriteContent(params);
    expect(result.content).toBe("Line1\nLine2");
    expect(result.path).toBe("test.txt");
  });

  it("returns params unchanged when content has real newlines", () => {
    const params = { path: "test.txt", content: "Line1\nLine2" };
    const result = normalizeWriteContent(params);
    expect(result).toBe(params); // Same reference = no change
  });

  it("returns params unchanged when content is not a string", () => {
    const params = { path: "test.txt", content: 42 };
    const result = normalizeWriteContent(params);
    expect(result).toBe(params);
  });

  it("returns params unchanged when content has no escapes", () => {
    const params = { path: "test.txt", content: "simple text" };
    const result = normalizeWriteContent(params);
    expect(result).toBe(params);
  });
});

describe("normalizeEditContent", () => {
  it("unescapes literal \\n in oldText and newText", () => {
    const params = {
      path: "test.txt",
      oldText: "old\\ntext",
      newText: "new\\ntext",
    };
    const result = normalizeEditContent(params);
    expect(result.oldText).toBe("old\ntext");
    expect(result.newText).toBe("new\ntext");
  });

  it("returns params unchanged when both fields have real newlines", () => {
    const params = {
      path: "test.txt",
      oldText: "old\ntext",
      newText: "new\ntext",
    };
    const result = normalizeEditContent(params);
    expect(result).toBe(params);
  });

  it("handles only oldText needing fix", () => {
    const params = {
      path: "test.txt",
      oldText: "old\\ntext",
      newText: "new\ntext",
    };
    const result = normalizeEditContent(params);
    expect(result.oldText).toBe("old\ntext");
    expect(result.newText).toBe("new\ntext");
  });
});
