import type { AgentMessage } from "@mariozechner/pi-agent-core";
import { SessionManager } from "@mariozechner/pi-coding-agent";
import fs from "node:fs/promises";
import os from "node:os";
import type { EmbeddedRunAttemptParams, EmbeddedRunAttemptResult } from "./types.js";
import { resolveHeartbeatPrompt } from "../../../auto-reply/heartbeat.js";
import { resolveChannelCapabilities } from "../../../config/channel-capabilities.js";
import { getMachineDisplayName } from "../../../infra/machine-name.js";
import { isSubagentSessionKey } from "../../../routing/session-key.js";
import { resolveSignalReactionLevel } from "../../../signal/reaction-level.js";
import { resolveTelegramInlineButtonsScope } from "../../../telegram/inline-buttons.js";
import { resolveTelegramReactionLevel } from "../../../telegram/reaction-level.js";
import { buildTtsSystemPromptHint } from "../../../tts/tts.js";
import { normalizeMessageChannel } from "../../../utils/message-channel.js";
import { isReasoningTagProvider } from "../../../utils/provider-utils.js";
import { resolveOpenClawAgentDir } from "../../agent-paths.js";
import { resolveSessionAgentIds } from "../../agent-scope.js";
import { makeBootstrapWarn, resolveBootstrapContextForRun } from "../../bootstrap-files.js";
import { runCamelRuntime } from "../../camel/runtime.js";
import {
  listChannelSupportedActions,
  resolveChannelMessageToolHints,
} from "../../channel-tools.js";
import { resolveOpenClawDocsPath } from "../../docs-path.js";
import { resolveModelAuthMode } from "../../model-auth.js";
import { resolveDefaultModelForAgent } from "../../model-selection.js";
import {
  resolveBootstrapMaxChars,
  validateAnthropicTurns,
  validateGeminiTurns,
} from "../../pi-embedded-helpers.js";
import { createOpenClawCodingTools } from "../../pi-tools.js";
import { resolveSandboxContext } from "../../sandbox.js";
import { resolveSandboxRuntimeStatus } from "../../sandbox/runtime-status.js";
import { repairSessionFileIfNeeded } from "../../session-file-repair.js";
import { guardSessionManager } from "../../session-tool-result-guard-wrapper.js";
import { acquireSessionWriteLock } from "../../session-write-lock.js";
import { detectRuntimeShell } from "../../shell-utils.js";
import {
  applySkillEnvOverrides,
  applySkillEnvOverridesFromSnapshot,
  loadWorkspaceSkillEntries,
  resolveSkillsPromptForRun,
} from "../../skills.js";
import { buildSystemPromptParams } from "../../system-prompt-params.js";
import { buildSystemPromptReport } from "../../system-prompt-report.js";
import { resolveTranscriptPolicy } from "../../transcript-policy.js";
import { DEFAULT_BOOTSTRAP_FILENAME } from "../../workspace.js";
import { sanitizeSessionHistory } from "../google.js";
import { getDmHistoryLimitFromSessionKey, limitHistoryTurns } from "../history.js";
import { log } from "../logger.js";
import { buildModelAliasLines } from "../model.js";
import { buildEmbeddedSandboxInfo } from "../sandbox-info.js";
import { prepareSessionManagerForRun } from "../session-manager-init.js";
import { buildEmbeddedSystemPrompt } from "../system-prompt.js";

function extractTextFromMessage(message: AgentMessage): string {
  const content = (message as { content?: unknown }).content;
  if (typeof content === "string") {
    return content.trim();
  }
  if (!Array.isArray(content)) {
    return "";
  }
  const lines = content
    .map((item) => {
      if (!item || typeof item !== "object") {
        return "";
      }
      const record = item as Record<string, unknown>;
      if (record.type !== "text" || typeof record.text !== "string") {
        return "";
      }
      return record.text.trim();
    })
    .filter(Boolean);
  return lines.join("\n").trim();
}

