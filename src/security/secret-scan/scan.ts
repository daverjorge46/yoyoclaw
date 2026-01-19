import {
  DEFAULT_SECRET_SCAN_LOG_MATCHES,
  DEFAULT_SECRET_SCAN_MAX_CHARS,
  DEFAULT_SECRET_SCAN_MODE,
  DEFAULT_SECRET_SCAN_OVERFLOW,
} from "./constants.js";
import { addEntropyDetections, addRegexDetections } from "./detectors/index.js";
import type { Redaction } from "./detectors/index.js";
import { maskToken, redactPemBlock } from "./redact.js";
import type {
  SecretScanMatch,
  SecretScanOptions,
  SecretScanResult,
  SecretScanWarning,
  SecretScanningConfig,
} from "./types.js";

type ResolvedSecretScanConfig = {
  mode: NonNullable<SecretScanningConfig["mode"]>;
  maxChars: number;
  overflow: NonNullable<SecretScanningConfig["overflow"]>;
  logSecretMatches: NonNullable<SecretScanningConfig["logSecretMatches"]>;
};

function resolveSecretScanConfig(config?: SecretScanningConfig): ResolvedSecretScanConfig {
  const mode = config?.mode ?? DEFAULT_SECRET_SCAN_MODE;
  const maxChars =
    typeof config?.maxChars === "number" && Number.isFinite(config.maxChars) && config.maxChars > 0
      ? Math.floor(config.maxChars)
      : DEFAULT_SECRET_SCAN_MAX_CHARS;
  const overflow = config?.overflow ?? DEFAULT_SECRET_SCAN_OVERFLOW;
  const logSecretMatches = config?.logSecretMatches ?? DEFAULT_SECRET_SCAN_LOG_MATCHES;
  return { mode, maxChars, overflow, logSecretMatches };
}

function buildTruncateWarning(maxChars: number, inputChars: number): SecretScanWarning {
  return {
    kind: "truncated",
    maxChars,
    inputChars,
    message: `Secret scan truncated to ${maxChars} chars (set security.secretScanning.maxChars to increase).`,
  };
}

function applyRedactions(text: string, redactions: Redaction[]): string {
  if (redactions.length === 0) return text;
  const sorted = [...redactions].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return b.end - a.end;
  });
  const merged: Redaction[] = [];
  for (const redaction of sorted) {
    const last = merged[merged.length - 1];
    if (!last) {
      merged.push({ ...redaction });
      continue;
    }
    if (redaction.start < last.end) {
      if (redaction.end <= last.end) continue;
      const start = last.start;
      const end = redaction.end;
      const slice = text.slice(start, end);
      const replacement = slice.includes("PRIVATE KEY-----")
        ? redactPemBlock(slice)
        : maskToken(slice);
      merged[merged.length - 1] = {
        start,
        end,
        replacement,
        detector: last.detector,
      };
      continue;
    }
    merged.push({ ...redaction });
  }

  let out = "";
  let cursor = 0;
  for (const redaction of merged) {
    if (redaction.end <= cursor) continue;
    out += text.slice(cursor, redaction.start);
    out += redaction.replacement;
    cursor = redaction.end;
  }
  out += text.slice(cursor);
  return out;
}

export function scanText(input: string, options: SecretScanOptions = {}): SecretScanResult {
  const config = resolveSecretScanConfig(options.config);
  if (config.mode === "off") {
    return { blocked: false, matches: [], truncated: false };
  }

  const source = input ?? "";
  const inputChars = source.length;
  let text = source;
  let truncated = false;

  if (inputChars > config.maxChars) {
    if (config.overflow === "block") {
      return { blocked: true, reason: "too_long", matches: [], truncated: false };
    }
    truncated = true;
    text = source.slice(0, config.maxChars);
    options.warn?.(buildTruncateWarning(config.maxChars, inputChars));
  }

  const matches: SecretScanMatch[] = [];
  const redactions: Redaction[] = [];
  const seen = new Set<string>();

  addRegexDetections(text, matches, redactions, seen);
  addEntropyDetections(text, matches, redactions, seen);

  const shouldRedactOutput = config.mode === "redact" || matches.length > 0 || truncated;
  const redactedBase = shouldRedactOutput ? applyRedactions(text, redactions) : undefined;
  const redactedText = shouldRedactOutput
    ? truncated
      ? `${redactedBase ?? text}${source.slice(text.length)}`
      : redactedBase
    : undefined;

  if (matches.length > 0 && config.mode === "block") {
    return {
      blocked: true,
      reason: "match",
      matches,
      truncated,
      redactedText,
    };
  }

  return {
    blocked: false,
    matches,
    truncated,
    redactedText,
  };
}

export { resolveSecretScanConfig, buildTruncateWarning };
