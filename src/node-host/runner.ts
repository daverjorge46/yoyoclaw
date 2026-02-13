import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { resolveAgentConfig } from "../agents/agent-scope.js";
import { resolveBrowserConfig } from "../browser/config.js";
import {
  createBrowserControlContext,
  startBrowserControlServiceFromConfig,
} from "../browser/control-service.js";
import { createBrowserRouteDispatcher } from "../browser/routes/dispatcher.js";
import { loadConfig } from "../config/config.js";
import { GatewayClient } from "../gateway/client.js";
import { loadOrCreateDeviceIdentity } from "../infra/device-identity.js";
import {
  addAllowlistEntry,
  analyzeArgvCommand,
  evaluateExecAllowlist,
  evaluateShellAllowlist,
  requiresExecApproval,
  normalizeExecApprovals,
  recordAllowlistUse,
  resolveExecApprovals,
  resolveSafeBins,
  ensureExecApprovals,
  readExecApprovalsSnapshot,
  saveExecApprovals,
  type ExecAsk,
  type ExecSecurity,
  type ExecApprovalsFile,
  type ExecAllowlistEntry,
  type ExecCommandSegment,
} from "../infra/exec-approvals.js";
import { getMachineDisplayName } from "../infra/machine-name.js";
import { ensureOpenClawCliOnPath } from "../infra/path-env.js";
import { detectMime } from "../media/mime.js";
import { GATEWAY_CLIENT_MODES, GATEWAY_CLIENT_NAMES } from "../utils/message-channel.js";
import { VERSION } from "../version.js";
import { ensureNodeHostConfig, saveNodeHostConfig, type NodeHostGatewayConfig } from "./config.js";
import { withTimeout } from "./with-timeout.js";

const OUTPUT_CAP = 200_000;
const OUTPUT_EVENT_TAIL = 20_000;
const DEFAULT_NODE_PATH = "";

class SkillBinsCache {
  private bins = new Set<string>();
  private lastRefresh = 0;
  private readonly ttlMs = 90_000;
  private readonly fetch: () => Promise<string[]>;

  constructor(fetch: () => Promise<string[]>) {
    this.fetch = fetch;
  }

  async current(force = false): Promise<Set<string>> {
    if (force || Date.now() - this.lastRefresh > this.ttlMs) {
      await this.refresh();
    }
    return this.bins;
  }

  private async refresh() {
    try {
      const bins = await this.fetch();
      this.bins = new Set(bins);
      this.lastRefresh = Date.now();
    } catch {
      if (!this.lastRefresh) {
        this.bins = new Set();
      }
    }
  }
}

function sanitizeEnv(
  overrides?: Record<string, string> | null,
): Record<string, string> | undefined {
  if (!overrides) {
    return undefined;
  }
  const merged = { ...process.env } as Record<string, string>;
  const basePath = process.env.PATH ?? DEFAULT_NODE_PATH;
  const blockedEnvKeys = new Set([
    "NODE_OPTIONS",
    "PYTHONHOME",
    "PYTHONPATH",
    "PERL5LIB",
    "PERL5OPT",
    "RUBYOPT",
  ]);
  const blockedEnvPrefixes = ["DYLD_", "LD_"];
  
  for (const [rawKey, value] of Object.entries(overrides)) {
    const key = rawKey.trim();
    if (!key) {
      continue;
    }
    const upper = key.toUpperCase();
    if (upper === "PATH") {
      const trimmed = value.trim();
      if (!trimmed) {
        continue;
      }
      if (!basePath || trimmed === basePath) {
        merged[key] = trimmed;
        continue;
      }
      const suffix = `${path.delimiter}${basePath}`;
      if (trimmed.endsWith(suffix)) {
        merged[key] = trimmed;
      }
      continue;
    }
    if (blockedEnvKeys.has(upper)) {
      continue;
    }
    if (blockedEnvPrefixes.some((prefix) => upper.startsWith(prefix))) {
      continue;
    }
    merged[key] = value;
  }
  return merged;
}

