import type {
  CamelCapability,
  CamelPolicyContext,
  CamelPolicyDecision,
  CamelToolMutability,
} from "./types.js";
import { isMessagingToolSendAction } from "../pi-embedded-messaging.js";
import { capabilityAllowsReader, isCapabilityPublic, mergeCapabilities } from "./capabilities.js";

const READ_ONLY_TOOLS = new Set([
  "print",
  "read",
  "ls",
  "glob",
  "grep",
  "find",
  "search",
  "web_search",
  "web_fetch",
  "memory_search",
  "memory_get",
  "sessions_history",
  "sessions_list",
  "session_status",
  "agents_list",
  "image",
  "tts",
  "sandbox_explain",
  "status",
  "whoami",
  "help",
]);

const STATEFUL_TOOLS = new Set([
  "write",
  "edit",
  "exec",
  "bash",
  "process",
  "apply_patch",
  "sessions_spawn",
]);

const ACTION_BASED_MUTABILITY_TOOLS = new Set([
  "message",
  "sessions_send",
  "browser",
  "gateway",
  "cron",
  "nodes",
  "canvas",
  "whatsapp_login",
]);

const EXPLICIT_MUTABILITY_RULE_TOOLS = new Set([
  ...READ_ONLY_TOOLS,
  ...STATEFUL_TOOLS,
  ...ACTION_BASED_MUTABILITY_TOOLS,
]);

const NO_SIDE_EFFECT_TOOLS = new Set([...READ_ONLY_TOOLS, "query_ai_assistant"]);

const BROWSER_READ_ACTIONS = new Set([
  "status",
  "profiles",
  "tabs",
  "snapshot",
  "screenshot",
  "console",
  "pdf",
]);

const CRON_READ_ACTIONS = new Set(["status", "list", "runs"]);

const NODES_READ_ACTIONS = new Set([
  "status",
  "describe",
  "pending",
  "camera_snap",
  "camera_list",
  "location_get",
]);

type CamelSecurityPolicy = (ctx: CamelPolicyContext) => CamelPolicyDecision;

type CamelSecurityPolicyEntry = {
  pattern: string;
  policy: CamelSecurityPolicy;
};

function normalizeToolName(toolName: string): string {
  return toolName.trim().toLowerCase();
}

