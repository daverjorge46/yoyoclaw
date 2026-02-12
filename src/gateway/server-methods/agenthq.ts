import fs from "node:fs/promises";
/**
 * AgentHQ Gateway RPC Handlers
 * Provides history, diff, and stats for agent workspace files.
 */
import type { GatewayRequestHandlers } from "./types.js";
import { listAgentIds, resolveAgentWorkspaceDir } from "../../agents/agent-scope.js";
import { loadConfig } from "../../config/config.js";
import { normalizeAgentId } from "../../routing/session-key.js";
import {
  getGitHistory,
  getGitDiff,
  getGitStats,
  getFileAtCommit,
  isGitRepository,
  type GitStatsResult,
} from "../../services/git-history.js";
import { resolveUserPath } from "../../utils.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";

// Tracked workspace files
const TRACKED_FILES = [
  "IDENTITY.md",
  "MEMORY.md",
  "SOUL.md",
  "HEARTBEAT.md",
  "USER.md",
  "AGENTS.md",
  "TOOLS.md",
  "BOOTSTRAP.md",
];

type AgentHQHistoryParams = {
  agentId?: string;
  files?: string[];
  limit?: number;
  since?: string;
  until?: string;
};

type AgentHQDiffParams = {
  agentId: string;
  sha: string;
  fileName: string;
};

type AgentHQStatsParams = {
  agentId?: string;
  files?: string[];
  since?: string;
  until?: string;
};

type AgentHQFileParams = {
  agentId: string;
  sha: string;
  fileName: string;
};

function validateAgentId(agentIdRaw: string | undefined): {
  valid: boolean;
  agentId: string | null;
  error?: string;
} {
  if (!agentIdRaw) {
    return { valid: false, agentId: null, error: "agentId is required" };
  }
  const cfg = loadConfig();
  const agentId = normalizeAgentId(agentIdRaw);
  const allowed = new Set(listAgentIds(cfg));
  if (!allowed.has(agentId)) {
    return { valid: false, agentId: null, error: `unknown agent: ${agentId}` };
  }
  return { valid: true, agentId };
}

async function resolveWorkspacePath(agentId: string): Promise<string | null> {
  const cfg = loadConfig();
  const workspaceDir = resolveAgentWorkspaceDir(cfg, agentId);
  if (!workspaceDir) {
    return null;
  }
  const resolved = resolveUserPath(workspaceDir);
  try {
    await fs.access(resolved);
    return resolved;
  } catch {
    return null;
  }
}

export const agenthqHandlers: GatewayRequestHandlers = {
  /**
   * List git history for agent workspace files
   */
  "agenthq.history.list": async ({ params, respond }) => {
    const typedParams = params as AgentHQHistoryParams;
    const { agentId: agentIdRaw, files, limit = 50, since, until } = typedParams;

    const validation = validateAgentId(agentIdRaw);
    if (!validation.valid || !validation.agentId) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, validation.error ?? "invalid agent"),
      );
      return;
    }

    const workspacePath = await resolveWorkspacePath(validation.agentId);
    if (!workspacePath) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "workspace not found"));
      return;
    }

    // Check if git repo exists
    const isGit = await isGitRepository(workspacePath);
    if (!isGit) {
      // Return empty result if not a git repo
      respond(true, {
        agentId: validation.agentId,
        workspace: workspacePath,
        entries: [],
        hasMore: false,
        isGitRepo: false,
      });
      return;
    }

    const fileFilter = files && files.length > 0 ? files : TRACKED_FILES;
    const history = await getGitHistory({
      workspacePath,
      fileFilter,
      limit,
      since,
      until,
    });

    respond(true, {
      agentId: validation.agentId,
      workspace: workspacePath,
      entries: history.commits,
      hasMore: history.hasMore,
      isGitRepo: true,
    });
  },

  /**
   * Get diff for a specific commit and file
   */
  "agenthq.history.diff": async ({ params, respond }) => {
    const typedParams = params as AgentHQDiffParams;
    const { agentId: agentIdRaw, sha, fileName } = typedParams;

    if (!sha || !fileName) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "sha and fileName are required"),
      );
      return;
    }

    const validation = validateAgentId(agentIdRaw);
    if (!validation.valid || !validation.agentId) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, validation.error ?? "invalid agent"),
      );
      return;
    }

    const workspacePath = await resolveWorkspacePath(validation.agentId);
    if (!workspacePath) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "workspace not found"));
      return;
    }

    const diff = await getGitDiff(workspacePath, sha, fileName);
    if (!diff) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "diff not found"));
      return;
    }

    respond(true, diff);
  },

  /**
   * Get statistics for agent workspace changes
   */
  "agenthq.history.stats": async ({ params, respond }) => {
    const typedParams = params as AgentHQStatsParams;
    const { agentId: agentIdRaw, files, since, until } = typedParams;

    const validation = validateAgentId(agentIdRaw);
    if (!validation.valid || !validation.agentId) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, validation.error ?? "invalid agent"),
      );
      return;
    }

    const workspacePath = await resolveWorkspacePath(validation.agentId);
    if (!workspacePath) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "workspace not found"));
      return;
    }

    const isGit = await isGitRepository(workspacePath);
    if (!isGit) {
      respond(true, {
        agentId: validation.agentId,
        totalCommits: 0,
        filesChanged: {},
        activityByDay: [],
        lastChangeAt: null,
        firstChangeAt: null,
        isGitRepo: false,
      });
      return;
    }

    const fileFilter = files && files.length > 0 ? files : TRACKED_FILES;
    const stats = await getGitStats({
      workspacePath,
      fileFilter,
      since,
      until,
    });

    respond(true, {
      agentId: validation.agentId,
      ...stats,
      isGitRepo: true,
    });
  },

  /**
   * Get file content at a specific commit
   */
  "agenthq.file.at": async ({ params, respond }) => {
    const typedParams = params as AgentHQFileParams;
    const { agentId: agentIdRaw, sha, fileName } = typedParams;

    if (!sha || !fileName) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "sha and fileName are required"),
      );
      return;
    }

    const validation = validateAgentId(agentIdRaw);
    if (!validation.valid || !validation.agentId) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, validation.error ?? "invalid agent"),
      );
      return;
    }

    const workspacePath = await resolveWorkspacePath(validation.agentId);
    if (!workspacePath) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "workspace not found"));
      return;
    }

    const content = await getFileAtCommit(workspacePath, sha, fileName);
    respond(true, {
      agentId: validation.agentId,
      sha,
      fileName,
      content,
    });
  },

  /**
   * List all agents with their workspace info for AgentHQ
   */
  "agenthq.agents.list": async ({ respond }) => {
    const cfg = loadConfig();
    const agentIds = listAgentIds(cfg);

    const agents = await Promise.all(
      agentIds.map(async (agentId) => {
        const workspacePath = await resolveWorkspacePath(agentId);
        const isGit = workspacePath ? await isGitRepository(workspacePath) : false;

        // Get basic stats if git repo
        let stats: GitStatsResult | null = null;
        if (workspacePath && isGit) {
          try {
            stats = await getGitStats({
              workspacePath,
              fileFilter: TRACKED_FILES,
              limit: 100,
            });
          } catch {
            // Ignore stats errors
          }
        }

        return {
          agentId,
          workspace: workspacePath,
          isGitRepo: isGit,
          totalCommits: stats?.totalCommits ?? 0,
          lastChangeAt: stats?.lastChangeAt ?? null,
          filesChanged: stats?.filesChanged ?? {},
        };
      }),
    );

    respond(true, { agents });
  },
};
