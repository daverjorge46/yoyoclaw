import { describe, expect, it } from "vitest";

import {
  generateSkillFromMcpServer,
  parseMcpToolListing,
  type McpServerInfo,
} from "./mcp-bridge.js";

describe("mcp-bridge", () => {
  const sampleServer: McpServerInfo = {
    name: "test-server",
    version: "1.0",
    tools: [
      {
        name: "get_data",
        description: "Fetch data from source",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
            limit: { type: "number", description: "Max results" },
          },
          required: ["query"],
        },
      },
      {
        name: "post_data",
        description: "Send data to destination",
      },
    ],
  };

  describe("generateSkillFromMcpServer", () => {
    it("generates valid SKILL.md content", () => {
      const content = generateSkillFromMcpServer(sampleServer);
      expect(content).toContain("name: mcp-test-server");
      expect(content).toContain("test-server");
      expect(content).toContain("get_data");
      expect(content).toContain("post_data");
      expect(content).toContain("Search query");
    });

    it("includes version in metadata", () => {
      const content = generateSkillFromMcpServer(sampleServer);
      expect(content).toContain('"version":"0.1.0"');
    });

    it("handles empty tools list", () => {
      const content = generateSkillFromMcpServer({ name: "empty", tools: [] });
      expect(content).toContain("name: mcp-empty");
      expect(content).toContain("## Available Tools");
    });
  });

  describe("parseMcpToolListing", () => {
    it("parses valid JSON tool listing", () => {
      const json = {
        tools: [{ name: "tool1", description: "desc1" }, { name: "tool2" }],
        version: "2.0",
      };
      const result = parseMcpToolListing(json, "my-server");
      expect(result.name).toBe("my-server");
      expect(result.version).toBe("2.0");
      expect(result.tools).toHaveLength(2);
      expect(result.tools[0].name).toBe("tool1");
    });

    it("handles null/undefined input", () => {
      const result = parseMcpToolListing(null, "fallback");
      expect(result.name).toBe("fallback");
      expect(result.tools).toHaveLength(0);
    });

    it("handles malformed tools array", () => {
      const result = parseMcpToolListing({ tools: [null, "bad", {}] }, "srv");
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].name).toBe("unknown");
    });

    it("preserves inputSchema when valid", () => {
      const result = parseMcpToolListing(
        {
          tools: [
            {
              name: "foo",
              inputSchema: {
                type: "object",
                properties: { bar: { type: "string" } },
                required: ["bar"],
              },
            },
          ],
        },
        "test",
      );
      expect(result.tools[0].inputSchema?.properties?.bar?.type).toBe("string");
      expect(result.tools[0].inputSchema?.required).toEqual(["bar"]);
    });

    it("handles missing version field", () => {
      const result = parseMcpToolListing({ tools: [] }, "no-ver");
      expect(result.version).toBeUndefined();
    });
  });

  describe("generateSkillFromMcpServer edge cases", () => {
    it("sanitizes server name with special characters", () => {
      const content = generateSkillFromMcpServer({
        name: "My Server @v2!",
        tools: [],
      });
      expect(content).toContain("name: mcp-my-server--v2-");
    });

    it("handles tools with no parameters", () => {
      const content = generateSkillFromMcpServer({
        name: "simple",
        tools: [{ name: "ping", description: "Ping" }],
      });
      expect(content).toContain("(no parameters)");
    });

    it("shows (+N more) for servers with many tools", () => {
      const tools = Array.from({ length: 5 }, (_, i) => ({
        name: `tool_${i}`,
        description: `Tool ${i}`,
      }));
      const content = generateSkillFromMcpServer({ name: "big", tools });
      expect(content).toContain("(+2 more)");
    });
  });
});
