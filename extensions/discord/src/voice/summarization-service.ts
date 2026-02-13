/**
 * Voice session summarization via openclaw's embedded agent runner.
 * Uses whatever LLM the user has configured (Anthropic, OpenAI, etc.)
 * instead of calling Groq directly.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { SpeakerTranscription } from "./types.js";
import { loadCoreAgentDeps } from "./core-bridge.js";

export interface SummarizeVoiceSessionParams {
  transcriptions: SpeakerTranscription[];
  coreConfig: Record<string, unknown>;
}

export interface SummarizeVoiceSessionResult {
  summary: string;
  actionItems: string;
  formatted: string;
}

function buildTranscriptText(transcriptions: SpeakerTranscription[]): string {
  return transcriptions
    .map((t) => {
      const time = new Date(t.timestamp).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `[${time}] ${t.userName}: ${t.text}`;
    })
    .join("\n");
}

const SYSTEM_PROMPT = `You are a meeting assistant. Given a voice conversation transcript, produce a thorough summary formatted for Discord.

Rules:
- Use **bold** for section labels, NOT markdown headings (#, ##). Discord renders # headings too large.
- Cover ALL important points, decisions, and context from the conversation. Do not artificially limit the number of bullet points — a 30-minute call needs far more detail than a 2-minute one.
- If there are clear action items, include them organized by person.
- If there are NO clear action items, omit the action items section entirely.

Format like this:

**Summary**
- Key point or decision
- Another important topic discussed
- ...as many points as needed to be thorough...

**Action Items**
**PersonName**
- Action item 1

(Omit the Action Items section entirely if none exist.)`;

/**
 * Resolve provider/model from coreConfig's agents.defaults.model.primary
 * (format: "provider/model", e.g. "google/gemini-3-pro-preview").
 */
function resolvePrimaryModel(coreConfig: Record<string, unknown>): {
  provider?: string;
  model?: string;
} {
  const agents = coreConfig.agents as Record<string, unknown> | undefined;
  const defaults = agents?.defaults as Record<string, unknown> | undefined;
  const modelCfg = defaults?.model as Record<string, unknown> | undefined;
  const primary = modelCfg?.primary;
  if (typeof primary === "string" && primary.includes("/")) {
    const idx = primary.indexOf("/");
    return {
      provider: primary.slice(0, idx),
      model: primary.slice(idx + 1),
    };
  }
  return {};
}

function collectText(payloads: Array<{ text?: string; isError?: boolean }> | undefined): string {
  const texts = (payloads ?? [])
    .filter((p) => !p.isError && typeof p.text === "string")
    .map((p) => p.text ?? "");
  return texts.join("\n").trim();
}

/**
 * Summarize a voice session's transcriptions via the user's configured LLM.
 * Returns `null` on failure (never throws).
 */
export async function summarizeVoiceSession(
  params: SummarizeVoiceSessionParams,
): Promise<SummarizeVoiceSessionResult | null> {
  let tmpDir: string | null = null;
  try {
    if (params.transcriptions.length === 0) {
      return null;
    }

    const transcript = buildTranscriptText(params.transcriptions);
    const fullPrompt = `${SYSTEM_PROMPT}\n\nHere is the voice conversation transcript:\n\n${transcript}`;

    const { runEmbeddedPiAgent, DEFAULT_PROVIDER, DEFAULT_MODEL } = await loadCoreAgentDeps();
    const { provider: cfgProvider, model: cfgModel } = resolvePrimaryModel(params.coreConfig);
    const provider = cfgProvider || DEFAULT_PROVIDER;
    const model = cfgModel || DEFAULT_MODEL;

    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-voice-summary-"));
    const sessionId = `voice-summary-${Date.now()}`;
    const sessionFile = path.join(tmpDir, "session.json");

    const result = await runEmbeddedPiAgent({
      sessionId,
      sessionFile,
      workspaceDir: tmpDir,
      config: params.coreConfig,
      prompt: fullPrompt,
      provider,
      model,
      timeoutMs: 60_000,
      runId: `voice-summary-${Date.now()}`,
      disableTools: true,
    });

    const content = collectText(result.payloads);
    if (!content) {
      return null;
    }

    // Parse the summary and action items sections (supports both **Bold** and ## Heading formats)
    const summaryMatch = content.match(
      /(?:\*\*Summary\*\*|## Summary)\s*\n([\s\S]*?)(?=\n(?:\*\*Action Items\*\*|## Action Items)|$)/,
    );
    const actionItemsMatch = content.match(
      /(?:\*\*Action Items\*\*|## Action Items)\s*\n([\s\S]*?)$/,
    );

    return {
      summary: summaryMatch?.[1]?.trim() ?? content,
      actionItems: actionItemsMatch?.[1]?.trim() ?? "",
      formatted: content,
    };
  } catch {
    return null;
  } finally {
    if (tmpDir) {
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  }
}
