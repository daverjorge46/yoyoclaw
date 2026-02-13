import type { AgentTool } from "@mariozechner/pi-agent-core";
import { describe, expect, it } from "vitest";
import { splitSdkTools } from "./tool-split.js";

function makeTool(name: string): AgentTool {
  return {
    name,
    description: `${name} tool`,
    parameters: { type: "object", properties: {}, required: [] },
    execute: async () => ({
      content: [{ type: "text", text: "ok" }],
      isError: false,
    }),
  } as unknown as AgentTool;
}

describe("splitSdkTools", () => {
  it("builds tool definitions in deterministic name order", () => {
    const tools = [makeTool("zeta"), makeTool("Alpha"), makeTool("beta")];

    const first = splitSdkTools({ tools, sandboxEnabled: false }).customTools.map((t) => t.name);
    const second = splitSdkTools({
      tools: tools.toReversed(),
      sandboxEnabled: false,
    }).customTools.map((t) => t.name);

    expect(first).toEqual(["Alpha", "beta", "zeta"]);
    expect(second).toEqual(first);
  });

  it("does not mutate caller tool order", () => {
    const tools = [makeTool("exec"), makeTool("read"), makeTool("write")];

    splitSdkTools({ tools, sandboxEnabled: false });

    expect(tools.map((tool) => tool.name)).toEqual(["exec", "read", "write"]);
  });
});
