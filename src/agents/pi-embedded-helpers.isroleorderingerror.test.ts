import { describe, expect, it } from "vitest";
import { isRoleOrderingError } from "./pi-embedded-helpers.js";

describe("isRoleOrderingError", () => {
  it("returns false for undefined/empty input", () => {
    expect(isRoleOrderingError(undefined)).toBe(false);
    expect(isRoleOrderingError("")).toBe(false);
  });

  it("detects Anthropic 'roles must alternate' errors", () => {
    expect(
      isRoleOrderingError('messages: roles must alternate between "user" and "assistant"'),
    ).toBe(true);
  });

  it("detects Google 'incorrect role information' errors", () => {
    expect(isRoleOrderingError("Incorrect role information")).toBe(true);
    expect(isRoleOrderingError("incorrect role information in messages")).toBe(true);
  });

  it("detects 400-prefix role errors", () => {
    expect(isRoleOrderingError("400 Incorrect role information")).toBe(true);
    expect(isRoleOrderingError("400 Bad Request: role must alternate")).toBe(true);
  });

  it("detects JSON-wrapped role errors", () => {
    expect(isRoleOrderingError('{"error":{"message":"400 Incorrect role information"}}')).toBe(
      true,
    );
    expect(isRoleOrderingError('{"message":"Incorrect role information in messages"}')).toBe(true);
  });

  it("does not match unrelated errors", () => {
    expect(isRoleOrderingError("Context overflow")).toBe(false);
    expect(isRoleOrderingError("Something exploded")).toBe(false);
    expect(isRoleOrderingError("500 Internal Server Error")).toBe(false);
  });
});
