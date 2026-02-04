import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import type { CliDeps } from "../cli/deps.js";
import type { CronJob, CronStoreFile } from "../cron/types.js";
import { resolveDefaultAgentId } from "../agents/agent-scope.js";
import { loadConfig } from "../config/config.js";
import { resolveAgentMainSessionKey } from "../config/sessions.js";
import { runCronIsolatedAgentTurn } from "../cron/isolated-agent.js";
import { appendCronRunLog, resolveCronRunLogPath } from "../cron/run-log.js";
import { CronService } from "../cron/service.js";
import { resolveCronStorePath } from "../cron/store.js";
import { logCronStart, logCronComplete } from "../hooks/bundled/compliance/handler.js";
import { runHeartbeatOnce } from "../infra/heartbeat-runner.js";
import { requestHeartbeatNow } from "../infra/heartbeat-wake.js";
import { enqueueSystemEvent } from "../infra/system-events.js";
import { getChildLogger } from "../logging.js";
import { normalizeAgentId } from "../routing/session-key.js";
import { defaultRuntime } from "../runtime.js";

export type GatewayCronState = {
  cron: CronService;
  storePath: string;
  cronEnabled: boolean;
};

// Helper to call webhooks
async function callWebhook(
  url: string | undefined,
  payload: Record<string, unknown>,
  headers?: Record<string, string>,
  logger?: ReturnType<typeof getChildLogger>,
) {
  if (!url) return;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      logger?.warn({ url, status: response.status }, "cron webhook failed");
    }
  } catch (err) {
    logger?.warn({ url, err: String(err) }, "cron webhook error");
  }
}

// Helper to load job from store file directly
function loadJobFromStore(storePath: string, jobId: string): CronJob | undefined {
  try {
    const content = readFileSync(storePath, "utf-8");
    const store: CronStoreFile = JSON.parse(content);
    return store.jobs?.find((j) => j.id === jobId);
  } catch {
    return undefined;
  }
}

export function buildGatewayCronService(params: {
  cfg: ReturnType<typeof loadConfig>;
  deps: CliDeps;
  broadcast: (event: string, payload: unknown, opts?: { dropIfSlow?: boolean }) => void;
}): GatewayCronState {
  const cronLogger = getChildLogger({ module: "cron" });
  const storePath = resolveCronStorePath(params.cfg.cron?.store);
  const cronEnabled = process.env.OPENCLAW_SKIP_CRON !== "1" && params.cfg.cron?.enabled !== false;

  const resolveCronAgent = (requested?: string | null) => {
    const runtimeConfig = loadConfig();
    const normalized =
      typeof requested === "string" && requested.trim() ? normalizeAgentId(requested) : undefined;
    const hasAgent =
      normalized !== undefined &&
      Array.isArray(runtimeConfig.agents?.list) &&
      runtimeConfig.agents.list.some(
        (entry) =>
          entry && typeof entry.id === "string" && normalizeAgentId(entry.id) === normalized,
      );
    const agentId = hasAgent ? normalized : resolveDefaultAgentId(runtimeConfig);
    return { agentId, cfg: runtimeConfig };
  };

  const cron = new CronService({
    storePath,
    cronEnabled,
    enqueueSystemEvent: (text, opts) => {
      const { agentId, cfg: runtimeConfig } = resolveCronAgent(opts?.agentId);
      const sessionKey = resolveAgentMainSessionKey({
        cfg: runtimeConfig,
        agentId,
      });
      enqueueSystemEvent(text, { sessionKey });
    },
    requestHeartbeatNow,
    runHeartbeatOnce: async (opts) => {
      const runtimeConfig = loadConfig();
      return await runHeartbeatOnce({
        cfg: runtimeConfig,
        reason: opts?.reason,
        deps: { ...params.deps, runtime: defaultRuntime },
      });
    },
    runIsolatedAgentJob: async ({ job, message }) => {
      const { agentId, cfg: runtimeConfig } = resolveCronAgent(job.agentId);
      return await runCronIsolatedAgentTurn({
        cfg: runtimeConfig,
        deps: params.deps,
        job,
        message,
        agentId,
        sessionKey: `cron:${job.id}`,
        lane: "cron",
      });
    },
    log: getChildLogger({ module: "cron", storePath }),
    onEvent: (evt) => {
      params.broadcast("cron", evt, { dropIfSlow: true });

      // Get current config for webhook settings
      const runtimeConfig = loadConfig();
      const webhooks = runtimeConfig.cron?.webhooks;

      // Load job details from store file
      const job = loadJobFromStore(storePath, evt.jobId);
      const jobName = job?.name || `job-${evt.jobId.slice(0, 8)}`;
      const agentId = job?.agentId;

      if (evt.action === "started") {
        // Call webhook on job start
        void callWebhook(
          webhooks?.onJobStart,
          {
            jobId: evt.jobId,
            jobName,
            agentId: agentId || "main",
            startedAt: evt.runAtMs || Date.now(),
            timestamp: new Date().toISOString(),
          },
          webhooks?.headers,
          cronLogger,
        );

        // Log to compliance system (if enabled)
        const cfg = loadConfig();
        logCronStart(cfg, agentId || "main", jobName);
      }

      if (evt.action === "finished") {
        // Call webhook on job complete
        void callWebhook(
          webhooks?.onJobComplete,
          {
            jobId: evt.jobId,
            jobName,
            agentId: agentId || "main",
            status: evt.status,
            durationMs: evt.durationMs,
            error: evt.error,
            summary: evt.summary,
            completedAt: Date.now(),
            timestamp: new Date().toISOString(),
          },
          webhooks?.headers,
          cronLogger,
        );

        // Log to compliance system (if enabled)
        const cfgEnd = loadConfig();
        logCronComplete(cfgEnd, agentId || "main", jobName, undefined, evt.status || "ok");

        // Existing run log logic
        const logPath = resolveCronRunLogPath({
          storePath,
          jobId: evt.jobId,
        });
        void appendCronRunLog(logPath, {
          ts: Date.now(),
          jobId: evt.jobId,
          action: "finished",
          status: evt.status,
          error: evt.error,
          summary: evt.summary,
          runAtMs: evt.runAtMs,
          durationMs: evt.durationMs,
          nextRunAtMs: evt.nextRunAtMs,
        }).catch((err) => {
          cronLogger.warn({ err: String(err), logPath }, "cron: run log append failed");
        });
      }
    },
  });

  return { cron, storePath, cronEnabled };
}
