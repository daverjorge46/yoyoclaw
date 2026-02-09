/**
 * Input Sanitizer — cleans ALL external input before it reaches the reasoning layer.
 *
 * Every Telegram message, API response, and external data source passes through
 * this sanitizer. It:
 * 1. Strips zero-width and invisible characters (used for obfuscation)
 * 2. Normalizes unicode (prevents homoglyph attacks)
 * 3. Truncates excessively long input
 * 4. Detects obvious structural injection patterns
 *
 * This is a pre-filter, not a replacement for the full injection scanner.
 */

/** Result of sanitization. */
export interface SanitizeResult {
  /** The cleaned text. */
  sanitized: string;
  /** Whether any modifications were made. */
  modified: boolean;
  /** What was stripped/changed. */
  modifications: string[];
}

/** Characters that should never appear in legitimate input. */
const INVISIBLE_CHARS = [
  "\u200B", // zero-width space
  "\u200C", // zero-width non-joiner
  "\u200D", // zero-width joiner
  "\u200E", // left-to-right mark
  "\u200F", // right-to-left mark
  "\u2060", // word joiner
  "\u2061", // function application
  "\u2062", // invisible times
  "\u2063", // invisible separator
  "\u2064", // invisible plus
  "\uFEFF", // zero-width no-break space (BOM)
  "\u00AD", // soft hyphen
  "\u034F", // combining grapheme joiner
  "\u061C", // arabic letter mark
  "\u180E", // mongolian vowel separator
];

const INVISIBLE_REGEX = new RegExp(
  `[${INVISIBLE_CHARS.map((c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`).join("")}]`,
  "g"
);

/** Max input length before truncation (generous but bounded). */
const MAX_INPUT_LENGTH = 4096;

/**
 * Sanitize external input text.
 * Returns the cleaned text and a log of what was modified.
 */
export function sanitizeInput(raw: string): SanitizeResult {
  const modifications: string[] = [];
  let text = raw;

  // 1. Strip invisible/zero-width characters
  const invisibleCount = (text.match(INVISIBLE_REGEX) || []).length;
  if (invisibleCount > 0) {
    text = text.replace(INVISIBLE_REGEX, "");
    modifications.push(`stripped ${invisibleCount} invisible character(s)`);
  }

  // 2. Normalize unicode (NFC: canonical decomposition + canonical composition)
  const normalized = text.normalize("NFC");
  if (normalized !== text) {
    text = normalized;
    modifications.push("normalized unicode (NFC)");
  }

  // 3. Strip control characters (except newline, tab, carriage return)
  const controlStripped = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  if (controlStripped !== text) {
    const count = text.length - controlStripped.length;
    text = controlStripped;
    modifications.push(`stripped ${count} control character(s)`);
  }

  // 4. Collapse excessive whitespace (> 3 consecutive newlines → 2)
  const collapsed = text.replace(/\n{4,}/g, "\n\n\n");
  if (collapsed !== text) {
    text = collapsed;
    modifications.push("collapsed excessive newlines");
  }

  // 5. Truncate if too long
  if (text.length > MAX_INPUT_LENGTH) {
    text = text.slice(0, MAX_INPUT_LENGTH);
    modifications.push(`truncated to ${MAX_INPUT_LENGTH} characters`);
  }

  return {
    sanitized: text.trim(),
    modified: modifications.length > 0,
    modifications,
  };
}

/**
 * Quick check: does this input contain structural injection markers?
 * This is a fast pre-filter — the full scanner does deeper analysis.
 */
export function hasStructuralInjection(text: string): boolean {
  const patterns = [
    /<\/?system>/i,
    /\[SYSTEM\]/i,
    /\[INST\]/i,
    /<<SYS>>/i,
    /---\s*END\s*(OF\s*)?SYSTEM/i,
    /\[OVERRIDE\]/i,
    /\[ADMIN\]/i,
    /<!-- inject/i,
  ];

  return patterns.some((p) => p.test(text));
}
