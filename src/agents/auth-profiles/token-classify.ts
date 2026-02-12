/**
 * Refined classification of a static bearer token based on known prefixes.
 *
 * - `"oauth"` — Anthropic OAuth access token (`sk-ant-oat01-`), billed
 *   through a Max/Pro subscription.
 * - `"api_key"` — Anthropic API key (`sk-ant-api03-`), billed against
 *   console.anthropic.com credits.
 * - `"token"` — Unknown/unrecognised prefix; keep the generic label.
 */
export type TokenKind = "oauth" | "api_key" | "token";

/**
 * Classify a bearer token string by its prefix.
 *
 * Currently recognises Anthropic-specific prefixes; all other tokens
 * fall through as `"token"`.
 */
export function classifyTokenKind(token: string): TokenKind {
  if (token.startsWith("sk-ant-oat01-")) {
    return "oauth";
  }
  if (token.startsWith("sk-ant-api03-")) {
    return "api_key";
  }
  return "token";
}
