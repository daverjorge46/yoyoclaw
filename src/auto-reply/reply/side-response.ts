import { logVerbose } from "../../globals.js";
import { formatErrorMessage } from "../../infra/errors.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import { runCommandWithTimeout } from "../../process/exec.js";

const log = createSubsystemLogger("reply/side-response");

const DEFAULT_MODEL = "sonnet";
const DEFAULT_TIMEOUT_MS = 15_000;

export type SideResponseResult = {
  /** The response text. */
  text: string;
  /** Whether this is a full answer (true) or brief ack (false). */
  isFull: boolean;
};

type ClaudeCliResponse = {
  result?: string;
  is_error?: boolean;
};

function parseCliResponse(stdout: string): string | null {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed) as ClaudeCliResponse;
    if (parsed.is_error) {
      return null;
    }
    return parsed.result?.trim() || null;
  } catch {
    return trimmed || null;
  }
}

function buildSideResponsePrompt(message: string): string {
  return [
    "You are a helpful AI assistant. The user sent a follow-up message while",
    "you were busy executing a long-running tool call (like a shell command).",
    "Your main task is still running in the background and will complete on",
    "its own.\n\n",
    "Classify and respond to the user's follow-up:\n\n",
    "If you can fully answer in 1-2 sentences (greetings, simple math,",
    'factual questions, status checks, casual chat): prefix with "FULL: "',
    "and give a complete answer.\n",
    'If it needs tools or deeper work: prefix with "ACK: " and give a brief',
    "acknowledgment (e.g. \"Got it, I'll address that once my current task",
    'finishes.").\n\n',
    'You MUST start your response with either "FULL: " or "ACK: ".\n\n',
    `User's message:\n${message}`,
  ].join("");
}

/**
 * Generate a quick side response to a user message that arrived while
 * the main agent is executing a tool call. Uses Claude CLI for a fast
 * one-shot answer without interrupting the main agent loop.
 */
export async function generateSideResponse(params: {
  message: string;
  model?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}): Promise<SideResponseResult | null> {
  const { message, signal } = params;

  if (signal?.aborted) {
    return null;
  }

  const model = params.model ?? DEFAULT_MODEL;
  const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const prompt = buildSideResponsePrompt(message);
  const args = ["--model", model, "-p", prompt, "--output-format", "json", "--max-turns", "1"];

  try {
    logVerbose(`side-response: running claude --model ${model}`);

    const result = await runCommandWithTimeout(["claude", ...args], {
      timeoutMs,
      input: "",
    });

    if (signal?.aborted) {
      return null;
    }

    if (result.code !== 0) {
      const err = result.stderr || result.stdout || "CLI failed";
      log.warn(`side-response: CLI exited with code ${result.code}: ${err}`);
      return null;
    }

    const raw = parseCliResponse(result.stdout);
    if (!raw) {
      logVerbose("side-response: empty response from CLI");
      return null;
    }

    const hasFullPrefix = raw.startsWith("FULL: ") || raw.startsWith("FULL:");
    const isAck = raw.startsWith("ACK: ") || raw.startsWith("ACK:");

    const cleanText = hasFullPrefix
      ? raw.replace(/^FULL:\s*/, "")
      : isAck
        ? raw.replace(/^ACK:\s*/, "")
        : raw;

    if (!cleanText.trim()) {
      return null;
    }

    const isFull = hasFullPrefix;
    const kind = isFull ? "full" : "ack";
    logVerbose(`side-response: generated ${kind} (${cleanText.length} chars)`);
    log.info(`side-response (${kind}): ${cleanText}`);

    return { text: cleanText, isFull };
  } catch (err) {
    if (signal?.aborted) {
      logVerbose("side-response: generation aborted");
    } else {
      log.warn(`side-response: generation failed: ${formatErrorMessage(err)}`);
    }
    return null;
  }
}

export type SideResponseController = {
  cancel: () => void;
  result: Promise<SideResponseResult | null>;
};

/**
 * Start a side response generation. Returns a controller with a result
 * promise that resolves as soon as the model responds. Can be cancelled.
 */
export function startSideResponse(params: {
  message: string;
  model?: string;
  timeoutMs?: number;
}): SideResponseController {
  const abortController = new AbortController();

  const result = generateSideResponse({
    ...params,
    signal: abortController.signal,
  });

  return {
    cancel: () => {
      abortController.abort();
    },
    result,
  };
}
