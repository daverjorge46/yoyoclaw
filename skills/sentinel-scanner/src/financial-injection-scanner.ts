/**
 * Financial Injection Scanner — detects prompt injection targeting financial operations.
 *
 * This scanner runs in-process alongside the agent, checking all input
 * for patterns that attempt to manipulate financial actions via injection.
 *
 * Patterns mirror the `financial_manipulation` category in
 * `.claude/hooks/prompt-injection-defender/patterns.yaml` but run at
 * the application layer rather than the Claude Code hook layer.
 *
 * Detection results are logged and can trigger circuit breaker trips.
 */

/** Severity levels matching the defender patterns. */
export type DetectionSeverity = "critical" | "high" | "medium";

/** A single detection from the scanner. */
export interface InjectionDetection {
  pattern: string;
  severity: DetectionSeverity;
  description: string;
  matchedText: string;
}

/** Full scan result. */
export interface ScanResult {
  clean: boolean;
  detections: InjectionDetection[];
  highestSeverity: DetectionSeverity | null;
}

interface PatternDef {
  regex: RegExp;
  severity: DetectionSeverity;
  description: string;
}

/**
 * Financial injection patterns.
 * These detect attempts to manipulate the agent into unauthorized financial actions.
 */
const FINANCIAL_PATTERNS: PatternDef[] = [
  // Full balance drain
  {
    regex: /(send|transfer|swap|bridge|deploy)\s+(all|everything|max|maximum|entire)\s+(balance|funds|tokens|eth|wallet)/i,
    severity: "critical",
    description: "Full balance drain attempt",
  },
  // Policy bypass
  {
    regex: /(ignore|skip|bypass|override)\s+(the\s+)?(policy|guard|limit|approval|check|restriction)/i,
    severity: "critical",
    description: "Policy bypass attempt",
  },
  // Direct action bypass
  {
    regex: /(approve|sign|submit)\s+(this\s+)?(transaction|transfer|swap)\s+(immediately|now|directly|without)/i,
    severity: "critical",
    description: "Direct action bypass",
  },
  // Fake emergency drain
  {
    regex: /emergency\s+(withdraw|transfer|send|move)\s+(all|funds|tokens|everything)/i,
    severity: "critical",
    description: "Fake emergency drain",
  },
  // Recipient address injection
  {
    regex: /(new|updated|changed)\s+(wallet|recipient|destination)\s+(address|is)\s*[:\s]\s*0x[0-9a-fA-F]/i,
    severity: "critical",
    description: "Recipient address injection",
  },
  // Limit modification via injection
  {
    regex: /(increase|raise|remove|disable)\s+(the\s+)?(spending|transaction|daily)\s+(limit|cap|maximum)/i,
    severity: "critical",
    description: "Limit modification via injection",
  },
  // Key exfiltration
  {
    regex: /private\s+key|seed\s+phrase|mnemonic|secret\s+key|wallet\s+secret/i,
    severity: "critical",
    description: "Key exfiltration attempt",
  },
  // Fake test mode
  {
    regex: /(this\s+is\s+)?(a\s+)?test\s+(transaction|transfer|swap|mode)\s*(,|\.|;|:|-|\s+no)/i,
    severity: "high",
    description: "Fake test mode injection",
  },
  // Privilege escalation in financial context
  {
    regex: /(admin|root|owner|operator)\s+(override|mode|access|privilege)/i,
    severity: "critical",
    description: "Privilege escalation in financial context",
  },
  // Unauthorized token deployment
  {
    regex: /deploy\s+(a\s+)?token\s+(on\s+)?(behalf|for)\s+(the\s+)?(user|owner|operator)/i,
    severity: "high",
    description: "Unauthorized token deployment framing",
  },
  // General instruction override (financial context)
  {
    regex: /ignore\s+(all\s+)?previous\s+(instructions|prompts|rules|constraints)/i,
    severity: "critical",
    description: "Instruction override in financial context",
  },
  // Impersonation of system messages
  {
    regex: /system\s*(message|update|notice)\s*:\s*(transfer|send|swap|approve)/i,
    severity: "critical",
    description: "Fake system message for financial action",
  },
];

/**
 * General prompt injection patterns (non-financial).
 * Subset of the defender patterns for in-process detection.
 */
const GENERAL_PATTERNS: PatternDef[] = [
  {
    regex: /you\s+are\s+(now\s+)?(DAN|STAN|DUDE|KEVIN|evil|unrestricted|jailbroken|unfiltered)/i,
    severity: "critical",
    description: "DAN/jailbreak persona injection",
  },
  {
    regex: /developer\s+mode\s+(enabled|activated|on)/i,
    severity: "critical",
    description: "Developer mode bypass",
  },
  {
    regex: /note\s+to\s+(the\s+)?(ai|assistant|model|claude)\s*:/i,
    severity: "critical",
    description: "Direct AI note injection",
  },
  {
    regex: /(do|perform)\s+this\s+(silently|quietly|without\s+(mentioning|telling|reporting))/i,
    severity: "critical",
    description: "Silent action attempt",
  },
  {
    regex: /don'?t\s+(tell|mention|report|say|reveal)\s+(to\s+)?(the\s+)?(user|human|person)/i,
    severity: "critical",
    description: "Secrecy instruction",
  },
];

const ALL_PATTERNS = [...FINANCIAL_PATTERNS, ...GENERAL_PATTERNS];

/**
 * Scan input text for financial prompt injection patterns.
 * Returns all detections sorted by severity (critical first).
 */
export function scanForInjection(text: string): ScanResult {
  const detections: InjectionDetection[] = [];

  for (const pattern of ALL_PATTERNS) {
    const match = pattern.regex.exec(text);
    if (match) {
      detections.push({
        pattern: pattern.regex.source,
        severity: pattern.severity,
        description: pattern.description,
        matchedText: match[0],
      });
    }
  }

  // Sort: critical -> high -> medium
  const severityOrder: Record<DetectionSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
  };
  detections.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    clean: detections.length === 0,
    detections,
    highestSeverity: detections[0]?.severity ?? null,
  };
}

/** Quick check: does this text contain any critical-severity patterns? */
export function hasCriticalInjection(text: string): boolean {
  return ALL_PATTERNS
    .filter((p) => p.severity === "critical")
    .some((p) => p.regex.test(text));
}
