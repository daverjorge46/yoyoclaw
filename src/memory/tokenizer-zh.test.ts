import { describe, it, expect } from "vitest";
import { hasChinese, tokenizeMixed } from "./tokenizer-zh.js";

describe("Chinese tokenizer", () => {
  describe("hasChinese", () => {
    it("detects Chinese characters", () => {
      expect(hasChinese("你好")).toBe(true);
      expect(hasChinese("世界")).toBe(true);
      expect(hasChinese("你好世界")).toBe(true);
      expect(hasChinese("中文测试")).toBe(true);
    });

    it("returns false for pure English text", () => {
      expect(hasChinese("hello world")).toBe(false);
      expect(hasChinese("test")).toBe(false);
      expect(hasChinese("")).toBe(false);
    });

    it("returns true for mixed Chinese and English", () => {
      expect(hasChinese("你好 hello")).toBe(true);
      expect(hasChinese("hello 世界")).toBe(true);
    });

    it("handles empty and invalid input", () => {
      expect(hasChinese("")).toBe(false);
      expect(hasChinese(null as unknown as string)).toBe(false);
      expect(hasChinese(undefined as unknown as string)).toBe(false);
    });
  });

  describe("tokenizeMixed", () => {
    it("tokenizes pure Chinese text", () => {
      const result = tokenizeMixed("你好世界");
      expect(result.length).toBeGreaterThan(1);
      expect(result).toContain("你好");
      expect(result).toContain("世界");
    });

    it("tokenizes Chinese sentence", () => {
      const result = tokenizeMixed("今天天气很好");
      expect(result.length).toBeGreaterThan(0);
      // "今天" 和 "天气" 应该被分出来
      expect(result.some((t) => t.includes("今天") || t.includes("天"))).toBe(true);
    });

    it("extracts English tokens from pure English text", () => {
      const result = tokenizeMixed("hello world test");
      expect(result).toContain("hello");
      expect(result).toContain("world");
      expect(result).toContain("test");
    });

    it("tokenizes mixed Chinese and English text", () => {
      const result = tokenizeMixed("你好 hello world 世界");
      expect(result.length).toBeGreaterThan(2);
      expect(result).toContain("你好");
      expect(result).toContain("hello");
      expect(result).toContain("world");
      expect(result).toContain("世界");
    });

    it("handles empty input", () => {
      expect(tokenizeMixed("")).toEqual([]);
      expect(tokenizeMixed(null as unknown as string)).toEqual([]);
    });
  });
});
