import type {
  GraspAgentProfile,
  GraspDimensionResult,
  GraspFinding,
  GraspOptions,
  GraspProgressEvent,
  GraspReport,
} from "./types.js";
import { listAgentIds, resolveDefaultAgentId } from "../../agents/agent-scope.js";
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "../../agents/defaults.js";
import { resolveConfiguredModelRef } from "../../agents/model-selection.js";
import { computeCacheKey, getCachedReport, setCachedReport } from "./cache.js";
import { ALL_DIMENSION_PROMPTS } from "./prompts/index.js";
import { runDimensionAnalysis } from "./runner.js";
import {
  aggregateScores,
  countBySeverity,
  generateAgentSummary,
  levelFromScore,
} from "./scoring.js";

export type {
  GraspOptions,
  GraspReport,
  GraspAgentProfile,
  GraspDimensionResult,
  GraspFinding,
  GraspProgressEvent,
};

export async function runGraspAssessment(opts: GraspOptions): Promise<GraspReport> {
  const { config } = opts;
  return await runGraspAssessmentInner(opts, config);
}

async function runGraspAssessmentInner(
  opts: GraspOptions,
  config: GraspOptions["config"],
): Promise<GraspReport> {
  const onProgress = opts.onProgress ?? (() => {});

  // Resolve model
  const modelRef = resolveConfiguredModelRef({
    cfg: config,
    defaultProvider: DEFAULT_PROVIDER,
    defaultModel: DEFAULT_MODEL,
  });

  // Parse provider/model from opts.model if provided (e.g., "moonshot/kimi-k2")
  let model = modelRef.model;
  let provider = modelRef.provider;
  if (opts.model) {
    if (opts.model.includes("/")) {
      const [p, ...rest] = opts.model.split("/");
      provider = p;
      model = rest.join("/");
    } else {
      model = opts.model;
    }
  }

  // Determine which agents to analyze
  const defaultAgentId = resolveDefaultAgentId(config);
  const allAgentIds = listAgentIds(config);
  const agentIds = opts.agentId
    ? [opts.agentId]
    : allAgentIds.length > 0
      ? allAgentIds
      : [defaultAgentId];

  // Check cache (if not disabled)
  const cacheKey = computeCacheKey(config, opts.agentId);
  if (!opts.noCache) {
    const cached = await getCachedReport(cacheKey);
    if (cached) {
      onProgress({ type: "done" });
      return cached;
    }
  }

  const totalDimensions = ALL_DIMENSION_PROMPTS.length * agentIds.length;
  onProgress({ type: "start", totalDimensions, agents: agentIds });

  const agents: GraspAgentProfile[] = [];
  let completedDimensions = 0;

  for (const agentId of agentIds) {
    // Run dimensions sequentially to provide better progress feedback
    const dimensionResults: GraspDimensionResult[] = [];

    for (const prompt of ALL_DIMENSION_PROMPTS) {
      onProgress({
        type: "dimension_start",
        dimension: prompt.dimension,
        label: prompt.label,
        agentId,
      });

      const result = await runDimensionAnalysis({
        config,
        prompt,
        agentId,
        model,
        provider,
      });

      dimensionResults.push(result);
      completedDimensions += 1;

      onProgress({
        type: "dimension_done",
        dimension: prompt.dimension,
        agentId,
        completed: completedDimensions,
        total: totalDimensions,
      });
    }

    const overallScore = aggregateScores(dimensionResults.map((d) => d.score));

    agents.push({
      agentId,
      isDefault: agentId === defaultAgentId,
      dimensions: dimensionResults,
      overallScore,
      overallLevel: levelFromScore(overallScore),
      summary: generateAgentSummary(dimensionResults),
    });

    onProgress({ type: "agent_done", agentId });
  }

  // Extract global findings (from governance and reach dimensions, related to gateway/channels)
  const globalFindings = extractGlobalFindings(agents);

  const overallScore = Math.max(...agents.map((a) => a.overallScore), 0);
  const allFindings = agents.flatMap((a) => a.dimensions.flatMap((d) => d.findings));

  const report: GraspReport = {
    ts: Date.now(),
    modelUsed: `${provider}/${model}`,
    agents,
    globalFindings,
    overallScore,
    overallLevel: levelFromScore(overallScore),
    summary: countBySeverity(allFindings),
  };

  // Cache the report
  if (!opts.noCache) {
    await setCachedReport(cacheKey, report);
  }

  onProgress({ type: "done" });

  return report;
}

function extractGlobalFindings(agents: GraspAgentProfile[]): GraspFinding[] {
  // Extract findings related to gateway/channels (not agent-specific)
  const globalPatterns = [
    /^governance\.gateway/,
    /^governance\.control_ui/,
    /^reach\.gateway/,
    /^reach\.tailscale/,
    /^reach\.channel/,
    /^safeguards\.channel/,
  ];

  const seen = new Set<string>();
  const global: GraspFinding[] = [];

  for (const agent of agents) {
    for (const dim of agent.dimensions) {
      for (const finding of dim.findings) {
        if (seen.has(finding.id)) {
          continue;
        }
        if (globalPatterns.some((p) => p.test(finding.id))) {
          seen.add(finding.id);
          global.push(finding);
        }
      }
    }
  }

  return global;
}
