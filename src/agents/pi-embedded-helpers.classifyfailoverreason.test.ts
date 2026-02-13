import { describe, expect, it } from "vitest";
import { classifyFailoverReason } from "./pi-embedded-helpers.js";
it("classifies 404 / model-not-found errors as model_not_found", () => {
  // Google Gemini deprecated model (exact error from issue #4992)
  expect(
    classifyFailoverReason(
      "models/gemini-1.5-pro is not found for API version v1beta, or is not supported for generateContent.",
    ),
  ).toBe("model_not_found");

  // Generic 404 with NOT_FOUND status
  expect(
    classifyFailoverReason(
      '{"error":{"code":404,"message":"models/gemini-1.5-pro is not found","status":"NOT_FOUND"}}',
    ),
  ).toBe("model_not_found");

  // Model does not exist
  expect(classifyFailoverReason("The model `gpt-5-turbo` does not exist")).toBe("model_not_found");

  // Model not available
  expect(classifyFailoverReason("model is not available in your region")).toBe("model_not_found");
});
import { DEFAULT_AGENTS_FILENAME } from "./workspace.js";

const _makeFile = (overrides: Partial<WorkspaceBootstrapFile>): WorkspaceBootstrapFile => ({
  name: DEFAULT_AGENTS_FILENAME,
  path: "/tmp/AGENTS.md",
  content: "",
  missing: false,
  ...overrides,
});
describe("classifyFailoverReason", () => {
  it("returns a stable reason", () => {
    expect(classifyFailoverReason("invalid api key")).toBe("auth");
    expect(classifyFailoverReason("no credentials found")).toBe("auth");
    expect(classifyFailoverReason("no api key found")).toBe("auth");
    expect(classifyFailoverReason("429 too many requests")).toBe("rate_limit");
    expect(classifyFailoverReason("resource has been exhausted")).toBe("rate_limit");
    expect(
      classifyFailoverReason(
        '{"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}',
      ),
    ).toBe("rate_limit");
    expect(classifyFailoverReason("invalid request format")).toBe("format");
    expect(classifyFailoverReason("credit balance too low")).toBe("billing");
    expect(classifyFailoverReason("deadline exceeded")).toBe("timeout");
    expect(
      classifyFailoverReason(
        "521 <!DOCTYPE html><html><head><title>Web server is down</title></head><body>Cloudflare</body></html>",
      ),
    ).toBe("timeout");
    expect(classifyFailoverReason("string should match pattern")).toBe("format");
    expect(classifyFailoverReason("bad request")).toBeNull();
    expect(
      classifyFailoverReason(
        "messages.84.content.1.image.source.base64.data: At least one of the image dimensions exceed max allowed size for many-image requests: 2000 pixels",
      ),
    ).toBeNull();
    expect(classifyFailoverReason("image exceeds 5 MB maximum")).toBeNull();
  });
  it("classifies OpenAI usage limit errors as rate_limit", () => {
    expect(classifyFailoverReason("You have hit your ChatGPT usage limit (plus plan)")).toBe(
      "rate_limit",
    );
  });
});
