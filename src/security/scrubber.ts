/**
 * Extracts potential secrets from a configuration object.
 */
export function extractSecrets(obj: unknown): string[] {
  const secrets = new Set<string>();

  function traverse(current: unknown) {
    if (!current || typeof current !== "object") return;

    for (const [key, value] of Object.entries(current)) {
      if (typeof value === "string") {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes("key") ||
          lowerKey.includes("token") ||
          lowerKey.includes("secret") ||
          lowerKey.includes("password") ||
          lowerKey.includes("credential")
        ) {
          if (value.length >= 8) {
            secrets.add(value);
          }
        }
      } else {
        traverse(value);
      }
    }
  }

  traverse(obj);
  return Array.from(secrets);
}

/**
 * Redacts known secrets from a text string.
 */
export function scrubText(text: string, secrets: string[]): string {
  if (!text || !secrets.length) return text;

  let scrubbed = text;
  // Sort secrets by length descending to avoid partial matches on shorter secrets
  const sortedSecrets = [...secrets].sort((a, b) => b.length - a.length);

  for (const secret of sortedSecrets) {
    if (!secret) continue;
    // Escape special regex characters in the secret
    const escaped = secret.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "gi");
    scrubbed = scrubbed.replace(regex, "[REDACTED]");
  }

  return scrubbed;
}
