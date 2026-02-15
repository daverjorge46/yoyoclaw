import type { AgentToolResult } from "@mariozechner/pi-agent-core";
import type { Api, AssistantMessage, Message, Model, UserMessage } from "@mariozechner/pi-ai";
import { completeSimple } from "@mariozechner/pi-ai";
import type { AnyAgentTool } from "../pi-tools.types.js";
import type {
  CamelCapability,
  CamelEvalMode,
  CamelExecutionEvent,
  CamelPlannerSourceLocation,
  CamelSchemaField,
  CamelSchemaFieldType,
  CamelPlannerIssue,
  CamelPlannerProgram,
  CamelPlannerStep,
  CamelRuntimeValue,
  CamelStructuredSchema,
} from "./types.js";
import { emitAgentEvent } from "../../infra/agent-events.js";
import {
  isMessagingTool,
  isMessagingToolSendAction,
  type MessagingToolSend,
} from "../pi-embedded-messaging.js";
import {
  extractMessagingToolSend,
  extractToolErrorMessage,
  extractToolResultText,
  isToolResultError,
  sanitizeToolResult,
} from "../pi-embedded-subscribe.tools.js";
import { inferToolMetaFromArgs } from "../pi-embedded-utils.js";
import { extractAssistantText } from "../pi-embedded-utils.js";
import { jsonResult } from "../tools/common.js";
import { normalizeUsage, type NormalizedUsage, type UsageLike } from "../usage.js";
import {
  capabilityFromQllmOutput,
  capabilityFromToolResult,
  createCamelCapability,
  createUserCapability,
  mergeCapabilities,
} from "./capabilities.js";
import { CamelJsonParseError, parseJsonPayload } from "./parser.js";
import { evaluateCamelPolicy } from "./policy.js";
import { parseCamelProgramToSteps } from "./program-parser.js";
import {
  buildCamelFinalReplyPrompt,
  buildCamelPlannerPrompt,
  buildCamelPlannerRepairPrompt,
  buildCamelQllmPrompt,
} from "./prompts.js";

const CAMEL_DEFAULT_MAX_PLAN_RETRIES = 10;
const CAMEL_MAX_PLAN_RETRIES_LIMIT = 10;
const CAMEL_MAX_STEPS = 64;
const CAMEL_PLANNER_MAX_TOKENS = 2_400;
const CAMEL_QLLM_MAX_TOKENS = 1_200;
const CAMEL_QLLM_RETRIES = 10;
const CAMEL_FINAL_MAX_TOKENS = 1_100;
const CAMEL_VIRTUAL_TOOL_NAMES = new Set(["print", "query_ai_assistant"]);

type CamelRuntimeParams = {
  model: Model<Api>;
  provider: string;
  modelId: string;
  runtimeApiKey?: string;
  prompt: string;
  history: string;
  tools: AnyAgentTool[];
  clientToolNames?: Set<string>;
  runId: string;
  abortSignal?: AbortSignal;
  evalMode?: CamelEvalMode;
  extraSystemPrompt?: string;
  shouldEmitToolResult?: () => boolean;
  shouldEmitToolOutput?: () => boolean;
  onToolResult?: (payload: { text?: string; mediaUrls?: string[] }) => void | Promise<void>;
  onAgentEvent?: (evt: { stream: string; data: Record<string, unknown> }) => void;
  maxPlanRetries?: number;
};

export type CamelRuntimeResult = {
  assistantTexts: string[];
  toolMetas: Array<{ toolName: string; meta?: string }>;
  lastAssistant?: AssistantMessage;
  lastToolError?: { toolName: string; meta?: string; error?: string };
  didSendViaMessagingTool: boolean;
  messagingToolSentTexts: string[];
  messagingToolSentTargets: MessagingToolSend[];
  attemptUsage?: NormalizedUsage;
  clientToolCall?: { name: string; params: Record<string, unknown> };
  executionTrace: CamelExecutionEvent[];
  issues: CamelPlannerIssue[];
};

class PlannerError extends Error {
  readonly trusted: boolean;

  constructor(message: string, trusted: boolean) {
    super(message);
    this.name = "PlannerError";
    this.trusted = trusted;
  }
}

