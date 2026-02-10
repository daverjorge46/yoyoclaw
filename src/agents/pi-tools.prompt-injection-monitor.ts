import { appendFileSync } from 'node:fs';
import { createSubsystemLogger } from '../logging/subsystem.js';
import { extractToolResultText } from './pi-embedded-subscribe.tools.js';
import type { AnyAgentTool } from './pi-tools.types.js';
import {
  createRedactedToolResult,
  PROMPT_INJECTION_THRESHOLD,
  scoreForPromptInjection,
} from './prompt-injection-monitor.js';

const log = createSubsystemLogger('agents/prompt-injection-monitor');

const MIN_TEXT_LENGTH = 50;
const DEBUG_LOG = '/tmp/openclaw-pi-monitor.log';

function debugLog(msg: string) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}\n`;
  try {
    appendFileSync(DEBUG_LOG, line);
  } catch {
    // ignore write errors
  }
}

export function wrapToolWithPromptInjectionMonitor(tool: AnyAgentTool): AnyAgentTool {
  if (!process.env.OPENAI_API_KEY) {
    debugLog(`SKIP wrapping tool "${tool.name}" — OPENAI_API_KEY not set`);
    return tool;
  }
  const execute = tool.execute;
  if (!execute) {
    debugLog(`SKIP wrapping tool "${tool.name}" — no execute method`);
    return tool;
  }
  const toolName = tool.name || 'tool';
  debugLog(`WRAPPED tool "${toolName}"`);
  return {
    ...tool,
    execute: async (toolCallId, params, signal, onUpdate) => {
      debugLog(`EXECUTE tool="${toolName}" toolCallId=${toolCallId}`);
      const result = await execute(toolCallId, params, signal, onUpdate);
      const text = extractToolResultText(result);
      if (!text || text.length < MIN_TEXT_LENGTH) {
        debugLog(`SKIP scoring tool="${toolName}" — text too short (${text?.length ?? 0} chars)`);
        return result;
      }

      debugLog(`SCORING tool="${toolName}" text=${text.length} chars, preview: ${JSON.stringify(text.slice(0, 200))}`);

      try {
        const { score, reasoning } = await scoreForPromptInjection(text, toolName);
        debugLog(`SCORED tool="${toolName}" score=${score}/100 reasoning=${JSON.stringify(reasoning)}`);
        if (score >= PROMPT_INJECTION_THRESHOLD) {
          log.warn(
            `Prompt injection detected in tool "${toolName}" (score: ${score}/100): ${reasoning}`,
          );
          debugLog(`REDACTED tool="${toolName}" score=${score}`);
          return createRedactedToolResult(toolName, score) as typeof result;
        }
        debugLog(`PASSED tool="${toolName}" score=${score}`);
        return result;
      } catch (err) {
        log.warn(`Prompt injection scoring failed for tool "${toolName}": ${String(err)}`);
        debugLog(`ERROR tool="${toolName}" err=${String(err)} — REDACTING (fail closed)`);
        return createRedactedToolResult(toolName, -1) as typeof result;
      }
    },
  };
}
