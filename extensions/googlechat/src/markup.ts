/**
 * Convert standard Markdown formatting to Google Chat markup.
 *
 * Google Chat uses its own text formatting syntax:
 *   Bold:          *text*    (Markdown: **text**)
 *   Italic:        _text_    (Markdown: *text*)
 *   Strikethrough: ~text~    (Markdown: ~~text~~)
 *
 * Code spans and fenced code blocks are preserved verbatim.
 */
export function convertMarkdownToGoogleChat(text: string): string {
  // Split on code blocks and inline code to protect them from conversion.
  const codePattern = /(```[\s\S]*?```|`[^`]+`)/g;

  const parts = text.split(codePattern);

  for (let i = 0; i < parts.length; i++) {
    // Even indices are non-code segments; odd indices are code segments.
    if (i % 2 === 0) {
      parts[i] = convertSegment(parts[i]);
    }
  }

  return parts.join("");
}

// Sentinel characters unlikely to appear in real text, used as temporary
// placeholders so that bold output (*…*) isn't re-consumed by the italic pass.
const BOLD_OPEN = "\x02GBOLD\x02";
const BOLD_CLOSE = "\x03GBOLD\x03";

function convertSegment(segment: string): string {
  // 1. Bold: **text** → placeholder
  segment = segment.replace(/\*\*(.+?)\*\*/g, `${BOLD_OPEN}$1${BOLD_CLOSE}`);

  // 2. Strikethrough: ~~text~~ → ~text~
  segment = segment.replace(/~~(.+?)~~/g, "~$1~");

  // 3. Italic: *text* → _text_
  //    Negative lookbehind/lookahead ensures we don't match stray asterisks.
  segment = segment.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "_$1_");

  // 4. Replace bold placeholders with Google Chat bold markers.
  segment = segment.replaceAll(BOLD_OPEN, "*");
  segment = segment.replaceAll(BOLD_CLOSE, "*");

  return segment;
}
