import { cut, load } from "@node-rs/jieba";

// 初始化 jieba 词典（在模块加载时自动加载）
load();

// 标点符号正则表达式（只包含英文和中文标点，不包含中文字符）
const punctuationPattern =
  /^[\u0020-\u002f\u003a-\u0040\u005b-\u0060\u007b-\u007e\u3000-\u303f\ufe10-\ufe1f\ufe30-\ufe44\ufe50-\ufe6b\uff00-\uff60\uffe0-\uffe6]+$/;

/**
 * 检测文本是否包含中文字符
 */
export function hasChinese(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  // 检测中文字符范围
  return /[\u4e00-\u9fa5]/.test(text);
}

/**
 * 对混合文本进行分词
 * 中文使用 jieba 分词，英文和数字保持原样
 */
export function tokenizeMixed(text: string): string[] {
  if (!text || typeof text !== "string") return [];

  // 如果不包含中文，只提取英文和数字
  if (!hasChinese(text)) {
    return (
      text
        .match(/[A-Za-z0-9_]+/g)
        ?.map((t) => t.trim())
        .filter(Boolean) ?? []
    );
  }

  // 使用 jieba 对整段文本进行分词，hmm=false 避免将数字英文拆开
  const tokens = cut(text, false);

  // jieba 分词结果可能包含标点符号，我们只保留有意义的 token
  const result: string[] = [];
  for (const token of tokens) {
    // 跳过空字符串
    if (!token || token.length === 0) continue;

    // 去除 token 中的前后空白
    const trimmed = token.trim();

    // 过滤掉纯标点符号和空白 token
    if (trimmed.length === 0) continue;

    // 跳过纯标点符号（不包括中文字符）
    if (punctuationPattern.test(trimmed)) continue;

    result.push(trimmed);
  }

  // 去重
  const uniqueTokens = [...new Set(result)];

  return uniqueTokens;
}
