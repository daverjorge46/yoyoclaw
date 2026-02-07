import { checkFile } from "@disreguard/sig";
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";

export interface TemplateDriftResult {
  unsigned: string[];
  modified: string[];
  ok: string[];
}

function toProjectRelative(projectRoot: string, absolutePath: string): string {
  return relative(projectRoot, absolutePath).replace(/\\/g, "/");
}

export async function checkTemplateDrift(
  projectRoot: string,
  templatesDir: string,
): Promise<TemplateDriftResult> {
  const result: TemplateDriftResult = { unsigned: [], modified: [], ok: [] };
  let entriesRaw: unknown;
  try {
    entriesRaw = await readdir(templatesDir, { withFileTypes: true });
  } catch (err) {
    // Some test/sandbox workspaces do not contain llm/prompts; skip drift checks there.
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return result;
    }
    throw err;
  }
  const entries = entriesRaw as Array<{ isFile: () => boolean; name: string }>;
  const templateNames = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".txt"))
    .map((entry) => entry.name)
    .toSorted();

  for (const name of templateNames) {
    const relativePath = toProjectRelative(projectRoot, join(templatesDir, name));
    try {
      const check = await checkFile(projectRoot, relativePath);
      if (check.status === "signed") {
        result.ok.push(relativePath);
        continue;
      }
      if (check.status === "unsigned") {
        result.unsigned.push(relativePath);
        continue;
      }
      result.modified.push(relativePath);
    } catch {
      result.modified.push(relativePath);
    }
  }

  return result;
}
