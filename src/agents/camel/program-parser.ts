import JSON5 from "json5";
import type { CamelPlannerStep, CamelSchemaField } from "./types.js";
import { extractSingleCodeBlock } from "./parser.js";

const VAR_REF_RE = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/;
const BUILTIN_EXPRESSION_CALLS = new Set([
  "abs",
  "all",
  "any",
  "bool",
  "dict",
  "divmod",
  "dir",
  "enumerate",
  "float",
  "hash",
  "int",
  "len",
  "list",
  "max",
  "min",
  "print",
  "range",
  "repr",
  "reversed",
  "set",
  "sorted",
  "str",
  "sum",
  "tuple",
  "type",
  "zip",
]);

export class CamelProgramParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CamelProgramParseError";
  }
}

type ParsedCall = {
  name: string;
  args: Record<string, unknown>;
  positional: unknown[];
  keyword: Record<string, unknown>;
};

type ParsedExpressionCall =
  | {
      kind: "name";
      name: string;
      args: Record<string, unknown>;
      positional: unknown[];
      keyword: Record<string, unknown>;
    }
  | {
      kind: "method";
      target: unknown;
      method: string;
      args: Record<string, unknown>;
      positional: unknown[];
      keyword: Record<string, unknown>;
    };

function countIndent(line: string): number {
  let count = 0;
  for (const char of line) {
    if (char === " ") {
      count += 1;
      continue;
    }
    if (char === "\t") {
      count += 2;
      continue;
    }
    break;
  }
  return count;
}

function splitTopLevel(input: string, delimiter = ","): string[] {
  const entries: string[] = [];
  let current = "";
  let paren = 0;
  let bracket = 0;
  let brace = 0;
  let quote: "'" | '"' | null = null;
  let escaped = false;
  for (const char of input) {
    if (quote) {
      current += char;
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      current += char;
      continue;
    }
    if (char === "(") {
      paren += 1;
      current += char;
      continue;
    }
    if (char === ")") {
      paren -= 1;
      current += char;
      continue;
    }
    if (char === "[") {
      bracket += 1;
      current += char;
      continue;
    }
    if (char === "]") {
      bracket -= 1;
      current += char;
      continue;
    }
    if (char === "{") {
      brace += 1;
      current += char;
      continue;
    }
    if (char === "}") {
      brace -= 1;
      current += char;
      continue;
    }
    if (char === delimiter && paren === 0 && bracket === 0 && brace === 0) {
      if (current.trim()) {
        entries.push(current.trim());
      }
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) {
    entries.push(current.trim());
  }
  return entries;
}

function splitTopLevelKeepingEmpty(input: string, delimiter = ","): string[] {
  const entries: string[] = [];
  let current = "";
  let paren = 0;
  let bracket = 0;
  let brace = 0;
  let quote: "'" | '"' | null = null;
  let escaped = false;
  for (const char of input) {
    if (quote) {
      current += char;
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      current += char;
      continue;
    }
    if (char === "(") {
      paren += 1;
      current += char;
      continue;
    }
    if (char === ")") {
      paren -= 1;
      current += char;
      continue;
    }
    if (char === "[") {
      bracket += 1;
      current += char;
      continue;
    }
    if (char === "]") {
      bracket -= 1;
      current += char;
      continue;
    }
    if (char === "{") {
      brace += 1;
      current += char;
      continue;
    }
    if (char === "}") {
      brace -= 1;
      current += char;
      continue;
    }
    if (char === delimiter && paren === 0 && bracket === 0 && brace === 0) {
      entries.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  entries.push(current.trim());
  return entries;
}

function findTopLevelAssignment(text: string): number {
  let paren = 0;
  let bracket = 0;
  let brace = 0;
  let quote: "'" | '"' | null = null;
  let escaped = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "(") {
      paren += 1;
      continue;
    }
    if (char === ")") {
      paren -= 1;
      continue;
    }
    if (char === "[") {
      bracket += 1;
      continue;
    }
    if (char === "]") {
      bracket -= 1;
      continue;
    }
    if (char === "{") {
      brace += 1;
      continue;
    }
    if (char === "}") {
      brace -= 1;
      continue;
    }
    if (paren === 0 && bracket === 0 && brace === 0 && char === "=") {
      const prev = text[i - 1];
      const next = text[i + 1];
      if (prev === "=" || next === "=" || prev === "!" || prev === "<" || prev === ">") {
        continue;
      }
      return i;
    }
  }
  return -1;
}

function parseCallArguments(inner: string): {
  args: Record<string, unknown>;
  positional: unknown[];
  keyword: Record<string, unknown>;
} {
  const argEntries = splitTopLevel(inner);
  const args: Record<string, unknown> = {};
  const positional: unknown[] = [];
  const keyword: Record<string, unknown> = {};
  let positionalIndex = 0;
  for (const entry of argEntries) {
    const eqIdx = findTopLevelAssignment(entry);
    if (eqIdx >= 0) {
      const key = entry.slice(0, eqIdx).trim();
      const valueText = entry.slice(eqIdx + 1).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
        throw new CamelProgramParseError(`Invalid argument name: ${key}`);
      }
      const parsedValue = parseExpression(valueText);
      args[key] = parsedValue;
      keyword[key] = parsedValue;
      continue;
    }
    const parsedValue = parseExpression(entry);
    args[`arg${positionalIndex}`] = parsedValue;
    positional.push(parsedValue);
    positionalIndex += 1;
  }
  return {
    args,
    positional,
    keyword,
  };
}

function findTopLevelAugmentedAssignment(
  text: string,
): { index: number; op: "+" | "-" | "*" | "/" | "%" } | undefined {
  let paren = 0;
  let bracket = 0;
  let brace = 0;
  let quote: "'" | '"' | null = null;
  let escaped = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "(") {
      paren += 1;
      continue;
    }
    if (char === ")") {
      paren -= 1;
      continue;
    }
    if (char === "[") {
      bracket += 1;
      continue;
    }
    if (char === "]") {
      bracket -= 1;
      continue;
    }
    if (char === "{") {
      brace += 1;
      continue;
    }
    if (char === "}") {
      brace -= 1;
      continue;
    }
    if (paren === 0 && bracket === 0 && brace === 0 && char === "=") {
      const prev = text[i - 1];
      const next = text[i + 1];
      if (next === "=") {
        continue;
      }
      if (prev === "+" || prev === "-" || prev === "*" || prev === "/" || prev === "%") {
        return { index: i, op: prev };
      }
    }
  }
  return undefined;
}

