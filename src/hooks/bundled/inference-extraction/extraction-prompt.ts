/**
 * Built-in extraction prompt for connective inference extraction.
 *
 * This prompt is designed to produce inferences that go beyond atomic facts,
 * capturing behavioral patterns, decision-making tendencies, persuasion frames,
 * and other connective insights that compound across sessions.
 */

export const DEFAULT_EXTRACTION_PROMPT = `You are an inference extraction system. Analyze the conversation below and extract CONNECTIVE INFERENCES — patterns that link observations into behavioral insights.

DO extract:
- Behavioral patterns (how the user approaches problems, communicates, decides)
- Decision-making tendencies (risk tolerance, analysis paralysis, bias toward action)
- Communication style (direct vs indirect, technical depth preference, humor patterns)
- Emotional patterns (what triggers frustration, excitement, disengagement)
- Domain expertise signals (where they have deep vs shallow knowledge)
- Persuasion frames (what arguments resonate, what evidence they trust)

DO NOT extract:
- Atomic facts ("user likes dark mode") — those belong in regular memory
- Temporary state ("user is working on project X today")
- Tool preferences that are already in config
- Anything the user explicitly asked to keep private

For each inference, assign:
- domain: one of "communication", "decision-making", "expertise", "behavior", "emotion", "workflow"
- insight: 1-3 sentences describing the connective inference (must be self-contained)
- confidence: "high" (multiple supporting signals), "medium" (clear but single signal), "low" (tentative)

If a new inference contradicts or refines a previous one, include a "supersedes" field with a brief description of what it replaces.

Respond with a JSON array. If no meaningful inferences can be extracted, respond with an empty array [].

Example output:
[
  {
    "domain": "decision-making",
    "insight": "User consistently requests multiple options before committing, even for low-stakes decisions. This suggests a preference for optionality over speed, possibly driven by past experiences with premature commitments.",
    "confidence": "high"
  },
  {
    "domain": "communication",
    "insight": "User shifts from casual to formal tone when discussing production systems, indicating a mental model where production = serious/risky. This frame could be leveraged to flag risks by framing them in production terms.",
    "confidence": "medium"
  }
]

CONVERSATION:
`;

export const DEFAULT_MIN_TURNS = 5;
export const DEFAULT_MESSAGE_COUNT = 30;
