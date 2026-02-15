/**
 * Inference consolidation logic.
 *
 * Merges redundant inferences, resolves contradictions, and promotes confidence
 * when the inference count exceeds a threshold.
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { OpenClawConfig } from "../../../config/config.js";
import {
  resolveDefaultAgentId,
  resolveAgentWorkspaceDir,
  resolveAgentDir,
} from "../../../agents/agent-scope.js";
import { runEmbeddedPiAgent } from "../../../agents/pi-embedded.js";
import { createSubsystemLogger } from "../../../logging/subsystem.js";
import { parseInferences, writeInferenceFiles } from "./handler.js";

const log = createSubsystemLogger("hooks/inference-consolidation");

export const DEFAULT_CONSOLIDATION_THRESHOLD = 20;

const CONSOLIDATION_PROMPT = `You are an inference consolidation system. Review the following set of behavioral inferences extracted over multiple sessions and consolidate them.

Your goals:
1. MERGE redundant inferences that describe the same pattern
2. RESOLVE contradictions by keeping the most recent/confident version
3. PROMOTE confidence when multiple independent observations support the same inference
4. REMOVE low-confidence inferences that lack supporting evidence from other entries
5. SYNTHESIZE higher-order patterns from related lower-level observations

Output a JSON array of consolidated inferences. Each must have: domain, insight, confidence.
If an inference supersedes others, include a "supersedes" field describing what it replaces.

Keep the total count significantly lower than the input count. Aim for roughly 30-50% reduction.

INFERENCES TO CONSOLIDATE:
`;

/**
 * Read all inference files from the given directory.
 */
export async function readInferenceFiles(
  dir: string,
): Promise<Array<{ path: string; content: string }>> {
  try {
    const entries = await fs.readdir(dir);
    const mdFiles = entries.filter((f) => f.endsWith(".md"));

    const results: Array<{ path: string; content: string }> = [];
    for (const file of mdFiles) {
      try {
        const filePath = path.join(dir, file);
        const content = await fs.readFile(filePath, "utf-8");
        results.push({ path: filePath, content });
      } catch {
        // Skip unreadable files
      }
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * Archive original inference files by moving them to an archive subdirectory.
 */
async function archiveInferences(
  files: Array<{ path: string }>,
  archiveDir: string,
): Promise<void> {
  await fs.mkdir(archiveDir, { recursive: true });
  for (const file of files) {
    const basename = path.basename(file.path);
    const destPath = path.join(archiveDir, basename);
    try {
      await fs.rename(file.path, destPath);
    } catch {
      log.warn("Failed to archive inference file", { file: file.path });
    }
  }
}

/**
 * Run the consolidation process on accumulated inferences.
 *
 * @returns Number of consolidated inferences, or null if consolidation was skipped.
 */
export async function consolidateInferences(params: {
  cfg: OpenClawConfig;
  inferencesDir: string;
  threshold?: number;
}): Promise<number | null> {
  const threshold = params.threshold ?? DEFAULT_CONSOLIDATION_THRESHOLD;

  // Read all existing inferences
  const files = await readInferenceFiles(params.inferencesDir);

  if (files.length < threshold) {
    log.debug(`Only ${files.length} inferences (threshold: ${threshold}), skipping consolidation`);
    return null;
  }

  log.info(`Consolidating ${files.length} inferences (threshold: ${threshold})`);

  // Build content summary for LLM
  const inferenceTexts = files.map((f) => f.content).join("\n---\n");
  const prompt = `${CONSOLIDATION_PROMPT}${inferenceTexts}`;

  let tempSessionFile: string | null = null;

  try {
    const agentId = resolveDefaultAgentId(params.cfg);
    const workspaceDir = resolveAgentWorkspaceDir(params.cfg, agentId);
    const agentDir = resolveAgentDir(params.cfg, agentId);

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-consolidate-"));
    tempSessionFile = path.join(tempDir, "session.jsonl");

    const result = await runEmbeddedPiAgent({
      sessionId: `consolidation-${Date.now()}`,
      sessionKey: "temp:consolidation",
      agentId,
      sessionFile: tempSessionFile,
      workspaceDir,
      agentDir,
      config: params.cfg,
      prompt,
      timeoutMs: 60_000,
      runId: `consolidate-${Date.now()}`,
    });

    const responseText = result.payloads?.[0]?.text;
    if (!responseText) {
      log.warn("No response from consolidation LLM");
      return null;
    }

    const consolidated = parseInferences(responseText);

    if (consolidated.length === 0) {
      log.warn("Consolidation produced no inferences");
      return null;
    }

    // Archive originals
    const archiveDir = path.join(
      params.inferencesDir,
      "archive",
      new Date().toISOString().split("T")[0],
    );
    await archiveInferences(files, archiveDir);

    // Write consolidated inferences
    await writeInferenceFiles({
      inferences: consolidated,
      outputDir: params.inferencesDir,
      timestamp: new Date(),
    });

    log.info(`Consolidated ${files.length} inferences into ${consolidated.length}`);
    return consolidated.length;
  } catch (err) {
    log.error("Consolidation failed", {
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    return null;
  } finally {
    if (tempSessionFile) {
      try {
        await fs.rm(path.dirname(tempSessionFile), { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}
