/**
 * Node-RED Built-in Flow Templates
 * Pre-defined flow patterns for common use cases.
 */

import {
  createFlowTab,
  NodeFactory,
  chainNodes,
  layoutNodes,
  type NodeJson,
  type FlowTabJson,
} from "./flow-builder.js";

export type TemplateInfo = {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
};

export type GeneratedFlow = {
  tab: FlowTabJson;
  nodes: NodeJson[];
  description: string;
};

/**
 * Available template categories.
 */
export const TEMPLATE_CATEGORIES = [
  "api",
  "iot",
  "automation",
  "integration",
  "utility",
] as const;

/**
 * Template information for listing.
 */
export const TEMPLATES: TemplateInfo[] = [
  {
    id: "http-api",
    name: "HTTP REST API",
    description: "HTTP 요청을 받아 처리하고 응답하는 기본 API 패턴",
    category: "api",
    tags: ["http", "rest", "api", "web"],
  },
  {
    id: "http-api-crud",
    name: "HTTP CRUD API",
    description: "GET, POST, PUT, DELETE 엔드포인트를 포함한 완전한 CRUD API",
    category: "api",
    tags: ["http", "rest", "crud", "api"],
  },
  {
    id: "mqtt-processor",
    name: "MQTT 메시지 처리",
    description: "MQTT 토픽을 구독하여 메시지를 처리하는 IoT 패턴",
    category: "iot",
    tags: ["mqtt", "iot", "message", "broker"],
  },
  {
    id: "timer-task",
    name: "타이머 작업",
    description: "주기적으로 실행되는 자동화 작업",
    category: "automation",
    tags: ["timer", "cron", "schedule", "automation"],
  },
  {
    id: "webhook-handler",
    name: "웹훅 핸들러",
    description: "외부 웹훅을 받아 조건에 따라 분기 처리",
    category: "integration",
    tags: ["webhook", "http", "switch", "routing"],
  },
  {
    id: "error-handler",
    name: "에러 핸들러",
    description: "플로우 에러를 캐치하여 로깅하는 패턴",
    category: "utility",
    tags: ["error", "catch", "logging", "debug"],
  },
  {
    id: "http-proxy",
    name: "HTTP 프록시",
    description: "외부 API를 호출하고 결과를 변환하여 반환",
    category: "api",
    tags: ["http", "proxy", "api", "transform"],
  },
  {
    id: "mqtt-to-http",
    name: "MQTT to HTTP",
    description: "MQTT 메시지를 받아 HTTP API로 전달하는 브릿지",
    category: "integration",
    tags: ["mqtt", "http", "bridge", "integration"],
  },
  {
    id: "data-logger",
    name: "데이터 로거",
    description: "입력 데이터를 파일이나 DB에 저장하는 패턴",
    category: "utility",
    tags: ["logging", "file", "database", "storage"],
  },
  {
    id: "rate-limiter",
    name: "Rate Limiter",
    description: "메시지 속도를 제한하는 패턴",
    category: "utility",
    tags: ["rate-limit", "throttle", "delay"],
  },
];

/**
 * Generate a flow from a template.
 */
