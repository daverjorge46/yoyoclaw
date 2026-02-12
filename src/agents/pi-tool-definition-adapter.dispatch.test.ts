import type { AgentTool } from "@mariozechner/pi-agent-core";
import { describe, expect, it, vi } from "vitest";
import { toToolDefinitions } from "./pi-tool-definition-adapter.js";
import { wrapToolWithAbortSignal } from "./pi-tools.abort.js";
import { wrapToolWithBeforeToolCallHook } from "./pi-tools.before-tool-call.js";

/**
 * Regression tests for issue #14954:
 * Plugin tool execute() never reached — TypeError: fetch failed in dispatch layer.
 *
 * Root cause: splitToolExecuteArgs misrouted the 5th arg (ExtensionContext)
 * into the signal slot when both signal and onUpdate were undefined,
 * because the fallback "current format" branch assumed a parameter order
 * that didn't match the actual ToolDefinition.execute signature.
 */
describe("plugin tool dispatch chain — #14954", () => {
  function makePluginTool(executeFn?: (...args: unknown[]) => Promise<unknown>) {
    return {
      name: "atlas_status",
      label: "Atlas Status",
      description: "Get server status",
      parameters: { type: "object" as const, properties: {} },
      execute:
        executeFn ??
        (async () => ({
          content: [{ type: "text" as const, text: "OK" }],
          details: {},
        })),
    } satisfies AgentTool<unknown, unknown>;
  }

  it("reaches plugin execute through full wrapping chain (signal+onUpdate defined)", async () => {
    const canary = vi.fn();
    const tool = makePluginTool(async () => {
      canary();
      return { content: [{ type: "text", text: "ok" }], details: {} };
    });

    const withHook = wrapToolWithBeforeToolCallHook(tool, { agentId: "main" });
    const ac = new AbortController();
    const withAbort = wrapToolWithAbortSignal(withHook, ac.signal);
    const [def] = toToolDefinitions([withAbort]);

    // Simulate wrapRegisteredTool: 5 args including ExtensionContext
    await def.execute("c1", {}, ac.signal, () => {}, {} as never);
    expect(canary).toHaveBeenCalledOnce();
  });

  it("reaches plugin execute when signal and onUpdate are both undefined (#14954)", async () => {
    const canary = vi.fn();
    const tool = makePluginTool(async () => {
      canary();
      return { content: [{ type: "text", text: "ok" }], details: {} };
    });

    const [def] = toToolDefinitions([tool]);

    // This is the exact scenario that triggered #14954:
    // wrapRegisteredTool passes (id, params, undefined, undefined, ctx)
    // Previously, splitToolExecuteArgs misrouted ctx into the signal slot.
    const fakeCtx = { cwd: "/tmp", sessionManager: {}, model: {} };
    await def.execute("c1", {}, undefined, undefined, fakeCtx as never);
    expect(canary).toHaveBeenCalledOnce();
  });

  it("does not leak ExtensionContext into signal parameter (#14954)", async () => {
    let receivedSignal: unknown = "SENTINEL";
    const tool = makePluginTool(async (_id, _params, signal) => {
      receivedSignal = signal;
      return { content: [{ type: "text", text: "ok" }], details: {} };
    });

    const [def] = toToolDefinitions([tool]);
    const fakeCtx = { cwd: "/tmp", sessionManager: {} };
    await def.execute("c1", {}, undefined, undefined, fakeCtx as never);

    // signal must be undefined, NOT the ExtensionContext object
    expect(receivedSignal).toBeUndefined();
  });

  it("correctly passes real AbortSignal through the chain", async () => {
    let receivedSignal: unknown;
    const tool = makePluginTool(async (_id, _params, signal) => {
      receivedSignal = signal;
      return { content: [{ type: "text", text: "ok" }], details: {} };
    });

    const ac = new AbortController();
    const [def] = toToolDefinitions([tool]);
    await def.execute("c1", {}, ac.signal, undefined, {} as never);

    expect(receivedSignal).toBe(ac.signal);
  });

  it("correctly passes onUpdate callback through the chain", async () => {
    let receivedOnUpdate: unknown;
    const tool = makePluginTool(async (_id, _params, _signal, onUpdate) => {
      receivedOnUpdate = onUpdate;
      return { content: [{ type: "text", text: "ok" }], details: {} };
    });

    const cb = () => {};
    const [def] = toToolDefinitions([tool]);
    await def.execute("c1", {}, undefined, cb, {} as never);

    expect(receivedOnUpdate).toBe(cb);
  });
});
