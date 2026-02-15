import { describe, expect, it, vi } from "vitest";
import { createOpenClawCodingTools } from "../pi-tools.js";
import {
  classifyCamelToolMutability,
  hasExplicitCamelMutabilityRule,
  hasExplicitCamelStatePolicyRule,
} from "./policy.js";

vi.mock("../channel-tools.js", () => {
  const stubTool = (name: string) => ({
    name,
    description: `${name} stub`,
    parameters: { type: "object", properties: {} },
    execute: vi.fn(),
  });
  return {
    listChannelAgentTools: () => [stubTool("whatsapp_login")],
  };
});

describe("camel policy registry conformance", () => {
  it("covers every registered state-changing tool with explicit mutability and policy rules", () => {
    const tools = createOpenClawCodingTools({
      senderIsOwner: true,
      modelProvider: "openai",
      modelId: "gpt-4.1",
      config: {
        tools: {
          exec: {
            applyPatch: {
              enabled: true,
            },
          },
        },
      },
    });

    const names = Array.from(
      new Set(tools.map((tool) => tool.name.trim().toLowerCase()).filter(Boolean)),
    ).toSorted();

    for (const expected of [
      "write",
      "edit",
      "exec",
      "process",
      "apply_patch",
      "browser",
      "canvas",
      "nodes",
      "cron",
      "message",
      "gateway",
      "sessions_send",
      "sessions_spawn",
      "whatsapp_login",
    ]) {
      expect(names).toContain(expected);
    }

    const stateChanging = names
      .filter((name) => classifyCamelToolMutability(name, {}) === "state")
      .toSorted();

    const missingMutabilityCoverage = stateChanging.filter(
      (name) => !hasExplicitCamelMutabilityRule(name),
    );
    const missingPolicyCoverage = stateChanging.filter(
      (name) => !hasExplicitCamelStatePolicyRule(name),
    );

    expect(missingMutabilityCoverage).toEqual([]);
    expect(missingPolicyCoverage).toEqual([]);
  });
});
