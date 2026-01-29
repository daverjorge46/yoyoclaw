import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { EigenDAReceiptStore } from "../stores/eigenda.js";
import type { ActionReceipt } from "../receipt-store.js";
import http from "node:http";

function makeReceipt(overrides: Partial<ActionReceipt> = {}): ActionReceipt {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    sessionKey: "test-session",
    tier: "medium",
    toolName: "message",
    argumentsHash: "abc123",
    resultHash: "def456",
    success: true,
    durationMs: 100,
    anomalies: [],
    ...overrides,
  };
}

describe("EigenDAReceiptStore", () => {
  let server: http.Server;
  let proxyUrl: string;
  let lastRequestBody: Buffer | null = null;
  let shouldFail = false;

  beforeEach(async () => {
    lastRequestBody = null;
    shouldFail = false;

    server = http.createServer((req, res) => {
      if (shouldFail) {
        res.destroy();
        return;
      }
      if (req.url === "/put" && req.method === "POST") {
        const chunks: Buffer[] = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", () => {
          lastRequestBody = Buffer.concat(chunks);
          // Return a mock commitment (binary data)
          const commitment = Buffer.from("deadbeef0123", "hex");
          res.writeHead(200);
          res.end(commitment);
        });
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const addr = server.address() as { port: number };
    proxyUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("sends POST /put with receipt blob", async () => {
    const store = new EigenDAReceiptStore(proxyUrl, ":memory:");
    const receipt = makeReceipt();
    await store.put(receipt);

    expect(lastRequestBody).not.toBeNull();
    const parsed = JSON.parse(lastRequestBody!.toString());
    expect(parsed.id).toBe(receipt.id);
  });

  it("sets hex daCommitment on receipt after successful DA put", async () => {
    const store = new EigenDAReceiptStore(proxyUrl, ":memory:");
    const receipt = makeReceipt();
    await store.put(receipt);

    const retrieved = await store.get(receipt.id);
    expect(retrieved?.daCommitment).toBe("deadbeef0123");
  });

  it("stores receipt locally even when DA fails", async () => {
    shouldFail = true;
    const store = new EigenDAReceiptStore(proxyUrl, ":memory:");
    const receipt = makeReceipt();

    // Should not throw
    await store.put(receipt);

    const retrieved = await store.get(receipt.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe(receipt.id);
    expect(retrieved!.daCommitment).toBeUndefined();
  });

  it("get/list/stats query from local index", async () => {
    const store = new EigenDAReceiptStore(proxyUrl, ":memory:");
    await store.put(makeReceipt({ tier: "high" }));
    await store.put(makeReceipt({ tier: "medium" }));

    const list = await store.list({ limit: 10, offset: 0 });
    expect(list).toHaveLength(2);

    const stats = await store.stats();
    expect(stats.total).toBe(2);
    expect(stats.byTier).toEqual({ high: 1, medium: 1 });
  });
});
