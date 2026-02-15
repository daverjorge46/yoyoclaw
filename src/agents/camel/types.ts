import type { AgentToolResult } from "@mariozechner/pi-agent-core";

export type CamelRuntimeEngine = "pi" | "camel";
export type CamelEvalMode = "normal" | "strict";

export type CamelCapabilitySource = "user" | "camel" | `tool:${string}` | `qllm:${string}`;

export type CamelCapability = {
  trusted: boolean;
  readers: "public" | string[];
  sources: CamelCapabilitySource[];
};

export type CamelRuntimeValue = {
  value: unknown;
  capability: CamelCapability;
};

export type CamelVarRef = { $var: string };

export type CamelSchemaFieldType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "email"
  | "datetime"
  | "array"
  | "object";

export type CamelSchemaField = {
  type: CamelSchemaFieldType;
  description?: string;
  required?: boolean;
  items?: CamelSchemaField;
  properties?: Record<string, CamelSchemaField>;
};

export type CamelStructuredSchema = {
  description?: string;
  fields: Record<string, CamelSchemaField>;
};

export type CamelPlannerSourceLocation = {
  line: number;
  column: number;
  lineText?: string;
};

export type CamelPlannerStepAssign = {
  kind: "assign";
  saveAs: string;
  value: unknown;
};

export type CamelPlannerStepUnpack = {
  kind: "unpack";
  targets: string[];
  value: unknown;
};

export type CamelPlannerStepTool = {
  kind: "tool";
  tool: string;
  args?: Record<string, unknown>;
  saveAs?: string;
  summary?: string;
  sourceLocation?: CamelPlannerSourceLocation;
};

export type CamelPlannerStepQllm = {
  kind: "qllm";
  instruction: string;
  input: unknown;
  schema: CamelStructuredSchema;
  saveAs: string;
};

export type CamelPlannerStepIf = {
  kind: "if";
  condition: unknown;
  thenBranch: CamelPlannerStep[];
  otherwise?: CamelPlannerStep[];
};

export type CamelPlannerStepFor = {
  kind: "for";
  item: string | string[];
  iterable: unknown;
  body: CamelPlannerStep[];
};

export type CamelPlannerStepRaise = {
  kind: "raise";
  error: unknown;
};

export type CamelPlannerStepFinal = {
  kind: "final";
  text: string;
};

export type CamelPlannerStep =
  | CamelPlannerStepAssign
  | CamelPlannerStepUnpack
  | CamelPlannerStepTool
  | CamelPlannerStepQllm
  | CamelPlannerStepIf
  | CamelPlannerStepFor
  | CamelPlannerStepRaise
  | CamelPlannerStepFinal;

export type CamelPlannerProgram = {
  rationale?: string;
  steps: CamelPlannerStep[];
};

export type CamelExecutionEvent =
  | {
      type: "tool";
      step: number;
      tool: string;
      args: Record<string, unknown>;
      result: AgentToolResult<unknown>;
      capability: CamelCapability;
      blocked?: false;
    }
  | {
      type: "tool";
      step: number;
      tool: string;
      args: Record<string, unknown>;
      blocked: true;
      reason: string;
    }
  | {
      type: "qllm";
      step: number;
      saveAs: string;
      output: unknown;
      capability: CamelCapability;
    }
  | {
      type: "assign";
      step: number;
      saveAs: string;
    }
  | {
      type: "final";
      step: number;
      text: string;
    };

export type CamelToolMutability = "read" | "state";

export type CamelPolicyContext = {
  toolName: string;
  args: Record<string, unknown>;
  controlCapability: CamelCapability;
  argCapabilities: Record<string, CamelCapability>;
  mutability: CamelToolMutability;
};

export type CamelPolicyDecision =
  | { allowed: true }
  | {
      allowed: false;
      reason: string;
    };

export type CamelPlannerIssue = {
  stage: "plan" | "execute";
  message: string;
  trusted: boolean;
};
