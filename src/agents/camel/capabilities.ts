import type { AgentToolResult } from "@mariozechner/pi-agent-core";
import type { CamelCapability, CamelCapabilitySource } from "./types.js";

const DEFAULT_READER = "user";

function normalizeReaders(readers: unknown): "public" | string[] {
  if (readers === "public") {
    return "public";
  }
  if (!Array.isArray(readers)) {
    return [DEFAULT_READER];
  }
  const normalized = readers
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
  return normalized.length > 0 ? Array.from(new Set(normalized)) : [DEFAULT_READER];
}

function normalizeSources(sources: CamelCapabilitySource[]): CamelCapabilitySource[] {
  return Array.from(new Set(sources));
}

function intersectReaders(a: CamelCapability["readers"], b: CamelCapability["readers"]) {
  if (a === "public") {
    return b;
  }
  if (b === "public") {
    return a;
  }
  const left = new Set(a);
  const intersection = b.filter((reader) => left.has(reader));
  return intersection.length > 0 ? Array.from(new Set(intersection)) : [];
}

export function createUserCapability(): CamelCapability {
  return {
    trusted: true,
    readers: "public",
    sources: ["user"],
  };
}

export function createCamelCapability(): CamelCapability {
  return {
    trusted: true,
    readers: "public",
    sources: ["camel"],
  };
}

export function mergeCapabilities(capabilities: CamelCapability[]): CamelCapability {
  if (capabilities.length === 0) {
    return createCamelCapability();
  }
  const trusted = capabilities.every((capability) => capability.trusted);
  const readers = capabilities.reduce<CamelCapability["readers"]>((merged, capability) => {
    return intersectReaders(merged, capability.readers);
  }, "public");
  const sources = normalizeSources(capabilities.flatMap((capability) => capability.sources));
  return {
    trusted,
    readers,
    sources,
  };
}

export function capabilityAllowsReader(capability: CamelCapability, reader: string): boolean {
  const normalizedReader = reader.trim();
  if (!normalizedReader) {
    return false;
  }
  if (capability.readers === "public") {
    return true;
  }
  return capability.readers.includes(normalizedReader);
}

function extractReadersFromDetails(details: unknown): "public" | string[] {
  if (!details || typeof details !== "object") {
    return [DEFAULT_READER];
  }
  const record = details as Record<string, unknown>;
  if ("readers" in record) {
    return normalizeReaders(record.readers);
  }
  if ("allowedReaders" in record) {
    return normalizeReaders(record.allowedReaders);
  }
  return [DEFAULT_READER];
}

export function capabilityFromToolResult(params: {
  toolName: string;
  result: AgentToolResult<unknown>;
  inputCapability: CamelCapability;
}): CamelCapability {
  const toolSource = `tool:${params.toolName}` as CamelCapabilitySource;
  const readers = extractReadersFromDetails(params.result.details);
  return {
    trusted: false,
    readers,
    sources: normalizeSources([...params.inputCapability.sources, toolSource]),
  };
}

export function capabilityFromQllmOutput(params: {
  sourceName: string;
  inputCapability: CamelCapability;
}): CamelCapability {
  const source = `qllm:${params.sourceName}` as CamelCapabilitySource;
  return {
    // Quarantined LLM outputs are treated as untrusted by default.
    trusted: false,
    readers: params.inputCapability.readers,
    sources: normalizeSources([...params.inputCapability.sources, source]),
  };
}

export function isPublicCapability(capability: CamelCapability): boolean {
  return capability.readers === "public";
}

export function isCapabilityPublic(capability: CamelCapability): boolean {
  return capability.readers === "public";
}
