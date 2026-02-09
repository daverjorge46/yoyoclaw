import { describe, it, expect, vi, beforeEach } from "vitest";
import { createExecuteNodeRedTool, NodeRedToolSchema } from "./tool.js";
import type { NodeRedToolConfig } from "./config.js";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("NodeRedToolSchema", () => {
  it("should have all required actions", () => {
    const actionEnum = NodeRedToolSchema.properties.action.enum;
    // Original actions
    expect(actionEnum).toContain("flows_get");
    expect(actionEnum).toContain("flows_deploy");
    expect(actionEnum).toContain("flow_add");
    expect(actionEnum).toContain("flow_update");
    expect(actionEnum).toContain("flows_state_get");
    expect(actionEnum).toContain("nodes_list");
    expect(actionEnum).toContain("nodes_install");
    // New actions
    expect(actionEnum).toContain("flow_create");
    expect(actionEnum).toContain("node_create");
    expect(actionEnum).toContain("nodes_connect");
    expect(actionEnum).toContain("flow_validate");
    expect(actionEnum).toContain("flow_analyze");
    expect(actionEnum).toContain("templates_list");
    expect(actionEnum).toContain("template_apply");
    expect(actionEnum).toContain("catalog_search");
    expect(actionEnum).toContain("catalog_info");
  });
});