export async function runNodeHost(opts: {
  gatewayHost: string;
  gatewayPort: number;
  gatewayTls?: boolean;
  gatewayTlsFingerprint?: string;
  nodeId?: string;
  displayName?: string;
}): Promise<void> {
  const config = await ensureNodeHostConfig();
  const nodeId = opts.nodeId?.trim() || config.nodeId;
  if (nodeId !== config.nodeId) {
    config.nodeId = nodeId;
  }
  const displayName =
    opts.displayName?.trim() || config.displayName || (await getMachineDisplayName());
  config.displayName = displayName;
  const gateway: NodeHostGatewayConfig = {
    host: opts.gatewayHost,
    port: opts.gatewayPort,
    tls: opts.gatewayTls ?? loadConfig().gateway?.tls?.enabled ?? false,
    tlsFingerprint: opts.gatewayTlsFingerprint,
  };
  config.gateway = gateway;
  await saveNodeHostConfig(config);

  const cfg = loadConfig();
  const pathEnv = ensureNodePathEnv();
  const host = gateway.host ?? "127.0.0.1";
  const port = gateway.port ?? 18789;
  const scheme = gateway.tls ? "wss" : "ws";
  const url = `${scheme}://${host}:${port}`;
  const isRemoteMode = cfg.gateway?.mode === "remote";
  const token =
    process.env.OPENCLAW_GATEWAY_TOKEN?.trim() ||
    (isRemoteMode ? cfg.gateway?.remote?.token : cfg.gateway?.auth?.token);
  const password =
    process.env.OPENCLAW_GATEWAY_PASSWORD?.trim() ||
    (isRemoteMode ? cfg.gateway?.remote?.password : cfg.gateway?.auth?.password);

  const client = new GatewayClient({
    url,
    token: token?.trim() || undefined,
    password: password?.trim() || undefined,
    instanceId: nodeId,
    clientName: GATEWAY_CLIENT_NAMES.NODE_HOST,
    clientDisplayName: displayName,
    clientVersion: VERSION,
    platform: process.platform,
    mode: GATEWAY_CLIENT_MODES.NODE,
    role: "node",
    scopes: [],
    caps: ["system"],
    commands: [
      "system.run",
      "system.which",
      "system.execApprovals.get",
      "system.execApprovals.set",
    ],
    pathEnv,
    permissions: undefined,
    deviceIdentity: loadOrCreateDeviceIdentity(),
    tlsFingerprint: gateway.tlsFingerprint,
    onEvent: (evt) => {
      if (evt.event !== "node.invoke.request") {
        return;
      }
      const payload = coerceNodeInvokePayload(evt.payload);
      if (!payload) {
        return;
      }
      void handleSystemInvocation(payload, client, skillBins);
    },
    onConnectError: (err) => {
      console.error(`node host gateway connect failed: ${err.message}`);
    },
    onClose: (code, reason) => {
      console.error(`node host gateway closed (${code}): ${reason}`);
    },
  });

  const skillBins = new SkillBinsCache(async () => {
    const res = await client.request<{ bins: Array<unknown> }>("skills.bins", {});
    const bins = Array.isArray(res?.bins) ? res.bins.map((bin) => String(bin)) : [];
    return bins;
  });

  client.start();
  await new Promise(() => {});
}

