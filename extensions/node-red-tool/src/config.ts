import { Type } from "@sinclair/typebox";

export const NodeRedToolConfigSchema = {
  jsonSchema: {
    type: "object",
    properties: {
      baseUrl: {
        type: "string",
        description: "Node-RED Admin API base URL",
        default: "http://localhost:1880",
      },
      adminApiRoot: {
        type: "string",
        description: "Admin API root path (e.g., /admin)",
        default: "",
      },
      token: {
        type: "string",
        description: "Bearer token for adminAuth authentication",
      },
      deploymentType: {
        type: "string",
        enum: ["full", "nodes", "flows", "reload"],
        description: "Default deployment type",
        default: "flows",
      },
      readOnly: {
        type: "boolean",
        description: "Read-only mode (disable write operations)",
        default: false,
      },
    },
    required: ["baseUrl"],
  },
  uiHints: {
    baseUrl: {
      label: "Base URL",
      placeholder: "http://localhost:1880",
      help: "Node-RED 인스턴스의 기본 URL",
    },
    adminApiRoot: {
      label: "Admin API Root",
      placeholder: "/admin",
      help: "Admin API 경로 접두사 (대부분 빈 문자열)",
      advanced: true,
    },
    token: {
      label: "API Token",
      sensitive: true,
      help: "adminAuth 인증용 Bearer 토큰",
    },
    deploymentType: {
      label: "Deployment Type",
      advanced: true,
      help: "기본 배포 타입: full(전체), nodes(노드만), flows(플로우만), reload(재시작)",
    },
    readOnly: {
      label: "Read-Only Mode",
      advanced: true,
      help: "활성화 시 조회만 가능하고 배포/수정 불가",
    },
  },
};

export type DeploymentType = "full" | "nodes" | "flows" | "reload";

export type NodeRedToolConfig = {
  baseUrl: string;
  adminApiRoot?: string;
  token?: string;
  deploymentType?: DeploymentType;
  readOnly?: boolean;
};

export function getPluginConfig(
  pluginConfig: Record<string, unknown> | undefined,
): NodeRedToolConfig {
  const baseUrl =
    typeof pluginConfig?.baseUrl === "string"
      ? pluginConfig.baseUrl
      : "http://localhost:1880";

  return {
    baseUrl: baseUrl.replace(/\/$/, ""), // Remove trailing slash
    adminApiRoot:
      typeof pluginConfig?.adminApiRoot === "string"
        ? pluginConfig.adminApiRoot
        : "",
    token:
      typeof pluginConfig?.token === "string" ? pluginConfig.token : undefined,
    deploymentType:
      (pluginConfig?.deploymentType as DeploymentType) || "flows",
    readOnly: pluginConfig?.readOnly === true,
  };
}