function tryParseCall(
  text: string,
  options: {
    allowDottedName?: boolean;
  } = {},
): ParsedCall | undefined {
  const trimmed = text.trim();
  const openIdx = trimmed.indexOf("(");
  if (openIdx <= 0 || !trimmed.endsWith(")")) {
    return undefined;
  }
  const name = trimmed.slice(0, openIdx).trim();
  const nameRe = options.allowDottedName
    ? /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/
    : /^[A-Za-z_][A-Za-z0-9_]*$/;
  if (!nameRe.test(name)) {
    return undefined;
  }
  const inner = trimmed.slice(openIdx + 1, -1);
  const { args, positional, keyword } = parseCallArguments(inner);
  return { name, args, positional, keyword };
}

function isExpressionCallName(name: string): boolean {
  if (name.includes(".")) {
    return true;
  }
  return BUILTIN_EXPRESSION_CALLS.has(name.trim().toLowerCase());
}

function findMatchingOpenParenForTrailingCall(text: string): number | undefined {
  if (!text.endsWith(")")) {
    return undefined;
  }
  const stack: number[] = [];
  let quote: "'" | '"' | null = null;
  let escaped = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i] ?? "";
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "(") {
      stack.push(i);
      continue;
    }
    if (char === ")") {
      const open = stack.pop();
      if (open === undefined) {
        return undefined;
      }
      if (i === text.length - 1) {
        return open;
      }
    }
  }
  return undefined;
}

function findTopLevelLastDot(text: string): number | undefined {
  let paren = 0;
  let bracket = 0;
  let brace = 0;
  let quote: "'" | '"' | null = null;
  let escaped = false;
  let last: number | undefined;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i] ?? "";
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "(") {
      paren += 1;
      continue;
    }
    if (char === ")") {
      paren -= 1;
      continue;
    }
    if (char === "[") {
      bracket += 1;
      continue;
    }
    if (char === "]") {
      bracket -= 1;
      continue;
    }
    if (char === "{") {
      brace += 1;
      continue;
    }
    if (char === "}") {
      brace -= 1;
      continue;
    }
    if (paren === 0 && bracket === 0 && brace === 0 && char === ".") {
      last = i;
    }
  }
  return last;
}

function parseExpressionCall(text: string): ParsedExpressionCall | undefined {
  const trimmed = text.trim();
  const openIdx = findMatchingOpenParenForTrailingCall(trimmed);
  if (openIdx === undefined || openIdx <= 0) {
    return undefined;
  }
  const calleeText = trimmed.slice(0, openIdx).trim();
  const inner = trimmed.slice(openIdx + 1, -1);
  const { args, positional, keyword } = parseCallArguments(inner);

  if (/^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/.test(calleeText)) {
    return {
      kind: "name",
      name: calleeText,
      args,
      positional,
      keyword,
    };
  }

  const dotIdx = findTopLevelLastDot(calleeText);
  if (dotIdx === undefined || dotIdx <= 0) {
    return undefined;
  }
  const targetText = calleeText.slice(0, dotIdx).trim();
  const method = calleeText.slice(dotIdx + 1).trim();
  if (!targetText || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(method)) {
    return undefined;
  }
  return {
    kind: "method",
    target: parseExpression(targetText),
    method,
    args,
    positional,
    keyword,
  };
}

function isBoundaryChar(char: string | undefined): boolean {
  if (!char) {
    return true;
  }
  return !/[A-Za-z0-9_]/.test(char);
}

function scanTopLevelSegments(
  input: string,
  onCandidate: (index: number) => number | undefined,
): number | undefined {
  let paren = 0;
  let bracket = 0;
  let brace = 0;
  let quote: "'" | '"' | null = null;
  let escaped = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
    } else if (char === "(") {
      paren += 1;
    } else if (char === ")") {
      paren -= 1;
    } else if (char === "[") {
      bracket += 1;
    } else if (char === "]") {
      bracket -= 1;
    } else if (char === "{") {
      brace += 1;
    } else if (char === "}") {
      brace -= 1;
    }
    if (paren === 0 && bracket === 0 && brace === 0) {
      const matched = onCandidate(i);
      if (typeof matched === "number") {
        return matched;
      }
    }
  }
  return undefined;
}

function findTopLevelKeyword(text: string, keyword: string): number | undefined {
  return scanTopLevelSegments(text, (i) => {
    if (!text.startsWith(keyword, i)) {
      return undefined;
    }
    const before = text[i - 1];
    const after = text[i + keyword.length];
    if (!isBoundaryChar(before) || !isBoundaryChar(after)) {
      return undefined;
    }
    return i;
  });
}

function splitTopLevelByKeyword(text: string, keyword: string): string[] {
  const entries: string[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const segment = text.slice(cursor);
    const relative = findTopLevelKeyword(segment, keyword);
    if (relative === undefined) {
      const tail = segment.trim();
      if (tail) {
        entries.push(tail);
      }
      break;
    }
    const index = cursor + relative;
    const left = text.slice(cursor, index).trim();
    if (left) {
      entries.push(left);
    }
    cursor = index + keyword.length;
  }
  return entries;
}

function findTopLevelChar(text: string, target: string): number | undefined {
  return scanTopLevelSegments(text, (i) => (text[i] === target ? i : undefined));
}

function hasTopLevelChar(text: string, target: string): boolean {
  return findTopLevelChar(text, target) !== undefined;
}

