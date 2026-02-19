import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { GatewayServiceRuntime } from "./service-runtime.js";
import { resolveConfigPath, resolveGatewayLockDir, resolveStateDir } from "../config/paths.js";
import { formatLine } from "./output.js";
import { resolveGatewayStateDir } from "./paths.js";
import { resolveGatewayProgramArguments } from "./program-args.js";

type FallbackLockPayload = {
  pid: number;
  createdAt: string;
  configPath: string;
  startTime?: number;
};

function resolveFallbackLockPath(env: Record<string, string | undefined>): {
  lockPath: string;
  configPath: string;
} {
  const stateDir = resolveStateDir(env as NodeJS.ProcessEnv);
  const configPath = resolveConfigPath(env as NodeJS.ProcessEnv, stateDir);
  const hash = createHash("sha1").update(configPath).digest("hex").slice(0, 8);
  const lockDir = resolveGatewayLockDir();
  const lockPath = path.join(lockDir, `gateway.${hash}.lock`);
  return { lockPath, configPath };
}

async function readFallbackLockPayload(lockPath: string): Promise<FallbackLockPayload | null> {
  try {
    const raw = await fs.readFile(lockPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<FallbackLockPayload>;
    if (
      typeof parsed.pid !== "number" ||
      typeof parsed.createdAt !== "string" ||
      typeof parsed.configPath !== "string"
    ) {
      return null;
    }
    return {
      pid: parsed.pid,
      createdAt: parsed.createdAt,
      configPath: parsed.configPath,
      startTime: typeof parsed.startTime === "number" ? parsed.startTime : undefined,
    };
  } catch {
    return null;
  }
}

function isProcessAlive(pid: number): boolean {
  if (!Number.isFinite(pid) || pid <= 0) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function isFallbackGatewayRunning(
  env: Record<string, string | undefined>,
): Promise<boolean> {
  const { lockPath } = resolveFallbackLockPath(env);
  const payload = await readFallbackLockPayload(lockPath);
  if (!payload) {
    return false;
  }
  return isProcessAlive(payload.pid);
}

export async function startFallbackGatewayProcess({
  env,
  port,
  stdout,
}: {
  env: Record<string, string | undefined>;
  port: number;
  stdout: NodeJS.WritableStream;
}): Promise<void> {
  const { programArguments, workingDirectory } = await resolveGatewayProgramArguments({ port });

  const args = [...programArguments.slice(1), "--allow-unconfigured", "--force"];
  const executable = programArguments[0];
  if (!executable) {
    throw new Error("Unable to resolve gateway executable");
  }

  const stateDir = resolveGatewayStateDir(env);
  const logDir = path.join(stateDir, "logs");
  await fs.mkdir(logDir, { recursive: true });

  const outLog = path.join(logDir, "gateway-fallback.log");
  const errLog = path.join(logDir, "gateway-fallback-error.log");

  const outFd = fsSync.openSync(outLog, "a");
  const errFd = fsSync.openSync(errLog, "a");

  const child = spawn(executable, args, {
    env: process.env,
    detached: true,
    stdio: ["ignore", outFd, errFd],
    cwd: workingDirectory,
  });
  child.unref();
  fsSync.closeSync(outFd);
  fsSync.closeSync(errFd);

  const pid = child.pid;
  stdout.write(`${formatLine("[fallback] Started gateway process", `pid=${pid ?? "unknown"}`)}\n`);
  stdout.write(`${formatLine("[fallback] Logs", outLog)}\n`);
}

export async function stopFallbackGatewayProcess({
  env,
  stdout,
}: {
  env: Record<string, string | undefined>;
  stdout: NodeJS.WritableStream;
}): Promise<void> {
  const { lockPath } = resolveFallbackLockPath(env);
  const payload = await readFallbackLockPayload(lockPath);
  if (!payload) {
    stdout.write("[fallback] No gateway lock file found; nothing to stop.\n");
    return;
  }

  const { pid } = payload;
  if (!isProcessAlive(pid)) {
    stdout.write(`[fallback] Gateway process (pid=${pid}) is not running.\n`);
    await fs.rm(lockPath, { force: true }).catch(() => undefined);
    return;
  }

  // Send SIGTERM and poll for exit
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    stdout.write(`[fallback] Failed to send SIGTERM to pid=${pid}.\n`);
    return;
  }

  const deadline = Date.now() + 8_000;
  const pollMs = 250;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, pollMs));
    if (!isProcessAlive(pid)) {
      stdout.write(`${formatLine("[fallback] Stopped gateway process", `pid=${pid}`)}\n`);
      return;
    }
  }

  // Escalate to SIGKILL
  try {
    process.kill(pid, "SIGKILL");
  } catch {
    // already dead
  }
  await new Promise((r) => setTimeout(r, 500));
  stdout.write(`${formatLine("[fallback] Killed gateway process", `pid=${pid} (SIGKILL)`)}\n`);
}

export async function readFallbackGatewayRuntime(
  env: Record<string, string | undefined>,
): Promise<GatewayServiceRuntime> {
  const { lockPath } = resolveFallbackLockPath(env);
  const payload = await readFallbackLockPayload(lockPath);
  if (!payload) {
    return { status: "stopped" };
  }
  if (!isProcessAlive(payload.pid)) {
    return { status: "stopped", detail: `stale lock (pid=${payload.pid})` };
  }
  return {
    status: "running",
    pid: payload.pid,
    detail: "fallback (direct process)",
  };
}
