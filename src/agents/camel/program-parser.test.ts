import { describe, expect, it } from "vitest";
import { CamelProgramParseError, parseCamelProgramToSteps } from "./program-parser.js";

describe("camel program parser", () => {
  it("parses a simple code block into steps", () => {
    const steps = parseCamelProgramToSteps(`\`\`\`python
contact = search_contacts_by_name(name="Alice")
if contact and count > 1:
  message(action="send", to=contact.email, content="hi")
else:
  print("no contact")
return "done"
\`\`\``);
    expect(steps[0]).toMatchObject({
      kind: "tool",
      tool: "search_contacts_by_name",
      saveAs: "contact",
    });
    expect(steps[1]).toMatchObject({
      kind: "if",
      condition: {
        $expr: "and",
      },
    });
    expect(steps.at(-1)).toMatchObject({
      kind: "final",
    });
  });

  it("parses final() helper", () => {
    const steps = parseCamelProgramToSteps("final('ok')");
    expect(steps).toEqual([{ kind: "final", text: "ok" }]);
  });

  it("attaches source location to parsed tool calls", () => {
    const steps = parseCamelProgramToSteps(`\`\`\`python
  result = open(path="/tmp/file.txt")
\`\`\``);
    expect(steps[0]).toMatchObject({
      kind: "tool",
      tool: "open",
      sourceLocation: {
        line: 1,
        column: 10,
      },
    });
  });

  it("rejects unsupported statements", () => {
    expect(() => parseCamelProgramToSteps("while True:\n  pass")).toThrow(CamelProgramParseError);
  });

  it("reports line/column diagnostics for parse failures", () => {
    try {
      parseCamelProgramToSteps(`items = [
final("bad")`);
      throw new Error("expected parse error");
    } catch (error) {
      expect(error).toBeInstanceOf(CamelProgramParseError);
      const parseError = error as CamelProgramParseError;
      expect(parseError.line).toBe(1);
      expect(parseError.column).toBe(9);
      expect(parseError.message).toContain("line 1, column 9");
    }
  });

  it("parses expression operators", () => {
    const steps = parseCamelProgramToSteps("if not ready or score >= 10:\n  final('ok')");
    expect(steps[0]).toMatchObject({
      kind: "if",
      condition: {
        $expr: "or",
      },
    });
  });

  it("parses arithmetic operator precedence", () => {
    const steps = parseCamelProgramToSteps("value = 1 + 2 * 3");
    expect(steps[0]).toMatchObject({
      kind: "assign",
      value: {
        $expr: "add",
        right: {
          $expr: "mul",
        },
      },
    });
  });

  it("treats python bool literals as literals", () => {
    const steps = parseCamelProgramToSteps("if not False:\n  final('ok')");
    expect(steps[0]).toMatchObject({
      kind: "if",
      condition: {
        $expr: "not",
        arg: false,
      },
    });
  });

  it("treats json literals as literals", () => {
    const steps = parseCamelProgramToSteps('value = {"ok": true, "none": null}');
    expect(steps[0]).toMatchObject({
      kind: "assign",
      value: {
        ok: true,
        none: null,
      },
    });
  });

  it("parses elif chains and for loops", () => {
    const steps = parseCamelProgramToSteps(`if score > 10:
  final("high")
elif score > 5:
  final("mid")
else:
  for item in items:
    print(item)`);
    expect(steps[0]).toMatchObject({
      kind: "if",
      otherwise: [
        {
          kind: "if",
        },
      ],
    });
    const nestedElse = (steps[0] as { otherwise?: Array<{ otherwise?: unknown[] }> })
      .otherwise?.[0];
    expect(nestedElse?.otherwise?.[0]).toMatchObject({
      kind: "for",
      item: "item",
    });
  });

  it("parses builtin and method expression calls as assignments", () => {
    const steps = parseCamelProgramToSteps(`items = range(1, 4)
digest = hash("abc")
pair = divmod(7, 3)
name = user.name.lower()`);
    expect(steps[0]).toMatchObject({
      kind: "assign",
      value: {
        $expr: "call",
        callee: "range",
      },
    });
    expect(steps[1]).toMatchObject({
      kind: "assign",
      value: {
        $expr: "call",
        callee: "hash",
      },
    });
    expect(steps[2]).toMatchObject({
      kind: "assign",
      value: {
        $expr: "call",
        callee: "divmod",
      },
    });
    expect(steps[3]).toMatchObject({
      kind: "assign",
      value: {
        $expr: "call",
        callee: "user.name.lower",
      },
    });
  });

  it("parses indexing, slicing, and conditional expressions", () => {
    const steps = parseCamelProgramToSteps(`first = items[0]
window = text[1:4]
label = "yes" if ok else "no"`);
    expect(steps[0]).toMatchObject({
      kind: "assign",
      value: {
        $expr: "index",
      },
    });
    expect(steps[1]).toMatchObject({
      kind: "assign",
      value: {
        $expr: "slice",
      },
    });
    expect(steps[2]).toMatchObject({
      kind: "assign",
      value: {
        $expr: "ifelse",
      },
    });
  });

  it("parses tuple literals and raise statements", () => {
    const steps = parseCamelProgramToSteps(`pair = (1, 2)
raise ValueError("boom")`);
    expect(steps[0]).toMatchObject({
      kind: "assign",
      value: {
        $expr: "tuple",
      },
    });
    expect(steps[1]).toMatchObject({
      kind: "raise",
    });
  });

  it("parses unpack assignments and tuple for-targets", () => {
    const steps = parseCamelProgramToSteps(`a, b = pair
for i, item in enumerate(items):
  print(item)`);
    expect(steps[0]).toMatchObject({
      kind: "unpack",
      targets: ["a", "b"],
    });
    expect(steps[1]).toMatchObject({
      kind: "for",
      item: ["i", "item"],
    });
  });

  it("parses not-in and identity operators", () => {
    const steps = parseCamelProgramToSteps("ok = x not in values and x is not y");
    expect(steps[0]).toMatchObject({
      kind: "assign",
      value: {
        $expr: "and",
        args: [{ $expr: "not_in" }, { $expr: "is_not" }],
      },
    });
  });

  it("parses augmented assignments", () => {
    const steps = parseCamelProgramToSteps("total += value");
    expect(steps[0]).toMatchObject({
      kind: "assign",
      saveAs: "total",
      value: {
        $expr: "add",
        left: { $var: "total" },
      },
    });
  });

  it("parses list/set/dict comprehensions and set literals", () => {
    const steps = parseCamelProgramToSteps(`pairs = [item for i, item in enumerate(items) if i > 0]
seen = {item for item in items}
lookup = {k: v for k, v in entries}
bag = {1, 2, 2}`);
    expect(steps[0]).toMatchObject({
      kind: "assign",
      value: {
        $expr: "list_comp",
      },
    });
    expect(steps[1]).toMatchObject({
      kind: "assign",
      value: {
        $expr: "set_comp",
      },
    });
    expect(steps[2]).toMatchObject({
      kind: "assign",
      value: {
        $expr: "dict_comp",
      },
    });
    expect(steps[3]).toMatchObject({
      kind: "assign",
      value: {
        $expr: "set_literal",
      },
    });
  });

  it("parses multi-clause comprehensions", () => {
    const steps = parseCamelProgramToSteps("pairs = [(i, j) for i in xs for j in ys if j > 0]");
    expect(steps[0]).toMatchObject({
      kind: "assign",
      value: {
        $expr: "list_comp",
      },
    });
    const clauses = (steps[0] as { value?: { clauses?: unknown[] } }).value?.clauses;
    expect(Array.isArray(clauses)).toBe(true);
    expect(clauses?.length).toBe(2);
  });

  it("parses comparison chains", () => {
    const steps = parseCamelProgramToSteps("ok = 1 < score < 10");
    expect(steps[0]).toMatchObject({
      kind: "assign",
      value: {
        $expr: "cmp_chain",
        ops: ["lt", "lt"],
      },
    });
  });

  it("parses top-level tuple expressions without parentheses", () => {
    const steps = parseCamelProgramToSteps("pair = 1, 2");
    expect(steps[0]).toMatchObject({
      kind: "assign",
      value: {
        $expr: "tuple",
      },
    });
  });

  it("parses method-call chains", () => {
    const steps = parseCamelProgramToSteps("name = user_name.strip().lower()");
    expect(steps[0]).toMatchObject({
      kind: "assign",
      value: {
        $expr: "call_method",
        method: "lower",
      },
    });
  });

  it("parses attribute access on indexed expressions", () => {
    const steps = parseCamelProgramToSteps("name = users[0].name");
    expect(steps[0]).toMatchObject({
      kind: "assign",
      value: {
        $expr: "attr",
        key: "name",
      },
    });
  });

  it("parses BaseModel schema classes into assignable schema values", () => {
    const steps = parseCamelProgramToSteps(`class Extracted(BaseModel):
  """schema for qllm"""
  recipient: str
  score: int
  contact_email: EmailStr
  meeting_at: datetime.datetime
  maybe_text: Optional[str]
  tags: typing.Optional[list[str]]
  level: typing.Literal["low", "high"]
result = query_ai_assistant(query="extract", input=payload, schema=Extracted)`);
    expect(steps[0]).toMatchObject({
      kind: "assign",
      saveAs: "Extracted",
      value: {
        fields: {
          recipient: { type: "string", required: true },
          score: { type: "integer", required: true },
          contact_email: { type: "email", required: true },
          meeting_at: { type: "datetime", required: true },
          maybe_text: { type: "string", required: false },
          tags: { type: "array", required: false },
          level: { type: "string", required: true },
        },
      },
    });
    expect(steps[1]).toMatchObject({
      kind: "tool",
      tool: "query_ai_assistant",
      args: {
        schema: { $var: "Extracted" },
      },
    });
  });

  it("ignores import lines in restricted subset", () => {
    const steps = parseCamelProgramToSteps(`from typing import Optional, Literal
import math
class Extracted(BaseModel):
  value: Optional[str]
result = query_ai_assistant(query="extract", input=payload, schema=Extracted)`);
    expect(steps[0]).toMatchObject({
      kind: "assign",
      saveAs: "Extracted",
    });
    expect(steps[1]).toMatchObject({
      kind: "tool",
      tool: "query_ai_assistant",
    });
  });
});
