/**
 * Deep Research command parsing
 */

export type DeepResearchCommand = {
  topic: string;
};

const DEEP_COMMAND_RE = /^\/deep(?:@([a-z0-9_]+))?(?:[\s:,-]+([\s\S]+))?$/i;

export function parseDeepResearchCommand(
  message: string,
  botUsername?: string,
): DeepResearchCommand | null {
  const trimmed = message.trim();
  const match = DEEP_COMMAND_RE.exec(trimmed);
  if (!match) return null;

  const mentioned = match[1];
  if (
    mentioned &&
    botUsername &&
    mentioned.toLowerCase() !== botUsername.toLowerCase()
  ) {
    return null;
  }

  const topic = (match[2] ?? "").trim();
  return { topic };
}