function isWrappedByPair(
  text: string,
  openChar: "(" | "[" | "{",
  closeChar: ")" | "]" | "}",
): boolean {
  if (!text.startsWith(openChar) || !text.endsWith(closeChar)) {
    return false;
  }
  const openToClose: Record<string, string> = {
    "(": ")",
    "[": "]",
    "{": "}",
  };
  const closeToOpen: Record<string, string> = {
    ")": "(",
    "]": "[",
    "}": "{",
  };
  const stack: string[] = [];
  let quote: "'" | '"' | null = null;
  let escaped = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i] ?? "";
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char in openToClose) {
      stack.push(char);
      continue;
    }
    if (char in closeToOpen) {
      const expectedOpen = closeToOpen[char];
      const actualOpen = stack.pop();
      if (actualOpen !== expectedOpen) {
        return false;
      }
      if (stack.length === 0) {
        return i === text.length - 1;
      }
    }
  }
  return false;
}

function stripOuterParens(text: string): string {
  let current = text.trim();
  while (current.startsWith("(") && current.endsWith(")")) {
    const closeIdx = scanTopLevelSegments(current, (i) => (current[i] === ")" ? i : undefined));
    if (closeIdx !== current.length - 1) {
      break;
    }
    current = current.slice(1, -1).trim();
  }
  return current;
}

function collectTopLevelComparators(text: string): Array<{ index: number; op: string }> {
  const ordered = ["==", "!=", ">=", "<=", ">", "<"];
  const found: Array<{ index: number; op: string }> = [];
  void scanTopLevelSegments(text, (i) => {
    for (const op of ordered) {
      if (!text.startsWith(op, i)) {
        continue;
      }
      found.push({ index: i, op });
      break;
    }
    return undefined;
  });
  return found;
}

function isUnarySign(text: string, index: number): boolean {
  let cursor = index - 1;
  while (cursor >= 0 && /\s/.test(text[cursor] ?? "")) {
    cursor -= 1;
  }
  if (cursor < 0) {
    return true;
  }
  const previous = text[cursor] ?? "";
  return ["(", "[", "{", ",", "+", "-", "*", "/", "%", "<", ">", "=", "!", ":"].includes(previous);
}

function findTopLevelBinaryOperator(
  text: string,
  operators: string[],
): { index: number; op: string } | undefined {
  const matches: Array<{ index: number; op: string }> = [];
  void scanTopLevelSegments(text, (i) => {
    for (const op of operators) {
      if (!text.startsWith(op, i)) {
        continue;
      }
      if ((op === "+" || op === "-") && isUnarySign(text, i)) {
        continue;
      }
      matches.push({ index: i, op });
      break;
    }
    return undefined;
  });
  return matches.length > 0 ? matches[matches.length - 1] : undefined;
}

function parseTopLevelSubscript(
  text: string,
): { targetText: string; indexText: string; isSlice: boolean } | undefined {
  let paren = 0;
  let bracket = 0;
  let brace = 0;
  let quote: "'" | '"' | null = null;
  let escaped = false;
  let topLevelOpen = -1;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "(") {
      paren += 1;
      continue;
    }
    if (char === ")") {
      paren -= 1;
      continue;
    }
    if (char === "{") {
      brace += 1;
      continue;
    }
    if (char === "}") {
      brace -= 1;
      continue;
    }
    if (char === "[") {
      if (paren === 0 && brace === 0 && bracket === 0) {
        topLevelOpen = i;
      }
      bracket += 1;
      continue;
    }
    if (char === "]") {
      bracket -= 1;
      if (
        paren === 0 &&
        brace === 0 &&
        bracket === 0 &&
        i === text.length - 1 &&
        topLevelOpen > 0
      ) {
        const targetText = text.slice(0, topLevelOpen).trim();
        const indexText = text.slice(topLevelOpen + 1, i).trim();
        return {
          targetText,
          indexText,
          isSlice: hasTopLevelChar(indexText, ":"),
        };
      }
      continue;
    }
  }
  return undefined;
}

function parseConditionalExpression(
  text: string,
): { thenText: string; conditionText: string; elseText: string } | undefined {
  const ifIdx = findTopLevelKeyword(text, "if");
  if (ifIdx === undefined || ifIdx <= 0) {
    return undefined;
  }
  const remainder = text.slice(ifIdx + "if".length);
  const elseRelative = findTopLevelKeyword(remainder, "else");
  if (elseRelative === undefined) {
    return undefined;
  }
  const elseIdx = ifIdx + "if".length + elseRelative;
  const thenText = text.slice(0, ifIdx).trim();
  const conditionText = text.slice(ifIdx + "if".length, elseIdx).trim();
  const elseText = text.slice(elseIdx + "else".length).trim();
  if (!thenText || !conditionText || !elseText) {
    return undefined;
  }
  return {
    thenText,
    conditionText,
    elseText,
  };
}

type ParsedComprehensionClause = {
  target: string | string[];
  iterableText: string;
  conditionTexts: string[];
};

function parseComprehensionClause(text: string): ParsedComprehensionClause {
  const inIdx = findTopLevelKeyword(text, "in");
  if (inIdx === undefined || inIdx <= 0) {
    throw new CamelProgramParseError(`Unsupported comprehension syntax: for ${text}`);
  }
  const targetText = text.slice(0, inIdx).trim();
  const afterIn = text.slice(inIdx + "in".length).trim();
  if (!targetText || !afterIn) {
    throw new CamelProgramParseError(`Unsupported comprehension syntax: for ${text}`);
  }
  const split = splitTopLevelByKeyword(afterIn, "if");
  const iterableText = (split[0] ?? "").trim();
  const conditionTexts = split
    .slice(1)
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (!iterableText) {
    throw new CamelProgramParseError(`Unsupported comprehension syntax: for ${text}`);
  }
  const targets = parseTargetNames(targetText);
  return {
    target: targets.length === 1 ? (targets[0] ?? "") : targets,
    iterableText,
    conditionTexts,
  };
}