function summarizeHistory(messages: AgentMessage[]): string {
  const relevant = messages.slice(-16);
  return relevant
    .map((message) => {
      const role = (message as { role?: unknown }).role;
      const text = extractTextFromMessage(message).replace(/\s+/g, " ").trim();
      if (!text) {
        return `[${String(role)}]`;
      }
      const clipped = text.length > 600 ? `${text.slice(0, 600)}...` : text;
      return `[${String(role)}] ${clipped}`;
    })
    .join("\n");
}

function buildUsageRecord(usage: {
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheWrite?: number;
  total?: number;
}) {
  return {
    input: usage.input ?? 0,
    output: usage.output ?? 0,
    cacheRead: usage.cacheRead ?? 0,
    cacheWrite: usage.cacheWrite ?? 0,
    totalTokens: usage.total ?? 0,
    cost: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      total: 0,
    },
  };
}

function buildUserContent(
  params: EmbeddedRunAttemptParams,
): Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }> {
  if (!params.images || params.images.length === 0) {
    return [{ type: "text", text: params.prompt }];
  }
  return [
    { type: "text", text: params.prompt },
    ...params.images.map((image) => ({
      type: "image" as const,
      data: image.data,
      mimeType: image.mimeType,
    })),
  ];
}

function resolveLastAssistant(messages: AgentMessage[]): EmbeddedRunAttemptResult["lastAssistant"] {
  const candidate = messages
    .slice()
    .toReversed()
    .find((message) => message.role === "assistant");
  return candidate;
}

async function emitFinalReplyCallbacks(
  params: EmbeddedRunAttemptParams,
  text: string,
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) {
    return;
  }
  try {
    await params.onAssistantMessageStart?.();
  } catch (err) {
    log.warn(`camel onAssistantMessageStart callback failed: ${String(err)}`);
  }
  try {
    await params.onPartialReply?.({ text: trimmed });
  } catch (err) {
    log.warn(`camel onPartialReply callback failed: ${String(err)}`);
  }
  try {
    await params.onBlockReply?.({ text: trimmed });
  } catch (err) {
    log.warn(`camel onBlockReply callback failed: ${String(err)}`);
  }
  try {
    await params.onBlockReplyFlush?.();
  } catch (err) {
    log.warn(`camel onBlockReplyFlush callback failed: ${String(err)}`);
  }
}

