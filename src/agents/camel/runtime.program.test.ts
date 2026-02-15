import type { AssistantMessage } from "@mariozechner/pi-ai";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const completeSimpleMock = vi.fn();

vi.mock("@mariozechner/pi-ai", async () => {
  const actual = await vi.importActual<typeof import("@mariozechner/pi-ai")>("@mariozechner/pi-ai");
  return {
    ...actual,
    completeSimple: (...args: unknown[]) => completeSimpleMock(...args),
  };
});

let runCamelRuntime: typeof import("./runtime.js").runCamelRuntime;

beforeAll(async () => {
  ({ runCamelRuntime } = await import("./runtime.js"));
});

function assistantText(text: string): AssistantMessage {
  return {
    role: "assistant",
    content: [{ type: "text", text }],
    api: "openai-responses",
    provider: "openai",
    model: "mock-1",
    usage: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 0,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    },
    stopReason: "stop",
    timestamp: Date.now(),
  };
}

describe("camel runtime program execution", () => {
  beforeEach(() => {
    completeSimpleMock.mockReset();
  });

  it("executes code-block planner output with expressions", async () => {
    completeSimpleMock.mockResolvedValueOnce(
      assistantText(`\`\`\`python
count = 2
if count > 1 and not False:
  final("ok")
else:
  final("bad")
\`\`\``),
    );
    const result = await runCamelRuntime({
      model: {} as never,
      provider: "openai",
      modelId: "mock-1",
      prompt: "say ok",
      history: "",
      tools: [],
      runId: "run:test:program",
    });
    expect(result.assistantTexts.at(-1)).toBe("ok");
  });

  it("executes query_ai_assistant inside program mode", async () => {
    completeSimpleMock
      .mockResolvedValueOnce(
        assistantText(`\`\`\`python
result = query_ai_assistant("extract name", {"text":"name is Alice"}, {"fields":{"name":{"type":"string","required":true}}})
final(result.name)
\`\`\``),
      )
      .mockResolvedValueOnce(assistantText('{"have_enough_information":true,"name":"Alice"}'));

    const result = await runCamelRuntime({
      model: {} as never,
      provider: "openai",
      modelId: "mock-1",
      prompt: "extract",
      history: "",
      tools: [],
      runId: "run:test:qllm",
    });
    expect(result.assistantTexts.at(-1)).toBe("Alice");
  });

  it("executes query_ai_assistant with BaseModel class schema", async () => {
    completeSimpleMock
      .mockResolvedValueOnce(
        assistantText(`\`\`\`python
class Extracted(BaseModel):
  name: str
  score: int
result = query_ai_assistant(query="extract", input={"text":"Alice has score 7"}, schema=Extracted)
if result.score == 7:
  final(result.name)
else:
  final("bad")
\`\`\``),
      )
      .mockResolvedValueOnce(
        assistantText('{"have_enough_information":true,"name":"Alice","score":7}'),
      );

    const result = await runCamelRuntime({
      model: {} as never,
      provider: "openai",
      modelId: "mock-1",
      prompt: "extract schema class",
      history: "",
      tools: [],
      runId: "run:test:qllm-schema-class",
    });
    expect(result.assistantTexts.at(-1)).toBe("Alice");
  });

  it("retries qllm when schema validation fails and then succeeds", async () => {
    completeSimpleMock
      .mockResolvedValueOnce(
        assistantText(`\`\`\`python
result = query_ai_assistant(query="extract contact data", input={"text":"contact alice@example.com at 2026-02-14T08:00:00"}, schema={"fields":{"email":{"type":"email","required":true},"when":{"type":"datetime","required":true}}})
final(result.email)
\`\`\``),
      )
      .mockResolvedValueOnce(
        assistantText('{"have_enough_information":true,"email":"not-an-email","when":"nope"}'),
      )
      .mockResolvedValueOnce(
        assistantText(
          '{"have_enough_information":true,"email":"alice@example.com","when":"2026-02-14T08:00:00"}',
        ),
      );

    const result = await runCamelRuntime({
      model: {} as never,
      provider: "openai",
      modelId: "mock-1",
      prompt: "extract",
      history: "",
      tools: [],
      runId: "run:test:qllm-schema-coercion-retry",
    });
    expect(completeSimpleMock).toHaveBeenCalledTimes(3);
    expect(result.assistantTexts.at(-1)).toBe("alice@example.com");
  });

  it("feeds planner parse diagnostics (line/column) back into repair loop", async () => {
    completeSimpleMock
      .mockResolvedValueOnce(
        assistantText(`\`\`\`python
items = [
final("bad")
\`\`\``),
      )
      .mockResolvedValueOnce(
        assistantText(`\`\`\`python
final("recovered")
\`\`\``),
      );

    const result = await runCamelRuntime({
      model: {} as never,
      provider: "openai",
      modelId: "mock-1",
      prompt: "recover from planner syntax",
      history: "",
      tools: [],
      runId: "run:test:planner-parse-repair",
      maxPlanRetries: 2,
    });
    expect(result.assistantTexts.at(-1)).toBe("recovered");
    expect(result.issues.some((issue) => issue.stage === "plan")).toBe(true);
    expect(
      result.issues.some(
        (issue) =>
          issue.stage === "plan" &&
          issue.message.includes("line 1") &&
          issue.message.includes("column"),
      ),
    ).toBe(true);
  });

  it("feeds unknown code tool diagnostics (line/column) back into repair loop", async () => {
    completeSimpleMock
      .mockResolvedValueOnce(
        assistantText(`\`\`\`python
open(path="/tmp/file.txt")
final("bad")
\`\`\``),
      )
      .mockResolvedValueOnce(
        assistantText(`\`\`\`python
final("recovered")
\`\`\``),
      );

    const result = await runCamelRuntime({
      model: {} as never,
      provider: "openai",
      modelId: "mock-1",
      prompt: "use only available tools",
      history: "",
      tools: [],
      runId: "run:test:planner-unknown-tool-repair",
      maxPlanRetries: 2,
    });
    expect(result.assistantTexts.at(-1)).toBe("recovered");
    expect(
      result.issues.some(
        (issue) =>
          issue.stage === "plan" &&
          issue.message.includes('unknown tool "open"') &&
          issue.message.includes("line 1") &&
          issue.message.includes("column"),
      ),
    ).toBe(true);
  });

  it("feeds unknown json tool diagnostics with step path back into repair loop", async () => {
    completeSimpleMock
      .mockResolvedValueOnce(
        assistantText(
          '{"steps":[{"kind":"tool","tool":"open","args":{"path":"/tmp/file.txt"}},{"kind":"final","text":"bad"}]}',
        ),
      )
      .mockResolvedValueOnce(
        assistantText(`\`\`\`python
final("recovered")
\`\`\``),
      );

    const result = await runCamelRuntime({
      model: {} as never,
      provider: "openai",
      modelId: "mock-1",
      prompt: "use only available tools",
      history: "",
      tools: [],
      runId: "run:test:planner-unknown-json-tool-repair",
      maxPlanRetries: 2,
    });
    expect(result.assistantTexts.at(-1)).toBe("recovered");
    expect(
      result.issues.some(
        (issue) =>
          issue.stage === "plan" &&
          issue.message.includes("Planner validation error at steps[0].tool") &&
          issue.message.includes('unknown tool "open"'),
      ),
    ).toBe(true);
  });

  it("honors configured max planner retries", async () => {
    completeSimpleMock.mockResolvedValueOnce(
      assistantText(`\`\`\`python
items = [
final("bad")
\`\`\``),
    );

    await expect(
      runCamelRuntime({
        model: {} as never,
        provider: "openai",
        modelId: "mock-1",
        prompt: "fail fast",
        history: "",
        tools: [],
        runId: "run:test:planner-retries-limit",
        maxPlanRetries: 1,
      }),
    ).rejects.toThrow(/line 1, column/);
    expect(completeSimpleMock).toHaveBeenCalledTimes(1);
  });

  it("allows trusted state-changing tool calls with public control flow", async () => {
    const execTool = {
      name: "exec",
      description: "execute command",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string" },
        },
      },
      execute: vi.fn(async () => ({
        content: [{ type: "text", text: "ok" }],
        details: { ok: true },
      })),
    };
    completeSimpleMock.mockResolvedValueOnce(
      assistantText(`\`\`\`python
exec(command="echo ok")
final("done")
\`\`\``),
    );

    const result = await runCamelRuntime({
      model: {} as never,
      provider: "openai",
      modelId: "mock-1",
      prompt: "run command",
      history: "",
      tools: [execTool as never],
      runId: "run:test:stateful-allowed",
      evalMode: "strict",
    });
    expect(execTool.execute).toHaveBeenCalledTimes(1);
    expect(result.lastToolError).toBeUndefined();
    expect(result.assistantTexts.at(-1)).toBe("done");
  });

  it("blocks state-changing tools in strict mode after private qllm input", async () => {
    const readTool = {
      name: "read",
      description: "read file",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
        },
      },
      execute: vi.fn(async () => ({
        content: [{ type: "text", text: "Private notes" }],
        details: {
          readers: ["alice@example.com"],
          text: "Private notes",
        },
      })),
    };
    const execTool = {
      name: "exec",
      description: "execute command",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string" },
        },
      },
      execute: vi.fn(async () => ({
        content: [{ type: "text", text: "ok" }],
        details: { ok: true },
      })),
    };
    completeSimpleMock
      .mockResolvedValueOnce(
        assistantText(`\`\`\`python
note = read(path="/tmp/note.txt")
info = query_ai_assistant(query="extract", input=note, schema={"fields":{"value":{"type":"string","required":true}}})
exec(command="echo safe")
final("done")
\`\`\``),
      )
      .mockResolvedValueOnce(assistantText('{"have_enough_information":true,"value":"x"}'))
      .mockResolvedValueOnce(assistantText("blocked"));

    const result = await runCamelRuntime({
      model: {} as never,
      provider: "openai",
      modelId: "mock-1",
      prompt: "strict block check",
      history: "",
      tools: [readTool as never, execTool as never],
      runId: "run:test:strict-qllm-deps",
      evalMode: "strict",
    });
    expect(execTool.execute).not.toHaveBeenCalled();
    expect(result.lastToolError?.toolName).toBe("exec");
    expect(result.lastToolError?.error).toContain("state-changing tool");
  });

  it("allows the same flow in normal mode", async () => {
    const readTool = {
      name: "read",
      description: "read file",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
        },
      },
      execute: vi.fn(async () => ({
        content: [{ type: "text", text: "Private notes" }],
        details: {
          readers: ["alice@example.com"],
          text: "Private notes",
        },
      })),
    };
    const execTool = {
      name: "exec",
      description: "execute command",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string" },
        },
      },
      execute: vi.fn(async () => ({
        content: [{ type: "text", text: "ok" }],
        details: { ok: true },
      })),
    };
    completeSimpleMock
      .mockResolvedValueOnce(
        assistantText(`\`\`\`python
note = read(path="/tmp/note.txt")
info = query_ai_assistant(query="extract", input=note, schema={"fields":{"value":{"type":"string","required":true}}})
exec(command="echo safe")
final("done")
\`\`\``),
      )
      .mockResolvedValueOnce(assistantText('{"have_enough_information":true,"value":"x"}'));

    const result = await runCamelRuntime({
      model: {} as never,
      provider: "openai",
      modelId: "mock-1",
      prompt: "normal mode check",
      history: "",
      tools: [readTool as never, execTool as never],
      runId: "run:test:normal-qllm-deps",
      evalMode: "normal",
    });
    expect(execTool.execute).toHaveBeenCalledTimes(1);
    expect(result.lastToolError).toBeUndefined();
    expect(result.assistantTexts.at(-1)).toBe("done");
  });

  it("executes builtin and method expressions", async () => {
    completeSimpleMock.mockResolvedValueOnce(
      assistantText(`\`\`\`python
name = "ALICE"
lowered = name.lower()
nums = range(1, 4)
if len(nums) == 3 and lowered == "alice":
  final("ok")
else:
  final("bad")
\`\`\``),
    );

    const result = await runCamelRuntime({
      model: {} as never,
      provider: "openai",
      modelId: "mock-1",
      prompt: "normalize",
      history: "",
      tools: [],
      runId: "run:test:builtin-methods",
    });
    expect(result.assistantTexts.at(-1)).toBe("ok");
  });

  it("executes additional CaMeL builtins and string methods", async () => {
    completeSimpleMock.mockResolvedValueOnce(
      assistantText(`\`\`\`python
pair = divmod(7, 3)
formatted = "{}, {}!".format("hello", "world")
right = "a.b.c".rpartition(".")
lines = "x\\ny".splitlines()
fingerprint = hash("abc")
if pair[0] == 2 and pair[1] == 1 and formatted == "hello, world!" and right[2] == "c" and len(lines) == 2 and type(fingerprint) == "int":
  final("ok")
else:
  final("bad")
\`\`\``),
    );

    const result = await runCamelRuntime({
      model: {} as never,
      provider: "openai",
      modelId: "mock-1",
      prompt: "extra-builtins",
      history: "",
      tools: [],
      runId: "run:test:extra-builtins",
    });
    expect(result.assistantTexts.at(-1)).toBe("ok");
  });

  it("executes for-loops", async () => {
    completeSimpleMock.mockResolvedValueOnce(
      assistantText(`\`\`\`python
for n in range(1, 4):
  if n == 3:
    final("loop-ok")
final("bad")
\`\`\``),
    );

    const result = await runCamelRuntime({
      model: {} as never,
      provider: "openai",
      modelId: "mock-1",
      prompt: "loop",
      history: "",
      tools: [],
      runId: "run:test:for-loop",
    });
    expect(result.assistantTexts.at(-1)).toBe("loop-ok");
  });

  it("executes arithmetic expressions", async () => {
    completeSimpleMock.mockResolvedValueOnce(
      assistantText(`\`\`\`python
value = 1 + 2 * 3
if value == 7:
  final("math-ok")
else:
  final("bad")
\`\`\``),
    );

    const result = await runCamelRuntime({
      model: {} as never,
      provider: "openai",
      modelId: "mock-1",
      prompt: "math",
      history: "",
      tools: [],
      runId: "run:test:math",
    });
    expect(result.assistantTexts.at(-1)).toBe("math-ok");
  });

  it("executes indexing, slicing, and conditional expressions", async () => {
    completeSimpleMock.mockResolvedValueOnce(
      assistantText(`\`\`\`python
text = "abcdef"
part = text[1:4]
first = part[0]
status = "ok" if first == "b" else "bad"
final(status)
\`\`\``),
    );

    const result = await runCamelRuntime({
      model: {} as never,
      provider: "openai",
      modelId: "mock-1",
      prompt: "slice",
      history: "",
      tools: [],
      runId: "run:test:slice-conditional",
    });
    expect(result.assistantTexts.at(-1)).toBe("ok");
  });

  it("executes reverse slices", async () => {
    completeSimpleMock.mockResolvedValueOnce(
      assistantText(`\`\`\`python
text = "abcd"
rev = text[::-1]
final(rev)
\`\`\``),
    );

    const result = await runCamelRuntime({
      model: {} as never,
      provider: "openai",
      modelId: "mock-1",
      prompt: "reverse-slice",
      history: "",
      tools: [],
      runId: "run:test:reverse-slice",
    });
    expect(result.assistantTexts.at(-1)).toBe("dcba");
  });

  it("retries after explicit raise", async () => {
    completeSimpleMock
      .mockResolvedValueOnce(
        assistantText(`\`\`\`python
raise ValueError("boom")
\`\`\``),
      )
      .mockResolvedValueOnce(
        assistantText(`\`\`\`python
final("recovered")
\`\`\``),
      );

    const result = await runCamelRuntime({
      model: {} as never,
      provider: "openai",
      modelId: "mock-1",
      prompt: "recover",
      history: "",
      tools: [],
      runId: "run:test:raise-retry",
    });
    expect(result.assistantTexts.at(-1)).toBe("recovered");
    expect(result.issues.some((issue) => issue.stage === "execute")).toBe(true);
  });

  it("executes unpack assignment and tuple loop targets", async () => {
    completeSimpleMock.mockResolvedValueOnce(
      assistantText(`\`\`\`python
items = ["a", "b"]
for i, item in enumerate(items):
  if i == 1:
    pair = (i, item.upper())
    idx, name = pair
    final(name)
final("bad")
\`\`\``),
    );

    const result = await runCamelRuntime({
      model: {} as never,
      provider: "openai",
      modelId: "mock-1",
      prompt: "unpack",
      history: "",
      tools: [],
      runId: "run:test:unpack",
    });
    expect(result.assistantTexts.at(-1)).toBe("B");
  });

  it("executes not-in and identity operators", async () => {
    completeSimpleMock.mockResolvedValueOnce(
      assistantText(`\`\`\`python
x = 2
values = [1, 3]
y = 2
if x not in values and x is y:
  final("ok")
else:
  final("bad")
\`\`\``),
    );

    const result = await runCamelRuntime({
      model: {} as never,
      provider: "openai",
      modelId: "mock-1",
      prompt: "ops",
      history: "",
      tools: [],
      runId: "run:test:ops",
    });
    expect(result.assistantTexts.at(-1)).toBe("ok");
  });

  it("executes augmented assignment in loops", async () => {
    completeSimpleMock.mockResolvedValueOnce(
      assistantText(`\`\`\`python
total = 0
for n in range(1, 4):
  total += n
if total == 6:
  final("ok")
else:
  final("bad")
\`\`\``),
    );

    const result = await runCamelRuntime({
      model: {} as never,
      provider: "openai",
      modelId: "mock-1",
      prompt: "augassign",
      history: "",
      tools: [],
      runId: "run:test:augassign",
    });
    expect(result.assistantTexts.at(-1)).toBe("ok");
  });

  it("executes list/dict/set comprehensions", async () => {
    completeSimpleMock.mockResolvedValueOnce(
      assistantText(`\`\`\`python
items = ["a", "b", "a"]
pairs = [item.upper() for i, item in enumerate(items) if i > 0]
lookup = {name: idx for idx, name in enumerate(items)}
seen = {item for item in items}
if pairs[0] == "B" and lookup["a"] == 2 and len(seen) == 2:
  final("ok")
else:
  final("bad")
\`\`\``),
    );

    const result = await runCamelRuntime({
      model: {} as never,
      provider: "openai",
      modelId: "mock-1",
      prompt: "comprehensions",
      history: "",
      tools: [],
      runId: "run:test:comprehensions",
    });
    expect(result.assistantTexts.at(-1)).toBe("ok");
  });

  it("executes multi-clause comprehensions", async () => {
    completeSimpleMock.mockResolvedValueOnce(
      assistantText(`\`\`\`python
xs = [1, 2]
ys = [3, 4]
pairs = [(x, y) for x in xs for y in ys if y > 3]
if len(pairs) == 2 and pairs[0][0] == 1 and pairs[1][0] == 2:
  final("ok")
else:
  final("bad")
\`\`\``),
    );

    const result = await runCamelRuntime({
      model: {} as never,
      provider: "openai",
      modelId: "mock-1",
      prompt: "multi-clause-comprehension",
      history: "",
      tools: [],
      runId: "run:test:multi-clause-comprehension",
    });
    expect(result.assistantTexts.at(-1)).toBe("ok");
  });

  it("executes comparison chains", async () => {
    completeSimpleMock.mockResolvedValueOnce(
      assistantText(`\`\`\`python
score = 7
if 1 < score < 10:
  final("ok")
else:
  final("bad")
\`\`\``),
    );

    const result = await runCamelRuntime({
      model: {} as never,
      provider: "openai",
      modelId: "mock-1",
      prompt: "cmp-chain",
      history: "",
      tools: [],
      runId: "run:test:cmp-chain",
    });
    expect(result.assistantTexts.at(-1)).toBe("ok");
  });

  it("preserves python and/or value semantics", async () => {
    completeSimpleMock.mockResolvedValueOnce(
      assistantText(`\`\`\`python
fallback = "x"
picked = "" or fallback
blocked = 0 and 9
if picked == "x" and blocked == 0:
  final("ok")
else:
  final("bad")
\`\`\``),
    );

    const result = await runCamelRuntime({
      model: {} as never,
      provider: "openai",
      modelId: "mock-1",
      prompt: "and-or-values",
      history: "",
      tools: [],
      runId: "run:test:and-or-values",
    });
    expect(result.assistantTexts.at(-1)).toBe("ok");
  });

  it("executes chained method calls", async () => {
    completeSimpleMock.mockResolvedValueOnce(
      assistantText(`\`\`\`python
names = ["  Alice  "]
normalized = names[0].strip().lower()
final(normalized)
\`\`\``),
    );

    const result = await runCamelRuntime({
      model: {} as never,
      provider: "openai",
      modelId: "mock-1",
      prompt: "chain-methods",
      history: "",
      tools: [],
      runId: "run:test:chain-methods",
    });
    expect(result.assistantTexts.at(-1)).toBe("alice");
  });

  it("executes attribute access after indexing", async () => {
    completeSimpleMock.mockResolvedValueOnce(
      assistantText(`\`\`\`python
users = [{"name": "Alice"}]
name = users[0].name.lower()
final(name)
\`\`\``),
    );

    const result = await runCamelRuntime({
      model: {} as never,
      provider: "openai",
      modelId: "mock-1",
      prompt: "attr-index",
      history: "",
      tools: [],
      runId: "run:test:attr-index",
    });
    expect(result.assistantTexts.at(-1)).toBe("alice");
  });
});
