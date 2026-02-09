/**
 * Node-RED Flow Builder Utilities
 * Provides helper functions for creating and manipulating Node-RED flows programmatically.
 */

import { randomUUID } from "node:crypto";

// ============================================================================
// Types
// ============================================================================

export type NodePosition = {
  x: number;
  y: number;
};

export type NodeJson = {
  id: string;
  type: string;
  name?: string;
  x: number;
  y: number;
  z: string;
  wires: string[][];
  [key: string]: unknown;
};

export type FlowTabJson = {
  id: string;
  type: "tab";
  label: string;
  disabled?: boolean;
  info?: string;
};

export type CreateNodeParams = {
  type: string;
  name?: string;
  flowId: string;
  position?: NodePosition;
  properties?: Record<string, unknown>;
  wires?: string[][];
};

export type WireConnection = {
  sourceId: string;
  targetId: string;
  sourcePort: number;
};

export type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    tabCount: number;
    nodeCount: number;
    wireCount: number;
  };
};

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Generate a Node-RED compatible node ID.
 * Node-RED uses a specific format for IDs.
 */
export function generateNodeId(): string {
  // Node-RED uses a format like: "d6e9f9a1.2910b8"
  // We'll use a simplified UUID-based approach that Node-RED accepts
  const uuid = randomUUID().replace(/-/g, "");
  return `${uuid.slice(0, 8)}.${uuid.slice(8, 14)}`;
}

/**
 * Generate a flow tab ID.
 */
export function generateFlowId(): string {
  return generateNodeId();
}

// ============================================================================
// Node Creation
// ============================================================================

const DEFAULT_NODE_SPACING = 200;
const DEFAULT_START_X = 100;
const DEFAULT_START_Y = 100;

/**
 * Create a node JSON object.
 */
export function createNode(params: CreateNodeParams): NodeJson {
  const { type, name, flowId, position, properties = {}, wires = [[]] } = params;

  return {
    id: generateNodeId(),
    type,
    name: name || "",
    x: position?.x ?? DEFAULT_START_X,
    y: position?.y ?? DEFAULT_START_Y,
    z: flowId,
    wires,
    ...properties,
  };
}

/**
 * Create a flow tab.
 */
export function createFlowTab(label: string, info?: string): FlowTabJson {
  return {
    id: generateFlowId(),
    type: "tab",
    label,
    disabled: false,
    info,
  };
}

/**
 * Create common node types with sensible defaults.
 */