async function handleSystemInvocation(
  frame: NodeInvokeRequestPayload,
  client: GatewayClient,
  skillBins: SkillBinsCache,
) {
  const command = String(frame.command ?? "");
  
  if (command === "system.execApprovals.get") {
    try {
      ensureExecApprovals();
      const snapshot = readExecApprovalsSnapshot();
      await sendInvokeResult(client, frame, {
        ok: true,
        payloadJSON: JSON.stringify(snapshot),
      });
    } catch (err) {
      const message = String(err);
      const code = message.toLowerCase().includes("timed out") ? "TIMEOUT" : "INVALID_REQUEST";
      await sendInvokeResult(client, frame, {
        ok: false,
        error: { code, message },
      });
    }
    return;
  }

  if (command === "system.execApprovals.set") {
    try {
      const params = decodeParams<SystemExecApprovalsSetParams>(frame.paramsJSON);
      if (!params.file || typeof params.file !== "object") {
        throw new Error("INVALID_REQUEST: exec approvals file required");
      }
      ensureExecApprovals();
      const snapshot = readExecApprovalsSnapshot();
      const normalized = normalizeExecApprovals({ ...params.file });
      saveExecApprovals(normalized);
      await sendInvokeResult(client, frame, {
        ok: true,
        payloadJSON: JSON.stringify(readExecApprovalsSnapshot()),
      });
    } catch (err) {
      await sendInvokeResult(client, frame, {
        ok: false,
        error: { code: "INVALID_REQUEST", message: String(err) },
      });
    }
    return;
  }

  if (command === "system.which") {
    try {
      const params = decodeParams<SystemWhichParams>(frame.paramsJSON);
      if (!Array.isArray(params.bins)) {
        throw new Error("INVALID_REQUEST: bins required");
      }
      const env = sanitizeEnv(undefined);
      const found: Record<string, string> = {};
      for (const bin of params.bins.map((b) => String(b).trim()).filter(Boolean)) {
        const path = resolveExecutable(bin, env);
        if (path) {
          found[bin] = path;
        }
      }
      await sendInvokeResult(client, frame, {
        ok: true,
        payloadJSON: JSON.stringify({ bins: found }),
      });
    } catch (err) {
      await sendInvokeResult(client, frame, {
        ok: false,
        error: { code: "INVALID_REQUEST", message: String(err) },
      });
    }
    return;
  }

  if (command !== "system.run") {
    await sendInvokeResult(client, frame, {
      ok: false,
      error: { code: "UNAVAILABLE", message: "command not supported" },
    });
    return;
  }

  const params = decodeParams<SystemRunParams>(frame.paramsJSON);

  const agentId = params.agentId?.trim() || undefined;
  const cfg = loadConfig();
  const agentExec = agentId ? resolveAgentConfig(cfg, agentId)?.tools?.exec : undefined;
  const security = (agentExec?.security ?? cfg.tools?.exec?.security) || "allowlist";
  const ask = (agentExec?.ask ?? cfg.tools?.exec?.ask) || "on-miss";
  const approvals = resolveExecApprovals(agentId, { security, ask });
  const sessionKey = params.sessionKey?.trim() || "node";
  const runId = params.runId?.trim() || crypto.randomUUID();
  const env = sanitizeEnv(params.env ?? undefined);
  const safeBins = resolveSafeBins(agentExec?.safeBins ?? cfg.tools?.exec?.safeBins);
  const bins = approvals.agent.autoAllowSkills ? await skillBins.current() : new Set<string>();

  if (security === "deny") {
    await sendInvokeResult(client, frame, {
      ok: false,
      error: { code: "UNAVAILABLE", message: "SYSTEM_RUN_DISABLED: security=deny" },
    });
    return;
  }

  const requiresAsk = requiresExecApproval({
    ask: ask as ExecAsk,
    security: security as ExecSecurity,
    analysisOk: true,
    allowlistSatisfied: false,
  });

  const isApproved = params.approved === true || params.approvalDecision !== undefined;
  if (requiresAsk && !isApproved) {
    await sendInvokeResult(client, frame, {
      ok: false,
      error: { code: "UNAVAILABLE", message: "SYSTEM_RUN_DENIED: approval required" },
    });
    return;
  }

  const result = await runCommand(
    params.command.map(String),
    params.cwd?.trim() || undefined,
    env,
    params.timeoutMs ?? undefined,
  );

  await sendInvokeResult(client, frame, {
    ok: true,
    payloadJSON: JSON.stringify({
      exitCode: result.exitCode,
      timedOut: result.timedOut,
      success: result.success,
      stdout: result.stdout,
      stderr: result.stderr,
      error: result.error ?? null,
    }),
  });
}

function ensureNodePathEnv(): string {
  ensureOpenClawCliOnPath({ pathEnv: process.env.PATH ?? "" });
  return process.env.PATH ?? DEFAULT_NODE_PATH;
}