export async function runEmbeddedCamelAttempt(
  params: EmbeddedRunAttemptParams,
): Promise<EmbeddedRunAttemptResult> {
  const resolvedWorkspace = params.workspaceDir;
  const prevCwd = process.cwd();
  await fs.mkdir(resolvedWorkspace, { recursive: true });
  const sessionLock = await acquireSessionWriteLock({
    sessionFile: params.sessionFile,
  });

  let sessionManager: ReturnType<typeof guardSessionManager> | undefined;
  let restoreSkillEnv: (() => void) | undefined;
  let systemPromptReport: EmbeddedRunAttemptResult["systemPromptReport"];
  let aborted = Boolean(params.abortSignal?.aborted);
  let timedOut = false;
  let promptError: unknown = null;
  const runAbortController = new AbortController();
  const timeoutReason = new Error("request timed out");
  timeoutReason.name = "TimeoutError";
  const onAbort = () => {
    aborted = true;
    const reason =
      params.abortSignal && "reason" in params.abortSignal
        ? (params.abortSignal as { reason?: unknown }).reason
        : undefined;
    timedOut =
      reason instanceof Error
        ? reason.name === "TimeoutError"
        : typeof reason === "string" && reason.toLowerCase().includes("timeout");
    runAbortController.abort(reason);
  };
  const timeoutHandle = setTimeout(
    () => {
      aborted = true;
      timedOut = true;
      runAbortController.abort(timeoutReason);
    },
    Math.max(1, params.timeoutMs),
  );
  if (params.abortSignal) {
    if (params.abortSignal.aborted) {
      onAbort();
    } else {
      params.abortSignal.addEventListener("abort", onAbort, { once: true });
    }
  }

  try {
    await repairSessionFileIfNeeded({
      sessionFile: params.sessionFile,
      warn: (message) => log.warn(message),
    });
    const hadSessionFile = await fs
      .stat(params.sessionFile)
      .then(() => true)
      .catch(() => false);

    sessionManager = guardSessionManager(SessionManager.open(params.sessionFile), {
      agentId: params.agentId,
      sessionKey: params.sessionKey,
      inputProvenance: params.inputProvenance,
      allowSyntheticToolResults: resolveTranscriptPolicy({
        modelApi: params.model?.api,
        provider: params.provider,
        modelId: params.modelId,
      }).allowSyntheticToolResults,
    });

    await prepareSessionManagerForRun({
      sessionManager,
      sessionFile: params.sessionFile,
      hadSessionFile,
      sessionId: params.sessionId,
      cwd: resolvedWorkspace,
    });

    const transcriptPolicy = resolveTranscriptPolicy({
      modelApi: params.model?.api,
      provider: params.provider,
      modelId: params.modelId,
    });
    const historyContext = sessionManager.buildSessionContext();
    const sanitized = await sanitizeSessionHistory({
      messages: historyContext.messages,
      modelApi: params.model.api,
      modelId: params.modelId,
      provider: params.provider,
      sessionManager,
      sessionId: params.sessionId,
      policy: transcriptPolicy,
    });
    const validatedGemini = transcriptPolicy.validateGeminiTurns
      ? validateGeminiTurns(sanitized)
      : sanitized;
    const validated = transcriptPolicy.validateAnthropicTurns
      ? validateAnthropicTurns(validatedGemini)
      : validatedGemini;
    const limited = limitHistoryTurns(
      validated,
      getDmHistoryLimitFromSessionKey(params.sessionKey, params.config),
    );
    const historySummary = summarizeHistory(limited);

    const sandboxSessionKey = params.sessionKey?.trim() || params.sessionId;
    const sandbox = await resolveSandboxContext({
      config: params.config,
      sessionKey: sandboxSessionKey,
      workspaceDir: resolvedWorkspace,
    });
    const effectiveWorkspace = sandbox?.enabled
      ? sandbox.workspaceAccess === "rw"
        ? resolvedWorkspace
        : sandbox.workspaceDir
      : resolvedWorkspace;
    await fs.mkdir(effectiveWorkspace, { recursive: true });
    process.chdir(effectiveWorkspace);

    const shouldLoadSkillEntries = !params.skillsSnapshot || !params.skillsSnapshot.resolvedSkills;
    const skillEntries = shouldLoadSkillEntries
      ? loadWorkspaceSkillEntries(effectiveWorkspace)
      : [];
    restoreSkillEnv = params.skillsSnapshot
      ? applySkillEnvOverridesFromSnapshot({
          snapshot: params.skillsSnapshot,
          config: params.config,
        })
      : applySkillEnvOverrides({
          skills: skillEntries ?? [],
          config: params.config,
        });

    const skillsPrompt = resolveSkillsPromptForRun({
      skillsSnapshot: params.skillsSnapshot,
      entries: shouldLoadSkillEntries ? skillEntries : undefined,
      config: params.config,
      workspaceDir: effectiveWorkspace,
    });

    const sessionLabel = params.sessionKey ?? params.sessionId;
    const { bootstrapFiles: hookAdjustedBootstrapFiles, contextFiles } =
      await resolveBootstrapContextForRun({
        workspaceDir: effectiveWorkspace,
        config: params.config,
        sessionKey: params.sessionKey,
        sessionId: params.sessionId,
        warn: makeBootstrapWarn({ sessionLabel, warn: (message) => log.warn(message) }),
      });
    const workspaceNotes = hookAdjustedBootstrapFiles.some(
      (file) => file.name === DEFAULT_BOOTSTRAP_FILENAME && !file.missing,
    )
      ? ["Reminder: commit your changes in this workspace after edits."]
      : undefined;

    const agentDir = params.agentDir ?? resolveOpenClawAgentDir();
    const modelAuthMode = resolveModelAuthMode(params.provider, params.config);
    const tools = params.disableTools
      ? []
      : createOpenClawCodingTools({
          exec: {
            ...params.execOverrides,
            elevated: params.bashElevated,
          },
          messageProvider: params.messageProvider ?? params.messageChannel,
          agentAccountId: params.agentAccountId,
          messageTo: params.messageTo,
          messageThreadId: params.messageThreadId,
          sandbox,
          sessionKey: params.sessionKey ?? params.sessionId,
          agentDir,
          workspaceDir: effectiveWorkspace,
          config: params.config,
          abortSignal: runAbortController.signal,
          modelProvider: params.provider,
          modelId: params.modelId,
          modelAuthMode,
          currentChannelId: params.currentChannelId,
          currentThreadTs: params.currentThreadTs,
          groupId: params.groupId,
          groupChannel: params.groupChannel,
          groupSpace: params.groupSpace,
          spawnedBy: params.spawnedBy,
          senderId: params.senderId,
          senderName: params.senderName,
          senderUsername: params.senderUsername,
          senderE164: params.senderE164,
          replyToMode: params.replyToMode,
          hasRepliedRef: params.hasRepliedRef,
          modelHasVision: params.model.input?.includes("image") ?? false,
          requireExplicitMessageTarget:
            params.requireExplicitMessageTarget ?? isSubagentSessionKey(params.sessionKey),
          disableMessageTool: params.disableMessageTool,
          senderIsOwner: params.senderIsOwner,
        });

    const machineName = await getMachineDisplayName();
    const runtimeChannel = normalizeMessageChannel(params.messageChannel ?? params.messageProvider);
    let runtimeCapabilities = runtimeChannel
      ? (resolveChannelCapabilities({
          cfg: params.config,
          channel: runtimeChannel,
          accountId: params.agentAccountId,
        }) ?? [])
      : undefined;
    if (runtimeChannel === "telegram" && params.config) {
      const inlineButtonsScope = resolveTelegramInlineButtonsScope({
        cfg: params.config,
        accountId: params.agentAccountId ?? undefined,
      });
      if (inlineButtonsScope !== "off") {
        if (!runtimeCapabilities) {
          runtimeCapabilities = [];
        }
        if (
          !runtimeCapabilities.some((cap) => String(cap).trim().toLowerCase() === "inlinebuttons")
        ) {
          runtimeCapabilities.push("inlineButtons");
        }
      }
    }

    const reactionGuidance =
      runtimeChannel && params.config
        ? (() => {
            if (runtimeChannel === "telegram") {
              const resolved = resolveTelegramReactionLevel({
                cfg: params.config,
                accountId: params.agentAccountId ?? undefined,
              });
              const level = resolved.agentReactionGuidance;
              return level ? { level, channel: "Telegram" } : undefined;
            }
            if (runtimeChannel === "signal") {
              const resolved = resolveSignalReactionLevel({
                cfg: params.config,
                accountId: params.agentAccountId ?? undefined,
              });
              const level = resolved.agentReactionGuidance;
              return level ? { level, channel: "Signal" } : undefined;
            }
            return undefined;
          })()
        : undefined;

    const { defaultAgentId, sessionAgentId } = resolveSessionAgentIds({
      sessionKey: params.sessionKey,
      config: params.config,
    });
    const sandboxInfo = buildEmbeddedSandboxInfo(sandbox, params.bashElevated);
    const reasoningTagHint = isReasoningTagProvider(params.provider);
    const channelActions = runtimeChannel
      ? listChannelSupportedActions({
          cfg: params.config,
          channel: runtimeChannel,
        })
      : undefined;
    const messageToolHints = runtimeChannel
      ? resolveChannelMessageToolHints({
          cfg: params.config,
          channel: runtimeChannel,
          accountId: params.agentAccountId,
        })
      : undefined;

    const defaultModelRef = resolveDefaultModelForAgent({
      cfg: params.config ?? {},
      agentId: sessionAgentId,
    });
    const defaultModelLabel = `${defaultModelRef.provider}/${defaultModelRef.model}`;
    const { runtimeInfo, userTimezone, userTime, userTimeFormat } = buildSystemPromptParams({
      config: params.config,
      agentId: sessionAgentId,
      workspaceDir: effectiveWorkspace,
      cwd: process.cwd(),
      runtime: {
        host: machineName,
        os: `${os.type()} ${os.release()}`,
        arch: os.arch(),
        node: process.version,
        model: `${params.provider}/${params.modelId}`,
        defaultModel: defaultModelLabel,
        shell: detectRuntimeShell(),
        channel: runtimeChannel,
        capabilities: runtimeCapabilities,
        channelActions,
      },
    });
    const isDefaultAgent = sessionAgentId === defaultAgentId;
    const promptMode = isSubagentSessionKey(params.sessionKey) ? "minimal" : "full";
    const docsPath = await resolveOpenClawDocsPath({
      workspaceDir: effectiveWorkspace,
      argv1: process.argv[1],
      cwd: process.cwd(),
      moduleUrl: import.meta.url,
    });
    const ttsHint = params.config ? buildTtsSystemPromptHint(params.config) : undefined;
    const camelPrompt = buildEmbeddedSystemPrompt({
      workspaceDir: effectiveWorkspace,
      defaultThinkLevel: params.thinkLevel,
      reasoningLevel: params.reasoningLevel ?? "off",
      extraSystemPrompt: params.extraSystemPrompt,
      ownerNumbers: params.ownerNumbers,
      reasoningTagHint,
      heartbeatPrompt: isDefaultAgent
        ? resolveHeartbeatPrompt(params.config?.agents?.defaults?.heartbeat?.prompt)
        : undefined,
      skillsPrompt,
      docsPath: docsPath ?? undefined,
      ttsHint,
      workspaceNotes,
      reactionGuidance,
      promptMode,
      runtimeInfo,
      messageToolHints,
      sandboxInfo,
      tools,
      modelAliasLines: buildModelAliasLines(params.config),
      userTimezone,
      userTime,
      userTimeFormat,
      contextFiles,
      memoryCitationsMode: params.config?.memory?.citations,
    });
    systemPromptReport = buildSystemPromptReport({
      source: "run",
      generatedAt: Date.now(),
      sessionId: params.sessionId,
      sessionKey: params.sessionKey,
      provider: params.provider,
      model: params.modelId,
      workspaceDir: effectiveWorkspace,
      bootstrapMaxChars: resolveBootstrapMaxChars(params.config),
      sandbox: (() => {
        const runtime = resolveSandboxRuntimeStatus({
          cfg: params.config,
          sessionKey: params.sessionKey ?? params.sessionId,
        });
        return { mode: runtime.mode, sandboxed: runtime.sandboxed };
      })(),
      systemPrompt: camelPrompt,
      bootstrapFiles: hookAdjustedBootstrapFiles,
      injectedFiles: contextFiles,
      skillsPrompt,
      tools,
    });

    sessionManager.appendMessage({
      role: "user",
      content: buildUserContent(params),
      timestamp: Date.now(),
    } as Parameters<typeof sessionManager.appendMessage>[0]);

    const runtime = await runCamelRuntime({
      model: params.model,
      provider: params.provider,
      modelId: params.modelId,
      runtimeApiKey: params.runtimeApiKey,
      evalMode: params.runtimeEvalMode,
      maxPlanRetries: params.runtimePlanRetries,
      prompt: params.prompt,
      history: historySummary,
      tools,
      clientToolNames: new Set((params.clientTools ?? []).map((tool) => tool.function.name)),
      runId: params.runId,
      abortSignal: runAbortController.signal,
      extraSystemPrompt: camelPrompt,
      onAgentEvent: params.onAgentEvent,
      shouldEmitToolOutput: params.shouldEmitToolOutput,
      shouldEmitToolResult: params.shouldEmitToolResult,
      onToolResult: params.onToolResult,
    });

    for (const event of runtime.executionTrace) {
      if (event.type !== "tool" || event.blocked) {
        continue;
      }
      const toolCallId = `camel_trace_${event.step}`;
      sessionManager.appendMessage({
        role: "assistant",
        content: [
          {
            type: "toolCall",
            id: toolCallId,
            name: event.tool,
            arguments: event.args,
          },
        ],
        stopReason: "toolUse",
        api: params.model.api,
        provider: params.provider,
        model: params.modelId,
        usage: buildUsageRecord({}),
        timestamp: Date.now(),
      } as Parameters<typeof sessionManager.appendMessage>[0]);
      sessionManager.appendMessage({
        role: "toolResult",
        toolCallId,
        toolName: event.tool,
        content: event.result.content,
        details: event.result.details,
      } as Parameters<typeof sessionManager.appendMessage>[0]);
    }

    const finalText = runtime.assistantTexts.at(-1)?.trim();
    if (finalText) {
      await emitFinalReplyCallbacks(params, finalText);
      sessionManager.appendMessage({
        role: "assistant",
        content: [{ type: "text", text: finalText }],
        stopReason: "stop",
        api: params.model.api,
        provider: params.provider,
        model: params.modelId,
        usage: buildUsageRecord(runtime.attemptUsage ?? {}),
        timestamp: Date.now(),
      } as Parameters<typeof sessionManager.appendMessage>[0]);
    }

    const finalMessages = sessionManager.buildSessionContext().messages;
    const sessionIdUsed = params.sessionId;

    return {
      aborted,
      timedOut,
      promptError,
      sessionIdUsed,
      systemPromptReport,
      messagesSnapshot: finalMessages,
      assistantTexts: runtime.assistantTexts,
      toolMetas: runtime.toolMetas,
      lastAssistant: runtime.lastAssistant ?? resolveLastAssistant(finalMessages),
      lastToolError: runtime.lastToolError,
      didSendViaMessagingTool: runtime.didSendViaMessagingTool,
      messagingToolSentTexts: runtime.messagingToolSentTexts,
      messagingToolSentTargets: runtime.messagingToolSentTargets,
      cloudCodeAssistFormatError: false,
      attemptUsage: runtime.attemptUsage,
      compactionCount: 0,
      clientToolCall: runtime.clientToolCall,
    };
  } catch (err) {
    promptError = err;
    if (runAbortController.signal.aborted || params.abortSignal?.aborted) {
      aborted = true;
      const reason =
        "reason" in runAbortController.signal
          ? (runAbortController.signal as { reason?: unknown }).reason
          : undefined;
      timedOut =
        reason instanceof Error
          ? reason.name === "TimeoutError"
          : typeof reason === "string" && reason.toLowerCase().includes("timeout");
    }
    const fallbackMessages = sessionManager
      ? sessionManager.buildSessionContext().messages
      : ([] as AgentMessage[]);
    return {
      aborted,
      timedOut,
      promptError,
      sessionIdUsed: params.sessionId,
      systemPromptReport,
      messagesSnapshot: fallbackMessages,
      assistantTexts: [],
      toolMetas: [],
      lastAssistant: resolveLastAssistant(fallbackMessages),
      lastToolError: undefined,
      didSendViaMessagingTool: false,
      messagingToolSentTexts: [],
      messagingToolSentTargets: [],
      cloudCodeAssistFormatError: false,
      attemptUsage: undefined,
      compactionCount: 0,
    };
  } finally {
    clearTimeout(timeoutHandle);
    params.abortSignal?.removeEventListener?.("abort", onAbort);
    try {
      const flushPendingToolResults = sessionManager?.flushPendingToolResults;
      if (flushPendingToolResults) {
        await Promise.resolve(flushPendingToolResults());
      }
    } catch {
      // best-effort flush
    }
    await sessionLock.release();
    restoreSkillEnv?.();
    process.chdir(prevCwd);
  }
}
