import type { DeploymentType, NodeRedToolConfig } from "./config.js";

export type FlowsResponse = {
  rev?: string;
  flows: unknown[];
};

export type FlowsStateResponse = {
  state?: string;
  [key: string]: unknown;
};

export type NodeInfo = {
  id: string;
  name: string;
  types: string[];
  enabled: boolean;
  local: boolean;
  module: string;
  version?: string;
};

export type DeployResult = {
  rev: string;
};

export type AddFlowResult = {
  id: string;
};

type RequestOptions = {
  method: string;
  headers: Record<string, string>;
  body?: string;
};

export class NodeRedClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  private readOnly: boolean;

  constructor(config: NodeRedToolConfig) {
    const root = config.adminApiRoot || "";
    this.baseUrl = `${config.baseUrl}${root}`;
    this.readOnly = config.readOnly ?? false;
    this.headers = {
      "Content-Type": "application/json",
      "Node-RED-API-Version": "v2",
    };
    if (config.token) {
      this.headers["Authorization"] = `Bearer ${config.token}`;
    }
  }

  private async request<T>(
    path: string,
    options: Partial<RequestOptions> = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const method = options.method || "GET";

    const res = await fetch(url, {
      method,
      headers: { ...this.headers, ...options.headers },
      body: options.body,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Node-RED API error: ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`,
      );
    }

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return (await res.json()) as T;
    }
    return (await res.text()) as unknown as T;
  }

  private checkWritePermission(): void {
    if (this.readOnly) {
      throw new Error(
        "Node-RED is configured in read-only mode. Write operations are disabled.",
      );
    }
  }

  /**
   * GET /flows - Retrieve the current flow configuration
   */
  async getFlows(): Promise<FlowsResponse> {
    return this.request<FlowsResponse>("/flows");
  }

  /**
   * POST /flows - Deploy flows
   */
  async deployFlows(params: {
    flows: unknown[];
    rev?: string;
    deploymentType?: DeploymentType;
  }): Promise<DeployResult> {
    this.checkWritePermission();

    const headers: Record<string, string> = {};
    if (params.deploymentType) {
      headers["Node-RED-Deployment-Type"] = params.deploymentType;
    }

    const body: Record<string, unknown> = { flows: params.flows };
    if (params.rev) {
      body.rev = params.rev;
    }

    return this.request<DeployResult>("/flows", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }

  /**
   * POST /flow - Add a new flow tab
   */
  async addFlow(flow: unknown): Promise<AddFlowResult> {
    this.checkWritePermission();

    return this.request<AddFlowResult>("/flow", {
      method: "POST",
      body: JSON.stringify(flow),
    });
  }

  /**
   * PUT /flow/:id - Update an existing flow tab
   */
  async updateFlow(id: string, flow: unknown): Promise<void> {
    this.checkWritePermission();

    await this.request<unknown>(`/flow/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(flow),
    });
  }

  /**
   * GET /flows/state - Get the runtime state of flows
   */
  async getFlowsState(): Promise<FlowsStateResponse> {
    return this.request<FlowsStateResponse>("/flows/state");
  }

  /**
   * GET /nodes - Get the list of installed nodes
   */
  async getNodes(): Promise<NodeInfo[]> {
    return this.request<NodeInfo[]>("/nodes");
  }

  /**
   * POST /nodes - Install a new node module
   */
  async installNode(module: string): Promise<unknown> {
    this.checkWritePermission();

    return this.request<unknown>("/nodes", {
      method: "POST",
      body: JSON.stringify({ module }),
    });
  }
}