export const NodeFactory = {
  inject(flowId: string, position?: NodePosition, options: {
    payload?: string;
    payloadType?: string;
    topic?: string;
    repeat?: string;
    crontab?: string;
    once?: boolean;
  } = {}): NodeJson {
    return createNode({
      type: "inject",
      flowId,
      position,
      properties: {
        payload: options.payload ?? "",
        payloadType: options.payloadType ?? "date",
        topic: options.topic ?? "",
        repeat: options.repeat ?? "",
        crontab: options.crontab ?? "",
        once: options.once ?? false,
        onceDelay: 0.1,
      },
    });
  },

  debug(flowId: string, position?: NodePosition, options: {
    name?: string;
    active?: boolean;
    tosidebar?: boolean;
    console?: boolean;
    tostatus?: boolean;
    complete?: string;
  } = {}): NodeJson {
    return createNode({
      type: "debug",
      name: options.name,
      flowId,
      position,
      wires: [], // Debug has no outputs
      properties: {
        active: options.active ?? true,
        tosidebar: options.tosidebar ?? true,
        console: options.console ?? false,
        tostatus: options.tostatus ?? false,
        complete: options.complete ?? "payload",
        targetType: "msg",
        statusVal: "",
        statusType: "auto",
      },
    });
  },

  function(flowId: string, position?: NodePosition, options: {
    name?: string;
    func?: string;
    outputs?: number;
    initialize?: string;
    finalize?: string;
  } = {}): NodeJson {
    const outputs = options.outputs ?? 1;
    return createNode({
      type: "function",
      name: options.name,
      flowId,
      position,
      wires: Array(outputs).fill([]),
      properties: {
        func: options.func ?? "return msg;",
        outputs,
        timeout: 0,
        noerr: 0,
        initialize: options.initialize ?? "",
        finalize: options.finalize ?? "",
        libs: [],
      },
    });
  },

  httpIn(flowId: string, position?: NodePosition, options: {
    name?: string;
    url: string;
    method: "get" | "post" | "put" | "delete" | "patch";
  }): NodeJson {
    return createNode({
      type: "http in",
      name: options.name,
      flowId,
      position,
      properties: {
        url: options.url,
        method: options.method,
        upload: false,
        swaggerDoc: "",
      },
    });
  },

  httpResponse(flowId: string, position?: NodePosition, options: {
    name?: string;
    statusCode?: string;
  } = {}): NodeJson {
    return createNode({
      type: "http response",
      name: options.name,
      flowId,
      position,
      wires: [], // Response has no outputs
      properties: {
        statusCode: options.statusCode ?? "",
        headers: {},
      },
    });
  },

  mqttIn(flowId: string, position?: NodePosition, options: {
    name?: string;
    topic: string;
    qos?: string;
    broker?: string;
  }): NodeJson {
    return createNode({
      type: "mqtt in",
      name: options.name,
      flowId,
      position,
      properties: {
        topic: options.topic,
        qos: options.qos ?? "2",
        datatype: "auto",
        broker: options.broker ?? "",
        nl: false,
        rap: true,
        rh: 0,
      },
    });
  },

  mqttOut(flowId: string, position?: NodePosition, options: {
    name?: string;
    topic: string;
    qos?: string;
    broker?: string;
  }): NodeJson {
    return createNode({
      type: "mqtt out",
      name: options.name,
      flowId,
      position,
      wires: [],
      properties: {
        topic: options.topic,
        qos: options.qos ?? "",
        retain: "",
        respTopic: "",
        contentType: "",
        userProps: "",
        correl: "",
        expiry: "",
        broker: options.broker ?? "",
      },
    });
  },

  change(flowId: string, position?: NodePosition, options: {
    name?: string;
    rules?: Array<{
      t: "set" | "change" | "delete" | "move";
      p: string;
      pt?: string;
      to?: string;
      tot?: string;
    }>;
  } = {}): NodeJson {
    return createNode({
      type: "change",
      name: options.name,
      flowId,
      position,
      properties: {
        rules: options.rules ?? [{ t: "set", p: "payload", pt: "msg", to: "", tot: "str" }],
        action: "",
        property: "",
        from: "",
        to: "",
        reg: false,
      },
    });
  },

  switch(flowId: string, position?: NodePosition, options: {
    name?: string;
    property?: string;
    rules?: Array<{
      t: string;
      v?: string;
      vt?: string;
    }>;
  } = {}): NodeJson {
    const rules = options.rules ?? [{ t: "else" }];
    return createNode({
      type: "switch",
      name: options.name,
      flowId,
      position,
      wires: Array(rules.length).fill([]),
      properties: {
        property: options.property ?? "payload",
        propertyType: "msg",
        rules,
        checkall: "true",
        repair: false,
        outputs: rules.length,
      },
    });
  },

  delay(flowId: string, position?: NodePosition, options: {
    name?: string;
    pauseType?: "delay" | "rate" | "queue" | "timed";
    timeout?: string;
    timeoutUnits?: string;
  } = {}): NodeJson {
    return createNode({
      type: "delay",
      name: options.name,
      flowId,
      position,
      properties: {
        pauseType: options.pauseType ?? "delay",
        timeout: options.timeout ?? "5",
        timeoutUnits: options.timeoutUnits ?? "seconds",
        rate: "1",
        nbRateUnits: "1",
        rateUnits: "second",
        randomFirst: "1",
        randomLast: "5",
        randomUnits: "seconds",
        drop: false,
        allowrate: false,
        outputs: 1,
      },
    });
  },

  template(flowId: string, position?: NodePosition, options: {
    name?: string;
    template?: string;
    format?: string;
    syntax?: string;
  } = {}): NodeJson {
    return createNode({
      type: "template",
      name: options.name,
      flowId,
      position,
      properties: {
        field: "payload",
        fieldType: "msg",
        format: options.format ?? "handlebars",
        syntax: options.syntax ?? "mustache",
        template: options.template ?? "{{payload}}",
        output: "str",
      },
    });
  },

  link_in(flowId: string, position?: NodePosition, options: {
    name?: string;
    links?: string[];
  } = {}): NodeJson {
    return createNode({
      type: "link in",
      name: options.name,
      flowId,
      position,
      properties: {
        links: options.links ?? [],
      },
    });
  },

  link_out(flowId: string, position?: NodePosition, options: {
    name?: string;
    mode?: "link" | "return";
    links?: string[];
  } = {}): NodeJson {
    return createNode({
      type: "link out",
      name: options.name,
      flowId,
      position,
      wires: [],
      properties: {
        mode: options.mode ?? "link",
        links: options.links ?? [],
      },
    });
  },

  comment(flowId: string, position?: NodePosition, options: {
    name?: string;
    info?: string;
  } = {}): NodeJson {
    return createNode({
      type: "comment",
      name: options.name ?? "Comment",
      flowId,
      position,
      wires: [],
      properties: {
        info: options.info ?? "",
      },
    });
  },

  catch(flowId: string, position?: NodePosition, options: {
    name?: string;
    scope?: "all" | string[];
  } = {}): NodeJson {
    return createNode({
      type: "catch",
      name: options.name,
      flowId,
      position,
      properties: {
        scope: options.scope === "all" ? null : (options.scope ?? null),
        uncaught: false,
      },
    });
  },

  status(flowId: string, position?: NodePosition, options: {
    name?: string;
    scope?: "all" | string[];
  } = {}): NodeJson {
    return createNode({
      type: "status",
      name: options.name,
      flowId,
      position,
      properties: {
        scope: options.scope === "all" ? null : (options.scope ?? null),
      },
    });
  },
};

