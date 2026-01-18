import type { SecretScanMatch } from "../types.js";

export type DetectorKind = SecretScanMatch["kind"];

export type RegexDetector = {
  id: string;
  kind: DetectorKind;
  confidence: SecretScanMatch["confidence"];
  pattern: string;
  flags?: string;
  group?: number;
  redact: "group" | "full";
  validator?: (value: string) => boolean;
};

export type Redaction = {
  start: number;
  end: number;
  replacement: string;
  detector: string;
};
