import { randomUUID } from "node:crypto";
import { createServer as createHttpServer, type Server as HttpServer } from "node:http";
import type { IncomingMessage } from "node:http";
import type { WebSocketServer } from "ws";

import { getChildLogger } from "../logging.js";
import { CANVAS_HOST_PATH } from "../canvas-host/a2ui.js";
import type { CanvasHostHandler } from "../canvas-host/server.js";

import {
  extractHookToken,
  readJsonBody,
  type HooksConfigResolved,
  normalizeWakePayload,
  normalizeAgentPayload,
} from "./hooks.js";
import {
  applyHookMappings,
} from "./hooks-mapping.js";
import {
  type ControlUiRequestOptions,
  handleControlUiHttpRequest,
} from "./control-ui.js";
import type { SubsystemLogger } from "./server-providers.js";

export type HandleHooksRequestDeps = {
  hooksConfig: HooksConfigResolved | null;
  bindHost: string;
  port: number;
  logHooks: SubsystemLogger;
  dispatchWakeHook: (value: { text: string; mode: "now" | "next-heartbeat" }) => void;
  dispatchAgentHook: (value: {
    message: string;
    name: string;
    wakeMode: "now" | "next-heartbeat";
    sessionKey: string;
    deliver: boolean;
    channel: "last" | "whatsapp" | "telegram" | "discord" | "signal" | "imessage";
    to?: string;
    thinking?: string;
    timeoutSeconds?: number;
  }) => string;
};

export type CreateGatewayHttpServerDeps = {
  canvasHost: CanvasHostHandler | null;
  controlUiEnabled: boolean;
  controlUiBasePath: string;
  handleHooksRequest: (
    req: IncomingMessage,
    res: import("node:http").ServerResponse,
  ) => Promise<boolean>;
};

export function sendJson(
  res: import("node:http").ServerResponse,
  status: number,
  body: unknown,
) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

export function sendJson404(res: import("node:http").ServerResponse) {
  res.statusCode = 404;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("Not Found");
}

export function createHooksRequestHandler(deps: HandleHooksRequestDeps) {
  const { hooksConfig, bindHost, port, logHooks, dispatchWakeHook, dispatchAgentHook } = deps;

  const handleHooksRequest = async (
    req: IncomingMessage,
    res: import("node:http").ServerResponse,
  ): Promise<boolean> => {
    if (!hooksConfig) return false;
    const url = new URL(req.url ?? "/", `http://${bindHost}:${port}`);
    const basePath = hooksConfig.basePath;
    if (url.pathname !== basePath && !url.pathname.startsWith(`${basePath}/`)) {
      return false;
    }

    const token = extractHookToken(req, url);
    if (!token || token !== hooksConfig.token) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Unauthorized");
      return true;
    }

    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("Allow", "POST");
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Method Not Allowed");
      return true;
    }

    const subPath = url.pathname.slice(basePath.length).replace(/^\/+/, "");
    if (!subPath) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Not Found");
      return true;
    }

    const body = await readJsonBody(req, hooksConfig.maxBodyBytes);
    if (!body.ok) {
      const status = body.error === "payload too large" ? 413 : 400;
      sendJson(res, status, { ok: false, error: body.error });
      return true;
    }

    const payload = typeof body.value === "object" && body.value !== null ? body.value : {};
    const headers = normalizeHookHeaders(req);

    if (subPath === "wake") {
      const normalized = normalizeWakePayload(payload as Record<string, unknown>);
      if (!normalized.ok) {
        sendJson(res, 400, { ok: false, error: normalized.error });
        return true;
      }
      dispatchWakeHook(normalized.value);
      sendJson(res, 200, { ok: true, mode: normalized.value.mode });
      return true;
    }

    if (subPath === "agent") {
      const normalized = normalizeAgentPayload(payload as Record<string, unknown>);
      if (!normalized.ok) {
        sendJson(res, 400, { ok: false, error: normalized.error });
        return true;
      }
      const runId = dispatchAgentHook(normalized.value);
      sendJson(res, 202, { ok: true, runId });
      return true;
    }

    if (hooksConfig.mappings.length > 0) {
      try {
        const mapped = await applyHookMappings(hooksConfig.mappings, {
          payload: payload as Record<string, unknown>,
          headers,
          url,
          path: subPath,
        });
        if (mapped) {
          if (!mapped.ok) {
            sendJson(res, 400, { ok: false, error: mapped.error });
            return true;
          }
          if (mapped.action === null) {
            sendJson(res, 204, {});
            return true;
          }
          if (mapped.action.kind === "wake") {
            dispatchWakeHook({
              text: mapped.action.text,
              mode: mapped.action.mode,
            });
            sendJson(res, 200, { ok: true, mode: mapped.action.mode });
            return true;
          }
          const runId = dispatchAgentHook({
            message: mapped.action.message,
            name: mapped.action.name ?? "Hook",
            wakeMode: mapped.action.wakeMode,
            sessionKey: mapped.action.sessionKey ?? `hook:${randomUUID()}`,
            deliver: mapped.action.deliver === true,
            channel: mapped.action.channel ?? "last",
            to: mapped.action.to,
            thinking: mapped.action.thinking,
            timeoutSeconds: mapped.action.timeoutSeconds,
          });
          sendJson(res, 202, { ok: true, runId });
          return true;
        }
      } catch (err) {
        logHooks.warn(`hook mapping failed: ${String(err)}`);
        sendJson(res, 500, { ok: false, error: "hook mapping failed" });
        return true;
      }
    }

    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Not Found");
    return true;
  };

  return handleHooksRequest;
}

export function createGatewayHttpServer(deps: CreateGatewayHttpServerDeps): HttpServer {
  const { canvasHost, controlUiEnabled, controlUiBasePath, handleHooksRequest } = deps;

  const httpServer: HttpServer = createHttpServer((req, res) => {
    if (String(req.headers.upgrade ?? "").toLowerCase() === "websocket") return;

    void (async () => {
      if (await handleHooksRequest(req, res)) return;
      if (canvasHost) {
        if (await canvasHost.handleHttpRequest(req, res)) return;
      }
      if (controlUiEnabled) {
        if (handleControlUiHttpRequest(req, res, { basePath: controlUiBasePath })) return;
      }

      sendJson404(res);
    })().catch((err) => {
      res.statusCode = 500;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end(String(err));
    });
  });

  return httpServer;
}

export function attachGatewayUpgradeHandler(deps: {
  httpServer: HttpServer;
  wss: WebSocketServer;
  canvasHost: CanvasHostHandler | null;
}): void {
  const { httpServer, wss, canvasHost } = deps;

  httpServer.on("upgrade", (req, socket, head) => {
    const urlRaw = req.url;
    if (!urlRaw) {
      socket.destroy();
      return;
    }

    const url = new URL(urlRaw, "http://localhost");

    if (url.pathname === CANVAS_HOST_PATH || url.pathname.startsWith(`${CANVAS_HOST_PATH}/`)) {
      if (canvasHost) {
        canvasHost.handleUpgrade(req, socket, head);
        return;
      }
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws, req) => {
      wss.emit("connection", ws, req);
    });
  });
}

function normalizeHookHeaders(req: IncomingMessage) {
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") {
      headers[key.toLowerCase()] = value;
    } else if (Array.isArray(value) && value.length > 0) {
      headers[key.toLowerCase()] = value.join(", ");
    }
  }
  return headers;
}
