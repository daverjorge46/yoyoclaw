import { describe, it, expect } from "vitest";
import { stripAnsi, visibleWidth } from "./ansi.js";

describe("ansi", () => {
  describe("stripAnsi", () => {
    it("should strip SGR codes", () => {
      expect(stripAnsi("\x1b[31mRed\x1b[0m")).toBe("Red");
      expect(stripAnsi("\x1b[1m\x1b[38;2;246;196;83mBoldColor\x1b[0m")).toBe("BoldColor");
    });

    it("should strip nested/adjacent SGR codes with multiple passes", () => {
      // Nested codes like [1m[38;2;246;196;83m should be fully stripped
      expect(stripAnsi("\x1b[1m\x1b[38;2;246;196;83mText\x1b[0m")).toBe("Text");
    });

    describe("OSC-8 hyperlinks", () => {
      it("should strip complete hyperlinks", () => {
        const input = "\x1b]8;;https://example.com\x07Link Text\x1b]8;;\x07";
        const output = stripAnsi(input);
        expect(output).toBe("Link Text");
      });

      it("should strip hyperlinks with ESC\\ terminator", () => {
        const input = "\x1b]8;;https://example.com\x1b\x5cLink Text\x1b]8;;\x1b\x5c";
        const output = stripAnsi(input);
        expect(output).toBe("Link Text");
      });

      it("should strip hyperlinks with parameters", () => {
        const input = "\x1b]8;;id=my-link;https://example.com\x07Link Text\x1b]8;;\x07";
        const output = stripAnsi(input);
        expect(output).toBe("Link Text");
      });

      it("should strip hyperlinks with mixed terminators", () => {
        // Opening with BEL, closing with ESC\
        const input = "\x1b]8;;https://example.com\x07Link Text\x1b]8;;\x1b\x5c";
        const output = stripAnsi(input);
        expect(output).toBe("Link Text");

        // Opening with ESC\, closing with BEL
        const input2 = "\x1b]8;;https://example.com\x1b\x5cLink Text\x1b]8;;\x07";
        const output2 = stripAnsi(input2);
        expect(output2).toBe("Link Text");
      });

      it("should not leave orphaned closing sequences", () => {
        const input = "\x1b]8;;https://example.com\x07Link Text\x1b]8;;\x07";
        const output = stripAnsi(input);
        // Should not contain any escape sequences
        expect(output).not.toContain("\x1b");
      });

      it("should not leave orphaned opening sequences", () => {
        const input = "\x1b]8;;https://example.com\x07Link Text\x1b]8;;\x07";
        const output = stripAnsi(input);
        // Should not contain any escape sequences
        expect(output).not.toContain("\x1b");
      });

      it("should strip multiple hyperlinks in a row", () => {
        const input =
          "\x1b]8;;https://a.com\x07A\x1b]8;;\x07 \x1b]8;;https://b.com\x07B\x1b]8;;\x07";
        const output = stripAnsi(input);
        expect(output).toBe("A B");
      });

      it("should strip hyperlinks combined with SGR codes", () => {
        const input = "\x1b[31m\x1b]8;;https://example.com\x07Link\x1b]8;;\x07\x1b[0m";
        const output = stripAnsi(input);
        expect(output).toBe("Link");
      });
    });
  });

  describe("visibleWidth", () => {
    it("should calculate width of plain text", () => {
      expect(visibleWidth("Hello")).toBe(5);
    });

    it("should exclude SGR codes from width", () => {
      expect(visibleWidth("\x1b[31mRed\x1b[0m")).toBe(3);
    });

    it("should exclude nested SGR codes from width", () => {
      expect(visibleWidth("\x1b[1m\x1b[38;2;246;196;83mText\x1b[0m")).toBe(4);
    });

    it("should exclude hyperlinks from width", () => {
      expect(visibleWidth("\x1b]8;;https://example.com\x07Link Text\x1b]8;;\x07")).toBe(9);
    });

    it("should exclude combined ANSI codes from width", () => {
      const input = "\x1b[31m\x1b]8;;https://example.com\x07Link\x1b]8;;\x07\x1b[0m";
      expect(visibleWidth(input)).toBe(4);
    });

    it("should handle empty string", () => {
      expect(visibleWidth("")).toBe(0);
    });

    it("should handle string with only ANSI codes", () => {
      expect(visibleWidth("\x1b[31m\x1b[0m")).toBe(0);
    });
  });
});
