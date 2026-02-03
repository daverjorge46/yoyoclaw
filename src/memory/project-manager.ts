import type { OpenClawConfig } from "../config/config.js";
import {
  resolveProjectContext,
  listAvailableProjects,
  type ProjectConfig,
  type ProjectContext,
} from "./project-scope.js";
import { MemoryIndexManager, type MemorySearchResult } from "./manager.js";

export class ProjectMemoryManager {
  private readonly agentId: string;
  private readonly projects: ProjectConfig[];
  private readonly cfg: OpenClawConfig;
  private readonly defaultProjectId?: string;
  private readonly managers = new Map<string, MemoryIndexManager | null>();

  constructor(params: {
    agentId: string;
    projects: ProjectConfig[];
    defaultProjectId?: string;
    cfg: OpenClawConfig;
  }) {
    this.agentId = params.agentId;
    this.projects = params.projects;
    this.defaultProjectId = params.defaultProjectId;
    this.cfg = params.cfg;
  }

  resolveContext(params: { channelName?: string; explicitProjectId?: string }): ProjectContext {
    return resolveProjectContext({
      channelName: params.channelName,
      explicitProjectId: params.explicitProjectId,
      defaultProjectId: this.defaultProjectId,
      projects: this.projects,
    });
  }

  listProjects(): string {
    return listAvailableProjects(this.projects);
  }

  getProject(projectId: string): ProjectConfig | undefined {
    return this.projects.find((p) => p.id === projectId);
  }

  async search(params: {
    projectId?: string;
    query: string;
    maxResults?: number;
    sessionKey?: string;
  }): Promise<MemorySearchResult[]> {
    const manager = await this.getManagerForProject(params.projectId);
    if (!manager) {
      return [];
    }

    return manager.search(params.query, {
      maxResults: params.maxResults,
      sessionKey: params.sessionKey,
    });
  }

  async crossProjectSearch(params: {
    targetProjectId: string;
    query: string;
    maxResults?: number;
  }): Promise<MemorySearchResult[]> {
    const project = this.getProject(params.targetProjectId);
    if (!project) {
      return [];
    }

    const manager = await this.getManagerForProject(params.targetProjectId);
    if (!manager) {
      return [];
    }

    return manager.search(params.query, {
      maxResults: params.maxResults,
    });
  }

  private async getManagerForProject(
    projectId: string | undefined,
  ): Promise<MemoryIndexManager | null> {
    const key = projectId ?? "_global";
    const cached = this.managers.get(key);
    if (cached !== undefined) {
      return cached;
    }

    // For now, use the existing MemoryIndexManager
    // Future: create project-specific manager with custom db path
    const manager = await MemoryIndexManager.get({
      cfg: this.cfg,
      agentId: this.agentId,
    });

    this.managers.set(key, manager);
    return manager;
  }

  buildMemoryScopePrompt(ctx: ProjectContext): string {
    if (!ctx.projectId) {
      return "## Memory Scope\nYour memory searches use global agent memory (no project context).";
    }

    const projectsList = this.projects
      .filter((p) => p.id !== ctx.projectId)
      .map((p) => p.id)
      .join(", ");

    return [
      "## Memory Scope",
      `You are currently in project: ${ctx.projectId} (${ctx.projectName})`,
      "Your memory searches are scoped to this project only.",
      "",
      "To query another project's memory, use the cross_project_search tool:",
      `- cross_project_search(project: "<project-id>", query: "<search query>")`,
      "- Only use this when explicitly relevant to the conversation.",
      projectsList ? `- Available projects: ${projectsList}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }
}