function resolveExecutable(bin: string, env?: Record<string, string>): string | null {
  if (bin.includes("/") || bin.includes("\\")) {
    return null;
  }
  const extensions = process.env.PATHEXT?.split(";") || [".EXE", ".CMD", ".BAT", ".COM"];
  const rawPath = env?.PATH ?? process.env.PATH ?? "";
  const pathDirs = rawPath.split(";").filter(Boolean);

  for (const dir of pathDirs) {
    for (const ext of extensions) {
      const candidate = path.join(dir, bin + ext);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }
  return null;
}

async function runCommand(
  argv: string[],
  cwd: string | undefined,
  env: Record<string, string> | undefined,
  timeoutMs: number | undefined,
): Promise<RunResult> {
  return await new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let outputLen = 0;
    let truncated = false;
    let timedOut = false;
    let settled = false;

    const child = spawn(argv[0], argv.slice(1), {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    const onChunk = (chunk: Buffer, target: "stdout" | "stderr") => {
      if (outputLen >= OUTPUT_CAP) {
        truncated = true;
        return;
      }
      const remaining = OUTPUT_CAP - outputLen;
      const slice = chunk.length > remaining ? chunk.subarray(0, remaining) : chunk;
      const str = slice.toString("utf8");
      outputLen += slice.length;
      if (target === "stdout") {
        stdout += str;
      } else {
        stderr += str;
      }
      if (chunk.length > remaining) {
        truncated = true;
      }
    };

    child.stdout?.on("data", (chunk) => onChunk(chunk as Buffer, "stdout"));
    child.stderr?.on("data", (chunk) => onChunk(chunk as Buffer, "stderr"));

    let timer: NodeJS.Timeout | undefined;
    if (timeoutMs && timeoutMs > 0) {
      timer = setTimeout(() => {
        timedOut = true;
        try {
          child.kill("SIGKILL");
        } catch {
          // ignore
        }
      }, timeoutMs);
    }

    const finalize = (exitCode?: number, error?: string | null) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timer) {
        clearTimeout(timer);
      }
      resolve({
        exitCode,
        timedOut,
        success: exitCode === 0 && !timedOut && !error,
        stdout,
        stderr,
        error: error ?? null,
        truncated,
      });
    };

    child.on("error", (err) => {
      finalize(undefined, err.message);
    });
    child.on("exit", (code) => {
      finalize(code === null ? undefined : code, null);
    });
  });
}

type RunResult = {
  exitCode?: number;
  timedOut: boolean;
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string | null;
  truncated: boolean;
};

type SystemRunParams = {
  command: string[];
  rawCommand?: string | null;
  cwd?: string | null;
  env?: Record<string, string>;
  timeoutMs?: number | null;
  needsScreenRecording?: boolean | null;
  agentId?: string | null;
  sessionKey?: string | null;
  approved?: boolean | null;
  approvalDecision?: string | null;
  runId?: string | null;
};

type SystemWhichParams = {
  bins: string[];
};

type SystemExecApprovalsSetParams = {
  file: ExecApprovalsFile;
  baseHash?: string | null;
};

type NodeInvokeRequestPayload = {
  id: string;
  nodeId: string;
  command: string;
  paramsJSON?: string | null;
  timeoutMs?: number | null;
  idempotencyKey?: string | null;
};

function decodeParams<T>(raw?: string | null): T {
  if (!raw) {
    throw new Error("INVALID_REQUEST: paramsJSON required");
  }
  return JSON.parse(raw) as T;
}

function coerceNodeInvokePayload(payload: unknown): NodeInvokeRequestPayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const obj = payload as Record<string, unknown>;
  const id = typeof obj.id === "string" ? obj.id.trim() : "";
  const nodeId = typeof obj.nodeId === "string" ? obj.nodeId.trim() : "";
  const command = typeof obj.command === "string" ? obj.command.trim() : "";
  if (!id || !nodeId || !command) {
    return null;
  }
  return {
    id,
    nodeId,
    command,
    paramsJSON: typeof obj.paramsJSON === "string" ? obj.paramsJSON : null,
    timeoutMs: typeof obj.timeoutMs === "number" ? obj.timeoutMs : null,
    idempotencyKey: typeof obj.idempotencyKey === "string" ? obj.idempotencyKey : null,
  };
}

async function sendInvokeResult(
  client: GatewayClient,
  frame: NodeInvokeRequestPayload,
  result: {
    ok: boolean;
    payloadJSON?: string | null;
    error?: { code?: string; message?: string } | null;
  },
) {
  try {
    await client.request("node.invoke.result", {
      id: frame.id,
      nodeId: frame.nodeId,
      ok: result.ok,
      payloadJSON: result.payloadJSON,
      error: result.error,
    });
  } catch {
    // ignore: node invoke responses are best-effort
  }
}
