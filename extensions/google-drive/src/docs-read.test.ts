import type { docs_v1 } from "googleapis";
import { describe, it, expect } from "vitest";
import { convertDocumentToText } from "./docs-read.js";

function minimalDocument(
  overrides: Partial<docs_v1.Schema$Document> = {},
): docs_v1.Schema$Document {
  return {
    title: "Test",
    body: { content: [] },
    ...overrides,
  };
}

describe("convertDocumentToText", () => {
  it("returns empty string for empty body content", () => {
    expect(convertDocumentToText(minimalDocument(), "markdown")).toBe("");
    expect(convertDocumentToText(minimalDocument({ body: { content: [] } }), "text")).toBe("");
  });

  it("extracts paragraph text", () => {
    const doc = minimalDocument({
      body: {
        content: [
          {
            paragraph: {
              elements: [{ textRun: { content: "Hello world" } }],
            },
          },
        ],
      },
    });
    expect(convertDocumentToText(doc, "text")).toBe("Hello world");
    expect(convertDocumentToText(doc, "markdown")).toBe("Hello world");
  });

  it("formats bold and italic in markdown", () => {
    const doc = minimalDocument({
      body: {
        content: [
          {
            paragraph: {
              elements: [
                { textRun: { content: "bold ", textStyle: { bold: true } } },
                { textRun: { content: "italic", textStyle: { italic: true } } },
              ],
            },
          },
        ],
      },
    });
    expect(convertDocumentToText(doc, "markdown")).toBe("**bold ***italic*");
    expect(convertDocumentToText(doc, "text")).toBe("bold italic");
  });

  it("outputs heading level in markdown", () => {
    const doc = minimalDocument({
      body: {
        content: [
          {
            paragraph: {
              elements: [{ textRun: { content: "Heading 2" } }],
              paragraphStyle: { namedStyleType: "HEADING_2" },
            },
          },
        ],
      },
    });
    expect(convertDocumentToText(doc, "markdown")).toBe("## Heading 2");
    expect(convertDocumentToText(doc, "text")).toBe("Heading 2");
  });

  it("converts table to markdown", () => {
    const doc = minimalDocument({
      body: {
        content: [
          {
            table: {
              tableRows: [
                {
                  tableCells: [
                    { content: [{ paragraph: { elements: [{ textRun: { content: "A" } }] } }] },
                    { content: [{ paragraph: { elements: [{ textRun: { content: "B" } }] } }] },
                  ],
                },
                {
                  tableCells: [
                    { content: [{ paragraph: { elements: [{ textRun: { content: "1" } }] } }] },
                    { content: [{ paragraph: { elements: [{ textRun: { content: "2" } }] } }] },
                  ],
                },
              ],
            },
          },
        ],
      },
    });
    expect(convertDocumentToText(doc, "markdown")).toBe("| A | B |\n| --- | --- |\n| 1 | 2 |");
    expect(convertDocumentToText(doc, "text")).toBe("A\tB\n1\t2");
  });
});