function aggregateUsage(usages: Array<NormalizedUsage | undefined>): NormalizedUsage | undefined {
  let input = 0;
  let output = 0;
  let cacheRead = 0;
  let cacheWrite = 0;
  let total = 0;
  let seen = false;
  for (const usage of usages) {
    if (!usage) {
      continue;
    }
    seen = true;
    input += usage.input ?? 0;
    output += usage.output ?? 0;
    cacheRead += usage.cacheRead ?? 0;
    cacheWrite += usage.cacheWrite ?? 0;
    total += usage.total ?? 0;
  }
  if (!seen) {
    return undefined;
  }
  return {
    input: input || undefined,
    output: output || undefined,
    cacheRead: cacheRead || undefined,
    cacheWrite: cacheWrite || undefined,
    total: total || undefined,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function sanitizeVariableName(name: string): string {
  return name.trim();
}

function toDisplayText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  try {
    const encoded = JSON.stringify(value);
    if (typeof encoded === "string") {
      return encoded;
    }
  } catch {
    // Ignore JSON encoding failures.
  }
  return Object.prototype.toString.call(value);
}

function stableHash(value: unknown): number {
  const text =
    typeof value === "string"
      ? value
      : value === null
        ? "null"
        : value === undefined
          ? "undefined"
          : `${typeof value}:${toDisplayText(value)}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash | 0;
}

function readPath(root: unknown, path: string): unknown {
  const segments = path
    .split(".")
    .map((entry) => entry.trim())
    .filter(Boolean);
  let current: unknown = root;
  for (const segment of segments) {
    if (Array.isArray(current)) {
      const index = Number.parseInt(segment, 10);
      if (!Number.isFinite(index) || index < 0 || index >= current.length) {
        return undefined;
      }
      current = current[index];
      continue;
    }
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

function resolveVarReference(
  ref: string,
  vars: Map<string, CamelRuntimeValue>,
): { value: unknown; capability: CamelCapability } {
  const [root, ...rest] = ref.split(".");
  const variable = vars.get(sanitizeVariableName(root ?? ""));
  if (!variable) {
    throw new PlannerError(`Unknown variable reference: ${ref}`, true);
  }
  const resolvedValue = rest.length > 0 ? readPath(variable.value, rest.join(".")) : variable.value;
  return {
    value: resolvedValue,
    capability: variable.capability,
  };
}

function toIterableArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    return Array.from(value);
  }
  if (value instanceof Set || value instanceof Map) {
    return Array.from(value.values());
  }
  if (isRecord(value)) {
    return Object.keys(value);
  }
  throw new PlannerError(`Value is not iterable: ${toDisplayText(value)}`, true);
}

function toNumber(value: unknown, label: string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new PlannerError(`Expected numeric ${label}, got ${toDisplayText(value)}.`, true);
  }
  return parsed;
}

function toInteger(value: unknown, label: string): number {
  return Math.trunc(toNumber(value, label));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function computeSlice(params: {
  sequence: unknown[] | string;
  start?: number;
  end?: number;
  step?: number;
}): unknown[] | string {
  const raw =
    typeof params.sequence === "string" ? Array.from(params.sequence) : [...params.sequence];
  const size = raw.length;
  const step = params.step ?? 1;
  if (step === 0) {
    throw new PlannerError("slice step cannot be 0.", true);
  }

  const hasStart = params.start !== undefined;
  const hasEnd = params.end !== undefined;
  let start = (hasStart ? (params.start as number) : undefined) ?? (step > 0 ? 0 : size - 1);
  let end = (hasEnd ? (params.end as number) : undefined) ?? (step > 0 ? size : -1);

  if (hasStart && start < 0) {
    start += size;
  }
  if (hasEnd && end < 0) {
    end += size;
  }

  if (step > 0) {
    start = clamp(start, 0, size);
    end = clamp(end, 0, size);
  } else {
    start = clamp(start, -1, size - 1);
    end = clamp(end, -1, size - 1);
  }

  const out: unknown[] = [];
  if (step > 0) {
    for (let i = start; i < end; i += step) {
      if (i >= 0 && i < size) {
        out.push(raw[i]);
      }
    }
  } else {
    for (let i = start; i > end; i += step) {
      if (i >= 0 && i < size) {
        out.push(raw[i]);
      }
    }
  }

  if (typeof params.sequence === "string") {
    return out.join("");
  }
  return out;
}

function normalizeTargetNames(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    const names = raw
      .map((entry) => (typeof entry === "string" ? sanitizeVariableName(entry) : ""))
      .filter(Boolean);
    if (names.length > 0) {
      return names;
    }
  } else if (typeof raw === "string") {
    const name = sanitizeVariableName(raw);
    if (name) {
      return [name];
    }
  }
  throw new PlannerError("Invalid target list.", true);
}

function bindTargets(params: {
  targets: string[];
  value: unknown;
  capability: CamelCapability;
  vars: Map<string, CamelRuntimeValue>;
  mismatchLabel: string;
}): void {
  if (params.targets.length === 1) {
    const target = params.targets[0];
    if (!target) {
      throw new PlannerError("Invalid target.", true);
    }
    params.vars.set(target, {
      value: params.value,
      capability: params.capability,
    });
    return;
  }
  const values = toIterableArray(params.value);
  if (values.length !== params.targets.length) {
    throw new PlannerError(
      `${params.mismatchLabel}: expected ${params.targets.length}, got ${values.length}.`,
      true,
    );
  }
  params.targets.forEach((target, index) => {
    params.vars.set(target, {
      value: values[index],
      capability: params.capability,
    });
  });
}

function withTemporaryBindings<T>(params: {
  vars: Map<string, CamelRuntimeValue>;
  names: string[];
  run: () => T;
}): T {
  const previous = new Map<string, CamelRuntimeValue | undefined>();
  for (const name of params.names) {
    previous.set(name, params.vars.get(name));
  }
  try {
    return params.run();
  } finally {
    for (const name of params.names) {
      const prior = previous.get(name);
      if (prior) {
        params.vars.set(name, prior);
      } else {
        params.vars.delete(name);
      }
    }
  }
}

type NormalizedComprehensionClause = {
  targets: string[];
  iterableNode: unknown;
  conditionNodes: unknown[];
};

function normalizeComprehensionClauses(
  node: Record<string, unknown>,
): NormalizedComprehensionClause[] {
  const rawClauses = Array.isArray(node.clauses)
    ? node.clauses
    : [
        {
          target: node.target,
          iterable: node.iterable,
          conditions: node.condition === undefined ? [] : [node.condition],
        },
      ];

  const clauses = rawClauses.map((entry) => {
    if (!isRecord(entry)) {
      throw new PlannerError("Invalid comprehension clause.", true);
    }
    const targets = normalizeTargetNames(entry.target);
    if (targets.length === 0) {
      throw new PlannerError("Invalid comprehension targets.", true);
    }
    const iterableNode = entry.iterable;
    if (iterableNode === undefined) {
      throw new PlannerError("Comprehension clause is missing iterable.", true);
    }
    const conditionNodes = Array.isArray(entry.conditions)
      ? entry.conditions
      : entry.condition === undefined
        ? []
        : [entry.condition];
    return {
      targets,
      iterableNode,
      conditionNodes,
    };
  });

  if (clauses.length === 0) {
    throw new PlannerError("Comprehension has no clauses.", true);
  }
  return clauses;
}

function pickCallArg(
  args: unknown[],
  kwargs: Record<string, unknown>,
  index: number,
  names: string[] = [],
): unknown {
  if (index < args.length) {
    return args[index];
  }
  for (const name of names) {
    if (name in kwargs) {
      return kwargs[name];
    }
  }
  return undefined;
}

function buildUniqueArray(values: unknown[]): unknown[] {
  const out: unknown[] = [];
  for (const value of values) {
    if (out.some((existing) => Object.is(existing, value))) {
      continue;
    }
    out.push(value);
  }
  return out;
}

function typeName(value: unknown): string {
  if (value === null) {
    return "NoneType";
  }
  if (Array.isArray(value)) {
    return "list";
  }
  if (typeof value === "string") {
    return "str";
  }
  if (typeof value === "boolean") {
    return "bool";
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? "int" : "float";
  }
  if (typeof value === "undefined") {
    return "NoneType";
  }
  if (isRecord(value)) {
    return "dict";
  }
  return typeof value;
}

function evaluateComparatorOp(op: string, left: unknown, right: unknown): boolean {
  const leftValue = left as string | number | boolean | null | undefined;
  const rightValue = right as string | number | boolean | null | undefined;
  if (op === "eq") {
    return Object.is(leftValue, rightValue);
  }
  if (op === "neq") {
    return !Object.is(leftValue, rightValue);
  }
  if (op === "gt") {
    return (leftValue as number | string) > (rightValue as number | string);
  }
  if (op === "lt") {
    return (leftValue as number | string) < (rightValue as number | string);
  }
  if (op === "gte") {
    return (leftValue as number | string) >= (rightValue as number | string);
  }
  if (op === "lte") {
    return (leftValue as number | string) <= (rightValue as number | string);
  }
  throw new PlannerError(`Unsupported comparator operator: ${op}`, true);
}

function evaluateBuiltinExpressionCall(params: {
  callee: string;
  args: unknown[];
  kwargs: Record<string, unknown>;
}): unknown {
  const callee = params.callee.trim().toLowerCase();
  const args = params.args;
  const kwargs = params.kwargs;

  switch (callee) {
    case "len": {
      const value = pickCallArg(args, kwargs, 0, ["value", "obj", "x"]);
      if (value === undefined) {
        return 0;
      }
      if (typeof value === "string" || Array.isArray(value)) {
        return value.length;
      }
      if (value instanceof Set || value instanceof Map) {
        return value.size;
      }
      if (isRecord(value)) {
        return Object.keys(value).length;
      }
      throw new PlannerError(`len() does not support ${typeName(value)}.`, true);
    }
    case "str":
      return toDisplayText(pickCallArg(args, kwargs, 0, ["value", "x"]) ?? "");
    case "repr":
      return toDisplayText(pickCallArg(args, kwargs, 0, ["value", "x"]) ?? "");
    case "print":
      return null;
    case "bool":
      return Boolean(pickCallArg(args, kwargs, 0, ["value", "x"]));
    case "hash":
      return stableHash(pickCallArg(args, kwargs, 0, ["value", "x"]));
    case "int":
      return toInteger(pickCallArg(args, kwargs, 0, ["value", "x"]) ?? 0, "int() input");
    case "float":
      return toNumber(pickCallArg(args, kwargs, 0, ["value", "x"]) ?? 0, "float() input");
    case "type":
      return typeName(pickCallArg(args, kwargs, 0, ["value", "x"]));
    case "list":
    case "tuple":
      return toIterableArray(pickCallArg(args, kwargs, 0, ["value", "x"]) ?? []);
    case "set":
      return buildUniqueArray(toIterableArray(pickCallArg(args, kwargs, 0, ["value", "x"]) ?? []));
    case "range": {
      let start = toInteger(pickCallArg(args, kwargs, 0, ["start"]) ?? 0, "range start");
      let stop = pickCallArg(args, kwargs, 1, ["stop"]);
      const step = toInteger(pickCallArg(args, kwargs, 2, ["step"]) ?? 1, "range step");
      if (stop === undefined && args.length > 0) {
        stop = start;
        start = 0;
      }
      if (step === 0) {
        throw new PlannerError("range() step cannot be 0.", true);
      }
      const resolvedStop = toInteger(stop ?? 0, "range stop");
      const out: number[] = [];
      if (step > 0) {
        for (let i = start; i < resolvedStop; i += step) {
          out.push(i);
        }
      } else {
        for (let i = start; i > resolvedStop; i += step) {
          out.push(i);
        }
      }
      return out;
    }
    case "enumerate": {
      const iterable = toIterableArray(pickCallArg(args, kwargs, 0, ["iterable", "x"]) ?? []);
      const start = toInteger(pickCallArg(args, kwargs, 1, ["start"]) ?? 0, "enumerate start");
      return iterable.map((entry, index) => [start + index, entry]);
    }
    case "zip": {
      const iterables = args.map((entry) => toIterableArray(entry));
      if (iterables.length === 0) {
        return [];
      }
      const minLen = Math.min(...iterables.map((entry) => entry.length));
      const out: unknown[][] = [];
      for (let i = 0; i < minLen; i += 1) {
        out.push(iterables.map((entry) => entry[i]));
      }
      return out;
    }
    case "reversed": {
      const iterable = toIterableArray(pickCallArg(args, kwargs, 0, ["iterable", "x"]) ?? []);
      return iterable.toReversed();
    }
    case "sorted": {
      const iterable = toIterableArray(pickCallArg(args, kwargs, 0, ["iterable", "x"]) ?? []);
      const reverse = Boolean(pickCallArg(args, kwargs, 2, ["reverse"]));
      const out = iterable.toSorted((left, right) => {
        if (typeof left === "number" && typeof right === "number") {
          return left - right;
        }
        return toDisplayText(left).localeCompare(toDisplayText(right));
      });
      return reverse ? out.toReversed() : out;
    }
    case "sum": {
      const iterable = toIterableArray(pickCallArg(args, kwargs, 0, ["iterable", "x"]) ?? []);
      const start = toNumber(pickCallArg(args, kwargs, 1, ["start"]) ?? 0, "sum start");
      return iterable.reduce<number>((acc, entry) => acc + toNumber(entry, "sum entry"), start);
    }
    case "min":
    case "max": {
      const entries = args.length === 1 && !("default" in kwargs) ? toIterableArray(args[0]) : args;
      if (entries.length === 0) {
        throw new PlannerError(`${callee}() arg is an empty sequence.`, true);
      }
      let selected = entries[0];
      for (const entry of entries.slice(1)) {
        if (callee === "min") {
          if (toDisplayText(entry) < toDisplayText(selected)) {
            selected = entry;
          }
        } else if (toDisplayText(entry) > toDisplayText(selected)) {
          selected = entry;
        }
      }
      return selected;
    }
    case "abs":
      return Math.abs(toNumber(pickCallArg(args, kwargs, 0, ["x"]) ?? 0, "abs input"));
    case "divmod": {
      const left = toNumber(pickCallArg(args, kwargs, 0, ["a", "x"]) ?? 0, "divmod left");
      const right = toNumber(pickCallArg(args, kwargs, 1, ["b", "y"]) ?? 0, "divmod right");
      if (right === 0) {
        throw new PlannerError("integer division or modulo by zero", true);
      }
      const quotient = Math.floor(left / right);
      const remainder = left - quotient * right;
      return [quotient, remainder];
    }
    case "any": {
      const iterable = toIterableArray(pickCallArg(args, kwargs, 0, ["iterable", "x"]) ?? []);
      return iterable.some(Boolean);
    }
    case "all": {
      const iterable = toIterableArray(pickCallArg(args, kwargs, 0, ["iterable", "x"]) ?? []);
      return iterable.every(Boolean);
    }
    case "dict": {
      const seed = pickCallArg(args, kwargs, 0, ["value", "x"]);
      const out: Record<string, unknown> = {};
      if (seed !== undefined) {
        if (Array.isArray(seed)) {
          for (const pair of seed) {
            if (!Array.isArray(pair) || pair.length < 2) {
              throw new PlannerError("dict() expects key/value pairs.", true);
            }
            out[toDisplayText(pair[0])] = pair[1];
          }
        } else if (isRecord(seed)) {
          Object.assign(out, seed);
        } else {
          throw new PlannerError("dict() expects mapping or key/value pairs.", true);
        }
      }
      for (const [key, value] of Object.entries(kwargs)) {
        out[key] = value;
      }
      return out;
    }
    case "dir": {
      const value = pickCallArg(args, kwargs, 0, ["value", "x"]);
      if (value === null || value === undefined) {
        return [];
      }
      if (isRecord(value)) {
        return Object.keys(value);
      }
      return Object.getOwnPropertyNames(Object.getPrototypeOf(value) ?? {}).toSorted();
    }
    default:
      throw new PlannerError(`Unsupported expression call: ${params.callee}`, true);
  }
}

function evaluateMethodExpressionCall(params: {
  target: unknown;
  method: string;
  args: unknown[];
  kwargs: Record<string, unknown>;
}): unknown {
  const method = params.method.trim().toLowerCase();
  const args = params.args;
  const kwargs = params.kwargs;
  const target = params.target;

  if (typeof target === "string") {
    switch (method) {
      case "lower":
        return target.toLowerCase();
      case "upper":
        return target.toUpperCase();
      case "strip":
        return target.trim();
      case "lstrip":
        return target.trimStart();
      case "rstrip":
        return target.trimEnd();
      case "split": {
        const sep = pickCallArg(args, kwargs, 0, ["sep"]);
        return sep === undefined ? target.split(/\s+/) : target.split(toDisplayText(sep));
      }
      case "rsplit": {
        const sep = pickCallArg(args, kwargs, 0, ["sep"]);
        const value =
          sep === undefined ? target.trim().split(/\s+/) : target.split(toDisplayText(sep));
        return value;
      }
      case "replace": {
        const oldText = toDisplayText(pickCallArg(args, kwargs, 0, ["old"]) ?? "");
        const newText = toDisplayText(pickCallArg(args, kwargs, 1, ["new"]) ?? "");
        return oldText ? target.split(oldText).join(newText) : target;
      }
      case "format": {
        const openToken = "\u0000camel_open_brace\u0000";
        const closeToken = "\u0000camel_close_brace\u0000";
        let autoIndex = 0;
        const template = target.replaceAll("{{", openToken).replaceAll("}}", closeToken);
        const rendered = template.replace(/\{([^{}]*)\}/g, (_full, rawKey: string) => {
          const key = rawKey.trim();
          if (!key) {
            const value = args[autoIndex];
            autoIndex += 1;
            return toDisplayText(value);
          }
          if (/^\d+$/.test(key)) {
            return toDisplayText(args[Number.parseInt(key, 10)]);
          }
          return toDisplayText(kwargs[key]);
        });
        return rendered.replaceAll(openToken, "{").replaceAll(closeToken, "}");
      }
      case "startswith":
        return target.startsWith(toDisplayText(pickCallArg(args, kwargs, 0, ["prefix"]) ?? ""));
      case "endswith":
        return target.endsWith(toDisplayText(pickCallArg(args, kwargs, 0, ["suffix"]) ?? ""));
      case "find":
        return target.indexOf(toDisplayText(pickCallArg(args, kwargs, 0, ["sub"]) ?? ""));
      case "rfind":
        return target.lastIndexOf(toDisplayText(pickCallArg(args, kwargs, 0, ["sub"]) ?? ""));
      case "index": {
        const idx = target.indexOf(toDisplayText(pickCallArg(args, kwargs, 0, ["sub"]) ?? ""));
        if (idx < 0) {
          throw new PlannerError("substring not found", true);
        }
        return idx;
      }
      case "rindex": {
        const idx = target.lastIndexOf(toDisplayText(pickCallArg(args, kwargs, 0, ["sub"]) ?? ""));
        if (idx < 0) {
          throw new PlannerError("substring not found", true);
        }
        return idx;
      }
      case "count": {
        const needle = toDisplayText(pickCallArg(args, kwargs, 0, ["sub"]) ?? "");
        if (!needle) {
          return 0;
        }
        return target.split(needle).length - 1;
      }
      case "partition": {
        const sep = toDisplayText(pickCallArg(args, kwargs, 0, ["sep"]) ?? "");
        if (!sep) {
          throw new PlannerError("empty separator", true);
        }
        const idx = target.indexOf(sep);
        if (idx < 0) {
          return [target, "", ""];
        }
        return [target.slice(0, idx), sep, target.slice(idx + sep.length)];
      }
      case "rpartition": {
        const sep = toDisplayText(pickCallArg(args, kwargs, 0, ["sep"]) ?? "");
        if (!sep) {
          throw new PlannerError("empty separator", true);
        }
        const idx = target.lastIndexOf(sep);
        if (idx < 0) {
          return ["", "", target];
        }
        return [target.slice(0, idx), sep, target.slice(idx + sep.length)];
      }
      case "join": {
        const iterable = toIterableArray(pickCallArg(args, kwargs, 0, ["iterable"]) ?? []);
        return iterable.map((entry) => toDisplayText(entry)).join(target);
      }
      case "capitalize":
        return target.length > 0
          ? `${target[0].toUpperCase()}${target.slice(1).toLowerCase()}`
          : "";
      case "title":
        return target
          .split(/\s+/)
          .map((token) =>
            token.length > 0 ? `${token[0].toUpperCase()}${token.slice(1).toLowerCase()}` : token,
          )
          .join(" ");
      case "islower":
        return target === target.toLowerCase() && target !== target.toUpperCase();
      case "isupper":
        return target === target.toUpperCase() && target !== target.toLowerCase();
      case "istitle": {
        const tokens = target.split(/\s+/).filter(Boolean);
        let hasCased = false;
        for (const token of tokens) {
          const letters = token.replace(/[^A-Za-z]/g, "");
          if (!letters) {
            continue;
          }
          hasCased = true;
          if (
            !(
              letters[0] === letters[0]?.toUpperCase() &&
              letters.slice(1) === letters.slice(1).toLowerCase()
            )
          ) {
            return false;
          }
        }
        return hasCased;
      }
      case "isdigit":
        return target.length > 0 && /^[0-9]+$/.test(target);
      case "isalpha":
        return target.length > 0 && /^[A-Za-z]+$/.test(target);
      case "isalnum":
        return target.length > 0 && /^[A-Za-z0-9]+$/.test(target);
      case "isspace":
        return target.length > 0 && /^\s+$/.test(target);
      case "splitlines": {
        const keepEnds = Boolean(pickCallArg(args, kwargs, 0, ["keepends"]));
        if (keepEnds) {
          const lines = target.match(/[^\r\n]*(?:\r\n|\r|\n|$)/g) ?? [];
          return lines.filter((line, index) => !(index === lines.length - 1 && line === ""));
        }
        const normalized = target.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
        if (!normalized) {
          return [];
        }
        const lines = normalized.split("\n");
        if (lines.at(-1) === "") {
          lines.pop();
        }
        return lines;
      }
      case "removeprefix": {
        const prefix = toDisplayText(pickCallArg(args, kwargs, 0, ["prefix"]) ?? "");
        return target.startsWith(prefix) ? target.slice(prefix.length) : target;
      }
      case "removesuffix": {
        const suffix = toDisplayText(pickCallArg(args, kwargs, 0, ["suffix"]) ?? "");
        return target.endsWith(suffix) ? target.slice(0, -suffix.length) : target;
      }
      default:
        break;
    }
  }

  if (Array.isArray(target)) {
    switch (method) {
      case "index": {
        const needle = pickCallArg(args, kwargs, 0, ["value"]);
        const idx = target.findIndex((entry) => Object.is(entry, needle));
        if (idx < 0) {
          throw new PlannerError("value not found in list", true);
        }
        return idx;
      }
      case "count": {
        const needle = pickCallArg(args, kwargs, 0, ["value"]);
        return target.reduce((acc, entry) => (Object.is(entry, needle) ? acc + 1 : acc), 0);
      }
      default:
        break;
    }
  }

  if (isRecord(target)) {
    switch (method) {
      case "get": {
        const key = toDisplayText(pickCallArg(args, kwargs, 0, ["key"]) ?? "");
        const fallback = pickCallArg(args, kwargs, 1, ["default"]);
        return key in target ? target[key] : fallback;
      }
      case "keys":
        return Object.keys(target);
      case "values":
        return Object.values(target);
      case "items":
        return Object.entries(target);
      default:
        break;
    }
  }

  throw new PlannerError(`Unsupported method call: ${typeName(target)}.${params.method}()`, true);
}

function evaluateExpressionCall(params: {
  callee: string;
  args: unknown[];
  kwargs: Record<string, unknown>;
  vars: Map<string, CamelRuntimeValue>;
}): { value: unknown; targetCapability?: CamelCapability } {
  if (!params.callee.includes(".")) {
    return {
      value: evaluateBuiltinExpressionCall({
        callee: params.callee,
        args: params.args,
        kwargs: params.kwargs,
      }),
    };
  }
  const segments = params.callee.split(".").filter(Boolean);
  if (segments.length < 2) {
    throw new PlannerError(`Invalid method call: ${params.callee}`, true);
  }
  const method = segments[segments.length - 1] ?? "";
  const targetRef = segments.slice(0, -1).join(".");
  const target = resolveVarReference(targetRef, params.vars);
  return {
    value: evaluateMethodExpressionCall({
      target: target.value,
      method,
      args: params.args,
      kwargs: params.kwargs,
    }),
    targetCapability: target.capability,
  };
}

function renderTemplate(
  text: string,
  vars: Map<string, CamelRuntimeValue>,
): {
  value: string;
  capability: CamelCapability;
} {
  const refs: CamelCapability[] = [];
  const rendered = text.replace(/\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g, (_full, ref: string) => {
    const [root, ...rest] = ref.split(".");
    const varName = sanitizeVariableName(root ?? "");
    const variable = vars.get(varName);
    if (!variable) {
      return "";
    }
    refs.push(variable.capability);
    const resolved = rest.length > 0 ? readPath(variable.value, rest.join(".")) : variable.value;
    return toDisplayText(resolved);
  });
  return {
    value: rendered,
    capability: mergeCapabilities([createUserCapability(), ...refs]),
  };
}

function resolveInput(
  value: unknown,
  vars: Map<string, CamelRuntimeValue>,
): { value: unknown; capability: CamelCapability } {
  if (Array.isArray(value)) {
    const items = value.map((entry) => resolveInput(entry, vars));
    return {
      value: items.map((entry) => entry.value),
      capability: mergeCapabilities(items.map((entry) => entry.capability)),
    };
  }
  if (isRecord(value)) {
    if (typeof value.$expr === "string") {
      const op = value.$expr.trim().toLowerCase();
      if (op === "and" || op === "or") {
        const args = Array.isArray(value.args) ? value.args : [];
        const resolvedCaps: CamelCapability[] = [createUserCapability()];
        let result: unknown = op === "and";
        for (const entry of args) {
          const resolved = resolveInput(entry, vars);
          resolvedCaps.push(resolved.capability);
          const truthy = Boolean(resolved.value);
          result = resolved.value;
          if (op === "and" && !truthy) {
            break;
          }
          if (op === "or" && truthy) {
            break;
          }
        }
        return {
          value: result,
          capability: mergeCapabilities(resolvedCaps),
        };
      }
      if (op === "not") {
        const arg = resolveInput(value.arg, vars);
        return {
          value: !arg.value,
          capability: mergeCapabilities([createUserCapability(), arg.capability]),
        };
      }
      if (op === "tuple") {
        const itemNodes = Array.isArray(value.items) ? value.items : [];
        const resolved = itemNodes.map((entry) => resolveInput(entry, vars));
        return {
          value: resolved.map((entry) => entry.value),
          capability: mergeCapabilities([
            createUserCapability(),
            ...resolved.map((entry) => entry.capability),
          ]),
        };
      }
      if (op === "set_literal") {
        const itemNodes = Array.isArray(value.items) ? value.items : [];
        const resolved = itemNodes.map((entry) => resolveInput(entry, vars));
        return {
          value: buildUniqueArray(resolved.map((entry) => entry.value)),
          capability: mergeCapabilities([
            createUserCapability(),
            ...resolved.map((entry) => entry.capability),
          ]),
        };
      }
      if (op === "list_comp" || op === "set_comp" || op === "dict_comp") {
        const clauses = normalizeComprehensionClauses(value);
        const caps: CamelCapability[] = [createUserCapability()];
        const tempNames = Array.from(new Set(clauses.flatMap((clause) => clause.targets)));

        const iterateClauses = (onMatch: () => void): void => {
          const visit = (index: number): void => {
            if (index >= clauses.length) {
              onMatch();
              return;
            }
            const clause = clauses[index];
            if (!clause) {
              return;
            }
            const iterable = resolveInput(clause.iterableNode, vars);
            caps.push(iterable.capability);
            const entries = toIterableArray(iterable.value);
            for (const entry of entries) {
              bindTargets({
                targets: clause.targets,
                value: entry,
                capability: iterable.capability,
                vars,
                mismatchLabel: "Comprehension unpack mismatch",
              });
              let allowed = true;
              for (const conditionNode of clause.conditionNodes) {
                const condition = resolveInput(conditionNode, vars);
                caps.push(condition.capability);
                if (!condition.value) {
                  allowed = false;
                  break;
                }
              }
              if (!allowed) {
                continue;
              }
              visit(index + 1);
            }
          };
          visit(0);
        };

        if (op === "dict_comp") {
          const out: Record<string, unknown> = {};
          withTemporaryBindings({
            vars,
            names: tempNames,
            run: () => {
              iterateClauses(() => {
                const keyResolved = resolveInput(value.key, vars);
                const valueResolved = resolveInput(value.value, vars);
                caps.push(keyResolved.capability, valueResolved.capability);
                out[toDisplayText(keyResolved.value)] = valueResolved.value;
              });
            },
          });
          return {
            value: out,
            capability: mergeCapabilities(caps),
          };
        }

        const out: unknown[] = [];
        withTemporaryBindings({
          vars,
          names: tempNames,
          run: () => {
            iterateClauses(() => {
              const element = resolveInput(value.element, vars);
              caps.push(element.capability);
              out.push(element.value);
            });
          },
        });

        return {
          value: op === "set_comp" ? buildUniqueArray(out) : out,
          capability: mergeCapabilities(caps),
        };
      }
      if (op === "ifelse") {
        const condition = resolveInput(value.condition, vars);
        const thenBranch = isRecord(value) ? (value.thenBranch ?? value["then"]) : undefined;
        const branch = condition.value ? thenBranch : value.otherwise;
        const resolvedBranch = resolveInput(branch, vars);
        return {
          value: resolvedBranch.value,
          capability: mergeCapabilities([
            createUserCapability(),
            condition.capability,
            resolvedBranch.capability,
          ]),
        };
      }
      if (op === "call") {
        const callee = typeof value.callee === "string" ? value.callee.trim() : "";
        if (!callee) {
          throw new PlannerError("Invalid call expression: missing callee.", true);
        }
        const argNodes = Array.isArray(value.args) ? value.args : [];
        const kwargsNode = isRecord(value.kwargs) ? value.kwargs : {};
        const resolvedArgs = argNodes.map((entry) => resolveInput(entry, vars));
        const resolvedKwargs = Object.entries(kwargsNode).map(([key, entry]) => ({
          key,
          resolved: resolveInput(entry, vars),
        }));
        const call = evaluateExpressionCall({
          callee,
          args: resolvedArgs.map((entry) => entry.value),
          kwargs: Object.fromEntries(
            resolvedKwargs.map((entry) => [entry.key, entry.resolved.value]),
          ),
          vars,
        });
        return {
          value: call.value,
          capability: mergeCapabilities([
            createUserCapability(),
            ...resolvedArgs.map((entry) => entry.capability),
            ...resolvedKwargs.map((entry) => entry.resolved.capability),
            ...(call.targetCapability ? [call.targetCapability] : []),
          ]),
        };
      }
      if (op === "call_method") {
        const method = typeof value.method === "string" ? value.method.trim() : "";
        if (!method) {
          throw new PlannerError("Invalid method call expression: missing method.", true);
        }
        const target = resolveInput(value.target, vars);
        const argNodes = Array.isArray(value.args) ? value.args : [];
        const kwargsNode = isRecord(value.kwargs) ? value.kwargs : {};
        const resolvedArgs = argNodes.map((entry) => resolveInput(entry, vars));
        const resolvedKwargs = Object.entries(kwargsNode).map(([key, entry]) => ({
          key,
          resolved: resolveInput(entry, vars),
        }));
        const callValue = evaluateMethodExpressionCall({
          target: target.value,
          method,
          args: resolvedArgs.map((entry) => entry.value),
          kwargs: Object.fromEntries(
            resolvedKwargs.map((entry) => [entry.key, entry.resolved.value]),
          ),
        });
        return {
          value: callValue,
          capability: mergeCapabilities([
            createUserCapability(),
            target.capability,
            ...resolvedArgs.map((entry) => entry.capability),
            ...resolvedKwargs.map((entry) => entry.resolved.capability),
          ]),
        };
      }
      if (op === "attr") {
        const key = typeof value.key === "string" ? value.key.trim() : "";
        if (!key) {
          throw new PlannerError("Invalid attr expression: missing key.", true);
        }
        const target = resolveInput(value.target, vars);
        let attrValue: unknown;
        if (isRecord(target.value)) {
          attrValue = target.value[key];
        } else if (Array.isArray(target.value) && key === "length") {
          attrValue = target.value.length;
        } else if (typeof target.value === "string" && key === "length") {
          attrValue = target.value.length;
        } else if (target.value && typeof target.value === "object") {
          attrValue = (target.value as Record<string, unknown>)[key];
        } else {
          throw new PlannerError(`Unsupported attr target: ${typeName(target.value)}.`, true);
        }
        return {
          value: attrValue,
          capability: mergeCapabilities([createUserCapability(), target.capability]),
        };
      }
      if (op === "neg" || op === "pos") {
        const arg = resolveInput(value.arg, vars);
        const numeric = toNumber(arg.value, `${op} operand`);
        return {
          value: op === "neg" ? -numeric : numeric,
          capability: mergeCapabilities([createUserCapability(), arg.capability]),
        };
      }
      if (op === "index") {
        const target = resolveInput(value.target, vars);
        const index = resolveInput(value.index, vars);
        let result: unknown;
        if (Array.isArray(target.value) || typeof target.value === "string") {
          const entries =
            typeof target.value === "string" ? Array.from(target.value) : target.value;
          let offset = toInteger(index.value, "index");
          if (offset < 0) {
            offset += entries.length;
          }
          result = entries[offset];
        } else if (isRecord(target.value)) {
          result = target.value[toDisplayText(index.value)];
        } else {
          throw new PlannerError(`Unsupported index target: ${typeName(target.value)}.`, true);
        }
        return {
          value: result,
          capability: mergeCapabilities([
            createUserCapability(),
            target.capability,
            index.capability,
          ]),
        };
      }
      if (op === "slice") {
        const target = resolveInput(value.target, vars);
        if (!Array.isArray(target.value) && typeof target.value !== "string") {
          throw new PlannerError(`Unsupported slice target: ${typeName(target.value)}.`, true);
        }
        const start = value.start === undefined ? undefined : resolveInput(value.start, vars);
        const end = value.end === undefined ? undefined : resolveInput(value.end, vars);
        const step = value.step === undefined ? undefined : resolveInput(value.step, vars);
        const result = computeSlice({
          sequence: target.value,
          start: start?.value === undefined ? undefined : toInteger(start.value, "slice start"),
          end: end?.value === undefined ? undefined : toInteger(end.value, "slice end"),
          step: step?.value === undefined ? undefined : toInteger(step.value, "slice step"),
        });
        return {
          value: result,
          capability: mergeCapabilities([
            createUserCapability(),
            target.capability,
            ...(start ? [start.capability] : []),
            ...(end ? [end.capability] : []),
            ...(step ? [step.capability] : []),
          ]),
        };
      }
      if (op === "cmp_chain") {
        const valueNodes = Array.isArray(value.values) ? value.values : [];
        const ops = Array.isArray(value.ops)
          ? value.ops.map((entry) => (typeof entry === "string" ? entry : "")).filter(Boolean)
          : [];
        if (valueNodes.length < 2 || ops.length !== valueNodes.length - 1) {
          throw new PlannerError("Invalid comparison chain expression.", true);
        }
        const resolved = valueNodes.map((entry) => resolveInput(entry, vars));
        let result = true;
        for (let i = 0; i < ops.length; i += 1) {
          const left = resolved[i];
          const right = resolved[i + 1];
          const opName = ops[i] ?? "";
          if (!evaluateComparatorOp(opName, left?.value, right?.value)) {
            result = false;
            break;
          }
        }
        return {
          value: result,
          capability: mergeCapabilities([
            createUserCapability(),
            ...resolved.map((entry) => entry.capability),
          ]),
        };
      }
      const left = resolveInput(value.left, vars);
      const right = resolveInput(value.right, vars);
      if (op === "in") {
        let result = false;
        if (Array.isArray(right.value)) {
          result = right.value.some((entry) => Object.is(entry, left.value));
        } else if (typeof right.value === "string") {
          result = typeof left.value === "string" && right.value.includes(left.value);
        } else if (isRecord(right.value)) {
          result = typeof left.value === "string" && left.value in right.value;
        }
        return {
          value: result,
          capability: mergeCapabilities([
            createUserCapability(),
            left.capability,
            right.capability,
          ]),
        };
      }
      if (op === "not_in") {
        let result = true;
        if (Array.isArray(right.value)) {
          result = !right.value.some((entry) => Object.is(entry, left.value));
        } else if (typeof right.value === "string") {
          result = !(typeof left.value === "string" && right.value.includes(left.value));
        } else if (isRecord(right.value)) {
          result = !(typeof left.value === "string" && left.value in right.value);
        }
        return {
          value: result,
          capability: mergeCapabilities([
            createUserCapability(),
            left.capability,
            right.capability,
          ]),
        };
      }
      if (op === "add") {
        let result: unknown;
        if (typeof left.value === "number" && typeof right.value === "number") {
          result = left.value + right.value;
        } else if (typeof left.value === "string" || typeof right.value === "string") {
          result = `${toDisplayText(left.value)}${toDisplayText(right.value)}`;
        } else if (Array.isArray(left.value) && Array.isArray(right.value)) {
          result = [...left.value, ...right.value];
        } else {
          throw new PlannerError("Unsupported operands for add.", true);
        }
        return {
          value: result,
          capability: mergeCapabilities([
            createUserCapability(),
            left.capability,
            right.capability,
          ]),
        };
      }
      if (op === "sub" || op === "mul" || op === "div" || op === "mod") {
        let result: unknown;
        if (op === "mul") {
          if (typeof left.value === "string" && typeof right.value === "number") {
            result = left.value.repeat(Math.max(0, Math.trunc(right.value)));
          } else if (typeof right.value === "string" && typeof left.value === "number") {
            result = right.value.repeat(Math.max(0, Math.trunc(left.value)));
          } else {
            const leftNumber = toNumber(left.value, "mul left");
            const rightNumber = toNumber(right.value, "mul right");
            result = leftNumber * rightNumber;
          }
        } else {
          const leftNumber = toNumber(left.value, `${op} left`);
          const rightNumber = toNumber(right.value, `${op} right`);
          if (op === "sub") {
            result = leftNumber - rightNumber;
          } else if (op === "div") {
            result = leftNumber / rightNumber;
          } else {
            result = leftNumber % rightNumber;
          }
        }
        return {
          value: result,
          capability: mergeCapabilities([
            createUserCapability(),
            left.capability,
            right.capability,
          ]),
        };
      }
      if (op === "is" || op === "is_not") {
        const result =
          op === "is" ? Object.is(left.value, right.value) : !Object.is(left.value, right.value);
        return {
          value: result,
          capability: mergeCapabilities([
            createUserCapability(),
            left.capability,
            right.capability,
          ]),
        };
      }
      const result = evaluateComparatorOp(op, left.value, right.value);
      return {
        value: result,
        capability: mergeCapabilities([createUserCapability(), left.capability, right.capability]),
      };
    }
    if (typeof value.$var === "string") {
      return resolveVarReference(value.$var, vars);
    }
    const out: Record<string, unknown> = {};
    const caps: CamelCapability[] = [];
    for (const [key, entry] of Object.entries(value)) {
      const resolved = resolveInput(entry, vars);
      out[key] = resolved.value;
      caps.push(resolved.capability);
    }
    return {
      value: out,
      capability: mergeCapabilities([createUserCapability(), ...caps]),
    };
  }
  if (typeof value === "string" && value.includes("{{")) {
    return renderTemplate(value, vars);
  }
  return {
    value,
    capability: createUserCapability(),
  };
}

function resolveToolArgs(
  rawArgs: Record<string, unknown>,
  vars: Map<string, CamelRuntimeValue>,
): {
  args: Record<string, unknown>;
  argCapabilities: Record<string, CamelCapability>;
  combinedCapability: CamelCapability;
} {
  const args: Record<string, unknown> = {};
  const argCapabilities: Record<string, CamelCapability> = {};
  const dependencies: CamelCapability[] = [];
  for (const [key, value] of Object.entries(rawArgs)) {
    const resolved = resolveInput(value, vars);
    args[key] = resolved.value;
    argCapabilities[key] = resolved.capability;
    dependencies.push(resolved.capability);
  }
  return {
    args,
    argCapabilities,
    combinedCapability: mergeCapabilities(dependencies),
  };
}

const SCHEMA_FIELD_TYPES = new Set<CamelSchemaFieldType>([
  "string",
  "number",
  "integer",
  "boolean",
  "email",
  "datetime",
  "array",
  "object",
]);

const SIMPLE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function coerceSchemaFieldValue(params: {
  value: unknown;
  field: CamelSchemaField;
  path: string;
}): unknown {
  const { value, field, path } = params;
  switch (field.type) {
    case "string":
      if (value === null || value === undefined) {
        throw new PlannerError(`Missing value for schema field "${path}".`, true);
      }
      return typeof value === "string" ? value : toDisplayText(value);
    case "email": {
      if (value === null || value === undefined) {
        throw new PlannerError(`Missing value for schema field "${path}".`, true);
      }
      const text = typeof value === "string" ? value.trim() : toDisplayText(value).trim();
      if (!SIMPLE_EMAIL_RE.test(text)) {
        throw new PlannerError(`Invalid email for schema field "${path}".`, true);
      }
      return text;
    }
    case "datetime": {
      if (value === null || value === undefined) {
        throw new PlannerError(`Missing value for schema field "${path}".`, true);
      }
      const text = typeof value === "string" ? value.trim() : toDisplayText(value).trim();
      if (!text || Number.isNaN(Date.parse(text))) {
        throw new PlannerError(`Invalid datetime for schema field "${path}".`, true);
      }
      return text;
    }
    case "number": {
      const parsed = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(parsed)) {
        throw new PlannerError(`Invalid number for schema field "${path}".`, true);
      }
      return parsed;
    }
    case "integer": {
      const parsed = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
        throw new PlannerError(`Invalid integer for schema field "${path}".`, true);
      }
      return parsed;
    }
    case "boolean":
      if (typeof value === "boolean") {
        return value;
      }
      if (typeof value === "string") {
        const lowered = value.trim().toLowerCase();
        if (lowered === "true") {
          return true;
        }
        if (lowered === "false") {
          return false;
        }
      }
      if (typeof value === "number") {
        if (value === 1) {
          return true;
        }
        if (value === 0) {
          return false;
        }
      }
      throw new PlannerError(`Invalid boolean for schema field "${path}".`, true);
    case "array": {
      if (!Array.isArray(value)) {
        throw new PlannerError(`Invalid array for schema field "${path}".`, true);
      }
      const itemField = field.items ?? { type: "string" };
      return value.map((entry, index) =>
        coerceSchemaFieldValue({
          value: entry,
          field: itemField,
          path: `${path}[${index}]`,
        }),
      );
    }
    case "object": {
      if (!isRecord(value)) {
        throw new PlannerError(`Invalid object for schema field "${path}".`, true);
      }
      if (!field.properties) {
        return value;
      }
      const out: Record<string, unknown> = {};
      for (const [key, child] of Object.entries(field.properties)) {
        const childValue = value[key];
        if (childValue === undefined || childValue === null) {
          if (child.required) {
            throw new PlannerError(`Missing required schema field "${path}.${key}".`, true);
          }
          continue;
        }
        out[key] = coerceSchemaFieldValue({
          value: childValue,
          field: child,
          path: `${path}.${key}`,
        });
      }
      for (const [key, entry] of Object.entries(value)) {
        if (!(key in out)) {
          out[key] = entry;
        }
      }
      return out;
    }
    default:
      return value;
  }
}

function coerceStructuredBySchema(
  value: Record<string, unknown>,
  schema: CamelStructuredSchema,
): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [name, field] of Object.entries(schema.fields)) {
    const fieldValue = value[name];
    if (fieldValue === undefined || fieldValue === null) {
      if (field.required) {
        throw new PlannerError(`Missing required schema field "${name}".`, true);
      }
      continue;
    }
    output[name] = coerceSchemaFieldValue({
      value: fieldValue,
      field,
      path: name,
    });
  }
  for (const [key, entry] of Object.entries(value)) {
    if (!(key in output)) {
      output[key] = entry;
    }
  }
  return output;
}

function normalizeSchemaField(value: unknown): CamelSchemaField {
  if (!isRecord(value)) {
    return { type: "string" };
  }
  const type =
    typeof value.type === "string" && SCHEMA_FIELD_TYPES.has(value.type as CamelSchemaFieldType)
      ? (value.type as CamelSchemaFieldType)
      : "string";
  const field: CamelSchemaField = {
    type,
    description: typeof value.description === "string" ? value.description : undefined,
    required: typeof value.required === "boolean" ? value.required : undefined,
  };
  if (isRecord(value.items)) {
    field.items = normalizeSchemaField(value.items);
  }
  if (isRecord(value.properties)) {
    const props: Record<string, CamelSchemaField> = {};
    for (const [key, entry] of Object.entries(value.properties)) {
      props[key] = normalizeSchemaField(entry);
    }
    field.properties = props;
  }
  return field;
}

function normalizeStructuredSchema(
  value: unknown,
  fallbackFieldName = "output",
): CamelStructuredSchema {
  if (!isRecord(value) || !isRecord(value.fields)) {
    return {
      fields: {
        [fallbackFieldName]: {
          type: "string",
          required: true,
        },
      },
    };
  }
  const fields: Record<string, CamelSchemaField> = {};
  for (const [name, fieldValue] of Object.entries(value.fields)) {
    fields[name] = normalizeSchemaField(fieldValue);
  }
  if (Object.keys(fields).length === 0) {
    fields[fallbackFieldName] = { type: "string", required: true };
  }
  return {
    description: typeof value.description === "string" ? value.description : undefined,
    fields,
  };
}

function plannerValidationError(path: string, message: string): PlannerError {
  return new PlannerError(`Planner validation error at ${path}: ${message}`, true);
}

function asPlannerRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw plannerValidationError(path, "expected object.");
  }
  return value;
}

function asPlannerString(value: unknown, path: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw plannerValidationError(path, "expected non-empty string.");
  }
  return value;
}

function asPlannerStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) {
    throw plannerValidationError(path, "expected string array.");
  }
  const output: string[] = [];
  value.forEach((entry, index) => {
    if (typeof entry !== "string" || !entry.trim()) {
      throw plannerValidationError(`${path}[${index}]`, "expected non-empty string.");
    }
    output.push(entry);
  });
  if (output.length === 0) {
    throw plannerValidationError(path, "must not be empty.");
  }
  return output;
}

function asPlannerSourceLocation(
  value: unknown,
  path: string,
): CamelPlannerSourceLocation | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = asPlannerRecord(value, path);
  const line = parsed.line;
  const column = parsed.column;
  const lineText = parsed.lineText;
  if (!Number.isFinite(line) || typeof line !== "number" || line <= 0) {
    throw plannerValidationError(`${path}.line`, "expected positive number when provided.");
  }
  if (
    column !== undefined &&
    (!Number.isFinite(column) || typeof column !== "number" || column <= 0)
  ) {
    throw plannerValidationError(`${path}.column`, "expected positive number when provided.");
  }
  if (lineText !== undefined && typeof lineText !== "string") {
    throw plannerValidationError(`${path}.lineText`, "expected string when provided.");
  }
  return {
    line: Math.trunc(line),
    column:
      typeof column === "number" && Number.isFinite(column) && column > 0 ? Math.trunc(column) : 1,
    lineText,
  };
}

function asPlannerStepArray(value: unknown, path: string): CamelPlannerStep[] {
  if (!Array.isArray(value)) {
    throw plannerValidationError(path, "expected step array.");
  }
  return value.map((entry, index) => normalizePlannerStep(entry, `${path}[${index}]`));
}

function normalizePlannerStep(step: unknown, path: string): CamelPlannerStep {
  const parsed = asPlannerRecord(step, path);
  const kind = asPlannerString(parsed.kind, `${path}.kind`);

  if (kind === "assign") {
    if (!Object.hasOwn(parsed, "value")) {
      throw plannerValidationError(`${path}.value`, "missing value.");
    }
    return {
      kind: "assign",
      saveAs: asPlannerString(parsed.saveAs, `${path}.saveAs`),
      value: parsed.value,
    };
  }

  if (kind === "unpack") {
    if (!Object.hasOwn(parsed, "value")) {
      throw plannerValidationError(`${path}.value`, "missing value.");
    }
    return {
      kind: "unpack",
      targets: asPlannerStringArray(parsed.targets, `${path}.targets`),
      value: parsed.value,
    };
  }

  if (kind === "tool") {
    if (parsed.args !== undefined && !isRecord(parsed.args)) {
      throw plannerValidationError(`${path}.args`, "expected object when provided.");
    }
    if (parsed.saveAs !== undefined && typeof parsed.saveAs !== "string") {
      throw plannerValidationError(`${path}.saveAs`, "expected string when provided.");
    }
    if (parsed.summary !== undefined && typeof parsed.summary !== "string") {
      throw plannerValidationError(`${path}.summary`, "expected string when provided.");
    }
    return {
      kind: "tool",
      tool: asPlannerString(parsed.tool, `${path}.tool`),
      args: parsed.args,
      saveAs: parsed.saveAs,
      summary: parsed.summary,
      sourceLocation: asPlannerSourceLocation(parsed.sourceLocation, `${path}.sourceLocation`),
    };
  }

  if (kind === "qllm") {
    if (!Object.hasOwn(parsed, "input")) {
      throw plannerValidationError(`${path}.input`, "missing input.");
    }
    const schema = normalizeStructuredSchema(parsed.schema, "output");
    return {
      kind: "qllm",
      instruction: asPlannerString(parsed.instruction, `${path}.instruction`),
      input: parsed.input,
      schema,
      saveAs: asPlannerString(parsed.saveAs, `${path}.saveAs`),
    };
  }

  if (kind === "if") {
    if (!Object.hasOwn(parsed, "condition")) {
      throw plannerValidationError(`${path}.condition`, "missing condition.");
    }
    const thenValue = parsed.thenBranch ?? parsed.then;
    return {
      kind: "if",
      condition: parsed.condition,
      thenBranch: asPlannerStepArray(thenValue, `${path}.thenBranch`),
      otherwise:
        parsed.otherwise === undefined
          ? undefined
          : asPlannerStepArray(parsed.otherwise, `${path}.otherwise`),
    };
  }

  if (kind === "for") {
    if (!Object.hasOwn(parsed, "iterable")) {
      throw plannerValidationError(`${path}.iterable`, "missing iterable.");
    }
    const item =
      typeof parsed.item === "string"
        ? parsed.item
        : Array.isArray(parsed.item)
          ? asPlannerStringArray(parsed.item, `${path}.item`)
          : null;
    if (!item || (typeof item === "string" && !item.trim())) {
      throw plannerValidationError(`${path}.item`, "expected string or string array.");
    }
    return {
      kind: "for",
      item,
      iterable: parsed.iterable,
      body: asPlannerStepArray(parsed.body, `${path}.body`),
    };
  }

  if (kind === "raise") {
    if (!Object.hasOwn(parsed, "error")) {
      throw plannerValidationError(`${path}.error`, "missing error.");
    }
    return {
      kind: "raise",
      error: parsed.error,
    };
  }

  if (kind === "final") {
    return {
      kind: "final",
      text: asPlannerString(parsed.text, `${path}.text`),
    };
  }

  throw plannerValidationError(`${path}.kind`, `unsupported step kind "${kind}".`);
}

function normalizeProgram(program: unknown): CamelPlannerProgram {
  const parsed = isRecord(program) ? program : null;
  if (!parsed || parsed.steps === undefined) {
    throw new PlannerError("Planner response is missing `steps`.", true);
  }
  const steps = asPlannerStepArray(parsed.steps, "steps");
  if (steps.length === 0) {
    throw new PlannerError("Planner returned an empty plan.", true);
  }
  if (steps.length > CAMEL_MAX_STEPS) {
    throw new PlannerError(`Planner returned too many steps (${steps.length}).`, true);
  }
  return {
    rationale: typeof parsed.rationale === "string" ? parsed.rationale : undefined,
    steps,
  };
}

function createToolIndex(tools: AnyAgentTool[]): Map<string, AnyAgentTool> {
  const index = new Map<string, AnyAgentTool>();
  for (const tool of tools) {
    const name = tool.name?.trim().toLowerCase();
    if (!name) {
      continue;
    }
    index.set(name, tool);
  }
  return index;
}

function summarizeAllowedTools(allowedToolNames: Set<string>): string {
  const sorted = [...allowedToolNames].toSorted();
  if (sorted.length === 0) {
    return "(none)";
  }
  if (sorted.length <= 16) {
    return sorted.join(", ");
  }
  return `${sorted.slice(0, 16).join(", ")}, ... (+${sorted.length - 16} more)`;
}

function formatSourceLocation(location?: CamelPlannerSourceLocation): string {
  if (!location || !Number.isFinite(location.line) || location.line <= 0) {
    return "";
  }
  if (Number.isFinite(location.column) && location.column > 0) {
    return ` (line ${location.line}, column ${location.column})`;
  }
  return ` (line ${location.line})`;
}

function buildAllowedToolNames(params: {
  toolIndex: Map<string, AnyAgentTool>;
  clientToolNames?: Set<string>;
}): Set<string> {
  const allowed = new Set<string>(CAMEL_VIRTUAL_TOOL_NAMES);
  for (const toolName of params.toolIndex.keys()) {
    const normalized = toolName.trim().toLowerCase();
    if (normalized) {
      allowed.add(normalized);
    }
  }
  for (const toolName of params.clientToolNames ?? []) {
    const normalized = toolName.trim().toLowerCase();
    if (normalized) {
      allowed.add(normalized);
    }
  }
  return allowed;
}

function validatePlannerToolUsage(params: {
  steps: CamelPlannerStep[];
  allowedToolNames: Set<string>;
  path?: string;
}): void {
  const walk = (steps: CamelPlannerStep[], path: string): void => {
    steps.forEach((step, index) => {
      const stepPath = `${path}[${index}]`;
      if (step.kind === "tool") {
        const normalizedToolName = step.tool.trim().toLowerCase();
        if (!normalizedToolName) {
          throw plannerValidationError(`${stepPath}.tool`, "expected non-empty string.");
        }
        if (!params.allowedToolNames.has(normalizedToolName)) {
          const locationText = formatSourceLocation(step.sourceLocation);
          const allowedSummary = summarizeAllowedTools(params.allowedToolNames);
          throw plannerValidationError(
            `${stepPath}.tool`,
            `unknown tool "${normalizedToolName}"${locationText}. Allowed tools: ${allowedSummary}.`,
          );
        }
        return;
      }
      if (step.kind === "if") {
        walk(step.thenBranch, `${stepPath}.thenBranch`);
        if (step.otherwise) {
          walk(step.otherwise, `${stepPath}.otherwise`);
        }
        return;
      }
      if (step.kind === "for") {
        walk(step.body, `${stepPath}.body`);
      }
    });
  };

  walk(params.steps, params.path ?? "steps");
}

function summarizeHistoryText(history: string): string {
  const trimmed = history.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.length <= 12_000) {
    return trimmed;
  }
  const head = trimmed.slice(0, 8_000);
  const tail = trimmed.slice(-3_500);
  return `${head}\n\n...[history truncated]...\n\n${tail}`;
}

async function callModel(params: {
  model: Model<Api>;
  runtimeApiKey?: string;
  systemPrompt?: string;
  messages: Message[];
  maxTokens: number;
  signal?: AbortSignal;
}): Promise<{ message: AssistantMessage; usage?: NormalizedUsage; text: string }> {
  const message = (await completeSimple(
    params.model,
    {
      systemPrompt: params.systemPrompt,
      messages: params.messages,
    },
    {
      apiKey: params.runtimeApiKey,
      maxTokens: params.maxTokens,
      temperature: 0,
      signal: params.signal,
    },
  )) as AssistantMessage | undefined;
  if (!message || typeof message !== "object") {
    throw new PlannerError("Model returned an empty response.", true);
  }
  return {
    message,
    usage: normalizeUsage((message.usage as UsageLike | undefined) ?? undefined),
    text: extractAssistantText(message),
  };
}

function userTextMessage(text: string): UserMessage {
  return {
    role: "user",
    content: text,
    timestamp: Date.now(),
  };
}

function sanitizeIssueMessage(message: string): string {
  const cleaned = message.trim();
  if (!cleaned) {
    return "execution failed";
  }
  if (cleaned.length <= 400) {
    return cleaned;
  }
  return `${cleaned.slice(0, 400)}...`;
}

function resolveMaxPlanRetries(configured?: number): number {
  const parsedConfigured =
    typeof configured === "number" && Number.isFinite(configured) && configured > 0
      ? Math.trunc(configured)
      : undefined;
  const rawEnv = process.env.OPENCLAW_CAMEL_MAX_PLAN_RETRIES?.trim();
  const parsedEnv = rawEnv && /^\d+$/.test(rawEnv) ? Number.parseInt(rawEnv, 10) : undefined;
  const candidate = parsedConfigured ?? parsedEnv ?? CAMEL_DEFAULT_MAX_PLAN_RETRIES;
  const bounded = Math.max(1, Math.min(CAMEL_MAX_PLAN_RETRIES_LIMIT, candidate));
  return Number.isFinite(bounded) ? Math.trunc(bounded) : CAMEL_DEFAULT_MAX_PLAN_RETRIES;
}

export async function runCamelRuntime(params: CamelRuntimeParams): Promise<CamelRuntimeResult> {
  const usageEntries: Array<NormalizedUsage | undefined> = [];
  const vars = new Map<string, CamelRuntimeValue>();
  const strictDependencyCapabilities: CamelCapability[] = [];
  const toolIndex = createToolIndex(params.tools);
  const issues: CamelPlannerIssue[] = [];
  const trace: CamelExecutionEvent[] = [];
  const toolMetas: Array<{ toolName: string; meta?: string }> = [];
  const assistantTexts: string[] = [];
  const messagingToolSentTexts: string[] = [];
  const messagingToolSentTargets: MessagingToolSend[] = [];
  const shouldEmitToolResult = params.shouldEmitToolResult ?? (() => false);
  const shouldEmitToolOutput = params.shouldEmitToolOutput ?? (() => false);
  let didSendViaMessagingTool = false;
  let lastAssistant: AssistantMessage | undefined;
  let lastToolError: { toolName: string; meta?: string; error?: string } | undefined;
  let clientToolCall: { name: string; params: Record<string, unknown> } | undefined;
  let finalText: string | undefined;
  let globalStep = 0;
  const evalMode: CamelEvalMode = params.evalMode ?? "strict";
  const maxPlanRetries = resolveMaxPlanRetries(params.maxPlanRetries);
  const allowedToolNames = buildAllowedToolNames({
    toolIndex,
    clientToolNames: params.clientToolNames,
  });

  const effectiveStrictControlCapability = (base: CamelCapability): CamelCapability => {
    if (evalMode !== "strict" || strictDependencyCapabilities.length === 0) {
      return base;
    }
    return mergeCapabilities([base, ...strictDependencyCapabilities]);
  };

  emitAgentEvent({
    runId: params.runId,
    stream: "lifecycle",
    data: { phase: "start", runtime: "camel" },
  });
  void params.onAgentEvent?.({
    stream: "lifecycle",
    data: { phase: "start", runtime: "camel" },
  });

  const runQllmExtraction = async (options: {
    stepIndex: number;
    saveAs: string;
    instruction: string;
    input: unknown;
    inputCapability: CamelCapability;
    schema: CamelStructuredSchema;
  }): Promise<{ structured: Record<string, unknown>; capability: CamelCapability }> => {
    const prompt = buildCamelQllmPrompt({
      instruction: options.instruction,
      input: toDisplayText(options.input),
      schema: options.schema,
    });
    let structured: Record<string, unknown> | undefined;
    for (let attempt = 0; attempt < CAMEL_QLLM_RETRIES; attempt += 1) {
      const qllm = await callModel({
        model: params.model,
        runtimeApiKey: params.runtimeApiKey,
        messages: [userTextMessage(prompt)],
        maxTokens: CAMEL_QLLM_MAX_TOKENS,
        signal: params.abortSignal,
      });
      usageEntries.push(qllm.usage);
      const parsed = parseJsonPayload<Record<string, unknown>>(qllm.text, "qllm output");
      if (parsed.have_enough_information === false) {
        if (attempt === CAMEL_QLLM_RETRIES - 1) {
          throw new PlannerError("Quarantined extraction did not have enough information.", true);
        }
        continue;
      }
      const { have_enough_information: _enough, ...extracted } = parsed;
      try {
        structured = coerceStructuredBySchema(extracted, options.schema);
        break;
      } catch (err) {
        if (attempt === CAMEL_QLLM_RETRIES - 1) {
          throw err;
        }
      }
    }
    if (!structured) {
      throw new PlannerError("Quarantined extraction failed to return structured output.", true);
    }
    const outputCapability = capabilityFromQllmOutput({
      sourceName: options.saveAs,
      inputCapability: options.inputCapability,
    });
    trace.push({
      type: "qllm",
      step: options.stepIndex,
      saveAs: options.saveAs,
      output: structured,
      capability: outputCapability,
    });
    return {
      structured,
      capability: outputCapability,
    };
  };

  const executeTool = async (options: {
    stepIndex: number;
    toolName: string;
    rawArgs: Record<string, unknown>;
    saveAs?: string;
    controlCapability: CamelCapability;
  }) => {
    const toolName = options.toolName.trim().toLowerCase();
    const { args, argCapabilities, combinedCapability } = resolveToolArgs(options.rawArgs, vars);
    const controlCapability = effectiveStrictControlCapability(options.controlCapability);
    const argsCapability =
      evalMode === "strict"
        ? mergeCapabilities([combinedCapability, controlCapability])
        : combinedCapability;
    if (toolName === "query_ai_assistant" && evalMode === "strict") {
      strictDependencyCapabilities.push(combinedCapability);
    }
    const policy = evaluateCamelPolicy({
      toolName,
      args,
      controlCapability,
      argCapabilities,
    });

    if (!policy.allowed) {
      trace.push({
        type: "tool",
        step: options.stepIndex,
        tool: toolName,
        args,
        blocked: true,
        reason: policy.reason,
      });
      lastToolError = {
        toolName,
        error: policy.reason,
      };
      assistantTexts.push(policy.reason);
      return { stop: true };
    }

    if (params.clientToolNames?.has(toolName)) {
      clientToolCall = {
        name: toolName,
        params: args,
      };
      return { stop: true };
    }

    if (toolName === "print") {
      const printed = toDisplayText(args.text ?? args.value ?? args.arg0 ?? "");
      if (printed.trim()) {
        assistantTexts.push(printed.trim());
      }
      return { stop: false };
    }

    if (toolName === "query_ai_assistant") {
      const instruction =
        typeof args.query === "string"
          ? args.query.trim()
          : typeof args.instruction === "string"
            ? args.instruction.trim()
            : typeof args.prompt === "string"
              ? args.prompt.trim()
              : typeof args.arg0 === "string"
                ? args.arg0.trim()
                : "";
      if (!instruction) {
        throw new PlannerError(
          "query_ai_assistant requires a non-empty `query`/`instruction`.",
          true,
        );
      }
      const inputPayload =
        args.input ?? args.data ?? args.payload ?? args.context ?? args.text ?? args.arg1 ?? args;
      const schemaPayload = args.schema ?? args.output_schema ?? args.outputSchema ?? args.arg2;
      const schema = normalizeStructuredSchema(schemaPayload, "output");
      const saveAs = sanitizeVariableName(options.saveAs ?? `qllm_${options.stepIndex}`);
      const extraction = await runQllmExtraction({
        stepIndex: options.stepIndex,
        saveAs,
        instruction,
        input: inputPayload,
        inputCapability: argsCapability,
        schema,
      });
      toolMetas.push({
        toolName,
        meta: instruction.length > 120 ? `${instruction.slice(0, 120)}...` : instruction,
      });
      if (options.saveAs) {
        vars.set(saveAs, {
          value: extraction.structured,
          capability: extraction.capability,
        });
      }
      return { stop: false };
    }

    const tool = toolIndex.get(toolName);
    if (!tool) {
      throw new PlannerError(`Unknown tool: ${toolName}`, true);
    }

    const toolCallId = `camel_${options.stepIndex}_${Date.now().toString(36)}`;
    const meta = inferToolMetaFromArgs(toolName, args);
    toolMetas.push({ toolName, meta });

    emitAgentEvent({
      runId: params.runId,
      stream: "tool",
      data: { phase: "start", name: toolName, toolCallId, args },
    });
    void params.onAgentEvent?.({
      stream: "tool",
      data: { phase: "start", name: toolName, toolCallId },
    });

    let result: AgentToolResult<unknown>;
    try {
      result = await tool.execute(toolCallId, args, params.abortSignal, undefined);
    } catch (err) {
      const message = err instanceof Error ? err.message : toDisplayText(err);
      result = jsonResult({
        status: "error",
        tool: toolName,
        error: message,
      });
    }

    const sanitizedResult = sanitizeToolResult(result) as AgentToolResult<unknown>;
    const isError = isToolResultError(sanitizedResult);
    const outputText = extractToolResultText(sanitizedResult);
    if (isError) {
      lastToolError = {
        toolName,
        meta,
        error: extractToolErrorMessage(sanitizedResult),
      };
    }

    if (isMessagingTool(toolName) && isMessagingToolSendAction(toolName, args) && !isError) {
      didSendViaMessagingTool = true;
      const text =
        typeof args.content === "string"
          ? args.content
          : typeof args.message === "string"
            ? args.message
            : undefined;
      if (text) {
        messagingToolSentTexts.push(text);
      }
      const target = extractMessagingToolSend(toolName, args);
      if (target) {
        messagingToolSentTargets.push(target);
      }
    }

    emitAgentEvent({
      runId: params.runId,
      stream: "tool",
      data: {
        phase: "result",
        name: toolName,
        toolCallId,
        isError,
        result: sanitizedResult,
      },
    });
    void params.onAgentEvent?.({
      stream: "tool",
      data: {
        phase: "result",
        name: toolName,
        toolCallId,
        isError,
      },
    });

    if (params.onToolResult && shouldEmitToolResult()) {
      const summaryText = meta ? `${toolName}: ${meta}` : toolName;
      await params.onToolResult({ text: summaryText });
    }
    if (params.onToolResult && shouldEmitToolOutput() && outputText) {
      await params.onToolResult({ text: outputText });
    }

    const outputCapability = capabilityFromToolResult({
      toolName,
      result: sanitizedResult,
      inputCapability: argsCapability,
    });
    if (options.saveAs) {
      vars.set(sanitizeVariableName(options.saveAs), {
        value: sanitizedResult.details ?? outputText ?? sanitizedResult,
        capability: outputCapability,
      });
    }

    trace.push({
      type: "tool",
      step: options.stepIndex,
      tool: toolName,
      args,
      result: sanitizedResult,
      capability: outputCapability,
    });
    return { stop: false };
  };

  const executeSteps = async (
    steps: CamelPlannerStep[],
    controlCaps: CamelCapability[],
  ): Promise<{ stop: boolean }> => {
    for (const step of steps) {
      globalStep += 1;
      if (globalStep > CAMEL_MAX_STEPS) {
        throw new PlannerError(`Plan exceeded max steps (${CAMEL_MAX_STEPS}).`, true);
      }
      if (params.abortSignal?.aborted) {
        throw new PlannerError("aborted", true);
      }
      const controlCapability = mergeCapabilities([createCamelCapability(), ...controlCaps]);
      if (!step || typeof step !== "object" || !("kind" in step)) {
        throw new PlannerError("Invalid step payload.", true);
      }
      if (step.kind === "assign") {
        const resolved = resolveInput(step.value, vars);
        const combined =
          evalMode === "strict"
            ? mergeCapabilities([resolved.capability, controlCapability])
            : resolved.capability;
        vars.set(sanitizeVariableName(step.saveAs), {
          value: resolved.value,
          capability: combined,
        });
        trace.push({
          type: "assign",
          step: globalStep,
          saveAs: step.saveAs,
        });
        continue;
      }
      if (step.kind === "unpack") {
        const resolved = resolveInput(step.value, vars);
        const targets = step.targets.map((entry) => sanitizeVariableName(entry)).filter(Boolean);
        if (targets.length === 0) {
          throw new PlannerError("Invalid unpack targets.", true);
        }
        const combined =
          evalMode === "strict"
            ? mergeCapabilities([resolved.capability, controlCapability])
            : resolved.capability;
        bindTargets({
          targets,
          value: resolved.value,
          capability: combined,
          vars,
          mismatchLabel: "Unpack target count mismatch",
        });
        targets.forEach((target) => {
          trace.push({
            type: "assign",
            step: globalStep,
            saveAs: target,
          });
        });
        continue;
      }
      if (step.kind === "tool") {
        const toolResult = await executeTool({
          stepIndex: globalStep,
          toolName: step.tool,
          rawArgs: step.args ?? {},
          saveAs: step.saveAs,
          controlCapability,
        });
        if (toolResult.stop) {
          return { stop: true };
        }
        continue;
      }
      if (step.kind === "qllm") {
        const resolvedInput = resolveInput(step.input, vars);
        if (evalMode === "strict") {
          strictDependencyCapabilities.push(resolvedInput.capability);
        }
        const combinedInputCapability =
          evalMode === "strict"
            ? mergeCapabilities([resolvedInput.capability, controlCapability])
            : resolvedInput.capability;
        const extraction = await runQllmExtraction({
          stepIndex: globalStep,
          saveAs: step.saveAs,
          instruction: step.instruction,
          input: resolvedInput.value,
          inputCapability: combinedInputCapability,
          schema: step.schema,
        });
        vars.set(sanitizeVariableName(step.saveAs), {
          value: extraction.structured,
          capability: extraction.capability,
        });
        continue;
      }
      if (step.kind === "if") {
        const resolved = resolveInput(step.condition, vars);
        const control =
          evalMode === "strict"
            ? mergeCapabilities([resolved.capability, controlCapability])
            : controlCapability;
        const legacyThenRaw = (step as unknown as Record<string, unknown>).then;
        const legacyThen = Array.isArray(legacyThenRaw)
          ? (legacyThenRaw as CamelPlannerStep[])
          : undefined;
        const branch = resolved.value
          ? (step.thenBranch ?? legacyThen ?? [])
          : (step.otherwise ?? []);
        const nested = await executeSteps(branch, [...controlCaps, control]);
        if (nested.stop) {
          return nested;
        }
        continue;
      }
      if (step.kind === "for") {
        const iterable = resolveInput(step.iterable, vars);
        const entries = toIterableArray(iterable.value);
        const loopControl =
          evalMode === "strict"
            ? mergeCapabilities([iterable.capability, controlCapability])
            : controlCapability;
        const itemCapability =
          evalMode === "strict"
            ? mergeCapabilities([iterable.capability, loopControl])
            : iterable.capability;
        const itemTargets = normalizeTargetNames(step.item);
        for (const entry of entries) {
          bindTargets({
            targets: itemTargets,
            value: entry,
            capability: itemCapability,
            vars,
            mismatchLabel: "Loop unpack mismatch",
          });
          const nested = await executeSteps(step.body, [...controlCaps, loopControl]);
          if (nested.stop) {
            return nested;
          }
        }
        continue;
      }
      if (step.kind === "raise") {
        const errorValue = resolveInput(step.error, vars);
        const message = toDisplayText(errorValue.value).trim() || "raised error";
        throw new PlannerError(`CaMeL raised exception: ${message}`, errorValue.capability.trusted);
      }
      if (step.kind === "final") {
        const rendered = renderTemplate(step.text, vars);
        finalText = rendered.value.trim();
        if (finalText) {
          assistantTexts.push(finalText);
        }
        trace.push({
          type: "final",
          step: globalStep,
          text: finalText,
        });
        return { stop: true };
      }
      throw new PlannerError(
        `Unsupported step kind: ${(step as { kind?: string }).kind ?? "?"}`,
        true,
      );
    }
    return { stop: false };
  };

  let completed = false;
  const plannerMessages: Message[] = [
    userTextMessage(
      buildCamelPlannerPrompt({
        userPrompt: params.prompt,
        history: summarizeHistoryText(params.history),
        tools: params.tools,
        priorIssues: issues,
        extraSystemPrompt: params.extraSystemPrompt,
      }),
    ),
  ];
  for (let attempt = 0; attempt < maxPlanRetries; attempt += 1) {
    const planner = await callModel({
      model: params.model,
      runtimeApiKey: params.runtimeApiKey,
      messages: plannerMessages,
      maxTokens: CAMEL_PLANNER_MAX_TOKENS,
      signal: params.abortSignal,
    });
    usageEntries.push(planner.usage);
    plannerMessages.push(planner.message);
    let program: CamelPlannerProgram;
    try {
      try {
        const codeSteps = parseCamelProgramToSteps(planner.text);
        program = normalizeProgram({ steps: codeSteps });
      } catch (codeErr) {
        try {
          const parsedPlan = parseJsonPayload<unknown>(planner.text, "planner output");
          program = normalizeProgram(parsedPlan);
        } catch (jsonErr) {
          const err = jsonErr instanceof CamelJsonParseError ? codeErr : jsonErr;
          throw err;
        }
      }
      validatePlannerToolUsage({
        steps: program.steps,
        allowedToolNames,
      });
    } catch (err) {
      const trusted = err instanceof PlannerError ? err.trusted : true;
      const message = sanitizeIssueMessage(err instanceof Error ? err.message : toDisplayText(err));
      issues.push({
        stage: "plan",
        message: trusted ? message : "untrusted planner error (redacted)",
        trusted,
      });
      if (attempt === maxPlanRetries - 1) {
        throw err;
      }
      plannerMessages.push(
        userTextMessage(
          buildCamelPlannerRepairPrompt({
            userPrompt: params.prompt,
            priorIssues: issues,
          }),
        ),
      );
      continue;
    }
    try {
      const result = await executeSteps(program.steps, []);
      if (result.stop) {
        completed = true;
      } else {
        issues.push({
          stage: "execute",
          message: "plan completed without final response",
          trusted: true,
        });
      }
      if (completed || clientToolCall || lastToolError) {
        break;
      }
      if (attempt < maxPlanRetries - 1) {
        plannerMessages.push(
          userTextMessage(
            buildCamelPlannerRepairPrompt({
              userPrompt: params.prompt,
              priorIssues: issues,
            }),
          ),
        );
      }
    } catch (err) {
      const trusted = err instanceof PlannerError ? err.trusted : true;
      const message = sanitizeIssueMessage(err instanceof Error ? err.message : toDisplayText(err));
      issues.push({
        stage: "execute",
        message: trusted ? message : "untrusted execution error (redacted)",
        trusted,
      });
      if (attempt === maxPlanRetries - 1) {
        throw err;
      }
      plannerMessages.push(
        userTextMessage(
          buildCamelPlannerRepairPrompt({
            userPrompt: params.prompt,
            priorIssues: issues,
          }),
        ),
      );
    }
  }

  if (!finalText && !clientToolCall) {
    const finalPrompt = buildCamelFinalReplyPrompt({
      userPrompt: params.prompt,
      trace,
      lastDraft: assistantTexts.at(-1),
    });
    const final = await callModel({
      model: params.model,
      runtimeApiKey: params.runtimeApiKey,
      messages: [userTextMessage(finalPrompt)],
      maxTokens: CAMEL_FINAL_MAX_TOKENS,
      signal: params.abortSignal,
    });
    usageEntries.push(final.usage);
    finalText = final.text.trim();
    if (finalText) {
      assistantTexts.push(finalText);
    }
    lastAssistant = final.message;
  }

  if (!lastAssistant) {
    const text = (finalText ?? assistantTexts.at(-1) ?? "").trim();
    lastAssistant = {
      role: "assistant",
      content: text ? [{ type: "text", text }] : [],
      stopReason: "stop",
      provider: params.provider,
      model: params.modelId,
      timestamp: Date.now(),
      usage: aggregateUsage(usageEntries),
    } as AssistantMessage;
  } else if (!lastAssistant.provider || !lastAssistant.model) {
    lastAssistant = {
      ...lastAssistant,
      provider: lastAssistant.provider ?? params.provider,
      model: lastAssistant.model ?? params.modelId,
    };
  }

  emitAgentEvent({
    runId: params.runId,
    stream: "lifecycle",
    data: {
      phase: "end",
      runtime: "camel",
      blocked: Boolean(lastToolError),
    },
  });
  void params.onAgentEvent?.({
    stream: "lifecycle",
    data: { phase: "end", runtime: "camel", blocked: Boolean(lastToolError) },
  });

  return {
    assistantTexts,
    toolMetas,
    lastAssistant,
    lastToolError,
    didSendViaMessagingTool,
    messagingToolSentTexts,
    messagingToolSentTargets,
    attemptUsage: aggregateUsage(usageEntries),
    clientToolCall,
    executionTrace: trace,
    issues,
  };
}