function parseComprehensionClauses(text: string): ParsedComprehensionClause[] {
  let remaining = text.trim();
  const clauses: ParsedComprehensionClause[] = [];
  while (remaining) {
    const forIdx = findTopLevelKeyword(remaining, "for");
    if (forIdx !== 0) {
      throw new CamelProgramParseError(`Unsupported comprehension syntax: ${text}`);
    }
    remaining = remaining.slice("for".length).trim();
    if (!remaining) {
      throw new CamelProgramParseError(`Unsupported comprehension syntax: ${text}`);
    }
    const nextForIdx = findTopLevelKeyword(remaining, "for");
    const clauseText = (
      nextForIdx === undefined ? remaining : remaining.slice(0, nextForIdx)
    ).trim();
    clauses.push(parseComprehensionClause(clauseText));
    remaining = (nextForIdx === undefined ? "" : remaining.slice(nextForIdx)).trim();
  }
  if (clauses.length === 0) {
    throw new CamelProgramParseError(`Unsupported comprehension syntax: ${text}`);
  }
  return clauses;
}

function parseExpression(text: string): unknown {
  const rawTrimmed = text.trim();
  if (!rawTrimmed) {
    throw new CamelProgramParseError("Empty expression.");
  }
  if (isWrappedByPair(rawTrimmed, "(", ")")) {
    const tupleParts = splitTopLevelKeepingEmpty(rawTrimmed.slice(1, -1));
    if (tupleParts.length > 1) {
      return {
        $expr: "tuple",
        items: tupleParts.filter(Boolean).map((part) => parseExpression(part)),
      };
    }
  }
  const trimmed = stripOuterParens(rawTrimmed);
  if (!trimmed) {
    throw new CamelProgramParseError("Empty expression.");
  }
  if (isWrappedByPair(trimmed, "[", "]")) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) {
      return [];
    }
    const forIdx = findTopLevelKeyword(inner, "for");
    if (forIdx !== undefined && forIdx > 0) {
      const elementText = inner.slice(0, forIdx).trim();
      const tail = inner.slice(forIdx + "for".length).trim();
      const clauses = parseComprehensionClauses(`for ${tail}`);
      return {
        $expr: "list_comp",
        element: parseExpression(elementText),
        clauses: clauses.map((clause) => ({
          target: clause.target,
          iterable: parseExpression(clause.iterableText),
          conditions: clause.conditionTexts.map((condition) => parseExpression(condition)),
        })),
      };
    }
    return splitTopLevelKeepingEmpty(inner)
      .filter(Boolean)
      .map((part) => parseExpression(part));
  }
  if (isWrappedByPair(trimmed, "{", "}")) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) {
      return {};
    }
    const forIdx = findTopLevelKeyword(inner, "for");
    if (forIdx !== undefined && forIdx > 0) {
      const head = inner.slice(0, forIdx).trim();
      const tail = inner.slice(forIdx + "for".length).trim();
      const clauses = parseComprehensionClauses(`for ${tail}`);
      const colonIdx = findTopLevelChar(head, ":");
      if (colonIdx !== undefined) {
        const keyText = head.slice(0, colonIdx).trim();
        const valueText = head.slice(colonIdx + 1).trim();
        if (!keyText || !valueText) {
          throw new CamelProgramParseError(`Unsupported dict comprehension: {${inner}}`);
        }
        return {
          $expr: "dict_comp",
          key: parseExpression(keyText),
          value: parseExpression(valueText),
          clauses: clauses.map((clause) => ({
            target: clause.target,
            iterable: parseExpression(clause.iterableText),
            conditions: clause.conditionTexts.map((condition) => parseExpression(condition)),
          })),
        };
      }
      return {
        $expr: "set_comp",
        element: parseExpression(head),
        clauses: clauses.map((clause) => ({
          target: clause.target,
          iterable: parseExpression(clause.iterableText),
          conditions: clause.conditionTexts.map((condition) => parseExpression(condition)),
        })),
      };
    }
    if (!hasTopLevelChar(inner, ":")) {
      return {
        $expr: "set_literal",
        items: splitTopLevelKeepingEmpty(inner)
          .filter(Boolean)
          .map((part) => parseExpression(part)),
      };
    }
    const entries = splitTopLevelKeepingEmpty(inner).filter(Boolean);
    const out: Record<string, unknown> = {};
    for (const entry of entries) {
      const colonIdx = findTopLevelChar(entry, ":");
      if (colonIdx === undefined) {
        throw new CamelProgramParseError(`Unsupported dict entry: ${entry}`);
      }
      const keyText = entry.slice(0, colonIdx).trim();
      const valueText = entry.slice(colonIdx + 1).trim();
      if (!keyText || !valueText) {
        throw new CamelProgramParseError(`Unsupported dict entry: ${entry}`);
      }
      let key: string;
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(keyText)) {
        key = keyText;
      } else {
        try {
          const parsed = JSON5.parse(keyText);
          if (
            typeof parsed !== "string" &&
            typeof parsed !== "number" &&
            typeof parsed !== "boolean" &&
            parsed !== null
          ) {
            throw new CamelProgramParseError(`Unsupported dict key: ${keyText}`);
          }
          key = String(parsed);
        } catch {
          throw new CamelProgramParseError(`Unsupported dict key: ${keyText}`);
        }
      }
      out[key] = parseExpression(valueText);
    }
    return out;
  }
  const topLevelTupleParts = splitTopLevelKeepingEmpty(trimmed);
  if (topLevelTupleParts.length > 1) {
    return {
      $expr: "tuple",
      items: topLevelTupleParts.filter(Boolean).map((part) => parseExpression(part)),
    };
  }
  const conditional = parseConditionalExpression(trimmed);
  if (conditional) {
    return {
      $expr: "ifelse",
      condition: parseExpression(conditional.conditionText),
      thenBranch: parseExpression(conditional.thenText),
      otherwise: parseExpression(conditional.elseText),
    };
  }
  const orParts = splitTopLevelByKeyword(trimmed, "or");
  if (orParts.length > 1) {
    return {
      $expr: "or",
      args: orParts.map((part) => parseExpression(part)),
    };
  }
  const andParts = splitTopLevelByKeyword(trimmed, "and");
  if (andParts.length > 1) {
    return {
      $expr: "and",
      args: andParts.map((part) => parseExpression(part)),
    };
  }
  const notIdx = findTopLevelKeyword(trimmed, "not");
  if (notIdx === 0) {
    return {
      $expr: "not",
      arg: parseExpression(trimmed.slice("not".length).trim()),
    };
  }
  const notInIdx = findTopLevelKeyword(trimmed, "not in");
  if (notInIdx !== undefined && notInIdx > 0) {
    return {
      $expr: "not_in",
      left: parseExpression(trimmed.slice(0, notInIdx).trim()),
      right: parseExpression(trimmed.slice(notInIdx + "not in".length).trim()),
    };
  }
  const inIdx = findTopLevelKeyword(trimmed, "in");
  if (inIdx !== undefined && inIdx > 0) {
    return {
      $expr: "in",
      left: parseExpression(trimmed.slice(0, inIdx).trim()),
      right: parseExpression(trimmed.slice(inIdx + "in".length).trim()),
    };
  }
  const isNotIdx = findTopLevelKeyword(trimmed, "is not");
  if (isNotIdx !== undefined && isNotIdx > 0) {
    return {
      $expr: "is_not",
      left: parseExpression(trimmed.slice(0, isNotIdx).trim()),
      right: parseExpression(trimmed.slice(isNotIdx + "is not".length).trim()),
    };
  }
  const isIdx = findTopLevelKeyword(trimmed, "is");
  if (isIdx !== undefined && isIdx > 0) {
    return {
      $expr: "is",
      left: parseExpression(trimmed.slice(0, isIdx).trim()),
      right: parseExpression(trimmed.slice(isIdx + "is".length).trim()),
    };
  }
  const comparators = collectTopLevelComparators(trimmed);
  if (comparators.length > 1) {
    const values: unknown[] = [];
    const ops: string[] = [];
    let cursor = 0;
    for (const comparator of comparators) {
      const segment = trimmed.slice(cursor, comparator.index).trim();
      if (!segment) {
        throw new CamelProgramParseError(`Unsupported comparison chain: ${trimmed}`);
      }
      values.push(parseExpression(segment));
      const op =
        comparator.op === "=="
          ? "eq"
          : comparator.op === "!="
            ? "neq"
            : comparator.op === ">"
              ? "gt"
              : comparator.op === "<"
                ? "lt"
                : comparator.op === ">="
                  ? "gte"
                  : "lte";
      ops.push(op);
      cursor = comparator.index + comparator.op.length;
    }
    const tail = trimmed.slice(cursor).trim();
    if (!tail) {
      throw new CamelProgramParseError(`Unsupported comparison chain: ${trimmed}`);
    }
    values.push(parseExpression(tail));
    return {
      $expr: "cmp_chain",
      ops,
      values,
    };
  }
  const comparator = comparators[0];
  if (comparator) {
    const left = parseExpression(trimmed.slice(0, comparator.index).trim());
    const right = parseExpression(trimmed.slice(comparator.index + comparator.op.length).trim());
    const op =
      comparator.op === "=="
        ? "eq"
        : comparator.op === "!="
          ? "neq"
          : comparator.op === ">"
            ? "gt"
            : comparator.op === "<"
              ? "lt"
              : comparator.op === ">="
                ? "gte"
                : "lte";
    return {
      $expr: op,
      left,
      right,
    };
  }
  const additive = findTopLevelBinaryOperator(trimmed, ["+", "-"]);
  if (additive) {
    return {
      $expr: additive.op === "+" ? "add" : "sub",
      left: parseExpression(trimmed.slice(0, additive.index).trim()),
      right: parseExpression(trimmed.slice(additive.index + additive.op.length).trim()),
    };
  }
  const multiplicative = findTopLevelBinaryOperator(trimmed, ["*", "/", "%"]);
  if (multiplicative) {
    return {
      $expr: multiplicative.op === "*" ? "mul" : multiplicative.op === "/" ? "div" : "mod",
      left: parseExpression(trimmed.slice(0, multiplicative.index).trim()),
      right: parseExpression(trimmed.slice(multiplicative.index + multiplicative.op.length).trim()),
    };
  }
  if (trimmed.startsWith("-")) {
    return {
      $expr: "neg",
      arg: parseExpression(trimmed.slice(1).trim()),
    };
  }
  if (trimmed.startsWith("+")) {
    return {
      $expr: "pos",
      arg: parseExpression(trimmed.slice(1).trim()),
    };
  }
  const subscript = parseTopLevelSubscript(trimmed);
  if (subscript) {
    if (subscript.isSlice) {
      const parts = splitTopLevelKeepingEmpty(subscript.indexText, ":");
      if (parts.length < 2 || parts.length > 3) {
        throw new CamelProgramParseError(`Unsupported slice syntax: ${trimmed}`);
      }
      return {
        $expr: "slice",
        target: parseExpression(subscript.targetText),
        start: parts[0] ? parseExpression(parts[0]) : undefined,
        end: parts[1] ? parseExpression(parts[1]) : undefined,
        step: parts[2] ? parseExpression(parts[2]) : undefined,
      };
    }
    if (!subscript.indexText) {
      throw new CamelProgramParseError(`Unsupported subscript syntax: ${trimmed}`);
    }
    return {
      $expr: "index",
      target: parseExpression(subscript.targetText),
      index: parseExpression(subscript.indexText),
    };
  }
  if (trimmed === "True") {
    return true;
  }
  if (trimmed === "true") {
    return true;
  }
  if (trimmed === "False") {
    return false;
  }
  if (trimmed === "false") {
    return false;
  }
  if (trimmed === "None") {
    return null;
  }
  if (trimmed === "null") {
    return null;
  }
  if (VAR_REF_RE.test(trimmed)) {
    return { $var: trimmed };
  }
  const expressionCall = parseExpressionCall(trimmed);
  if (expressionCall) {
    if (expressionCall.kind === "name" && isExpressionCallName(expressionCall.name)) {
      return {
        $expr: "call",
        callee: expressionCall.name,
        args: expressionCall.positional,
        kwargs: expressionCall.keyword,
      };
    }
    if (expressionCall.kind === "method") {
      return {
        $expr: "call_method",
        target: expressionCall.target,
        method: expressionCall.method,
        args: expressionCall.positional,
        kwargs: expressionCall.keyword,
      };
    }
  }
  const attrDotIdx = findTopLevelLastDot(trimmed);
  if (attrDotIdx !== undefined && attrDotIdx > 0) {
    const targetText = trimmed.slice(0, attrDotIdx).trim();
    const key = trimmed.slice(attrDotIdx + 1).trim();
    if (targetText && /^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      return {
        $expr: "attr",
        target: parseExpression(targetText),
        key,
      };
    }
  }
  try {
    return JSON5.parse(trimmed);
  } catch {
    throw new CamelProgramParseError(`Unsupported expression: ${trimmed}`);
  }
}

