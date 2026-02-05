/**
 * AI Fact Extraction — uses Gemini 2.5 Flash to extract structured facts
 * from conversation text via plain fetch().
 */

import type { MemoryCategory } from "../config.js";

// ============================================================================
// Types
// ============================================================================

export type ExtractedFact = {
  text: string;           // Self-contained narrative sentence
  category: MemoryCategory;
  importance: number;     // 0.0-1.0
  entities: string[];     // Entity names mentioned
};

// ============================================================================
// Extraction Prompt
// ============================================================================

const EXTRACTION_PROMPT = `You are a memory extraction system. Given a conversation between a human and an AI assistant, extract important facts that should be remembered long-term.

For each fact, provide:
- text: A self-contained, narrative sentence (understandable without any prior context)
- category: one of ["preference", "decision", "fact", "entity", "rule", "project", "relationship", "other"]
- importance: 0.0-1.0 (how important is this to remember long-term?)
- entities: list of entity names mentioned (people, projects, tools, places, organizations)

Rules:
- Only extract DURABLE information (not ephemeral conversation)
- Preferences and rules are high importance (0.7-1.0)
- Skip greetings, small talk, acknowledgments, status updates
- Each fact must stand alone — no "he said" or "they decided" without naming who
- Do not extract information about what the AI assistant said or did — only extract facts ABOUT the human, their world, preferences, projects, and decisions
- Maximum 10 facts per conversation
- If there is nothing worth extracting, return an empty array []

Return a JSON array of objects with keys: text, category, importance, entities.

Conversation:
`;

// ============================================================================
// Extractor
// ============================================================================

const VALID_CATEGORIES = new Set<string>([
  "preference", "decision", "fact", "entity", "rule", "project", "relationship", "other",
]);

/**
 * Extract structured facts from a conversation using Gemini Flash.
 *
 * @param conversationText - The full conversation text (user + assistant messages)
 * @param apiKey - Gemini API key
 * @param model - Model to use (default: "gemini-2.5-flash")
 * @returns Array of extracted facts
 */
export async function extractFacts(
  conversationText: string,
  apiKey: string,
  model: string = "gemini-2.5-flash",
): Promise<ExtractedFact[]> {
  if (!conversationText || conversationText.trim().length < 50) {
    return [];
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          {
            text: EXTRACTION_PROMPT + conversationText,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
      maxOutputTokens: 2048,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "unknown");
    throw new Error(
      `Gemini extraction failed (${response.status}): ${errorText.slice(0, 500)}`,
    );
  }

  const data = await response.json() as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return [];
  }

  // Parse the JSON response
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[1]);
      } catch {
        return [];
      }
    } else {
      return [];
    }
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  // Validate and normalize each extracted fact
  const facts: ExtractedFact[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;

    const factText = typeof raw.text === "string" ? raw.text.trim() : "";
    if (!factText || factText.length < 10) continue;

    const category = VALID_CATEGORIES.has(raw.category as string)
      ? (raw.category as MemoryCategory)
      : "other";

    let importance = typeof raw.importance === "number" ? raw.importance : 0.5;
    importance = Math.max(0, Math.min(1, importance));

    const entities: string[] = [];
    if (Array.isArray(raw.entities)) {
      for (const e of raw.entities) {
        if (typeof e === "string" && e.trim()) {
          entities.push(e.trim());
        }
      }
    }

    facts.push({ text: factText, category, importance, entities });
  }

  // Enforce max 10 facts, sorted by importance
  return facts
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 10);
}
