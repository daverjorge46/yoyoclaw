/**
 * Strip Matrix reply fallback from message body.
 *
 * When a Matrix client sends a reply, the spec prepends a "fallback" to the
 * body for clients that don't understand replies. For plain-text `body`, these
 * are lines starting with `> ` followed by an optional blank line. For
 * `formatted_body` (HTML), the fallback is wrapped in `<mx-reply>...</mx-reply>`.
 *
 * We strip these so the AI agent only sees the actual reply text.
 */

/**
 * Strip reply fallback from a plain-text body.
 *
 * Removes leading `> ` lines and one trailing blank line, which is the
 * standard reply fallback format per the Matrix spec.
 */
export function stripReplyFallback(body: string): string {
  return body.replace(/^(>.*\n)*\n?/, "");
}

/**
 * Strip reply fallback from an HTML formatted_body.
 *
 * Removes the `<mx-reply>...</mx-reply>` block that clients prepend.
 */
export function stripHtmlReplyFallback(html: string): string {
  return html.replace(/<mx-reply>[\s\S]*?<\/mx-reply>/, "");
}
