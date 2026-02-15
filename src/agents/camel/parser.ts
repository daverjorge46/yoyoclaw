import JSON5 from "json5";

export class CamelJsonParseError extends Error {
  readonly label: string;

  constructor(label: string) {
    super(`Failed to parse ${label} as JSON.`);
    this.name = "CamelJsonParseError";
    this.label = label;
  }
}

export function extractSingleCodeBlock(markdownText: string): string | undefined {
  const pattern = /```([a-zA-Z0-9_+\-#]*)\n([\s\S]*?)\n```/g;
  const matches = Array.from(markdownText.matchAll(pattern));
  const blocks = matches.map((match) => match[2]?.trim() ?? "").filter(Boolean);
  if (blocks.length === 0) {
    return undefined;
  }
  if (blocks.length !== 1) {
    throw new Error("You must provide exactly one non-empty code block in markdown format.");
  }
  return blocks[0];
}

export function parseJsonPayload<T>(text: string, label: string): T {
  const extractedCode = extractSingleCodeBlock(text);
  const trimmed = (extractedCode ?? text).trim();
  const fenced = trimmed
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const attempts = [trimmed, fenced];
  const objMatch = fenced.match(/\{[\s\S]*\}/);
  if (objMatch) {
    attempts.push(objMatch[0]);
  }
  const arrMatch = fenced.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    attempts.push(arrMatch[0]);
  }
  for (const candidate of attempts) {
    if (!candidate) {
      continue;
    }
    try {
      return JSON.parse(candidate);
    } catch {
      try {
        return JSON5.parse(candidate);
      } catch {
        // try next parse candidate
      }
    }
  }
  throw new CamelJsonParseError(label);
}