// ============================================================================
// Wire Connections
// ============================================================================

/**
 * Connect two nodes by updating the source node's wires array.
 * Returns the updated source node.
 */
export function connectNodes(
  sourceNode: NodeJson,
  targetId: string,
  sourcePort: number = 0,
): NodeJson {
  const wires = [...sourceNode.wires];
  
  // Ensure the port exists
  while (wires.length <= sourcePort) {
    wires.push([]);
  }
  
  // Add the connection if not already present
  if (!wires[sourcePort].includes(targetId)) {
    wires[sourcePort] = [...wires[sourcePort], targetId];
  }
  
  return { ...sourceNode, wires };
}

/**
 * Create a chain of connected nodes.
 * Returns all nodes with updated wire connections.
 */
export function chainNodes(nodes: NodeJson[]): NodeJson[] {
  if (nodes.length < 2) return nodes;
  
  const result: NodeJson[] = [];
  
  for (let i = 0; i < nodes.length; i++) {
    let node = nodes[i];
    
    // Connect to the next node if it exists
    if (i < nodes.length - 1) {
      node = connectNodes(node, nodes[i + 1].id, 0);
    }
    
    result.push(node);
  }
  
  return result;
}

/**
 * Auto-layout nodes vertically or horizontally.
 */
export function layoutNodes(
  nodes: NodeJson[],
  options: {
    startX?: number;
    startY?: number;
    direction?: "horizontal" | "vertical";
    spacing?: number;
  } = {},
): NodeJson[] {
  const {
    startX = DEFAULT_START_X,
    startY = DEFAULT_START_Y,
    direction = "horizontal",
    spacing = DEFAULT_NODE_SPACING,
  } = options;

  return nodes.map((node, index) => ({
    ...node,
    x: direction === "horizontal" ? startX + index * spacing : startX,
    y: direction === "vertical" ? startY + index * spacing : startY,
  }));
}

// ============================================================================
// Flow Validation
// ============================================================================

/**
 * Validate a flow configuration.
 */
