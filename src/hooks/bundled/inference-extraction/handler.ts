/**
 * Inference extraction hook handler
 *
 * Extracts connective inferences (behavioral patterns, decision-making tendencies,
 * persuasion frames) from session conversations on /new or /reset.
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { OpenClawConfig } from "../../../config/config.js";
import type { HookHandler } from "../../hooks.js";
import {
  resolveDefaultAgentId,
  resolveAgentWorkspaceDir,
  resolveAgentDir,
} from "../../../agents/agent-scope.js";
import { runEmbeddedPiAgent } from "../../../agents/pi-embedded.js";
import { resolveStateDir } from "../../../config/paths.js";
import { createSubsystemLogger } from "../../../logging/subsystem.js";
import { resolveAgentIdFromSessionKey } from "../../../routing/session-key.js";
import { hasInterSessionUserProvenance } from "../../../sessions/input-provenance.js";
import { resolveHookConfig } from "../../config.js";
import {
  DEFAULT_EXTRACTION_PROMPT,
  DEFAULT_MIN_TURNS,
  DEFAULT_MESSAGE_COUNT,
} from "./extraction-prompt.js";

const log = createSubsystemLogger("hooks/inference-extraction");

export type Inference = {
  domain: string;
  insight: string;
  confidence: string;
  supersedes?: string;
};

/**
 * Read and parse session messages from a JSONL transcript file.
 */
async function getSessionMessages(
  sessionFilePath: string,
  messageCount: number,
): Promise<string[]> {
  try {
    const content = await fs.readFile(sessionFilePath, "utf-8");
    const lines = content.trim().split("\n");

    const allMessages: string[] = [];
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.type === "message" && entry.message) {
          const msg = entry.message;
          const role = msg.role;
          if ((role === "user" || role === "assistant") && msg.content) {
            if (role === "user" && hasInterSessionUserProvenance(msg)) {
              continue;
            }
            const text = Array.isArray(msg.content)
              ? // oxlint-disable-next-line typescript/no-explicit-any
                msg.content.find((c: any) => c.type === "text")?.text
              : msg.content;
            if (text && !text.startsWith("/")) {
              allMessages.push(`${role}: ${text}`);
            }
          }
        }
      } catch {
        // Skip invalid JSON lines
      }
    }

    return allMessages.slice(-messageCount);
  } catch {
    return [];
  }
}

/**
 * Parse LLM response into structured inferences.
 */
export function parseInferences(text: string): Inference[] {
  // Try to extract JSON array from the response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return [];
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item: unknown): item is Inference =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Inference).domain === "string" &&
        typeof (item as Inference).insight === "string" &&
        typeof (item as Inference).confidence === "string",
    );
  } catch {
    return [];
  }
}

/**
 * Format an inference as a markdown note.
 */
export function formatInferenceMarkdown(inference: Inference, timestamp: Date): string {
  const dateStr = timestamp.toISOString().split("T")[0];
  const parts = [
    `# Inference: ${inference.domain} - ${dateStr}`,
    "",
    `**Domain**: ${inference.domain}`,
    `**Confidence**: ${inference.confidence}`,
    `**Extracted**: ${timestamp.toISOString()}`,
    "",
    "## Insight",
    "",
    inference.insight,
  ];

  if (inference.supersedes) {
    parts.push("", `**Supersedes**: ${inference.supersedes}`);
  }

  parts.push("");
  return parts.join("\n");
}

/**
 * Check whether extraction should run for a given session.
 */
export function shouldRunExtraction(params: {
  messageCount: number;
  minTurns: number;
  isTestEnv: boolean;
}): boolean {
  if (params.isTestEnv) {
    return false;
  }
  return params.messageCount >= params.minTurns;
}

/**
 * Call LLM with the extraction prompt and return raw response text.
 */
