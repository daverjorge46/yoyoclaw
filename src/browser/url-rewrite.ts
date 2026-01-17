export function rewriteUrlForAccess(url: string): {
  url: string;
  rewritten: boolean;
} {
  const trimmed = typeof url === "string" ? url.trim() : "";
  if (!trimmed) return { url, rewritten: false };

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { url: trimmed, rewritten: false };
  }

  const host = parsed.hostname.toLowerCase();
  const isTwitter =
    host === "x.com" ||
    host.endsWith(".x.com") ||
    host === "twitter.com" ||
    host.endsWith(".twitter.com");
  const alreadyBypassed =
    host === "r.jina.ai" ||
    host.endsWith(".r.jina.ai") ||
    host === "vxtwitter.com" ||
    host.endsWith(".vxtwitter.com") ||
    host === "fxtwitter.com" ||
    host.endsWith(".fxtwitter.com") ||
    host === "fixupx.com" ||
    host.endsWith(".fixupx.com");

  if (!isTwitter || alreadyBypassed) {
    return { url: parsed.toString(), rewritten: false };
  }

  // Proxy through Jina reader to avoid login walls for read-only fetches.
  const proxied = `https://r.jina.ai/${parsed.toString()}`;
  return { url: proxied, rewritten: true };
}
