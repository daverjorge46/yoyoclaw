import { describe, it, expect, beforeEach } from "vitest";
import { registerBoltbotApi } from "../api.js";
import type { ActionReceipt, ReceiptStore } from "../receipt-store.js";
import type { IncomingMessage, ServerResponse } from "node:http";

// Mock ReceiptStore
function makeStore(receipts: ActionReceipt[] = []): ReceiptStore {
  return {
    async put(r: ActionReceipt) { receipts.push(r); },
    async get(id: string) { return receipts.find((r) => r.id === id) ?? null; },
    async list(opts: { limit: number; offset: number }) {
      return receipts.slice(opts.offset, opts.offset + opts.limit);
    },
    async stats() {
      const byTier: Record<string, number> = {};
      let anomalyCount = 0;
      for (const r of receipts) {
        byTier[r.tier] = (byTier[r.tier] ?? 0) + 1;
        if (r.anomalies.length > 0) anomalyCount++;
      }
      return { total: receipts.length, byTier, anomalyCount };
    },
  };
}

// Mock API and capture registered routes
type Route = { path: string; handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void> };

function makeApi() {
  const routes: Route[] = [];
  return {
    routes,
    registerHttpRoute(route: Route) { routes.push(route); },
  };
}

// Mock HTTP request/response
function mockReq(url: string): IncomingMessage {
  return { url } as any;
}

function mockRes() {
  let statusCode = 200;
  let headers: Record<string, string> = {};
  let body = "";
  return {
    writeHead(code: number, h: Record<string, string>) { statusCode = code; headers = h; },
    end(data?: string) { body = data ?? ""; },
    get statusCode() { return statusCode; },
    get headers() { return headers; },
    get body() { return body; },
    json() { return JSON.parse(body); },
  } as any;
}

const sampleReceipt: ActionReceipt = {
  id: "test-id-1",
  timestamp: "2026-01-29T00:00:00.000Z",
  sessionKey: "sess-1",
  tier: "medium",
  toolName: "message",
  argumentsHash: "abc",
  resultHash: "def",
  success: true,
  durationMs: 100,
  anomalies: [],
};

describe("Dashboard API", () => {
  let api: ReturnType<typeof makeApi>;
  let store: ReceiptStore;

  beforeEach(() => {
    api = makeApi();
    store = makeStore([sampleReceipt]);
    registerBoltbotApi(api as any, store);
  });

  it("registers 3 routes", () => {
    expect(api.routes).toHaveLength(3);
  });

  describe("/boltbot/receipts", () => {
    it("returns receipts list", async () => {
      const route = api.routes.find((r) => r.path === "/boltbot/receipts")!;
      const res = mockRes();
      await route.handler(mockReq("/boltbot/receipts"), res);
      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.receipts).toHaveLength(1);
    });

    it("respects pagination params", async () => {
      const route = api.routes.find((r) => r.path === "/boltbot/receipts")!;
      const res = mockRes();
      await route.handler(mockReq("/boltbot/receipts?limit=5&offset=0"), res);
      expect(res.statusCode).toBe(200);
    });
  });

  describe("/boltbot/receipt", () => {
    it("returns receipt by id", async () => {
      const route = api.routes.find((r) => r.path === "/boltbot/receipt")!;
      const res = mockRes();
      await route.handler(mockReq("/boltbot/receipt?id=test-id-1"), res);
      expect(res.statusCode).toBe(200);
      expect(res.json().receipt.id).toBe("test-id-1");
    });

    it("returns 400 for missing id", async () => {
      const route = api.routes.find((r) => r.path === "/boltbot/receipt")!;
      const res = mockRes();
      await route.handler(mockReq("/boltbot/receipt"), res);
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe("missing_id");
    });

    it("returns 404 for nonexistent id", async () => {
      const route = api.routes.find((r) => r.path === "/boltbot/receipt")!;
      const res = mockRes();
      await route.handler(mockReq("/boltbot/receipt?id=nonexistent"), res);
      expect(res.statusCode).toBe(404);
      expect(res.json().error).toBe("not_found");
    });
  });

  describe("/boltbot/stats", () => {
    it("returns stats", async () => {
      const route = api.routes.find((r) => r.path === "/boltbot/stats")!;
      const res = mockRes();
      await route.handler(mockReq("/boltbot/stats"), res);
      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.total).toBe(1);
      expect(data.byTier).toEqual({ medium: 1 });
      expect(data.anomalyCount).toBe(0);
    });
  });

  it("all responses have Content-Type application/json", async () => {
    for (const route of api.routes) {
      const res = mockRes();
      await route.handler(mockReq(route.path), res);
      expect(res.headers["Content-Type"]).toBe("application/json");
    }
  });
});