async function runExtractionLLM(params: {
  sessionContent: string;
  extractionPrompt: string;
  cfg: OpenClawConfig;
}): Promise<string | null> {
  let tempSessionFile: string | null = null;

  try {
    const agentId = resolveDefaultAgentId(params.cfg);
    const workspaceDir = resolveAgentWorkspaceDir(params.cfg, agentId);
    const agentDir = resolveAgentDir(params.cfg, agentId);

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-inference-"));
    tempSessionFile = path.join(tempDir, "session.jsonl");

    const prompt = `${params.extractionPrompt}${params.sessionContent}`;

    const result = await runEmbeddedPiAgent({
      sessionId: `inference-extraction-${Date.now()}`,
      sessionKey: "temp:inference-extraction",
      agentId,
      sessionFile: tempSessionFile,
      workspaceDir,
      agentDir,
      config: params.cfg,
      prompt,
      timeoutMs: 30_000,
      runId: `inference-${Date.now()}`,
    });

    if (result.payloads && result.payloads.length > 0) {
      return result.payloads[0]?.text ?? null;
    }

    return null;
  } catch (err) {
    log.error("LLM extraction failed", {
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    return null;
  } finally {
    if (tempSessionFile) {
      try {
        await fs.rm(path.dirname(tempSessionFile), { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Write inference files to the workspace memory/inferences/ directory.
 */
export async function writeInferenceFiles(params: {
  inferences: Inference[];
  outputDir: string;
  timestamp: Date;
  domainTag?: string;
}): Promise<string[]> {
  await fs.mkdir(params.outputDir, { recursive: true });

  const written: string[] = [];
  const dateStr = params.timestamp.toISOString().split("T")[0];

  for (const inference of params.inferences) {
    const hash = crypto.createHash("sha256").update(inference.insight).digest("hex").slice(0, 8);
    const prefix = params.domainTag ? `${params.domainTag}-` : "";
    const filename = `${prefix}${inference.domain}-${dateStr}-${hash}.md`;
    const filePath = path.join(params.outputDir, filename);

    const content = formatInferenceMarkdown(inference, params.timestamp);
    await fs.writeFile(filePath, content, "utf-8");
    written.push(filePath);
  }

  return written;
}

/**
 * Main handler: extract connective inferences from session on /new or /reset.
 */
const extractInferences: HookHandler = async (event) => {
  if (event.type !== "command" || (event.action !== "new" && event.action !== "reset")) {
    return;
  }

  try {
    log.debug("Inference extraction triggered", { action: event.action });

    const context = event.context || {};
    const cfg = context.cfg as OpenClawConfig | undefined;
    const hookConfig = resolveHookConfig(cfg, "inference-extraction");

    // Resolve workspace directory
    const agentId = resolveAgentIdFromSessionKey(event.sessionKey);
    const workspaceDir = cfg
      ? resolveAgentWorkspaceDir(cfg, agentId)
      : path.join(resolveStateDir(process.env, os.homedir), "workspace");
    const outputDir = path.join(workspaceDir, "memory", "inferences");

    // Resolve configuration
    const minTurns =
      typeof hookConfig?.minTurns === "number" && hookConfig.minTurns > 0
        ? hookConfig.minTurns
        : DEFAULT_MIN_TURNS;
    const messageCount =
      typeof hookConfig?.messages === "number" && hookConfig.messages > 0
        ? hookConfig.messages
        : DEFAULT_MESSAGE_COUNT;
    const domainTag =
      typeof hookConfig?.domainTag === "string" && hookConfig.domainTag.trim()
        ? hookConfig.domainTag.trim()
        : undefined;

    // Get session file from previous session entry (before reset)
    const sessionEntry = (context.previousSessionEntry || context.sessionEntry || {}) as Record<
      string,
      unknown
    >;
    const sessionFile = (sessionEntry.sessionFile as string) || undefined;

    if (!sessionFile) {
      log.debug("No session file available, skipping extraction");
      return;
    }

    // Read messages
    const messages = await getSessionMessages(sessionFile, messageCount);

    log.debug("Session messages loaded", {
      count: messages.length,
      minTurns,
    });

    // Check if extraction should run
    const isTestEnv =
      process.env.OPENCLAW_TEST_FAST === "1" ||
      process.env.VITEST === "true" ||
      process.env.VITEST === "1" ||
      process.env.NODE_ENV === "test";

    if (!shouldRunExtraction({ messageCount: messages.length, minTurns, isTestEnv })) {
      log.debug("Skipping extraction: insufficient turns or test environment");
      return;
    }

    if (!cfg) {
      log.debug("No config available, skipping LLM extraction");
      return;
    }

    // Build session content string
    const sessionContent = messages.join("\n");

    // Resolve extraction prompt (allow user override via config)
    const extractionPrompt =
      typeof hookConfig?.extractionPrompt === "string" && hookConfig.extractionPrompt.trim()
        ? hookConfig.extractionPrompt.trim()
        : DEFAULT_EXTRACTION_PROMPT;

    // Call LLM
    log.debug("Running inference extraction LLM...");
    const rawResponse = await runExtractionLLM({ sessionContent, extractionPrompt, cfg });

    if (!rawResponse) {
      log.debug("No response from extraction LLM");
      return;
    }

    // Parse inferences
    const inferences = parseInferences(rawResponse);

    if (inferences.length === 0) {
      log.debug("No inferences extracted");
      return;
    }

    // Write files
    const written = await writeInferenceFiles({
      inferences,
      outputDir,
      timestamp: event.timestamp,
      domainTag,
    });

    log.info(`Extracted ${inferences.length} inference(s)`, {
      files: written.map((f) => f.replace(os.homedir(), "~")),
    });
  } catch (err) {
    if (err instanceof Error) {
      log.error("Inference extraction failed", {
        errorName: err.name,
        errorMessage: err.message,
        stack: err.stack,
      });
    } else {
      log.error("Inference extraction failed", { error: String(err) });
    }
  }
};

export default extractInferences;
