import { describe, expect, it } from "vitest";
import {
  coerceToFailoverError,
  describeFailoverError,
  parseRetryAfter,
  parseRetryAfterFromMessage,
  resolveFailoverReasonFromError,
} from "./failover-error.js";

describe("failover-error", () => {
  it("infers failover reason from HTTP status", () => {
    expect(resolveFailoverReasonFromError({ status: 402 })).toBe("billing");
    expect(resolveFailoverReasonFromError({ statusCode: "429" })).toBe("rate_limit");
    expect(resolveFailoverReasonFromError({ status: 403 })).toBe("auth");
    expect(resolveFailoverReasonFromError({ status: 408 })).toBe("timeout");
    expect(resolveFailoverReasonFromError({ status: 400 })).toBe("format");
  });

  it("infers format errors from error messages", () => {
    expect(
      resolveFailoverReasonFromError({
        message: "invalid request format: messages.1.content.1.tool_use.id",
      }),
    ).toBe("format");
  });

  it("infers timeout from common node error codes", () => {
    expect(resolveFailoverReasonFromError({ code: "ETIMEDOUT" })).toBe("timeout");
    expect(resolveFailoverReasonFromError({ code: "ECONNRESET" })).toBe("timeout");
  });

  it("coerces failover-worthy errors into FailoverError with metadata", () => {
    const err = coerceToFailoverError("credit balance too low", {
      provider: "anthropic",
      model: "claude-opus-4-5",
    });
    expect(err?.name).toBe("FailoverError");
    expect(err?.reason).toBe("billing");
    expect(err?.status).toBe(402);
    expect(err?.provider).toBe("anthropic");
    expect(err?.model).toBe("claude-opus-4-5");
  });

  it("coerces format errors with a 400 status", () => {
    const err = coerceToFailoverError("invalid request format", {
      provider: "google",
      model: "cloud-code-assist",
    });
    expect(err?.reason).toBe("format");
    expect(err?.status).toBe(400);
  });

  it("describes non-Error values consistently", () => {
    const described = describeFailoverError(123);
    expect(described.message).toBe("123");
    expect(described.reason).toBeUndefined();
  });

  describe("parseRetryAfterFromMessage", () => {
    it("parses Gemini retryDelay JSON pattern", () => {
      expect(parseRetryAfterFromMessage('"retryDelay": "15s"')).toBe(15);
      expect(parseRetryAfterFromMessage('"retryDelay":  "60s"')).toBe(60);
    });

    it("parses Gemini 'retry in Ns' pattern", () => {
      expect(parseRetryAfterFromMessage("Please retry in 49.733425304s.")).toBe(50);
      expect(parseRetryAfterFromMessage("retry in 30s")).toBe(30);
    });

    it("prefers retryDelay over retry-in when both present", () => {
      const msg = '"retryDelay": "15s" Please retry in 49s.';
      expect(parseRetryAfterFromMessage(msg)).toBe(15);
    });

    it("returns undefined for unrelated messages", () => {
      expect(parseRetryAfterFromMessage("something went wrong")).toBeUndefined();
      expect(parseRetryAfterFromMessage("")).toBeUndefined();
    });
  });

  describe("parseRetryAfter", () => {
    it("parses HTTP Retry-After header (numeric)", () => {
      expect(parseRetryAfter({ headers: { "retry-after": "30" } })).toBe(30);
    });

    it("falls back to Gemini retryDelay in error message", () => {
      const err = { message: 'Resource exhausted. "retryDelay": "45s"' };
      expect(parseRetryAfter(err)).toBe(45);
    });

    it("falls back to retry-in pattern in error message", () => {
      const err = new Error("Please retry in 49.7s.");
      expect(parseRetryAfter(err)).toBe(50);
    });

    it("prefers HTTP header over message body", () => {
      const err = {
        headers: { "retry-after": "10" },
        message: "Please retry in 49s.",
      };
      expect(parseRetryAfter(err)).toBe(10);
    });

    it("returns undefined for non-object input", () => {
      expect(parseRetryAfter(null)).toBeUndefined();
      expect(parseRetryAfter("string")).toBeUndefined();
    });
  });

  it("coerceToFailoverError preserves Gemini retryAfter", () => {
    const err = {
      status: 429,
      message: 'Resource exhausted. "retryDelay": "45s"',
    };
    const failover = coerceToFailoverError(err);
    expect(failover?.reason).toBe("rate_limit");
    expect(failover?.retryAfter).toBe(45);
  });
});