type ProgramLine = {
  index: number;
  indent: number;
  text: string;
};

function isElseClause(text: string): boolean {
  if (text === "else:") {
    return true;
  }
  return text.startsWith("elif ") && text.endsWith(":");
}

function parseTargetNames(text: string): string[] {
  let targetText = text.trim();
  if (!targetText) {
    throw new CamelProgramParseError("Missing assignment target.");
  }
  if (isWrappedByPair(targetText, "(", ")")) {
    targetText = targetText.slice(1, -1).trim();
  }
  const parts = splitTopLevelKeepingEmpty(targetText).map((entry) => entry.trim());
  if (parts.some((part) => !part)) {
    throw new CamelProgramParseError(`Invalid target list: ${text}`);
  }
  for (const part of parts) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(part)) {
      throw new CamelProgramParseError(`Invalid assignment target: ${part}`);
    }
  }
  return parts;
}

function isNoneTypeToken(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return normalized === "none" || normalized === "nonetype" || normalized === "null";
}

function parseSchemaFieldTypeFromAnnotation(rawText: string): CamelSchemaField {
  let text = rawText.trim();
  if (!text) {
    return { type: "string" };
  }

  const optionalMatch = /^(?:typing\.)?Optional\s*\[(.+)\]$/i.exec(text);
  let optional = false;
  if (optionalMatch?.[1]) {
    optional = true;
    text = optionalMatch[1].trim();
  }

  const unionParts = splitTopLevel(text, "|")
    .map((part) => part.trim())
    .filter(Boolean);
  if (unionParts.length > 1) {
    const nonNone = unionParts.filter((part) => !isNoneTypeToken(part));
    if (nonNone.length === 1) {
      optional = true;
      text = nonNone[0] ?? text;
    }
  }

  const listLike = /^(list|tuple|set)\s*\[(.+)\]$/i.exec(text);
  if (listLike?.[2]) {
    const items = parseSchemaFieldTypeFromAnnotation(listLike[2]);
    return {
      type: "array",
      items,
      required: optional ? false : undefined,
    };
  }

  const dictLike = /^dict\s*(\[.*\])?$/i.exec(text);
  if (dictLike) {
    return {
      type: "object",
      required: optional ? false : undefined,
    };
  }

  const literalLike = /^(?:typing\.)?Literal\s*\[.*\]$/i.exec(text);
  if (literalLike) {
    return {
      type: "string",
      required: optional ? false : undefined,
    };
  }

  const normalized = text.trim().toLowerCase();
  let type: CamelSchemaField["type"] = "string";
  if (normalized === "int" || normalized === "integer") {
    type = "integer";
  } else if (normalized === "float" || normalized === "number") {
    type = "number";
  } else if (normalized === "bool" || normalized === "boolean") {
    type = "boolean";
  } else if (normalized === "emailstr" || normalized === "pydantic.emailstr") {
    type = "email";
  } else if (normalized === "datetime" || normalized === "datetime.datetime") {
    type = "datetime";
  } else if (
    normalized === "list" ||
    normalized === "array" ||
    normalized === "tuple" ||
    normalized === "set"
  ) {
    type = "array";
  } else if (normalized === "dict" || normalized === "object" || normalized === "mapping") {
    type = "object";
  } else {
    type = "string";
  }
  return {
    type,
    required: optional ? false : undefined,
  };
}

