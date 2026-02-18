import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveOpenClawPackageRoot } from "../infra/openclaw-root.js";
import { pathExists } from "../utils.js";

// Compute fallback paths relative to this module's location.
// In source: src/agents/workspace-templates.ts → ../../docs = yoyoclaw/docs (correct)
// In bundle: dist/workspace-*.js            → ../docs  = yoyoclaw/docs (correct)
const __moduleDir = path.dirname(fileURLToPath(import.meta.url));
const FALLBACK_TEMPLATE_DIRS = [
  path.resolve(__moduleDir, "../docs/reference/templates"),
  path.resolve(__moduleDir, "../../docs/reference/templates"),
];

let cachedTemplateDir: string | undefined;
let resolvingTemplateDir: Promise<string> | undefined;

export async function resolveWorkspaceTemplateDir(opts?: {
  cwd?: string;
  argv1?: string;
  moduleUrl?: string;
}): Promise<string> {
  if (cachedTemplateDir) {
    return cachedTemplateDir;
  }
  if (resolvingTemplateDir) {
    return resolvingTemplateDir;
  }

  resolvingTemplateDir = (async () => {
    const moduleUrl = opts?.moduleUrl ?? import.meta.url;
    const argv1 = opts?.argv1 ?? process.argv[1];
    const cwd = opts?.cwd ?? process.cwd();

    const packageRoot = await resolveOpenClawPackageRoot({ moduleUrl, argv1, cwd });
    const candidates = [
      packageRoot ? path.join(packageRoot, "docs", "reference", "templates") : null,
      ...FALLBACK_TEMPLATE_DIRS,
    ].filter(Boolean) as string[];

    for (const candidate of candidates) {
      if (await pathExists(candidate)) {
        cachedTemplateDir = candidate;
        return candidate;
      }
    }

    cachedTemplateDir = candidates[0] ?? FALLBACK_TEMPLATE_DIRS[0];
    return cachedTemplateDir;
  })();

  try {
    return await resolvingTemplateDir;
  } finally {
    resolvingTemplateDir = undefined;
  }
}

export function resetWorkspaceTemplateDirCache() {
  cachedTemplateDir = undefined;
  resolvingTemplateDir = undefined;
}
