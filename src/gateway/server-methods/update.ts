import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import type { GatewayRequestHandlers } from "./types.js";
import { loadConfig } from "../../config/config.js";
import { resolveOpenClawPackageRoot } from "../../infra/openclaw-root.js";
import {
  formatDoctorNonInteractiveHint,
  type RestartSentinelPayload,
  writeRestartSentinel,
} from "../../infra/restart-sentinel.js";
import { scheduleGatewaySigusr1Restart } from "../../infra/restart.js";
import { normalizeUpdateChannel } from "../../infra/update-channels.js";
import { runGatewayUpdate, type UpdateRunResult } from "../../infra/update-runner.js";
import { runCommandWithTimeout } from "../../process/exec.js";
import {
  ErrorCodes,
  errorShape,
  formatValidationErrors,
  validateUpdateRunParams,
} from "../protocol/index.js";

const CUSTOM_UPDATE_SCRIPT_ENV = "OPENCLAW_UPDATE_RUN_SCRIPT";
const DEFAULT_UPDATE_TIMEOUT_MS = 20 * 60_000;
const MAX_LOG_CHARS = 8000;

function trimLogTail(text: string, maxChars = MAX_LOG_CHARS): string {
  if (text.length <= maxChars) {
    return text;
  }
  return text.slice(text.length - maxChars);
}

function resolveCustomUpdateScriptPath(): string | null {
  const raw = process.env[CUSTOM_UPDATE_SCRIPT_ENV];
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed ? trimmed : null;
}

async function runCustomUpdateScript(params: {
  scriptPath: string;
  timeoutMs?: number;
  cwd: string;
  channel?: "stable" | "beta" | "dev";
}): Promise<UpdateRunResult> {
  const startedAt = Date.now();
  const timeoutMs = params.timeoutMs ?? DEFAULT_UPDATE_TIMEOUT_MS;
  const commandArgv = [params.scriptPath, "--yes"];
  if (params.channel) {
    commandArgv.push("--channel", params.channel);
  }

  let result:
    | { stdout: string; stderr: string; code: number | null }
    | { stdout: string; stderr: string; code: null };
  try {
    const out = await runCommandWithTimeout(commandArgv, {
      cwd: params.cwd,
      timeoutMs,
      env: {
        OPENCLAW_UPDATE_IN_PROGRESS: "1",
      },
    });
    result = {
      stdout: out.stdout,
      stderr: out.stderr,
      code: out.code,
    };
  } catch (err) {
    result = { stdout: "", stderr: String(err), code: null };
  }

  const step = {
    name: "custom update script",
    command: commandArgv.join(" "),
    cwd: params.cwd,
    durationMs: Date.now() - startedAt,
    exitCode: result.code,
    stdoutTail: trimLogTail(result.stdout, MAX_LOG_CHARS),
    stderrTail: trimLogTail(result.stderr, MAX_LOG_CHARS),
  };

  return {
    status: result.code === 0 ? "ok" : "error",
    mode: "unknown",
    root: params.cwd,
    reason: result.code === 0 ? undefined : "custom-script-failed",
    steps: [step],
    durationMs: Date.now() - startedAt,
  };
}

export const updateHandlers: GatewayRequestHandlers = {
  "update.run": async ({ params, respond }) => {
    if (!validateUpdateRunParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid update.run params: ${formatValidationErrors(validateUpdateRunParams.errors)}`,
        ),
      );
      return;
    }
    const sessionKey =
      typeof (params as { sessionKey?: unknown }).sessionKey === "string"
        ? (params as { sessionKey?: string }).sessionKey?.trim() || undefined
        : undefined;
    const note =
      typeof (params as { note?: unknown }).note === "string"
        ? (params as { note?: string }).note?.trim() || undefined
        : undefined;
    const restartDelayMsRaw = (params as { restartDelayMs?: unknown }).restartDelayMs;
    const restartDelayMs =
      typeof restartDelayMsRaw === "number" && Number.isFinite(restartDelayMsRaw)
        ? Math.max(0, Math.floor(restartDelayMsRaw))
        : undefined;
    const timeoutMsRaw = (params as { timeoutMs?: unknown }).timeoutMs;
    const timeoutMs =
      typeof timeoutMsRaw === "number" && Number.isFinite(timeoutMsRaw)
        ? Math.max(1000, Math.floor(timeoutMsRaw))
        : undefined;

    let result: Awaited<ReturnType<typeof runGatewayUpdate>>;
    try {
      const config = loadConfig();
      const configChannel = normalizeUpdateChannel(config.update?.channel);
      const root =
        (await resolveOpenClawPackageRoot({
          moduleUrl: import.meta.url,
          argv1: process.argv[1],
          cwd: process.cwd(),
        })) ?? process.cwd();
      const customScriptPath = resolveCustomUpdateScriptPath();
      if (customScriptPath) {
        try {
          await fs.access(customScriptPath, fsConstants.X_OK);
          result = await runCustomUpdateScript({
            scriptPath: customScriptPath,
            timeoutMs,
            cwd: root,
            channel: configChannel ?? undefined,
          });
        } catch {
          result = {
            status: "error",
            mode: "unknown",
            root,
            reason: `custom-script-not-executable:${customScriptPath}`,
            steps: [
              {
                name: "custom update script",
                command: customScriptPath,
                cwd: root,
                durationMs: 0,
                exitCode: 1,
                stderrTail: `configured ${CUSTOM_UPDATE_SCRIPT_ENV} is not executable`,
              },
            ],
            durationMs: 0,
          };
        }
      } else {
        result = await runGatewayUpdate({
          timeoutMs,
          cwd: root,
          argv1: process.argv[1],
          channel: configChannel ?? undefined,
        });
      }
    } catch (err) {
      result = {
        status: "error",
        mode: "unknown",
        reason: String(err),
        steps: [],
        durationMs: 0,
      };
    }

    const payload: RestartSentinelPayload = {
      kind: "update",
      status: result.status,
      ts: Date.now(),
      sessionKey,
      message: note ?? null,
      doctorHint: formatDoctorNonInteractiveHint(),
      stats: {
        mode: result.mode,
        root: result.root ?? undefined,
        before: result.before ?? null,
        after: result.after ?? null,
        steps: result.steps.map((step) => ({
          name: step.name,
          command: step.command,
          cwd: step.cwd,
          durationMs: step.durationMs,
          log: {
            stdoutTail: step.stdoutTail ?? null,
            stderrTail: step.stderrTail ?? null,
            exitCode: step.exitCode ?? null,
          },
        })),
        reason: result.reason ?? null,
        durationMs: result.durationMs,
      },
    };

    let sentinelPath: string | null = null;
    try {
      sentinelPath = await writeRestartSentinel(payload);
    } catch {
      sentinelPath = null;
    }

    const restart = scheduleGatewaySigusr1Restart({
      delayMs: restartDelayMs,
      reason: "update.run",
    });

    respond(
      true,
      {
        ok: true,
        result,
        restart,
        sentinel: {
          path: sentinelPath,
          payload,
        },
      },
      undefined,
    );
  },
};