function parseBaseModelFieldLine(text: string): { name: string; field: CamelSchemaField } {
  const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/.exec(text);
  if (!match) {
    throw new CamelProgramParseError(`Unsupported BaseModel field syntax: ${text}`);
  }
  const name = (match[1] ?? "").trim();
  const rhs = (match[2] ?? "").trim();
  if (!name || !rhs) {
    throw new CamelProgramParseError(`Unsupported BaseModel field syntax: ${text}`);
  }
  const eqIdx = findTopLevelAssignment(rhs);
  const annotation = (eqIdx >= 0 ? rhs.slice(0, eqIdx) : rhs).trim();
  const hasDefault = eqIdx >= 0;
  const parsed = parseSchemaFieldTypeFromAnnotation(annotation);
  if (hasDefault) {
    parsed.required = false;
  } else if (parsed.required === undefined) {
    parsed.required = true;
  }
  return {
    name,
    field: parsed,
  };
}

function startsTripleQuote(text: string): boolean {
  return text.startsWith('"""') || text.startsWith("'''");
}

class ProgramParser {
  readonly lines: string[];
  index = 0;
  returnCounter = 0;
  unpackCounter = 0;

  constructor(lines: string[]) {
    this.lines = lines;
  }

  parseProgram(): CamelPlannerStep[] {
    return this.parseBlock(0, false);
  }

  private peekMeaningful(start = this.index): ProgramLine | undefined {
    for (let i = start; i < this.lines.length; i += 1) {
      const text = this.lines[i]?.trim() ?? "";
      if (!text || text.startsWith("#")) {
        continue;
      }
      return {
        index: i,
        indent: countIndent(this.lines[i] ?? ""),
        text,
      };
    }
    return undefined;
  }