export function generateFromTemplate(
  templateId: string,
  options: {
    label?: string;
    baseUrl?: string;
    mqttTopic?: string;
    interval?: string;
  } = {},
): GeneratedFlow | null {
  const template = TEMPLATES.find((t) => t.id === templateId);
  if (!template) {
    return null;
  }

  const tab = createFlowTab(options.label || template.name, template.description);
  let nodes: NodeJson[] = [];

  switch (templateId) {
    case "http-api": {
      const url = options.baseUrl || "/api/example";
      const httpIn = NodeFactory.httpIn(tab.id, undefined, {
        name: "HTTP 입력",
        url,
        method: "get",
      });
      const func = NodeFactory.function(tab.id, undefined, {
        name: "처리 로직",
        func: `// 요청 처리 로직
const response = {
    success: true,
    message: "Hello from Node-RED!",
    timestamp: new Date().toISOString()
};
msg.payload = response;
return msg;`,
      });
      const httpRes = NodeFactory.httpResponse(tab.id, undefined, {
        name: "HTTP 응답",
      });
      nodes = layoutNodes(chainNodes([httpIn, func, httpRes]));
      break;
    }

    case "http-api-crud": {
      const baseUrl = options.baseUrl || "/api/items";
      
      // GET all
      const getAll = NodeFactory.httpIn(tab.id, { x: 100, y: 100 }, {
        name: "GET all",
        url: baseUrl,
        method: "get",
      });
      const getAllFunc = NodeFactory.function(tab.id, { x: 300, y: 100 }, {
        name: "List items",
        func: `msg.payload = flow.get("items") || [];
return msg;`,
      });
      const getAllRes = NodeFactory.httpResponse(tab.id, { x: 500, y: 100 });

      // POST create
      const create = NodeFactory.httpIn(tab.id, { x: 100, y: 180 }, {
        name: "POST create",
        url: baseUrl,
        method: "post",
      });
      const createFunc = NodeFactory.function(tab.id, { x: 300, y: 180 }, {
        name: "Create item",
        func: `const items = flow.get("items") || [];
const newItem = { id: Date.now(), ...msg.payload };
items.push(newItem);
flow.set("items", items);
msg.payload = newItem;
msg.statusCode = 201;
return msg;`,
      });
      const createRes = NodeFactory.httpResponse(tab.id, { x: 500, y: 180 });

      // PUT update
      const update = NodeFactory.httpIn(tab.id, { x: 100, y: 260 }, {
        name: "PUT update",
        url: `${baseUrl}/:id`,
        method: "put",
      });
      const updateFunc = NodeFactory.function(tab.id, { x: 300, y: 260 }, {
        name: "Update item",
        func: `const items = flow.get("items") || [];
const id = parseInt(msg.req.params.id);
const index = items.findIndex(i => i.id === id);
if (index >= 0) {
    items[index] = { ...items[index], ...msg.payload };
    flow.set("items", items);
    msg.payload = items[index];
} else {
    msg.statusCode = 404;
    msg.payload = { error: "Not found" };
}
return msg;`,
      });
      const updateRes = NodeFactory.httpResponse(tab.id, { x: 500, y: 260 });

      // DELETE
      const del = NodeFactory.httpIn(tab.id, { x: 100, y: 340 }, {
        name: "DELETE",
        url: `${baseUrl}/:id`,
        method: "delete",
      });
      const delFunc = NodeFactory.function(tab.id, { x: 300, y: 340 }, {
        name: "Delete item",
        func: `const items = flow.get("items") || [];
const id = parseInt(msg.req.params.id);
const index = items.findIndex(i => i.id === id);
if (index >= 0) {
    items.splice(index, 1);
    flow.set("items", items);
    msg.payload = { success: true };
} else {
    msg.statusCode = 404;
    msg.payload = { error: "Not found" };
}
return msg;`,
      });
      const delRes = NodeFactory.httpResponse(tab.id, { x: 500, y: 340 });

      // Connect each endpoint
      nodes = [
        ...chainNodes([getAll, getAllFunc, getAllRes]),
        ...chainNodes([create, createFunc, createRes]),
        ...chainNodes([update, updateFunc, updateRes]),
        ...chainNodes([del, delFunc, delRes]),
      ];
      break;
    }

    case "mqtt-processor": {
      const topic = options.mqttTopic || "sensors/#";
      const mqttIn = NodeFactory.mqttIn(tab.id, undefined, {
        name: "MQTT 구독",
        topic,
      });
      const func = NodeFactory.function(tab.id, undefined, {
        name: "메시지 처리",
        func: `// MQTT 메시지 처리
const data = msg.payload;
msg.payload = {
    topic: msg.topic,
    data: typeof data === 'string' ? JSON.parse(data) : data,
    receivedAt: new Date().toISOString()
};
return msg;`,
      });
      const debug = NodeFactory.debug(tab.id, undefined, {
        name: "디버그 출력",
      });
      nodes = layoutNodes(chainNodes([mqttIn, func, debug]));
      break;
    }

    case "timer-task": {
      const interval = options.interval || "60";
      const inject = NodeFactory.inject(tab.id, undefined, {
        payload: "",
        payloadType: "date",
        repeat: interval,
      });
      inject.name = `매 ${interval}초`;
      
      const func = NodeFactory.function(tab.id, undefined, {
        name: "작업 실행",
        func: `// 주기적 작업 로직
msg.payload = {
    task: "periodic-task",
    executedAt: new Date().toISOString()
};

// 여기에 실제 작업 로직 추가
node.status({ fill: "green", shape: "dot", text: "실행됨" });

return msg;`,
      });
      const debug = NodeFactory.debug(tab.id, undefined, {
        name: "결과 확인",
      });
      nodes = layoutNodes(chainNodes([inject, func, debug]));
      break;
    }

    case "webhook-handler": {
      const url = options.baseUrl || "/webhook";
      const httpIn = NodeFactory.httpIn(tab.id, { x: 100, y: 200 }, {
        name: "웹훅 수신",
        url,
        method: "post",
      });
      const switchNode = NodeFactory.switch(tab.id, { x: 300, y: 200 }, {
        name: "이벤트 분기",
        property: "payload.event",
        rules: [
          { t: "eq", v: "created", vt: "str" },
          { t: "eq", v: "updated", vt: "str" },
          { t: "eq", v: "deleted", vt: "str" },
          { t: "else" },
        ],
      });
      const debug1 = NodeFactory.debug(tab.id, { x: 500, y: 100 }, { name: "Created" });
      const debug2 = NodeFactory.debug(tab.id, { x: 500, y: 180 }, { name: "Updated" });
      const debug3 = NodeFactory.debug(tab.id, { x: 500, y: 260 }, { name: "Deleted" });
      const debug4 = NodeFactory.debug(tab.id, { x: 500, y: 340 }, { name: "Unknown" });
      const httpRes = NodeFactory.httpResponse(tab.id, { x: 300, y: 400 });

      // Connect switch outputs to debugs
      let connectedSwitch = switchNode;
      connectedSwitch.wires = [[debug1.id], [debug2.id], [debug3.id], [debug4.id]];
      
      // Connect input to switch and response
      const connectedHttpIn = { ...httpIn, wires: [[switchNode.id, httpRes.id]] };

      nodes = [connectedHttpIn, connectedSwitch, debug1, debug2, debug3, debug4, httpRes];
      break;
    }

    case "error-handler": {
      const catchNode = NodeFactory.catch(tab.id, undefined, {
        name: "에러 캐치",
        scope: "all",
      });
      const func = NodeFactory.function(tab.id, undefined, {
        name: "에러 로깅",
        func: `// 에러 정보 수집
const errorInfo = {
    error: msg.error,
    sourceNode: msg.error?.source?.id,
    sourceType: msg.error?.source?.type,
    message: msg.error?.message,
    timestamp: new Date().toISOString()
};

// 에러 로그 저장
const errorLog = flow.get("errorLog") || [];
errorLog.push(errorInfo);
flow.set("errorLog", errorLog.slice(-100)); // 최근 100개만 유지

msg.payload = errorInfo;
node.warn("Error caught: " + msg.error?.message);
return msg;`,
      });
      const debug = NodeFactory.debug(tab.id, undefined, {
        name: "에러 출력",
      });
      nodes = layoutNodes(chainNodes([catchNode, func, debug]));
      break;
    }

    case "http-proxy": {
      const url = options.baseUrl || "/proxy";
      const httpIn = NodeFactory.httpIn(tab.id, undefined, {
        name: "요청 수신",
        url,
        method: "get",
      });
      const func1 = NodeFactory.function(tab.id, undefined, {
        name: "요청 준비",
        func: `// 외부 API 요청 설정
msg.url = "https://api.example.com/data";
msg.method = "GET";
msg.headers = {
    "Content-Type": "application/json"
};
return msg;`,
      });
      // HTTP request node (simplified)
      const httpReq = createHttpRequest(tab.id);
      const func2 = NodeFactory.function(tab.id, undefined, {
        name: "응답 변환",
        func: `// 응답 데이터 변환
msg.payload = {
    success: true,
    data: msg.payload,
    proxiedAt: new Date().toISOString()
};
return msg;`,
      });
      const httpRes = NodeFactory.httpResponse(tab.id, undefined);
      nodes = layoutNodes(chainNodes([httpIn, func1, httpReq, func2, httpRes]));
      break;
    }

    case "mqtt-to-http": {
      const topic = options.mqttTopic || "events/#";
      const mqttIn = NodeFactory.mqttIn(tab.id, undefined, {
        name: "MQTT 수신",
        topic,
      });
      const func = NodeFactory.function(tab.id, undefined, {
        name: "HTTP 요청 준비",
        func: `// MQTT → HTTP 변환
msg.url = "https://api.example.com/events";
msg.method = "POST";
msg.headers = { "Content-Type": "application/json" };
msg.payload = {
    topic: msg.topic,
    data: msg.payload,
    timestamp: new Date().toISOString()
};
return msg;`,
      });
      const httpReq = createHttpRequest(tab.id);
      const debug = NodeFactory.debug(tab.id, undefined, {
        name: "결과 확인",
      });
      nodes = layoutNodes(chainNodes([mqttIn, func, httpReq, debug]));
      break;
    }

    case "data-logger": {
      const inject = NodeFactory.inject(tab.id, undefined, {
        payload: "",
        payloadType: "date",
        repeat: "10",
      });
      inject.name = "주기적 트리거";
      
      const func = NodeFactory.function(tab.id, undefined, {
        name: "로그 데이터 생성",
        func: `// 로그 데이터 생성
msg.payload = {
    timestamp: new Date().toISOString(),
    data: {
        value: Math.random() * 100,
        source: "sensor-1"
    }
};
return msg;`,
      });
      const file = createFileNode(tab.id);
      const debug = NodeFactory.debug(tab.id, undefined, {
        name: "로그 확인",
      });
      nodes = layoutNodes(chainNodes([inject, func, file, debug]));
      break;
    }

    case "rate-limiter": {
      const inject = NodeFactory.inject(tab.id, undefined, {
        payload: "test",
        payloadType: "str",
      });
      inject.name = "테스트 입력";
      
      const delay = NodeFactory.delay(tab.id, undefined, {
        name: "Rate Limit",
        pauseType: "rate",
        timeout: "1",
        timeoutUnits: "seconds",
      });
      const debug = NodeFactory.debug(tab.id, undefined, {
        name: "제한된 출력",
      });
      nodes = layoutNodes(chainNodes([inject, delay, debug]));
      break;
    }

    default:
      return null;
  }

  return {
    tab,
    nodes,
    description: template.description,
  };
}

