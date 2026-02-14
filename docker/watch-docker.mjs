#!/usr/bin/env node
/**
 * Watch Dockerfile/compose and runtime dependency manifests; on change run:
 *   docker compose down openclaw-gateway && docker compose up -d --build --force-recreate openclaw-gateway
 * Intended to be run as a long-lived daemon (e.g. under PM2).
 */
import chokidar from "chokidar";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const DEBOUNCE_MS = 3000;
const CWD = process.cwd();
const BUILD_PENDING_FILE = path.join(CWD, ".watch-docker-build-pending");
const FIX_PROMPT_PATH = path.join(CWD, "docker", "fix-docker-build.md");
const MAX_FIX_ATTEMPTS = 3;
const WATCH_GLOBS = [
  "Dockerfile",
  "docker-compose.yml",
  ".env",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  ".npmrc",
  "patches/**",
  "docker/*.sh",
  "docker/*.mjs",
  "docker/*.cjs",
  "docker/*.yml",
  "docker/*.yaml",
  "packages/**/package.json",
  "extensions/**/package.json",
  "apps/**/package.json",
  "ui/package.json",
];
const HEALTHCHECK_URL = process.env.OPENCLAW_DOCKER_HEALTHCHECK_URL ?? "http://127.0.0.1:18789/";
const HEALTHCHECK_TIMEOUT_MS = 30_000;
const HEALTHCHECK_INTERVAL_MS = 60_000;

let debounceTimer = null;
let healthTimer = null;
let running = false;
let recoveringByHealthcheck = false;
let pendingRebuild = false;
/** 當前 run 的 id，被 kill 後啟動新 run 時遞增，用於忽略舊 run 的 .then() */
let currentRunId = 0;

function removeBuildPending() {
  try {
    fs.unlinkSync(BUILD_PENDING_FILE);
  } catch {
    /* 忽略 */
  }
}

function run(cmd, args, opts = {}) {
  const { childRef = {}, capture, captureStderr, captureBoth, ...spawnOpts } = opts;
  const pipeBoth = capture || captureBoth;
  const stdio = pipeBoth ? "pipe" : captureStderr ? ["inherit", "inherit", "pipe"] : "inherit";
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: CWD, stdio, ...spawnOpts });
    childRef.current = child;
    let stdout = "";
    let stderr = "";
    if (pipeBoth && child.stdout) {
      child.stdout.on("data", (d) => {
        stdout += d.toString();
        process.stdout.write(d);
      });
    }
    if ((capture || captureStderr || pipeBoth) && child.stderr) {
      child.stderr.on("data", (d) => {
        stderr += d.toString();
        if (pipeBoth) {
          process.stderr.write(d);
        }
      });
    }
    child.on("close", (code, signal) => resolve({ code, signal, stderr: stderr + stdout }));
    child.on("error", () => resolve({ code: 1, signal: null, stderr: "" }));
  });
}

async function runCursorAgentFix(attempt) {
  const ts = new Date().toISOString();
  if (!fs.existsSync(FIX_PROMPT_PATH)) {
    console.error(`[${ts}] Fix prompt not found: ${FIX_PROMPT_PATH}`);
    return false;
  }
  let prompt = "";
  try {
    prompt = fs.readFileSync(FIX_PROMPT_PATH, "utf8").trim();
  } catch (err) {
    console.error(`[${ts}] Failed to read fix prompt: ${String(err)}`);
    return false;
  }
  if (!prompt) {
    console.error(`[${ts}] Fix prompt is empty: ${FIX_PROMPT_PATH}`);
    return false;
  }
  console.log(`[${ts}] Auto-fix attempt ${attempt}/${MAX_FIX_ATTEMPTS}: cursor-agent -p <prompt>`);
  const result = await run("cursor-agent", ["-p", prompt], { captureBoth: true });
  const ts2 = new Date().toISOString();
  if (result.code === 0) {
    console.log(`[${ts2}] Auto-fix attempt ${attempt} finished successfully.`);
    return true;
  }
  console.error(`[${ts2}] Auto-fix attempt ${attempt} failed with code=${result.code}.`);
  return false;
}

async function notifyTelegramBuildFailure() {
  const ts = new Date().toISOString();
  const message =
    "openclaw-docker-watch: build failed after 3 auto-fix attempts. " +
    "See /home/jethro/.pm2/logs/openclaw-docker-watch-out.log";
  console.log(`[${ts}] Sending Telegram failure notice to 109967251.`);
  await run(
    "pnpm",
    [
      "openclaw",
      "message",
      "send",
      "--channel",
      "telegram",
      "--target",
      "109967251",
      "--message",
      message,
    ],
    { captureBoth: true },
  );
}

