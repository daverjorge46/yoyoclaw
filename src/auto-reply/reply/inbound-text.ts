export function normalizeInboundTextNewlines(input: string): string {
  // Normalize actual newline characters (CR+LF and CR to LF).
  // Do NOT replace literal backslash-n sequences (\\n) as they may be part of
  // Windows paths like C:\Work\nxxx\README.md or user-intended escape sequences.
  return input.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

/**
 * Normalize outbound text newlines before sending to channels.
 * Converts literal `\n` escape sequences to actual newlines.
 * Some LLM providers may output literal `\n` in their responses,
 * which causes WhatsApp (and potentially other channels) to display
 * the escape sequence as text instead of rendering a line break.
 */
export function normalizeOutboundTextNewlines(input: string): string {
  if (!input) return input;
  // Convert literal \n (backslash-n) sequences to actual newlines.
  // Also handle \r\n and \r for consistency.
  return input.replaceAll("\\r\\n", "\n").replaceAll("\\r", "\n").replaceAll("\\n", "\n");
}
