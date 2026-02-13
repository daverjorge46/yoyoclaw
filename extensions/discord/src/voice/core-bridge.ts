/**
 * Dynamic import bridge to openclaw core — mirrors extensions/voice-call/src/core-bridge.ts
 * but only exposes what's needed for one-shot LLM summarization.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type CoreAgentDeps = {
  runEmbeddedPiAgent: (params: {
    sessionId: string;
    sessionFile: string;
    workspaceDir: string;
    config?: Record<string, unknown>;
    prompt: string;
    provider?: string;
    model?: string;
    timeoutMs: number;
    runId: string;
    disableTools?: boolean;
  }) => Promise<{
    payloads?: Array<{ text?: string; isError?: boolean }>;
    meta?: { aborted?: boolean };
  }>;
  DEFAULT_MODEL: string;
  DEFAULT_PROVIDER: string;
};

let coreRootCache: string | null = null;
let coreDepsPromise: Promise<CoreAgentDeps> | null = null;

function findPackageRoot(startDir: string, name: string): string | null {
  let dir = startDir;
  for (;;) {
    const pkgPath = path.join(dir, "package.json");
    try {
      if (fs.existsSync(pkgPath)) {
        const raw = fs.readFileSync(pkgPath, "utf8");
        const pkg = JSON.parse(raw) as { name?: string };
        if (pkg.name === name) {
          return dir;
        }
      }
    } catch {
      // ignore parse errors and keep walking
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
}

function resolveOpenClawRoot(): string {
  if (coreRootCache) {
    return coreRootCache;
  }
  const override = process.env.OPENCLAW_ROOT?.trim();
  if (override) {
    coreRootCache = override;
    return override;
  }

  const candidates = new Set<string>();
  if (process.argv[1]) {
    candidates.add(path.dirname(process.argv[1]));
  }
  candidates.add(process.cwd());
  try {
    const urlPath = fileURLToPath(import.meta.url);
    candidates.add(path.dirname(urlPath));
  } catch {
    // ignore
  }

  for (const start of candidates) {
    for (const name of ["openclaw"]) {
      const found = findPackageRoot(start, name);
      if (found) {
        coreRootCache = found;
        return found;
      }
    }
  }

  throw new Error("Unable to resolve core root. Set OPENCLAW_ROOT to the package root.");
}

async function importCoreExtensionAPI(): Promise<CoreAgentDeps> {
  const distPath = path.join(resolveOpenClawRoot(), "dist", "extensionAPI.js");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Missing core module at ${distPath}. Run \`pnpm build\` or install the official package.`,
    );
  }
  return await import(pathToFileURL(distPath).href);
}

export async function loadCoreAgentDeps(): Promise<CoreAgentDeps> {
  if (coreDepsPromise) {
    return coreDepsPromise;
  }

  coreDepsPromise = (async () => {
    return await importCoreExtensionAPI();
  })();

  return coreDepsPromise;
}
