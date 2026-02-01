import { describe, expect, it } from "vitest";

import {
  resolveOpenClawMetadata,
  resolveSkillInvocationPolicy,
  resolveSkillKey,
} from "./frontmatter.js";

describe("resolveSkillInvocationPolicy", () => {
  it("defaults to enabled behaviors", () => {
    const policy = resolveSkillInvocationPolicy({});
    expect(policy.userInvocable).toBe(true);
    expect(policy.disableModelInvocation).toBe(false);
  });

  it("parses frontmatter boolean strings", () => {
    const policy = resolveSkillInvocationPolicy({
      "user-invocable": "no",
      "disable-model-invocation": "yes",
    });
    expect(policy.userInvocable).toBe(false);
    expect(policy.disableModelInvocation).toBe(true);
  });
});

describe("resolveOpenClawMetadata", () => {
  it("parses version from metadata", () => {
    const metadata = resolveOpenClawMetadata({
      metadata: '{"openclaw":{"version":"1.2.3"}}',
    });
    expect(metadata?.version).toBe("1.2.3");
  });

  it("returns undefined when metadata is missing", () => {
    const metadata = resolveOpenClawMetadata({});
    expect(metadata).toBeUndefined();
  });

  it("returns undefined for invalid JSON", () => {
    const metadata = resolveOpenClawMetadata({ metadata: "{invalid json" });
    expect(metadata).toBeUndefined();
  });

  it("parses emoji and homepage", () => {
    const metadata = resolveOpenClawMetadata({
      metadata: '{"openclaw":{"emoji":"🔧","homepage":"https://example.com"}}',
    });
    expect(metadata?.emoji).toBe("🔧");
    expect(metadata?.homepage).toBe("https://example.com");
  });

  it("parses requires fields", () => {
    const metadata = resolveOpenClawMetadata({
      metadata: '{"openclaw":{"requires":{"bins":["node","git"],"env":["API_KEY"]}}}',
    });
    expect(metadata?.requires?.bins).toEqual(["node", "git"]);
    expect(metadata?.requires?.env).toEqual(["API_KEY"]);
  });

  it("defaults missing fields to undefined", () => {
    const metadata = resolveOpenClawMetadata({
      metadata: '{"openclaw":{}}',
    });
    expect(metadata?.version).toBeUndefined();
    expect(metadata?.emoji).toBeUndefined();
    expect(metadata?.always).toBeUndefined();
  });
});

describe("resolveSkillKey", () => {
  it("returns metadata skillKey when available", () => {
    const skill = { name: "my-skill" } as never;
    const entry = { metadata: { skillKey: "custom-key" } } as never;
    expect(resolveSkillKey(skill, entry)).toBe("custom-key");
  });

  it("falls back to skill name", () => {
    const skill = { name: "fallback-skill" } as never;
    expect(resolveSkillKey(skill)).toBe("fallback-skill");
  });

  it("falls back when entry has no metadata", () => {
    const skill = { name: "test" } as never;
    const entry = {} as never;
    expect(resolveSkillKey(skill, entry)).toBe("test");
  });
});
