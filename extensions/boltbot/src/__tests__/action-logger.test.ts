import { describe, it, expect, vi, beforeEach } from "vitest";
import { createActionLogger } from "../action-logger.js";
import type { ReceiptStore, ActionReceipt } from "../receipt-store.js";

function makeStore(): ReceiptStore & { receipts: ActionReceipt[] } {
  const receipts: ActionReceipt[] = [];
  return {
    receipts,
    async put(receipt: ActionReceipt) { receipts.push(receipt); },
    async get(id: string) { return receipts.find((r) => r.id === id) ?? null; },
    async list() { return receipts as any; },
    async stats() { return { total: receipts.length, byTier: {}, anomalyCount: 0 }; },
  };
}

describe("action-logger", () => {
  let store: ReturnType<typeof makeStore>;
  let logger: ReturnType<typeof createActionLogger>;

  beforeEach(() => {
    store = makeStore();
    logger = createActionLogger(store);
  });

  it("stores receipt for high-tier tool (exec)", async () => {
    await logger(
      { toolName: "exec", params: { command: "ls" }, durationMs: 50 },
      { sessionKey: "sess-1", toolName: "exec" },
    );
    expect(store.receipts).toHaveLength(1);
    expect(store.receipts[0].tier).toBe("high");
    expect(store.receipts[0].toolName).toBe("exec");
  });

  it("stores receipt for medium-tier tool (message)", async () => {
    await logger(
      { toolName: "message", params: { to: "user", content: "hi" }, durationMs: 30 },
      { sessionKey: "sess-2", toolName: "message" },
    );
    expect(store.receipts).toHaveLength(1);
    expect(store.receipts[0].tier).toBe("medium");
  });

  it("skips low-tier tools (web_search)", async () => {
    await logger(
      { toolName: "web_search", params: { q: "test" }, durationMs: 10 },
      { sessionKey: "sess-3", toolName: "web_search" },
    );
    expect(store.receipts).toHaveLength(0);
  });

  it("includes anomalies in receipt", async () => {
    await logger(
      { toolName: "message", params: { to: "user", content: "hi", bcc: "evil@bad.com" }, durationMs: 20 },
      { sessionKey: "sess-4", toolName: "message" },
    );
    expect(store.receipts[0].anomalies).toContain("unexpected_recipient");
  });

  it("uses ctx.sessionKey (not sessionId)", async () => {
    await logger(
      { toolName: "exec", params: { command: "echo hi" }, durationMs: 5 },
      { sessionKey: "my-session-key", toolName: "exec" },
    );
    expect(store.receipts[0].sessionKey).toBe("my-session-key");
  });

  it("defaults sessionKey to unknown when missing", async () => {
    await logger(
      { toolName: "exec", params: { command: "echo" }, durationMs: 5 },
      { toolName: "exec" } as any,
    );
    expect(store.receipts[0].sessionKey).toBe("unknown");
  });

  it("creates receipt with valid id and timestamp", async () => {
    await logger(
      { toolName: "exec", params: { command: "pwd" }, durationMs: 1 },
      { sessionKey: "s", toolName: "exec" },
    );
    const r = store.receipts[0];
    expect(r.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(new Date(r.timestamp).getTime()).not.toBeNaN();
  });

  it("hashes arguments and result", async () => {
    await logger(
      { toolName: "exec", params: { command: "ls" }, result: { output: "files" }, durationMs: 1 },
      { sessionKey: "s", toolName: "exec" },
    );
    const r = store.receipts[0];
    expect(r.argumentsHash).toMatch(/^[0-9a-f]{64}$/);
    expect(r.resultHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("marks error results as not successful", async () => {
    await logger(
      { toolName: "exec", params: { command: "fail" }, error: "boom", durationMs: 1 },
      { sessionKey: "s", toolName: "exec" },
    );
    expect(store.receipts[0].success).toBe(false);
  });

  it("does not throw when store.put fails (fire-and-forget)", async () => {
    const failStore: ReceiptStore = {
      async put() { throw new Error("disk full"); },
      async get() { return null; },
      async list() { return [] as any; },
      async stats() { return { total: 0, byTier: {}, anomalyCount: 0 }; },
    };
    const failLogger = createActionLogger(failStore);
    // Should not throw
    await failLogger(
      { toolName: "exec", params: { command: "ls" }, durationMs: 1 },
      { sessionKey: "s", toolName: "exec" },
    );
  });
});
