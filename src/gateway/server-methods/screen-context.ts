import AjvPkg from "ajv";
import {
  type ScreenContextData,
  type ScreenContextGetParams,
  ScreenContextGetParamsSchema,
  type ScreenContextUpdateParams,
  ScreenContextUpdateParamsSchema,
} from "../protocol/schema/screen-context.js";
import { ErrorCodes, errorShape, formatValidationErrors } from "../protocol/index.js";
import type { GatewayRequestHandlers } from "./types.js";

const ajv = new (AjvPkg as unknown as new (opts?: object) => import("ajv").default)({
  allErrors: true,
  strict: false,
  removeAdditional: false,
});

const validateScreenContextUpdateParams = ajv.compile<ScreenContextUpdateParams>(
  ScreenContextUpdateParamsSchema,
);
const validateScreenContextGetParams = ajv.compile<ScreenContextGetParams>(
  ScreenContextGetParamsSchema,
);

// In-memory storage for screen context by session key
const screenContextStore = new Map<string, ScreenContextData>();

// Maximum age for screen context data (5 minutes)
const MAX_CONTEXT_AGE_MS = 5 * 60 * 1000;

export function getSessionScreenContext(sessionKey: string): ScreenContextData | null {
  const ctx = screenContextStore.get(sessionKey);
  if (!ctx) return null;

  // Check if context is stale
  const age = Date.now() - ctx.updatedAt;
  if (age > MAX_CONTEXT_AGE_MS) {
    screenContextStore.delete(sessionKey);
    return null;
  }

  return ctx;
}

export function formatScreenContextForAgent(ctx: ScreenContextData): string {
  const lines: string[] = [];
  lines.push("<screen-context>");

  if (ctx.app) {
    lines.push(`  <app>${escapeXml(ctx.app)}</app>`);
  }
  if (ctx.title) {
    lines.push(`  <window-title>${escapeXml(ctx.title)}</window-title>`);
  }
  if (ctx.text) {
    // Truncate very long text to avoid overwhelming the context
    const maxTextLength = 4000;
    const truncatedText =
      ctx.text.length > maxTextLength ? ctx.text.slice(0, maxTextLength) + "..." : ctx.text;
    lines.push(`  <visible-content>`);
    lines.push(escapeXml(truncatedText));
    lines.push(`  </visible-content>`);
  }

  lines.push("</screen-context>");
  return lines.join("\n");
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const screenContextHandlers: GatewayRequestHandlers = {
  "screen_context.update": ({ params, respond }) => {
    if (!validateScreenContextUpdateParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid screen_context.update params: ${formatValidationErrors(validateScreenContextUpdateParams.errors)}`,
        ),
      );
      return;
    }

    const p = params as ScreenContextUpdateParams;
    const now = Date.now();

    const contextData: ScreenContextData = {
      app: p.app,
      title: p.title,
      text: p.text,
      timestamp: p.timestamp,
      updatedAt: now,
    };

    screenContextStore.set(p.sessionKey, contextData);

    respond(true, { ok: true });
  },

  "screen_context.get": ({ params, respond }) => {
    if (!validateScreenContextGetParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid screen_context.get params: ${formatValidationErrors(validateScreenContextGetParams.errors)}`,
        ),
      );
      return;
    }

    const p = params as ScreenContextGetParams;
    const ctx = getSessionScreenContext(p.sessionKey);

    if (!ctx) {
      respond(true, { found: false, context: null });
      return;
    }

    respond(true, {
      found: true,
      context: {
        app: ctx.app,
        title: ctx.title,
        text: ctx.text,
        timestamp: ctx.timestamp,
      },
    });
  },
};