// Helper for HTTP request node
function createHttpRequest(flowId: string): NodeJson {
  return {
    id: `${Date.now().toString(16)}.httpreq`,
    type: "http request",
    name: "HTTP 요청",
    x: 0,
    y: 0,
    z: flowId,
    wires: [[]],
    method: "use",
    ret: "obj",
    paytoqs: "ignore",
    url: "",
    tls: "",
    persist: false,
    proxy: "",
    insecureHTTPParser: false,
    authType: "",
    senderr: false,
    headers: [],
  };
}

// Helper for file node
function createFileNode(flowId: string): NodeJson {
  return {
    id: `${Date.now().toString(16)}.file`,
    type: "file",
    name: "파일 저장",
    x: 0,
    y: 0,
    z: flowId,
    wires: [[]],
    filename: "node-red-log.txt",
    filenameType: "str",
    appendNewline: true,
    createDir: false,
    overwriteFile: "false",
    encoding: "utf8",
  };
}

/**
 * Get a list of available templates.
 */
export function listTemplates(category?: string): TemplateInfo[] {
  if (category) {
    return TEMPLATES.filter((t) => t.category === category);
  }
  return TEMPLATES;
}

/**
 * Search templates by keyword.
 */
export function searchTemplates(keyword: string): TemplateInfo[] {
  const lower = keyword.toLowerCase();
  return TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(lower) ||
      t.description.toLowerCase().includes(lower) ||
      t.tags.some((tag) => tag.includes(lower)),
  );
}