describe("createExecuteNodeRedTool", () => {
  const defaultConfig: NodeRedToolConfig = {
    baseUrl: "http://localhost:1880",
    deploymentType: "flows",
  };

  beforeEach(() => {
    mockFetch.mockReset();
  });

  function mockResponse(data: unknown, status = 200) {
    mockFetch.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? "OK" : "Error",
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
    });
  }

  describe("flows_get action", () => {
    it("should fetch flows successfully", async () => {
      const execute = createExecuteNodeRedTool(defaultConfig);
      const mockFlows = {
        rev: "abc123",
        flows: [{ id: "flow1", type: "tab", label: "Flow 1" }],
      };
      mockResponse(mockFlows);

      const result = await execute("call-1", { action: "flows_get" });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:1880/flows",
        expect.objectContaining({ method: "GET" }),
      );
      expect(result.details).toMatchObject({
        success: true,
        rev: "abc123",
      });
    });
  });

  describe("flows_deploy action", () => {
    it("should deploy flows successfully", async () => {
      const execute = createExecuteNodeRedTool(defaultConfig);
      // Mock backup fetch
      mockResponse({ rev: "old-rev", flows: [] });
      // Mock deploy
      mockResponse({ rev: "new-rev" });

      const flows = [{ id: "flow1", type: "tab", label: "Test" }];
      const result = await execute("call-2", {
        action: "flows_deploy",
        flows,
        rev: "old-rev",
      });

      expect(result.details).toMatchObject({
        success: true,
        previousRev: "old-rev",
        newRev: "new-rev",
      });
    });

    it("should require flows parameter", async () => {
      const execute = createExecuteNodeRedTool(defaultConfig);

      const result = await execute("call-3", { action: "flows_deploy" });

      expect(result.details).toMatchObject({
        error: "flows array required for flows_deploy action",
      });
    });
  });

  describe("flow_add action", () => {
    it("should add a new flow tab", async () => {
      const execute = createExecuteNodeRedTool(defaultConfig);
      mockResponse({ id: "new-flow-id" });

      const result = await execute("call-4", {
        action: "flow_add",
        flow: { type: "tab", label: "New Flow" },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:1880/flow",
        expect.objectContaining({ method: "POST" }),
      );
      expect(result.details).toMatchObject({
        success: true,
        id: "new-flow-id",
      });
    });
  });

  describe("read-only mode", () => {
    it("should block write operations in read-only mode", async () => {
      const execute = createExecuteNodeRedTool({
        ...defaultConfig,
        readOnly: true,
      });

      const result = await execute("call-5", {
        action: "flows_deploy",
        flows: [{ id: "flow1", type: "tab" }],
      });

      expect(result.details).toMatchObject({
        error: expect.stringContaining("read-only mode"),
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should allow read operations in read-only mode", async () => {
      const execute = createExecuteNodeRedTool({
        ...defaultConfig,
        readOnly: true,
      });
      mockResponse({ rev: "abc", flows: [] });

      const result = await execute("call-6", { action: "flows_get" });

      expect(result.details).toMatchObject({ success: true });
    });
  });

  describe("error handling", () => {
    it("should handle authentication errors", async () => {
      const execute = createExecuteNodeRedTool(defaultConfig);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        headers: new Headers(),
        text: () => Promise.resolve("Unauthorized"),
      });

      const result = await execute("call-7", { action: "flows_get" });

      expect(result.details).toMatchObject({
        error: "Authentication failed",
      });
    });

    it("should handle revision conflict", async () => {
      const execute = createExecuteNodeRedTool(defaultConfig);
      // Mock backup fetch
      mockResponse({ rev: "old", flows: [] });
      // Mock deploy conflict
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        statusText: "Conflict",
        headers: new Headers(),
        text: () => Promise.resolve("Revision conflict"),
      });

      const result = await execute("call-8", {
        action: "flows_deploy",
        flows: [{ id: "t", type: "tab" }],
        rev: "wrong-rev",
      });

      expect(result.details).toMatchObject({
        error: "Revision conflict detected",
      });
    });
  });

  describe("nodes_list action", () => {
    it("should list installed nodes", async () => {
      const execute = createExecuteNodeRedTool(defaultConfig);
      mockResponse([
        { id: "node-1", name: "inject", module: "node-red", types: ["inject"] },
      ]);

      const result = await execute("call-9", { action: "nodes_list" });

      expect(result.details).toMatchObject({
        success: true,
        nodeCount: 1,
      });
    });
  });

  describe("nodes_install action", () => {
    it("should install a node module", async () => {
      const execute = createExecuteNodeRedTool(defaultConfig);
      mockResponse({ id: "node-red-contrib-test" });

      const result = await execute("call-10", {
        action: "nodes_install",
        module: "node-red-contrib-test",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:1880/nodes",
        expect.objectContaining({ method: "POST" }),
      );
      expect(result.details).toMatchObject({
        success: true,
        module: "node-red-contrib-test",
      });
    });

    it("should require module parameter", async () => {
      const execute = createExecuteNodeRedTool(defaultConfig);

      const result = await execute("call-11", { action: "nodes_install" });

      expect(result.details).toMatchObject({
        error: "module name required for nodes_install action",
      });
    });
  });

  // ========================================
  // New Flow Creation Actions Tests
  // ========================================

  describe("flow_create action", () => {
    it("should create a flow tab locally", async () => {
      const execute = createExecuteNodeRedTool(defaultConfig);

      const result = await execute("call-20", {
        action: "flow_create",
        label: "My New Flow",
      });

      expect(result.details).toMatchObject({
        success: true,
      });
      expect((result.details as any).tab.type).toBe("tab");
      expect((result.details as any).tab.label).toBe("My New Flow");
    });
  });

  describe("node_create action", () => {
    it("should create a node with factory", async () => {
      const execute = createExecuteNodeRedTool(defaultConfig);

      const result = await execute("call-21", {
        action: "node_create",
        nodeType: "inject",
        flowId: "flow-123",
        position: { x: 100, y: 200 },
      });

      expect(result.details).toMatchObject({
        success: true,
      });
      const node = (result.details as any).node;
      expect(node.type).toBe("inject");
      expect(node.z).toBe("flow-123");
      expect(node.x).toBe(100);
      expect(node.y).toBe(200);
    });

    it("should create generic node types", async () => {
      const execute = createExecuteNodeRedTool(defaultConfig);

      const result = await execute("call-22", {
        action: "node_create",
        nodeType: "custom-node",
        flowId: "flow-123",
        label: "My Custom Node",
        properties: { customProp: "value" },
      });

      expect(result.details).toMatchObject({ success: true });
      const node = (result.details as any).node;
      expect(node.type).toBe("custom-node");
      expect(node.name).toBe("My Custom Node");
      expect(node.customProp).toBe("value");
    });
  });

  describe("templates_list action", () => {
    it("should list all templates", async () => {
      const execute = createExecuteNodeRedTool(defaultConfig);

      const result = await execute("call-30", { action: "templates_list" });

      expect(result.details).toMatchObject({ success: true });
      expect((result.details as any).templateCount).toBeGreaterThan(0);
      expect((result.details as any).templates[0]).toHaveProperty("id");
      expect((result.details as any).templates[0]).toHaveProperty("name");
    });

    it("should filter by category", async () => {
      const execute = createExecuteNodeRedTool(defaultConfig);

      const result = await execute("call-31", {
        action: "templates_list",
        category: "api",
      });

      expect(result.details).toMatchObject({ success: true });
      const templates = (result.details as any).templates;
      templates.forEach((t: any) => expect(t.category).toBe("api"));
    });
  });

  describe("template_apply action", () => {
    it("should apply a template", async () => {
      const execute = createExecuteNodeRedTool(defaultConfig);

      const result = await execute("call-32", {
        action: "template_apply",
        templateId: "http-api",
        label: "My API",
        baseUrl: "/api/test",
      });

      expect(result.details).toMatchObject({ success: true });
      expect((result.details as any).flows).toBeDefined();
      expect((result.details as any).nodeCount).toBeGreaterThan(0);
    });

    it("should error on invalid template", async () => {
      const execute = createExecuteNodeRedTool(defaultConfig);

      const result = await execute("call-33", {
        action: "template_apply",
        templateId: "invalid-template",
      });

      expect(result.details).toMatchObject({
        error: expect.stringContaining("Template not found"),
      });
    });
  });

  describe("catalog_search action", () => {
    it("should list categories when no query", async () => {
      const execute = createExecuteNodeRedTool(defaultConfig);

      const result = await execute("call-40", { action: "catalog_search" });

      expect(result.details).toMatchObject({ success: true });
      expect((result.details as any).categories).toBeDefined();
    });

    it("should search by query", async () => {
      const execute = createExecuteNodeRedTool(defaultConfig);

      const result = await execute("call-41", {
        action: "catalog_search",
        query: "http",
      });

      expect(result.details).toMatchObject({ success: true });
      expect((result.details as any).resultCount).toBeGreaterThan(0);
    });
  });

  describe("catalog_info action", () => {
    it("should return node info", async () => {
      const execute = createExecuteNodeRedTool(defaultConfig);

      const result = await execute("call-42", {
        action: "catalog_info",
        nodeType: "function",
      });

      expect(result.details).toMatchObject({
        success: true,
        type: "function",
        category: "function",
      });
    });

    it("should handle unknown node type", async () => {
      const execute = createExecuteNodeRedTool(defaultConfig);

      const result = await execute("call-43", {
        action: "catalog_info",
        nodeType: "unknown-type-xyz",
      });

      expect(result.details).toMatchObject({
        success: false,
        error: expect.stringContaining("not found"),
      });
    });
  });

  describe("flow_validate action", () => {
    it("should validate a valid flow", async () => {
      const execute = createExecuteNodeRedTool(defaultConfig);

      const result = await execute("call-50", {
        action: "flow_validate",
        flows: [
          { id: "tab1", type: "tab", label: "Test" },
          { id: "n1", type: "inject", x: 100, y: 100, z: "tab1", wires: [["n2"]] },
          { id: "n2", type: "debug", x: 300, y: 100, z: "tab1", wires: [] },
        ],
      });

      expect(result.details).toMatchObject({
        success: true,
        valid: true,
      });
    });

    it("should detect errors in invalid flow", async () => {
      const execute = createExecuteNodeRedTool(defaultConfig);

      const result = await execute("call-51", {
        action: "flow_validate",
        flows: [
          { type: "inject" }, // missing id
        ],
      });

      expect(result.details).toMatchObject({
        success: true,
        valid: false,
      });
      expect((result.details as any).errors.length).toBeGreaterThan(0);
    });
  });

  describe("flow_analyze action", () => {
    it("should analyze a flow", async () => {
      const execute = createExecuteNodeRedTool(defaultConfig);

      const result = await execute("call-52", {
        action: "flow_analyze",
        flows: [
          { id: "tab1", type: "tab", label: "Test Flow" },
          { id: "n1", type: "http in", x: 100, y: 100, z: "tab1", wires: [[]] },
          { id: "n2", type: "http response", x: 300, y: 100, z: "tab1", wires: [] },
        ],
      });

      expect(result.details).toMatchObject({
        success: true,
        hasHttpEndpoints: true,
      });
    });
  });
});
