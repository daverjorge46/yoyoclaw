/**
 * @agent-os/sentinel-scanner — Input sanitization and financial injection detection.
 *
 * Zero external dependencies. Works as both an npm library and an OpenClaw skill.
 *
 * @example
 * ```ts
 * import { sanitizeInput, scanForInjection, hasCriticalInjection } from "@agent-os/sentinel-scanner";
 *
 * const { sanitized } = sanitizeInput(userInput);
 * const result = scanForInjection(sanitized);
 * if (!result.clean) {
 *   console.log("Injection detected:", result.detections);
 * }
 * ```
 */

// Input sanitizer
export {
  sanitizeInput,
  hasStructuralInjection,
} from "./input-sanitizer.js";
export type { SanitizeResult } from "./input-sanitizer.js";

// Financial injection scanner
export {
  scanForInjection,
  hasCriticalInjection,
} from "./financial-injection-scanner.js";
export type {
  DetectionSeverity,
  InjectionDetection,
  ScanResult,
} from "./financial-injection-scanner.js";
