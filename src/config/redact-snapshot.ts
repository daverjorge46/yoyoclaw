import type { ConfigFileSnapshot } from "./types.openclaw.js";

/**
 * Sentinel value used to replace sensitive config fields in gateway responses.
 * Write-side handlers (config.set, config.apply, config.patch) detect this
 * sentinel and restore the original value from the on-disk config, so a
 * round-trip through the Web UI does not corrupt credentials.
 */
export const REDACTED_SENTINEL = "__OPENCLAW_REDACTED__";

/**
 * Patterns that identify sensitive config field names.
 * Aligned with the UI-hint logic in schema.ts.
 */
const SENSITIVE_KEY_PATTERNS = [/token$/i, /password/i, /secret/i, /api.?key/i];

/**
 * Full dot-separated key paths that are exempt from redaction even though
 * their leaf key matches a sensitive pattern.  iOS/macOS clients read
 * `talk.apiKey` from `config.get` and pass it directly to ElevenLabs,
 * so it must not be replaced with the sentinel.
 */
const REDACTION_EXEMPT_PATHS = new Set(["talk.apiKey"]);

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function isExemptPath(parentPath: string, key: string): boolean {
  const fullPath = parentPath ? `${parentPath}.${key}` : key;
  return REDACTION_EXEMPT_PATHS.has(fullPath);
}

/**
 * Deep-walk an object and replace values whose key matches a sensitive pattern
 * with the redaction sentinel.
 */
function redactObject(obj: unknown, parentPath = ""): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item, parentPath));
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const fullPath = parentPath ? `${parentPath}.${key}` : key;
    if (
      isSensitiveKey(key) &&
      value !== null &&
      value !== undefined &&
      !isExemptPath(parentPath, key)
    ) {
      result[key] = REDACTED_SENTINEL;
    } else if (typeof value === "object" && value !== null) {
      result[key] = redactObject(value, fullPath);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function redactConfigObject<T>(value: T): T {
  return redactObject(value) as T;
}

/**
 * Collect all sensitive string values from a config object.
 * Used for text-based redaction of the raw JSON5 source.
 */
function collectSensitiveValues(obj: unknown, parentPath = ""): string[] {
  const values: string[] = [];
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return values;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      values.push(...collectSensitiveValues(item, parentPath));
    }
    return values;
  }
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const fullPath = parentPath ? `${parentPath}.${key}` : key;
    if (
      isSensitiveKey(key) &&
      typeof value === "string" &&
      value.length > 0 &&
      !isExemptPath(parentPath, key)
    ) {
      values.push(value);
    } else if (typeof value === "object" && value !== null) {
      values.push(...collectSensitiveValues(value, fullPath));
    }
  }
  return values;
}

/**
 * Collect values at exempt paths so the raw-text regex pass can skip them.
 */
function collectExemptValues(config: unknown): Set<string> {
  const values = new Set<string>();
  for (const path of REDACTION_EXEMPT_PATHS) {
    const parts = path.split(".");
    let current: unknown = config;
    for (const part of parts) {
      if (current && typeof current === "object" && !Array.isArray(current)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        current = undefined;
        break;
      }
    }
    if (typeof current === "string" && current.length > 0) {
      values.add(current);
    }
  }
  return values;
}

/**
 * Replace known sensitive values in a raw JSON5 string with the sentinel.
 * Values are replaced longest-first to avoid partial matches.
 */
function redactRawText(raw: string, config: unknown): string {
  const sensitiveValues = collectSensitiveValues(config);
  sensitiveValues.sort((a, b) => b.length - a.length);
  let result = raw;
  for (const value of sensitiveValues) {
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(escaped, "g"), REDACTED_SENTINEL);
  }

  const exemptValues = collectExemptValues(config);
  const keyValuePattern =
    /(^|[{\s,])((["'])([^"']+)\3|([A-Za-z0-9_$.-]+))(\s*:\s*)(["'])([^"']*)\7/g;
  result = result.replace(
    keyValuePattern,
    (match, prefix, keyExpr, _keyQuote, keyQuoted, keyBare, sep, valQuote, val) => {
      const key = (keyQuoted ?? keyBare) as string | undefined;
      if (!key || !isSensitiveKey(key)) {
        return match;
      }
      if (val === REDACTED_SENTINEL) {
        return match;
      }
      if (exemptValues.has(val as string)) {
        return match;
      }
      return `${prefix}${keyExpr}${sep}${valQuote}${REDACTED_SENTINEL}${valQuote}`;
    },
  );

  return result;
}

/**
 * Returns a copy of the config snapshot with all sensitive fields
 * replaced by {@link REDACTED_SENTINEL}. The `hash` is preserved
 * (it tracks config identity, not content).
 *
 * Both `config` (the parsed object) and `raw` (the JSON5 source) are scrubbed
 * so no credential can leak through either path.
 */
export function redactConfigSnapshot(snapshot: ConfigFileSnapshot): ConfigFileSnapshot {
  const redactedConfig = redactConfigObject(snapshot.config);
  const redactedRaw = snapshot.raw ? redactRawText(snapshot.raw, snapshot.config) : null;
  const redactedParsed = snapshot.parsed ? redactConfigObject(snapshot.parsed) : snapshot.parsed;

  return {
    ...snapshot,
    config: redactedConfig,
    raw: redactedRaw,
    parsed: redactedParsed,
  };
}

/**
 * Deep-walk `incoming` and replace any {@link REDACTED_SENTINEL} values
 * (on sensitive keys) with the corresponding value from `original`.
 *
 * This is called by config.set / config.apply / config.patch before writing,
 * so that credentials survive a Web UI round-trip unmodified.
 */
export function restoreRedactedValues(incoming: unknown, original: unknown): unknown {
  if (incoming === null || incoming === undefined) {
    return incoming;
  }
  if (typeof incoming !== "object") {
    return incoming;
  }
  if (Array.isArray(incoming)) {
    const origArr = Array.isArray(original) ? original : [];
    return incoming.map((item, i) => restoreRedactedValues(item, origArr[i]));
  }
  const orig =
    original && typeof original === "object" && !Array.isArray(original)
      ? (original as Record<string, unknown>)
      : {};
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(incoming as Record<string, unknown>)) {
    if (isSensitiveKey(key) && value === REDACTED_SENTINEL) {
      if (!(key in orig)) {
        throw new Error(
          `config write rejected: "${key}" is redacted; set an explicit value instead of ${REDACTED_SENTINEL}`,
        );
      }
      result[key] = orig[key];
    } else if (typeof value === "object" && value !== null) {
      result[key] = restoreRedactedValues(value, orig[key]);
    } else {
      result[key] = value;
    }
  }
  return result;
}
