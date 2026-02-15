import { describe, expect, it } from "vitest";
import type { AnyAgentTool } from "../pi-tools.types.js";
import { buildCamelPlannerPrompt, buildCamelPlannerRepairPrompt } from "./prompts.js";

describe("camel prompts", () => {
  it("includes query_ai_assistant virtual tool in planner prompt", () => {
    const prompt = buildCamelPlannerPrompt({
      userPrompt: "extract data and send",
      history: "",
      tools: [],
      priorIssues: [],
    });
    expect(prompt).toContain("query_ai_assistant");
  });

  it("builds planner repair prompt with issue context", () => {
    const prompt = buildCamelPlannerRepairPrompt({
      userPrompt: "Send status update to team",
      priorIssues: [
        {
          stage: "execute",
          message: "Blocked by CaMeL policy: payload is not readable by recipient.",
          trusted: true,
        },
      ],
    });
    expect(prompt).toContain("The previous CaMeL program failed");
    expect(prompt).toContain("Return code block or JSON only.");
    expect(prompt).toContain("Send status update to team");
    expect(prompt).toContain("Blocked by CaMeL policy");
  });

  it("renders pseudo signatures for tool schemas", () => {
    const tool = {
      name: "send_email",
      description: "send an email",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string" },
          body: { type: "string" },
          urgent: { type: "boolean" },
        },
        required: ["to", "body"],
      },
    } as unknown as AnyAgentTool;
    const prompt = buildCamelPlannerPrompt({
      userPrompt: "email summary",
      history: "",
      tools: [tool],
      priorIssues: [],
    });
    expect(prompt).toContain("signature=send_email(to: str, body: str, urgent: bool = None)");
  });
});