export function validateFlow(flowItems: unknown[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let tabCount = 0;
  let nodeCount = 0;
  let wireCount = 0;

  if (!Array.isArray(flowItems)) {
    return {
      valid: false,
      errors: ["Flow must be an array"],
      warnings: [],
      stats: { tabCount: 0, nodeCount: 0, wireCount: 0 },
    };
  }

  const nodeIds = new Set<string>();
  const flowIds = new Set<string>();

  for (const item of flowItems) {
    if (typeof item !== "object" || item === null) {
      errors.push("Invalid flow item: not an object");
      continue;
    }

    const node = item as Record<string, unknown>;

    // Check required fields
    if (typeof node.id !== "string" || !node.id) {
      errors.push("Node missing required 'id' field");
      continue;
    }

    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node ID: ${node.id}`);
    }
    nodeIds.add(node.id);

    if (typeof node.type !== "string" || !node.type) {
      errors.push(`Node ${node.id} missing required 'type' field`);
      continue;
    }

    if (node.type === "tab") {
      tabCount++;
      flowIds.add(node.id);
      
      if (typeof node.label !== "string") {
        warnings.push(`Tab ${node.id} missing 'label' field`);
      }
    } else if (node.type === "subflow") {
      flowIds.add(node.id);
    } else {
      nodeCount++;

      // Validate position
      if (typeof node.x !== "number" || typeof node.y !== "number") {
        warnings.push(`Node ${node.id} (${node.type}) missing position (x, y)`);
      }

      // Validate flow reference
      if (typeof node.z !== "string") {
        warnings.push(`Node ${node.id} (${node.type}) missing flow reference (z)`);
      }

      // Validate wires
      if (node.wires !== undefined) {
        if (!Array.isArray(node.wires)) {
          errors.push(`Node ${node.id} (${node.type}) has invalid wires format`);
        } else {
          for (const port of node.wires as unknown[][]) {
            if (Array.isArray(port)) {
              wireCount += port.length;
              for (const targetId of port) {
                if (typeof targetId === "string" && !nodeIds.has(targetId)) {
                  // This might be a forward reference, just warn
                  // We'll do a second pass check if needed
                }
              }
            }
          }
        }
      }
    }
  }

  // Check for orphan nodes (nodes referencing non-existent flows)
  for (const item of flowItems) {
    const node = item as Record<string, unknown>;
    if (node.type !== "tab" && node.type !== "subflow" && typeof node.z === "string") {
      if (!flowIds.has(node.z) && !node.z.startsWith("subflow:")) {
        warnings.push(`Node ${node.id} references non-existent flow: ${node.z}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: { tabCount, nodeCount, wireCount },
  };
}

// ============================================================================
// Flow Analysis
// ============================================================================

export type FlowAnalysis = {
  summary: string;
  tabs: Array<{
    id: string;
    label: string;
    nodeCount: number;
    nodeTypes: Record<string, number>;
  }>;
  totalNodes: number;
  uniqueNodeTypes: string[];
  hasHttpEndpoints: boolean;
  hasMqtt: boolean;
  hasDatabase: boolean;
  inputNodes: string[];
  outputNodes: string[];
};

/**
 * Analyze a flow and provide a summary.
 */
export function analyzeFlow(flowItems: unknown[]): FlowAnalysis {
  const tabs: FlowAnalysis["tabs"] = [];
  const nodeTypeCount: Record<string, number> = {};
  const inputNodes: string[] = [];
  const outputNodes: string[] = [];
  let hasHttpEndpoints = false;
  let hasMqtt = false;
  let hasDatabase = false;

  // Group nodes by flow
  const nodesByFlow: Record<string, Array<Record<string, unknown>>> = {};

  for (const item of flowItems) {
    const node = item as Record<string, unknown>;
    if (node.type === "tab") {
      tabs.push({
        id: node.id as string,
        label: (node.label as string) || "Unnamed",
        nodeCount: 0,
        nodeTypes: {},
      });
      nodesByFlow[node.id as string] = [];
    }
  }

  for (const item of flowItems) {
    const node = item as Record<string, unknown>;
    const type = node.type as string;

    if (type === "tab" || type === "subflow") continue;

    const flowId = node.z as string;
    if (flowId && nodesByFlow[flowId]) {
      nodesByFlow[flowId].push(node);
    }

    // Count node types
    nodeTypeCount[type] = (nodeTypeCount[type] || 0) + 1;

    // Identify input/output nodes
    if (["inject", "http in", "mqtt in", "websocket in", "tcp in", "udp in", "link in"].includes(type)) {
      inputNodes.push(`${type}: ${node.name || node.id}`);
    }
    if (["debug", "http response", "mqtt out", "websocket out", "tcp out", "udp out", "link out"].includes(type)) {
      outputNodes.push(`${type}: ${node.name || node.id}`);
    }

    // Check for specific features
    if (type.startsWith("http")) hasHttpEndpoints = true;
    if (type.startsWith("mqtt")) hasMqtt = true;
    if (["mysql", "postgresql", "mongodb", "redis", "sqlite"].some((db) => type.includes(db))) {
      hasDatabase = true;
    }
  }

  // Update tab stats
  for (const tab of tabs) {
    const nodes = nodesByFlow[tab.id] || [];
    tab.nodeCount = nodes.length;
    for (const node of nodes) {
      const type = node.type as string;
      tab.nodeTypes[type] = (tab.nodeTypes[type] || 0) + 1;
    }
  }

  const totalNodes = Object.values(nodeTypeCount).reduce((a, b) => a + b, 0);
  const uniqueNodeTypes = Object.keys(nodeTypeCount).sort();

  // Generate summary
  const summaryParts: string[] = [];
  summaryParts.push(`전체 ${tabs.length}개 탭, ${totalNodes}개 노드`);
  
  if (hasHttpEndpoints) summaryParts.push("HTTP API 포함");
  if (hasMqtt) summaryParts.push("MQTT 통신 포함");
  if (hasDatabase) summaryParts.push("데이터베이스 연동 포함");

  const topTypes = Object.entries(nodeTypeCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, count]) => `${type}(${count})`)
    .join(", ");
  
  if (topTypes) {
    summaryParts.push(`주요 노드: ${topTypes}`);
  }

  return {
    summary: summaryParts.join(". "),
    tabs,
    totalNodes,
    uniqueNodeTypes,
    hasHttpEndpoints,
    hasMqtt,
    hasDatabase,
    inputNodes,
    outputNodes,
  };
}
