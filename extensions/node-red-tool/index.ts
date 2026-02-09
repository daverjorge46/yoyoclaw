import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import {
  NodeRedToolConfigSchema,
  getPluginConfig,
} from "./src/config.js";
import { NodeRedToolSchema, createExecuteNodeRedTool } from "./src/tool.js";

const plugin = {
  id: "node-red-tool",
  name: "Node-RED Tools",
  description:
    "Control Node-RED flows via Admin API with flow creation helpers",
  configSchema: NodeRedToolConfigSchema,
  register(api: OpenClawPluginApi) {
    api.registerTool({
      name: "node_red",
      label: "Node-RED",
      description:
        "Node-RED Flow 관리 및 생성 도구.\n" +
        "▶ 조회/배포: flows_get, flows_deploy, flows_state_get\n" +
        "▶ 플로우 관리: flow_add, flow_update, flow_create\n" +
        "▶ 노드 관리: nodes_list, nodes_install, node_create, nodes_connect\n" +
        "▶ 템플릿: templates_list, template_apply (http-api, mqtt-processor, timer-task 등)\n" +
        "▶ 도우미: flow_validate, flow_analyze, catalog_search, catalog_info\n" +
        "플로우 생성 순서: flow_create → node_create → nodes_connect → flows_deploy",
      parameters: NodeRedToolSchema,
      execute: createExecuteNodeRedTool(getPluginConfig(api.pluginConfig)),
    });
  },
};

export default plugin;
