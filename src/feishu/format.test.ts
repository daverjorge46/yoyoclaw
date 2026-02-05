import { describe, expect, it } from "vitest";
import type { FeishuPostContent } from "./format.js";
import { containsMarkdown, extractTextFromFeishuPost, markdownToFeishuPost } from "./format.js";

describe("containsMarkdown", () => {
  it("detects bold text", () => {
    expect(containsMarkdown("Hello **world**")).toBe(true);
  });

  it("detects italic text", () => {
    expect(containsMarkdown("Hello *world*")).toBe(true);
  });

  it("detects inline code", () => {
    expect(containsMarkdown("Run `npm install`")).toBe(true);
  });

  it("detects code blocks", () => {
    expect(containsMarkdown("```js\nconsole.log('hi')\n```")).toBe(true);
  });

  it("detects links", () => {
    expect(containsMarkdown("Visit [Google](https://google.com)")).toBe(true);
  });

  it("detects headings", () => {
    expect(containsMarkdown("# Title")).toBe(true);
  });

  it("returns false for plain text", () => {
    expect(containsMarkdown("Hello world")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(containsMarkdown("")).toBe(false);
  });
});

describe("extractTextFromFeishuPost", () => {
  it("extracts plain text from a single line", () => {
    const post: FeishuPostContent = {
      zh_cn: {
        content: [[{ tag: "text", text: "Hello world" }]],
      },
    };
    expect(extractTextFromFeishuPost(post)).toBe("Hello world");
  });

  it("extracts text from multiple lines", () => {
    const post: FeishuPostContent = {
      zh_cn: {
        content: [
          [{ tag: "text", text: "Line 1" }],
          [{ tag: "text", text: "Line 2" }],
          [{ tag: "text", text: "Line 3" }],
        ],
      },
    };
    expect(extractTextFromFeishuPost(post)).toBe("Line 1\nLine 2\nLine 3");
  });

  it("extracts text from links", () => {
    const post: FeishuPostContent = {
      zh_cn: {
        content: [
          [
            { tag: "text", text: "Visit " },
            { tag: "a", text: "Google", href: "https://google.com" },
            { tag: "text", text: " for more" },
          ],
        ],
      },
    };
    expect(extractTextFromFeishuPost(post)).toBe("Visit Google for more");
  });

  it("skips @mention elements (matches text-message stripping behavior)", () => {
    const post: FeishuPostContent = {
      zh_cn: {
        content: [
          [
            { tag: "at", user_id: "ou_123" },
            { tag: "text", text: " Hello" },
          ],
        ],
      },
    };
    expect(extractTextFromFeishuPost(post)).toBe(" Hello");
  });

  it("extracts emoji as bracketed name", () => {
    const post: FeishuPostContent = {
      zh_cn: {
        content: [
          [
            { tag: "text", text: "Great " },
            { tag: "emotion", emoji_type: "THUMBSUP" },
          ],
        ],
      },
    };
    expect(extractTextFromFeishuPost(post)).toBe("Great [THUMBSUP]");
  });

  it("skips img and media elements", () => {
    const post: FeishuPostContent = {
      zh_cn: {
        content: [
          [
            { tag: "text", text: "See image: " },
            { tag: "img", image_key: "img_xxx" },
          ],
        ],
      },
    };
    expect(extractTextFromFeishuPost(post)).toBe("See image: ");
  });

  it("falls back to en_us when zh_cn is missing", () => {
    const post: FeishuPostContent = {
      en_us: {
        content: [[{ tag: "text", text: "English text" }]],
      },
    };
    expect(extractTextFromFeishuPost(post)).toBe("English text");
  });

  it("returns empty string for empty post", () => {
    expect(extractTextFromFeishuPost({})).toBe("");
  });

  it("handles mixed elements on one line", () => {
    const post: FeishuPostContent = {
      zh_cn: {
        content: [
          [
            { tag: "text", text: "Check " },
            { tag: "a", text: "this link", href: "https://example.com" },
            { tag: "text", text: " and " },
            { tag: "text", text: "reply" },
          ],
        ],
      },
    };
    expect(extractTextFromFeishuPost(post)).toBe("Check this link and reply");
  });
});

describe("markdownToFeishuPost", () => {
  it("converts plain text", () => {
    const result = markdownToFeishuPost("Hello world");
    expect(result.zh_cn?.content).toBeDefined();
    expect(result.zh_cn?.content[0]).toContainEqual({
      tag: "text",
      text: "Hello world",
    });
  });

  it("converts bold text", () => {
    const result = markdownToFeishuPost("Hello **bold** text");
    const content = result.zh_cn?.content[0];
    expect(content).toBeDefined();
    // Should have at least one element with bold style
    const boldElement = content?.find((el) => el.tag === "text" && el.style?.includes("bold"));
    expect(boldElement).toBeDefined();
  });

  it("converts italic text", () => {
    const result = markdownToFeishuPost("Hello *italic* text");
    const content = result.zh_cn?.content[0];
    expect(content).toBeDefined();
    const italicElement = content?.find((el) => el.tag === "text" && el.style?.includes("italic"));
    expect(italicElement).toBeDefined();
  });

  it("converts links", () => {
    const result = markdownToFeishuPost("Visit [Google](https://google.com)");
    const content = result.zh_cn?.content[0];
    expect(content).toBeDefined();
    const linkElement = content?.find((el) => el.tag === "a");
    expect(linkElement).toBeDefined();
    if (linkElement && linkElement.tag === "a") {
      expect(linkElement.href).toBe("https://google.com");
      expect(linkElement.text).toBe("Google");
    }
  });

  it("handles multi-line text", () => {
    const result = markdownToFeishuPost("Line 1\nLine 2\nLine 3");
    expect(result.zh_cn?.content.length).toBe(3);
  });

  it("converts code to code style", () => {
    const result = markdownToFeishuPost("Run `npm install`");
    const content = result.zh_cn?.content[0];
    expect(content).toBeDefined();
    const codeElement = content?.find((el) => el.tag === "text" && el.style?.includes("code"));
    expect(codeElement).toBeDefined();
  });

  it("handles empty input", () => {
    const result = markdownToFeishuPost("");
    expect(result.zh_cn?.content).toBeDefined();
  });
});
