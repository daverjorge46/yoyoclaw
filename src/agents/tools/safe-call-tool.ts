import { Type } from "@sinclair/typebox";
import { truncateUtf16Safe } from "../../utils.js";
import {
  type AnyAgentTool,
  jsonResult,
  readNumberParam,
  readStringArrayParam,
  readStringParam,
} from "./common.js";

const DEFAULT_MAX_CHARS = 2000;
const TRUNCATION_HINT = "提示: 用 offset 翻页查看更多";

const SafeCallToolSchema = Type.Object({
  tool: Type.String(),
  params: Type.Optional(Type.Object({}, { additionalProperties: true })),
  maxChars: Type.Optional(Type.Number({ minimum: 1 })),
  offset: Type.Optional(Type.Number({ minimum: 0 })),
  limit: Type.Optional(Type.Number({ minimum: 1 })),
  fields: Type.Optional(Type.Array(Type.String())),
});

type SafeCallToolOptions = {
  resolveTool: (name: string) => AnyAgentTool | undefined;
};

type PageResult = {
  mode: "array" | "lines";
  totalItems: number;
  hasMore: boolean;
  nextOffset?: number;
  output: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getPathValue(source: unknown, path: string[]): unknown {
  let current: unknown = source;
  for (const segment of path) {
    if (!isRecord(current) || !(segment in current)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

function setPathValue(target: Record<string, unknown>, path: string[], value: unknown) {
  let current: Record<string, unknown> = target;
  for (let index = 0; index < path.length; index += 1) {
    const key = path[index];
    if (!key) {
      return;
    }
    const isLeaf = index === path.length - 1;
    if (isLeaf) {
      current[key] = value;
      return;
    }
    const existing = current[key];
    if (!isRecord(existing)) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
}

function pickFieldsFromRecord(value: Record<string, unknown>, fields: string[]) {
  const picked: Record<string, unknown> = {};
  for (const field of fields) {
    const path = field
      .split(".")
      .map((segment) => segment.trim())
      .filter(Boolean);
    if (path.length === 0) {
      continue;
    }
    const selected = getPathValue(value, path);
    if (selected === undefined) {
      continue;
    }
    setPathValue(picked, path, selected);
  }
  return picked;
}

function applyFields(value: unknown, fields: string[] | undefined): unknown {
  if (!fields || fields.length === 0) {
    return value;
  }
  const normalized = Array.from(new Set(fields.map((field) => field.trim()).filter(Boolean)));
  if (normalized.length === 0) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) =>
      isRecord(entry) ? pickFieldsFromRecord(entry, normalized) : entry,
    );
  }
  if (isRecord(value)) {
    return pickFieldsFromRecord(value, normalized);
  }
  return value;
}

function paginateArray(items: unknown[], offset: number, limit?: number): PageResult {
  const totalItems = items.length;
  const end = typeof limit === "number" ? offset + limit : totalItems;
  const sliced = items.slice(offset, end);
  const hasMore = end < totalItems;
  return {
    mode: "array",
    totalItems,
    hasMore,
    nextOffset: hasMore ? end : undefined,
    output: sliced,
  };
}

function paginateLines(raw: string, offset: number, limit?: number): PageResult {
  const lines = raw.split(/\r?\n/);
  const totalItems = lines.length;
  const end = typeof limit === "number" ? offset + limit : totalItems;
  const sliced = lines.slice(offset, end).join("\n");
  const hasMore = end < totalItems;
  return {
    mode: "lines",
    totalItems,
    hasMore,
    nextOffset: hasMore ? end : undefined,
    output: sliced,
  };
}

function serializeOutput(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function truncateWithHeadTail(
  text: string,
  maxChars: number,
): { output: string; truncated: boolean } {
  if (text.length <= maxChars) {
    return { output: text, truncated: false };
  }
  if (maxChars <= 0) {
    return { output: "", truncated: true };
  }

  const divider = `\n...\n${TRUNCATION_HINT}\n...\n`;
  if (maxChars <= divider.length + 2) {
    return {
      output: truncateUtf16Safe(text, maxChars),
      truncated: true,
    };
  }

  const edge = Math.max(1, Math.floor((maxChars - divider.length) / 2));
  const head = truncateUtf16Safe(text, edge);
  const tail = truncateUtf16Safe(text.slice(Math.max(0, text.length - edge)), edge);
  let output = `${head}${divider}${tail}`;
  if (output.length > maxChars) {
    output = truncateUtf16Safe(output, maxChars);
  }
  return { output, truncated: true };
}

function extractPayload(result: unknown): unknown {
  if (!isRecord(result)) {
    return result;
  }
  if ("details" in result && result.details !== undefined) {
    return result.details;
  }

  const content = result.content;
  if (Array.isArray(content)) {
    const textBlocks = content
      .filter((entry) => isRecord(entry) && entry.type === "text" && typeof entry.text === "string")
      .map((entry) => String((entry as { text?: unknown }).text));
    if (textBlocks.length > 0) {
      return textBlocks.join("\n");
    }
  }

  return result;
}

export function createSafeCallTool(options: SafeCallToolOptions): AnyAgentTool {
  return {
    label: "Safe Call",
    name: "safe_call",
    description:
      "Call another tool and safely post-process its output with field filtering, pagination, and maxChars truncation.",
    parameters: SafeCallToolSchema,
    execute: async (toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const toolName = readStringParam(params, "tool", { required: true });
      if (toolName === "safe_call") {
        throw new Error("safe_call cannot wrap itself");
      }

      const target = options.resolveTool(toolName);
      if (!target) {
        throw new Error(`Unknown tool: ${toolName}`);
      }

      const targetParamsRaw = params.params;
      const targetParams = isRecord(targetParamsRaw) ? targetParamsRaw : {};
      const requestedOffset = readNumberParam(params, "offset", { integer: true }) ?? 0;
      const requestedLimit = readNumberParam(params, "limit", { integer: true });
      const requestedMaxChars = readNumberParam(params, "maxChars", { integer: true });
      const fields = readStringArrayParam(params, "fields");

      const offset = Math.max(0, requestedOffset);
      const limit =
        typeof requestedLimit === "number" && Number.isFinite(requestedLimit)
          ? Math.max(1, requestedLimit)
          : undefined;
      const maxChars =
        typeof requestedMaxChars === "number" && Number.isFinite(requestedMaxChars)
          ? Math.max(1, requestedMaxChars)
          : DEFAULT_MAX_CHARS;

      const targetResult = await target.execute(
        `${toolCallId}:safe_call:${toolName}`,
        targetParams,
      );
      const selected = applyFields(extractPayload(targetResult), fields);
      const page = Array.isArray(selected)
        ? paginateArray(selected, offset, limit)
        : paginateLines(serializeOutput(selected), offset, limit);
      const serialized = serializeOutput(page.output);
      const truncated = truncateWithHeadTail(serialized, maxChars);

      return jsonResult({
        tool: toolName,
        mode: page.mode,
        totalItems: page.totalItems,
        hasMore: page.hasMore,
        nextOffset: page.nextOffset,
        offset,
        limit: limit ?? null,
        maxChars,
        fields: fields ?? [],
        truncated: truncated.truncated,
        output: truncated.output,
      });
    },
  };
}