async function buildWithAutoFixes(childRef, runId) {
  for (let attempt = 1; attempt <= MAX_FIX_ATTEMPTS; attempt += 1) {
    if (runId !== currentRunId) {
      return { ok: false, cancelled: true };
    }
    if (attempt > 1) {
      await runCursorAgentFix(attempt - 1);
    }
    const ts = new Date().toISOString();
    console.log(`[${ts}] Building image (attempt ${attempt}/${MAX_FIX_ATTEMPTS})...`);
    const result = await run("docker", ["compose", "build", "openclaw-gateway"], {
      env: { ...process.env, BUILDKIT_PROGRESS: "plain" },
      childRef,
      captureBoth: true,
    });
    if (runId !== currentRunId) {
      return { ok: false, cancelled: true };
    }
    if (result.code === 0) {
      return { ok: true, cancelled: false };
    }
    const ts2 = new Date().toISOString();
    console.error(
      `[${ts2}] Build attempt ${attempt}/${MAX_FIX_ATTEMPTS} failed with code=${result.code}.`,
    );
  }
  await notifyTelegramBuildFailure();
  return { ok: false, cancelled: false };
}

async function runJustUpRecovery() {
  if (recoveringByHealthcheck || running) {
    return;
  }
  recoveringByHealthcheck = true;
  const ts = new Date().toISOString();
  console.log(`[${ts}] Healthcheck failed >30s. Running recovery: just up`);
  const result = await run("bash", ["-lc", "just up"], {
    env: { ...process.env, BUILDKIT_PROGRESS: "plain" },
    captureBoth: true,
  });
  const ts2 = new Date().toISOString();
  if (result.code === 0) {
    removeBuildPending();
    console.log(`[${ts2}] Recovery (just up) finished successfully.`);
  } else {
    console.error(`[${ts2}] Recovery (just up) failed with code=${result.code}.`);
  }
  recoveringByHealthcheck = false;
}

async function getGatewayContainerHealth() {
  const idResult = await run("docker", ["compose", "ps", "-q", "openclaw-gateway"], {
    capture: true,
    captureStderr: true,
  });
  const id = idResult.stderr.trim();
  if (!id) {
    return { status: "missing" };
  }
  const inspectResult = await run("docker", ["inspect", "--format", "{{json .State}}", id], {
    capture: true,
    captureStderr: true,
  });
  if (inspectResult.code !== 0) {
    return { status: "unknown" };
  }
  try {
    const state = JSON.parse(inspectResult.stderr.trim() || "{}");
    const healthStatus = state?.Health?.Status;
    if (healthStatus) {
      return { status: healthStatus };
    }
    if (state?.Running === true) {
      return { status: "running" };
    }
    if (state?.Running === false) {
      return { status: "stopped" };
    }
  } catch {
    return { status: "unknown" };
  }
  return { status: "unknown" };
}

async function shouldRecoverFromHealthFailure() {
  const health = await getGatewayContainerHealth();
  const okStatuses = new Set(["healthy", "starting", "running"]);
  if (okStatuses.has(health.status)) {
    console.warn(
      `[${new Date().toISOString()}] Healthcheck failed but container status=${health.status}; skipping recovery.`,
    );
    return false;
  }
  return true;
}

