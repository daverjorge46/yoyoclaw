import type { IncomingMessage, ServerResponse } from "node:http";
import type { ReceiptStore } from "./receipt-store.js";

type PluginApi = {
  registerHttpRoute: (params: {
    path: string;
    handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;
  }) => void;
};

function jsonResponse(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function parseQuery(url: string): Record<string, string> {
  const idx = url.indexOf("?");
  if (idx === -1) return {};
  const params = new URLSearchParams(url.slice(idx + 1));
  return Object.fromEntries(params.entries());
}

export function registerBoltbotApi(api: PluginApi, store: ReceiptStore) {
  api.registerHttpRoute({
    path: "/boltbot/receipts",
    handler: async (req, res) => {
      const query = parseQuery(req.url ?? "");
      const limit = Math.min(Math.max(parseInt(query.limit ?? "50", 10) || 50, 1), 500);
      const offset = Math.max(parseInt(query.offset ?? "0", 10) || 0, 0);
      const receipts = await store.list({ limit, offset });
      jsonResponse(res, 200, { receipts });
    },
  });

  api.registerHttpRoute({
    path: "/boltbot/receipt",
    handler: async (req, res) => {
      const query = parseQuery(req.url ?? "");
      const id = query.id;
      if (!id) {
        jsonResponse(res, 400, { error: "missing_id" });
        return;
      }
      const receipt = await store.get(id);
      if (!receipt) {
        jsonResponse(res, 404, { error: "not_found" });
        return;
      }
      jsonResponse(res, 200, { receipt });
    },
  });

  api.registerHttpRoute({
    path: "/boltbot/stats",
    handler: async (_req, res) => {
      const stats = await store.stats();
      jsonResponse(res, 200, stats);
    },
  });
}
