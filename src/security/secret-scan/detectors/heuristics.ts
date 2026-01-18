import type { RegexDetector } from "./types.js";

export const heuristicDetectors: RegexDetector[] = [
  {
    id: "env-assignment",
    kind: "heuristic",
    confidence: "medium",
    pattern: String.raw`\b[A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD)\b\s*[=:]\s*(["']?)([^\s"'\\]+)\1`,
    flags: "gi",
    group: 2,
    redact: "group",
  },
  {
    id: "json-field",
    kind: "heuristic",
    confidence: "medium",
    pattern: String.raw`"(?:apiKey|token|secret|password|passwd|accessToken|refreshToken)"\s*:\s*"([^"]+)"`,
    flags: "gi",
    group: 1,
    redact: "group",
  },
  {
    id: "cli-flag",
    kind: "heuristic",
    confidence: "medium",
    pattern: String.raw`--(?:api[-_]?key|token|secret|password|passwd)\s+(["']?)([^\s"']+)\1`,
    flags: "gi",
    group: 2,
    redact: "group",
  },
];