async function probeGatewayHealth() {
  if (running || recoveringByHealthcheck) {
    return;
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), HEALTHCHECK_TIMEOUT_MS);
  try {
    const res = await fetch(HEALTHCHECK_URL, {
      method: "GET",
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (res.status >= 500) {
      console.log(
        `[${new Date().toISOString()}] Healthcheck HTTP ${res.status} from ${HEALTHCHECK_URL} (treat as reachable).`,
      );
    }
  } catch (err) {
    console.warn(
      `[${new Date().toISOString()}] Healthcheck failed for ${HEALTHCHECK_URL}: ${String(err)}`,
    );
    if (await shouldRecoverFromHealthFailure()) {
      await runJustUpRecovery();
    }
  } finally {
    clearTimeout(t);
  }
}

function runCompose(retrying = false) {
  if (running && !retrying) {
    // Avoid restart storms: queue one follow-up rebuild and let the current run finish.
    pendingRebuild = true;
    console.log(`[${new Date().toISOString()}] Rebuild in progress, queued one follow-up run.`);
    return;
  }
  running = true;
  try {
    fs.writeFileSync(BUILD_PENDING_FILE, "", "utf8");
  } catch {
    /* 忽略寫入失敗 */
  }
  const myRunId = ++currentRunId;
  const childRef = {};
  const ts = new Date().toISOString();
  console.log(
    `[${ts}] Triggering: docker compose build openclaw-gateway && docker compose down openclaw-gateway && docker compose up -d --force-recreate openclaw-gateway`,
  );
  void buildWithAutoFixes(childRef, myRunId)
    .then((buildResult) => {
      if (!buildResult || buildResult.cancelled || !buildResult.ok) {
        running = false;
        return null;
      }
      if (myRunId !== currentRunId) {
        running = false;
        return null;
      }
      return run("docker", ["compose", "down", "openclaw-gateway"]);
    })
    .then((downResult) => {
      if (!downResult) {
        return null;
      }
      if (myRunId !== currentRunId) {
        running = false;
        return null;
      }
      return run("docker", ["compose", "up", "-d", "--force-recreate", "openclaw-gateway"], {
        env: { ...process.env, BUILDKIT_PROGRESS: "plain" },
        childRef,
        captureBoth: true, // BUILDKIT_PROGRESS=plain 時衝突錯誤在 stdout，需 capture 兩者才能偵測
      });
    })
    .then((result) => {
      if (!result) {
        if (!running && pendingRebuild) {
          pendingRebuild = false;
          runCompose();
        }
        return;
      }
      const { code, signal, stderr } = result;
      if (myRunId !== currentRunId) {
        running = false;
        if (pendingRebuild) {
          pendingRebuild = false;
          runCompose();
        }
        return;
      }
      running = false;
      const ts2 = new Date().toISOString();
      if (signal === "SIGTERM") {
        if (pendingRebuild) {
          pendingRebuild = false;
          runCompose();
        }
        return;
      }
      if (code === 0) {
        removeBuildPending();
        console.log(`[${ts2}] Rebuild finished successfully.`);
        if (pendingRebuild) {
          pendingRebuild = false;
          runCompose();
        }
        return;
      }
      const conflictMatch =
        !retrying && stderr.match(/container name "(\/[^"]+)" is already in use by container/);
      if (conflictMatch) {
        const name = conflictMatch[1].replace(/^\//, "");
        console.log(`[${ts2}] Removing conflicting container "${name}" and retrying…`);
        void run("docker", ["rm", "-f", name]).then(() => runCompose(true));
        return;
      }
      removeBuildPending();
      if (stderr) {
        console.error(stderr);
      }
      console.error(`[${ts2}] Rebuild exited with code=${code}. Daemon keeps watching.`);
      if (pendingRebuild) {
        pendingRebuild = false;
        runCompose();
      }
    });
}

const IGNORED_PATH_SEGMENTS = ["node_modules", ".vite-temp", ".cache", "dist"];
/** 容器 log 寫入 logs/ 的子行程，與 watch 同進退 */
let logsTailChild = null;

function startLogsTail() {
  if (logsTailChild) {
    return;
  }
  const scriptPath = path.join(CWD, "docker", "gateway-logs-tail.mjs");
  if (!fs.existsSync(scriptPath)) {
    return;
  }
  logsTailChild = spawn(process.execPath, [scriptPath], {
    cwd: CWD,
    stdio: ["ignore", "ignore", "inherit"],
  });
  logsTailChild.on("close", (code, signal) => {
    logsTailChild = null;
    if (code != null && code !== 0 && signal !== "SIGTERM") {
      console.warn(
        `[${new Date().toISOString()}] logs-tail exited code=${code}, restarting in 5s…`,
      );
      setTimeout(startLogsTail, 5000);
    }
  });
}

function shouldIgnore(path) {
  return IGNORED_PATH_SEGMENTS.some((seg) => path.includes(`/${seg}/`) || path.includes(`/${seg}`));
}

function scheduleRebuild() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    runCompose();
  }, DEBOUNCE_MS);
}

const watcher = chokidar.watch(WATCH_GLOBS, {
  cwd: CWD,
  ignoreInitial: true,
  ignored: ["**/node_modules/**", "**/.vite-temp/**", "**/.cache/**", "**/dist/**"],
});

watcher.on("change", (path) => {
  if (shouldIgnore(path)) {
    return;
  }
  console.log(`[${new Date().toISOString()}] ${path} changed.`);
  scheduleRebuild();
});

watcher.on("add", (path) => {
  if (shouldIgnore(path)) {
    return;
  }
  console.log(`[${new Date().toISOString()}] ${path} added.`);
  scheduleRebuild();
});

watcher.on("error", (err) => {
  console.error(`[${new Date().toISOString()}] Watcher error:`, err.message);
});

watcher.on("ready", () => {
  console.log(
    `[${new Date().toISOString()}] Watching ${WATCH_GLOBS.join(", ")}. Edit to trigger rebuild.`,
  );
  console.log(
    `[${new Date().toISOString()}] Healthcheck enabled: ${HEALTHCHECK_URL} (timeout ${HEALTHCHECK_TIMEOUT_MS}ms, interval ${HEALTHCHECK_INTERVAL_MS}ms)`,
  );
  startLogsTail();
  void probeGatewayHealth();
  healthTimer = setInterval(() => {
    void probeGatewayHealth();
  }, HEALTHCHECK_INTERVAL_MS);
  if (fs.existsSync(BUILD_PENDING_FILE)) {
    console.log(`[${new Date().toISOString()}] Resuming interrupted build (watch restarted).`);
    runCompose();
  }
});

function shutdown() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  if (healthTimer) {
    clearInterval(healthTimer);
  }
  if (logsTailChild?.kill) {
    logsTailChild.kill("SIGTERM");
  }
  void watcher.close().then(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
