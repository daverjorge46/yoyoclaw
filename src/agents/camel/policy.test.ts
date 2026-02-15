import { describe, expect, it } from "vitest";
import type { CamelCapability } from "./types.js";
import {
  evaluateCamelPolicy,
  hasExplicitCamelMutabilityRule,
  hasExplicitCamelStatePolicyRule,
} from "./policy.js";

const trustedCapability: CamelCapability = {
  trusted: true,
  readers: ["user"],
  sources: ["user"],
};

const publicUntrustedCapability: CamelCapability = {
  trusted: false,
  readers: "public",
  sources: ["tool:web_fetch"],
};

const privateUntrustedCapability: CamelCapability = {
  trusted: false,
  readers: ["alice@example.com"],
  sources: ["tool:web_fetch"],
};

describe("camel policy", () => {
  it("allows read-only tools even when control dependencies are non-public", () => {
    const decision = evaluateCamelPolicy({
      toolName: "read",
      args: { path: "/tmp/data.txt" },
      controlCapability: privateUntrustedCapability,
      argCapabilities: { path: trustedCapability },
    });
    expect(decision).toEqual({ allowed: true });
  });

  it("blocks state-changing tools when control dependencies are non-public", () => {
    const decision = evaluateCamelPolicy({
      toolName: "exec",
      args: { command: "echo ok" },
      controlCapability: privateUntrustedCapability,
      argCapabilities: { command: trustedCapability },
    });
    expect(decision.allowed).toBe(false);
  });

  it("blocks exec when command field is untrusted", () => {
    const decision = evaluateCamelPolicy({
      toolName: "exec",
      args: { command: "rm -rf /tmp/demo" },
      controlCapability: publicUntrustedCapability,
      argCapabilities: { command: privateUntrustedCapability },
    });
    expect(decision.allowed).toBe(false);
  });

  it("allows exec when control is public and command is trusted", () => {
    const decision = evaluateCamelPolicy({
      toolName: "exec",
      args: { command: "echo ok" },
      controlCapability: publicUntrustedCapability,
      argCapabilities: { command: trustedCapability },
    });
    expect(decision).toEqual({ allowed: true });
  });

  it("allows message send when payload readers include recipient", () => {
    const decision = evaluateCamelPolicy({
      toolName: "message",
      args: { action: "send", to: "alice@example.com", content: "hi" },
      controlCapability: publicUntrustedCapability,
      argCapabilities: {
        to: privateUntrustedCapability,
        content: privateUntrustedCapability,
      },
    });
    expect(decision).toEqual({ allowed: true });
  });

  it("treats message action casing as read for status/read", () => {
    const decision = evaluateCamelPolicy({
      toolName: "message",
      args: { action: "READ", to: "alice@example.com" },
      controlCapability: privateUntrustedCapability,
      argCapabilities: {},
    });
    expect(decision).toEqual({ allowed: true });
  });

  it("blocks message send when payload readers exclude recipient", () => {
    const decision = evaluateCamelPolicy({
      toolName: "message",
      args: { action: "send", to: "bob@example.com", content: "private" },
      controlCapability: publicUntrustedCapability,
      argCapabilities: {
        to: privateUntrustedCapability,
        content: privateUntrustedCapability,
      },
    });
    expect(decision.allowed).toBe(false);
  });

  it("allows query_ai_assistant as no-side-effect helper", () => {
    const decision = evaluateCamelPolicy({
      toolName: "query_ai_assistant",
      args: { query: "extract recipient", input: "raw text" },
      controlCapability: privateUntrustedCapability,
      argCapabilities: {
        query: privateUntrustedCapability,
        input: privateUntrustedCapability,
      },
    });
    expect(decision).toEqual({ allowed: true });
  });

  it("denies unknown state-changing tools by default", () => {
    const decision = evaluateCamelPolicy({
      toolName: "custom_mutation_tool",
      args: { value: "x" },
      controlCapability: publicUntrustedCapability,
      argCapabilities: { value: trustedCapability },
    });
    expect(decision.allowed).toBe(false);
  });

  it("treats gateway config.get as read-only", () => {
    const decision = evaluateCamelPolicy({
      toolName: "gateway",
      args: { action: "config.get" },
      controlCapability: privateUntrustedCapability,
      argCapabilities: {},
    });
    expect(decision).toEqual({ allowed: true });
  });

  it("blocks gateway config.patch when raw config is untrusted", () => {
    const decision = evaluateCamelPolicy({
      toolName: "gateway",
      args: { action: "config.patch", raw: '{"agents":{"defaults":{"runtimeEngine":"pi"}}}' },
      controlCapability: publicUntrustedCapability,
      argCapabilities: {
        raw: privateUntrustedCapability,
      },
    });
    expect(decision.allowed).toBe(false);
  });

  it("treats browser snapshot as read-only", () => {
    const decision = evaluateCamelPolicy({
      toolName: "browser",
      args: { action: "snapshot", targetUrl: "https://example.com" },
      controlCapability: privateUntrustedCapability,
      argCapabilities: {
        targetUrl: privateUntrustedCapability,
      },
    });
    expect(decision).toEqual({ allowed: true });
  });

  it("blocks browser navigate when URL is untrusted", () => {
    const decision = evaluateCamelPolicy({
      toolName: "browser",
      args: { action: "navigate", targetUrl: "https://example.com" },
      controlCapability: publicUntrustedCapability,
      argCapabilities: {
        targetUrl: privateUntrustedCapability,
      },
    });
    expect(decision.allowed).toBe(false);
  });

  it("blocks sessions_spawn when prompt is untrusted", () => {
    const decision = evaluateCamelPolicy({
      toolName: "sessions_spawn",
      args: { message: "please run this task" },
      controlCapability: publicUntrustedCapability,
      argCapabilities: {
        message: privateUntrustedCapability,
      },
    });
    expect(decision.allowed).toBe(false);
  });

  it("treats cron status as read-only", () => {
    const decision = evaluateCamelPolicy({
      toolName: "cron",
      args: { action: "status" },
      controlCapability: privateUntrustedCapability,
      argCapabilities: {},
    });
    expect(decision).toEqual({ allowed: true });
  });

  it("blocks cron add when job payload is untrusted", () => {
    const decision = evaluateCamelPolicy({
      toolName: "cron",
      args: { action: "add", job: { payload: "x" } },
      controlCapability: publicUntrustedCapability,
      argCapabilities: {
        job: privateUntrustedCapability,
      },
    });
    expect(decision.allowed).toBe(false);
  });

  it("treats whatsapp_login wait as read-only", () => {
    const decision = evaluateCamelPolicy({
      toolName: "whatsapp_login",
      args: { action: "wait" },
      controlCapability: privateUntrustedCapability,
      argCapabilities: {},
    });
    expect(decision).toEqual({ allowed: true });
  });

  it("blocks whatsapp_login start when action field is untrusted", () => {
    const decision = evaluateCamelPolicy({
      toolName: "whatsapp_login",
      args: { action: "start" },
      controlCapability: publicUntrustedCapability,
      argCapabilities: {
        action: privateUntrustedCapability,
      },
    });
    expect(decision.allowed).toBe(false);
  });

  it("exposes explicit mutability and policy coverage for whatsapp_login", () => {
    expect(hasExplicitCamelMutabilityRule("whatsapp_login")).toBe(true);
    expect(hasExplicitCamelStatePolicyRule("whatsapp_login")).toBe(true);
  });
});