  private childIndent(parentIndent: number): number {
    const next = this.peekMeaningful();
    if (!next) {
      throw new CamelProgramParseError("Expected an indented block.");
    }
    if (next.indent <= parentIndent) {
      throw new CamelProgramParseError("Expected an indented block.");
    }
    return next.indent;
  }

  private parseBlock(expectedIndent: number, stopOnElseClause: boolean): CamelPlannerStep[] {
    const steps: CamelPlannerStep[] = [];
    while (this.index < this.lines.length) {
      const line = this.lines[this.index] ?? "";
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        this.index += 1;
        continue;
      }
      const indent = countIndent(line);
      if (indent < expectedIndent) {
        break;
      }
      if (indent > expectedIndent) {
        throw new CamelProgramParseError(`Unexpected indentation on line ${this.index + 1}.`);
      }
      if (stopOnElseClause && isElseClause(trimmed)) {
        break;
      }
      steps.push(...this.parseStatement(trimmed, expectedIndent));
    }
    return steps;
  }

  private parseStatement(text: string, currentIndent: number): CamelPlannerStep[] {
    if (text === "pass") {
      this.index += 1;
      return [];
    }

    if (/^import\s+/.test(text) || /^from\s+\S+\s+import\s+/.test(text)) {
      // Imports are ignored in the restricted CaMeL subset.
      this.index += 1;
      return [];
    }

    if (text.startsWith("class ") && text.endsWith(":")) {
      const classMatch = /^class\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*BaseModel\s*\)\s*:$/.exec(text);
      if (!classMatch) {
        throw new CamelProgramParseError(`Unsupported class syntax: ${text}`);
      }
      const className = (classMatch[1] ?? "").trim();
      if (!className) {
        throw new CamelProgramParseError(`Unsupported class syntax: ${text}`);
      }
      this.index += 1;
      const bodyIndent = this.childIndent(currentIndent);
      const fields: Record<string, CamelSchemaField> = {};
      let inDocstring = false;
      let docstringQuote: '"""' | "'''" | undefined;
      while (this.index < this.lines.length) {
        const line = this.lines[this.index] ?? "";
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
          this.index += 1;
          continue;
        }
        const indent = countIndent(line);
        if (indent < bodyIndent) {
          break;
        }
        if (indent > bodyIndent) {
          throw new CamelProgramParseError(
            `Unexpected indentation in class body on line ${this.index + 1}.`,
          );
        }

        if (inDocstring) {
          if (docstringQuote && trimmed.includes(docstringQuote)) {
            inDocstring = false;
            docstringQuote = undefined;
          }
          this.index += 1;
          continue;
        }
        if (startsTripleQuote(trimmed)) {
          const quote: '"""' | "'''" = trimmed.startsWith('"""') ? '"""' : "'''";
          const closesOnSameLine = trimmed.length > 3 && trimmed.slice(3).includes(quote);
          if (!closesOnSameLine) {
            inDocstring = true;
            docstringQuote = quote;
          }
          this.index += 1;
          continue;
        }

        const parsedField = parseBaseModelFieldLine(trimmed);
        fields[parsedField.name] = parsedField.field;
        this.index += 1;
      }
      if (Object.keys(fields).length === 0) {
        throw new CamelProgramParseError(`BaseModel class ${className} has no fields.`);
      }
      return [
        {
          kind: "assign",
          saveAs: className,
          value: {
            fields,
          },
        },
      ];
    }

    if (text.startsWith("if ") && text.endsWith(":")) {
      const conditionText = text.slice(3, -1).trim();
      this.index += 1;
      const thenIndent = this.childIndent(currentIndent);
      const thenSteps = this.parseBlock(thenIndent, true);

      let otherwise: CamelPlannerStep[] | undefined;
      const maybeElse = this.peekMeaningful(this.index);
      if (maybeElse && maybeElse.indent === currentIndent) {
        if (maybeElse.text === "else:") {
          this.index = maybeElse.index + 1;
          const elseIndent = this.childIndent(currentIndent);
          const elseSteps = this.parseBlock(elseIndent, false);
          otherwise = elseSteps.length > 0 ? elseSteps : undefined;
        } else if (maybeElse.text.startsWith("elif ") && maybeElse.text.endsWith(":")) {
          this.index = maybeElse.index;
          otherwise = this.parseStatement(maybeElse.text, currentIndent);
        }
      }
      return [
        {
          kind: "if",
          condition: parseExpression(conditionText),
          thenBranch: thenSteps,
          otherwise,
        },
      ];
    }

    if (text.startsWith("elif ") && text.endsWith(":")) {
      const conditionText = text.slice(5, -1).trim();
      this.index += 1;
      const thenIndent = this.childIndent(currentIndent);
      const thenSteps = this.parseBlock(thenIndent, true);

      let otherwise: CamelPlannerStep[] | undefined;
      const maybeElse = this.peekMeaningful(this.index);
      if (maybeElse && maybeElse.indent === currentIndent) {
        if (maybeElse.text === "else:") {
          this.index = maybeElse.index + 1;
          const elseIndent = this.childIndent(currentIndent);
          const elseSteps = this.parseBlock(elseIndent, false);
          otherwise = elseSteps.length > 0 ? elseSteps : undefined;
        } else if (maybeElse.text.startsWith("elif ") && maybeElse.text.endsWith(":")) {
          this.index = maybeElse.index;
          otherwise = this.parseStatement(maybeElse.text, currentIndent);
        }
      }

      return [
        {
          kind: "if",
          condition: parseExpression(conditionText),
          thenBranch: thenSteps,
          otherwise,
        },
      ];
    }

    if (text.startsWith("for ") && text.endsWith(":")) {
      const match = /^for\s+(.+?)\s+in\s+(.+):$/.exec(text);
      if (!match) {
        throw new CamelProgramParseError(`Unsupported for-loop syntax: ${text}`);
      }
      const targetNames = parseTargetNames(match[1] ?? "");
      const item = targetNames.length === 1 ? targetNames[0] : targetNames;
      const iterableExpr = parseExpression(match[2] ?? "");
      this.index += 1;
      const bodyIndent = this.childIndent(currentIndent);
      const body = this.parseBlock(bodyIndent, false);
      if (body.length === 0) {
        throw new CamelProgramParseError("for loop body is empty.");
      }
      return [
        {
          kind: "for",
          item,
          iterable: iterableExpr,
          body,
        },
      ];
    }

    if (text.startsWith("return ")) {
      const returnValue = parseExpression(text.slice("return ".length).trim());
      const saveAs = `__camel_return_${this.returnCounter}`;
      this.returnCounter += 1;
      this.index += 1;
      return [
        {
          kind: "assign",
          saveAs,
          value: returnValue,
        },
        {
          kind: "final",
          text: `{{${saveAs}}}`,
        },
      ];
    }

    if (text.startsWith("raise ")) {
      const errorText = text.slice("raise ".length).trim();
      let errorValue: unknown;
      try {
        errorValue = parseExpression(errorText);
      } catch {
        errorValue = errorText;
      }
      this.index += 1;
      return [
        {
          kind: "raise",
          error: errorValue,
        },
      ];
    }

    const augmented = findTopLevelAugmentedAssignment(text);
    if (augmented) {
      const lhs = text.slice(0, augmented.index - 1).trim();
      const rhs = text.slice(augmented.index + 1).trim();
      const targets = parseTargetNames(lhs);
      if (targets.length !== 1) {
        throw new CamelProgramParseError("Augmented assignment only supports a single target.");
      }
      const saveAs = targets[0] ?? lhs;
      const op =
        augmented.op === "+"
          ? "add"
          : augmented.op === "-"
            ? "sub"
            : augmented.op === "*"
              ? "mul"
              : augmented.op === "/"
                ? "div"
                : "mod";
      this.index += 1;
      return [
        {
          kind: "assign",
          saveAs,
          value: {
            $expr: op,
            left: { $var: saveAs },
            right: parseExpression(rhs),
          },
        },
      ];
    }

    const assignmentIdx = findTopLevelAssignment(text);
    if (assignmentIdx >= 0) {
      const lhs = text.slice(0, assignmentIdx).trim();
      const rhs = text.slice(assignmentIdx + 1).trim();
      const targets = parseTargetNames(lhs);
      this.index += 1;
      const call = tryParseCall(rhs);
      if (targets.length > 1) {
        if (call && !isExpressionCallName(call.name) && call.name !== "final") {
          const tempVar = `__camel_unpack_${this.unpackCounter}`;
          this.unpackCounter += 1;
          return [
            {
              kind: "tool",
              tool: call.name,
              args: call.args,
              saveAs: tempVar,
            },
            {
              kind: "unpack",
              targets,
              value: { $var: tempVar },
            },
          ];
        }
        return [
          {
            kind: "unpack",
            targets,
            value: parseExpression(rhs),
          },
        ];
      }
      const saveAs = targets[0] ?? lhs;
      if (call) {
        if (call.name === "final") {
          const finalExpr = call.args.text ?? call.args.arg0;
          if (typeof finalExpr === "string") {
            return [{ kind: "final", text: finalExpr }];
          }
          if (
            finalExpr &&
            typeof finalExpr === "object" &&
            "$var" in (finalExpr as Record<string, unknown>) &&
            typeof (finalExpr as Record<string, unknown>).$var === "string"
          ) {
            return [{ kind: "final", text: `{{${(finalExpr as Record<string, string>).$var}}}` }];
          }
          throw new CamelProgramParseError("final() only supports string or variable arguments.");
        }
        if (isExpressionCallName(call.name)) {
          return [
            {
              kind: "assign",
              saveAs,
              value: parseExpression(rhs),
            },
          ];
        }
        return [
          {
            kind: "tool",
            tool: call.name,
            args: call.args,
            saveAs,
          },
        ];
      }
      return [
        {
          kind: "assign",
          saveAs,
          value: parseExpression(rhs),
        },
      ];
    }

    const call = tryParseCall(text);
    if (!call) {
      try {
        const expression = parseExpression(text);
        if (
          expression &&
          typeof expression === "object" &&
          "$expr" in (expression as Record<string, unknown>) &&
          ((expression as Record<string, unknown>).$expr === "call" ||
            (expression as Record<string, unknown>).$expr === "call_method")
        ) {
          this.index += 1;
          return [];
        }
      } catch {
        // ignored
      }
      throw new CamelProgramParseError(`Unsupported statement: ${text}`);
    }
    this.index += 1;
    if (call.name === "final") {
      const finalExpr = call.args.text ?? call.args.arg0;
      if (typeof finalExpr === "string") {
        return [{ kind: "final", text: finalExpr }];
      }
      if (
        finalExpr &&
        typeof finalExpr === "object" &&
        "$var" in (finalExpr as Record<string, unknown>) &&
        typeof (finalExpr as Record<string, unknown>).$var === "string"
      ) {
        return [{ kind: "final", text: `{{${(finalExpr as Record<string, string>).$var}}}` }];
      }
      throw new CamelProgramParseError("final() only supports string or variable arguments.");
    }
    if (call.name === "print") {
      const printArg = call.args.text ?? call.args.arg0 ?? "";
      return [
        {
          kind: "tool",
          tool: "print",
          args: { text: printArg },
        },
      ];
    }
    if (isExpressionCallName(call.name)) {
      // Pure expression calls are allowed as statements, but their values are discarded.
      parseExpression(text);
      return [];
    }
    return [
      {
        kind: "tool",
        tool: call.name,
        args: call.args,
      },
    ];
  }
}

export function parseCamelProgramToSteps(programText: string): CamelPlannerStep[] {
  const code = extractSingleCodeBlock(programText) ?? programText;
  const lines = code.replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n");
  const parser = new ProgramParser(lines);
  const steps = parser.parseProgram();
  if (steps.length === 0) {
    throw new CamelProgramParseError("Program is empty.");
  }
  return steps;
}