function normalizeRecipient(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readRecipients(args: Record<string, unknown>): string[] {
  const raw: unknown[] = [];
  for (const key of ["to", "recipient", "recipients", "email", "target"]) {
    const value = args[key];
    if (Array.isArray(value)) {
      raw.push(...value);
      continue;
    }
    raw.push(value);
  }
  const recipients = raw.map(normalizeRecipient).filter(Boolean);
  return Array.from(new Set(recipients));
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function globMatches(glob: string, value: string): boolean {
  const pattern = glob
    .split("*")
    .map((segment) => segment.split("?").map(escapeRegExp).join("."))
    .join(".*");
  const regex = new RegExp(`^${pattern}$`);
  return regex.test(value);
}

function deny(reason: string): CamelPolicyDecision {
  return { allowed: false, reason };
}

function readAction(args: Record<string, unknown>): string {
  return typeof args.action === "string" ? args.action.trim().toLowerCase() : "";
}

function makeTrustedFieldsPolicy(fields: string[]): CamelSecurityPolicy {
  return (ctx) => {
    for (const field of fields) {
      const capability = ctx.argCapabilities[field];
      if (capability && !capability.trusted) {
        return deny(`Blocked by CaMeL policy: "${field}" must come directly from trusted input.`);
      }
    }
    return { allowed: true };
  };
}

function recipientAwarePolicy(ctx: CamelPolicyContext): CamelPolicyDecision {
  const recipients = readRecipients(ctx.args);
  if (recipients.length === 0) {
    return { allowed: true };
  }

  const recipientCapability = mergeCapabilities(
    ["to", "recipient", "recipients", "email", "target"]
      .map((field) => ctx.argCapabilities[field])
      .filter((capability): capability is CamelCapability => Boolean(capability)),
  );
  if (recipientCapability.trusted) {
    return { allowed: true };
  }

  const payloadCapability = mergeCapabilities(
    ["content", "message", "body", "text"]
      .map((field) => ctx.argCapabilities[field])
      .filter((capability): capability is CamelCapability => Boolean(capability)),
  );
  const readableByRecipients = recipients.every((recipient) =>
    capabilityAllowsReader(payloadCapability, recipient),
  );
  if (readableByRecipients) {
    return { allowed: true };
  }
  return deny(
    `Blocked by CaMeL policy: payload is not readable by recipient(s): ${recipients.join(", ")}.`,
  );
}

function baseSecurityPolicy(ctx: CamelPolicyContext): CamelPolicyDecision {
  if (ctx.mutability === "read") {
    return { allowed: true };
  }
  if (isCapabilityPublic(ctx.controlCapability)) {
    return { allowed: true };
  }
  return deny(
    `Blocked by CaMeL policy: state-changing tool "${ctx.toolName}" depends on non-public control data.`,
  );
}

const EXPLICIT_STATE_POLICY_ENTRIES: CamelSecurityPolicyEntry[] = [
  { pattern: "message", policy: recipientAwarePolicy },
  { pattern: "sessions_send", policy: recipientAwarePolicy },
  { pattern: "exec", policy: makeTrustedFieldsPolicy(["command", "cmd", "script"]) },
  { pattern: "bash", policy: makeTrustedFieldsPolicy(["command", "cmd", "script"]) },
  { pattern: "process", policy: makeTrustedFieldsPolicy(["command", "cmd", "script"]) },
  { pattern: "write", policy: makeTrustedFieldsPolicy(["path", "file", "to", "target"]) },
  { pattern: "edit", policy: makeTrustedFieldsPolicy(["path", "file", "target"]) },
  { pattern: "apply_patch", policy: makeTrustedFieldsPolicy(["path", "file", "target"]) },
  {
    pattern: "sessions_spawn",
    policy: makeTrustedFieldsPolicy(["message", "prompt", "text", "task", "input", "sessionKey"]),
  },
  {
    pattern: "browser",
    policy: makeTrustedFieldsPolicy([
      "targetUrl",
      "request",
      "promptText",
      "selector",
      "ref",
      "element",
      "paths",
    ]),
  },
  {
    pattern: "gateway",
    policy: makeTrustedFieldsPolicy(["raw", "reason", "note", "sessionKey"]),
  },
  {
    pattern: "cron",
    policy: makeTrustedFieldsPolicy(["job", "patch", "text"]),
  },
  {
    pattern: "nodes",
    policy: makeTrustedFieldsPolicy([
      "title",
      "body",
      "command",
      "invokeCommand",
      "invokeParamsJson",
    ]),
  },
  {
    pattern: "canvas",
    policy: makeTrustedFieldsPolicy(["target", "url", "javaScript", "jsonl", "jsonlPath"]),
  },
  {
    pattern: "whatsapp_login",
    policy: makeTrustedFieldsPolicy(["action", "timeoutMs", "force"]),
  },
];

const WILDCARD_STATE_POLICY_ENTRIES: CamelSecurityPolicyEntry[] = [
  { pattern: "*_send", policy: recipientAwarePolicy },
  { pattern: "*_post", policy: recipientAwarePolicy },
];

const EXPLICIT_STATE_POLICY_PATTERNS = new Set(
  EXPLICIT_STATE_POLICY_ENTRIES.map((entry) => entry.pattern),
);

class CamelSecurityPolicyEngine {
  readonly policies: CamelSecurityPolicyEntry[];
  readonly noSideEffectTools: Set<string>;

  constructor(params: { policies: CamelSecurityPolicyEntry[]; noSideEffectTools: Set<string> }) {
    this.policies = params.policies;
    this.noSideEffectTools = params.noSideEffectTools;
  }

  checkPolicy(ctx: CamelPolicyContext): CamelPolicyDecision {
    const toolName = normalizeToolName(ctx.toolName);
    if (ctx.mutability === "read" || this.noSideEffectTools.has(toolName)) {
      return { allowed: true };
    }

    const base = baseSecurityPolicy(ctx);
    if (!base.allowed) {
      return base;
    }

    for (const entry of this.policies) {
      if (!globMatches(entry.pattern, toolName)) {
        continue;
      }
      return entry.policy({ ...ctx, toolName });
    }

    return deny(
      `Blocked by CaMeL policy: no matching rule for state-changing tool "${toolName}" (default deny).`,
    );
  }
}

const DEFAULT_ENGINE = new CamelSecurityPolicyEngine({
  noSideEffectTools: NO_SIDE_EFFECT_TOOLS,
  policies: [...EXPLICIT_STATE_POLICY_ENTRIES, ...WILDCARD_STATE_POLICY_ENTRIES],
});

export function hasExplicitCamelMutabilityRule(toolName: string): boolean {
  return EXPLICIT_MUTABILITY_RULE_TOOLS.has(normalizeToolName(toolName));
}

export function hasExplicitCamelStatePolicyRule(toolName: string): boolean {
  return EXPLICIT_STATE_POLICY_PATTERNS.has(normalizeToolName(toolName));
}

export function classifyCamelToolMutability(
  toolName: string,
  args: Record<string, unknown>,
): CamelToolMutability {
  const normalized = normalizeToolName(toolName);
  if (READ_ONLY_TOOLS.has(normalized)) {
    return "read";
  }
  if (normalized === "message") {
    const action = typeof args.action === "string" ? args.action.trim().toLowerCase() : "";
    return action === "read" || action === "status" ? "read" : "state";
  }
  if (normalized === "sessions_send") {
    return isMessagingToolSendAction(normalized, args) ? "state" : "read";
  }
  if (normalized === "browser") {
    const action = readAction(args);
    return BROWSER_READ_ACTIONS.has(action) ? "read" : "state";
  }
  if (normalized === "gateway") {
    const action = readAction(args);
    return action === "config.get" || action === "config.schema" ? "read" : "state";
  }
  if (normalized === "cron") {
    const action = readAction(args);
    return CRON_READ_ACTIONS.has(action) ? "read" : "state";
  }
  if (normalized === "nodes") {
    const action = readAction(args);
    return NODES_READ_ACTIONS.has(action) ? "read" : "state";
  }
  if (normalized === "canvas") {
    const action = readAction(args);
    return action === "snapshot" ? "read" : "state";
  }
  if (normalized === "whatsapp_login") {
    const action = readAction(args);
    return action === "wait" ? "read" : "state";
  }
  if (STATEFUL_TOOLS.has(normalized)) {
    return "state";
  }
  if (
    normalized.endsWith("_send") ||
    normalized.endsWith("_post") ||
    normalized.endsWith("_write")
  ) {
    return "state";
  }
  return "state";
}

export function evaluateCamelPolicy(params: {
  toolName: string;
  args: Record<string, unknown>;
  controlCapability: CamelCapability;
  argCapabilities: Record<string, CamelCapability>;
}): CamelPolicyDecision {
  const mutability = classifyCamelToolMutability(params.toolName, params.args);
  const context: CamelPolicyContext = {
    toolName: normalizeToolName(params.toolName),
    args: params.args,
    controlCapability: params.controlCapability,
    argCapabilities: params.argCapabilities,
    mutability,
  };
  return DEFAULT_ENGINE.checkPolicy(context);
}
