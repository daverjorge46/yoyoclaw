import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resolveSessionFilePath,
  resolveSessionFilePathOptions,
  resolveSessionTranscriptPath,
  resolveSessionTranscriptPathInDir,
  resolveStorePath,
  validateSessionId,
} from "./paths.js";

describe("resolveStorePath", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses OPENCLAW_HOME for tilde expansion", () => {
    vi.stubEnv("OPENCLAW_HOME", "/srv/openclaw-home");
    vi.stubEnv("HOME", "/home/other");

    const resolved = resolveStorePath("~/.openclaw/agents/{agentId}/sessions/sessions.json", {
      agentId: "research",
    });

    expect(resolved).toBe(
      path.resolve("/srv/openclaw-home/.openclaw/agents/research/sessions/sessions.json"),
    );
  });
});

describe("session path safety", () => {
  it("validates safe session IDs", () => {
    expect(validateSessionId("sess-1")).toBe("sess-1");
    expect(validateSessionId("ABC_123.hello")).toBe("ABC_123.hello");
  });

  it("rejects unsafe session IDs", () => {
    expect(() => validateSessionId("../etc/passwd")).toThrow(/Invalid session ID/);
    expect(() => validateSessionId("a/b")).toThrow(/Invalid session ID/);
    expect(() => validateSessionId("a\\b")).toThrow(/Invalid session ID/);
    expect(() => validateSessionId("/abs")).toThrow(/Invalid session ID/);
  });

  it("resolves transcript path inside an explicit sessions dir", () => {
    const sessionsDir = "/tmp/openclaw/agents/main/sessions";
    const resolved = resolveSessionTranscriptPathInDir("sess-1", sessionsDir, "topic/a+b");

    expect(resolved).toBe(path.resolve(sessionsDir, "sess-1-topic-topic%2Fa%2Bb.jsonl"));
  });

  it("falls back when sessionFile candidates escape the sessions dir", () => {
    const sessionsDir = "/tmp/openclaw/agents/main/sessions";

    const resolved1 = resolveSessionFilePath(
      "sess-1",
      { sessionFile: "../../etc/passwd" },
      {
        sessionsDir,
      },
    );
    expect(resolved1).toBe(path.resolve(sessionsDir, "sess-1.jsonl"));

    const resolved2 = resolveSessionFilePath(
      "sess-1",
      { sessionFile: "/etc/passwd" },
      {
        sessionsDir,
      },
    );
    expect(resolved2).toBe(path.resolve(sessionsDir, "sess-1.jsonl"));
  });

  it("accepts sessionFile candidates within the sessions dir", () => {
    const sessionsDir = "/tmp/openclaw/agents/main/sessions";

    const resolved = resolveSessionFilePath(
      "sess-1",
      { sessionFile: "subdir/threaded-session.jsonl" },
      { sessionsDir },
    );

    expect(resolved).toBe(path.resolve(sessionsDir, "subdir/threaded-session.jsonl"));
  });

  it("accepts absolute sessionFile paths that resolve within the sessions dir", () => {
    const sessionsDir = "/tmp/openclaw/agents/main/sessions";

    const resolved = resolveSessionFilePath(
      "sess-1",
      { sessionFile: "/tmp/openclaw/agents/main/sessions/abc-123.jsonl" },
      { sessionsDir },
    );

    expect(resolved).toBe(path.resolve(sessionsDir, "abc-123.jsonl"));
  });

  it("accepts absolute sessionFile with topic suffix within the sessions dir", () => {
    const sessionsDir = "/tmp/openclaw/agents/main/sessions";

    const resolved = resolveSessionFilePath(
      "sess-1",
      { sessionFile: "/tmp/openclaw/agents/main/sessions/abc-123-topic-42.jsonl" },
      { sessionsDir },
    );

    expect(resolved).toBe(path.resolve(sessionsDir, "abc-123-topic-42.jsonl"));
  });

  it("falls back when absolute sessionFile paths are outside the sessions dir", () => {
    const sessionsDir = "/tmp/openclaw/agents/main/sessions";

    const resolved = resolveSessionFilePath(
      "sess-1",
      { sessionFile: "/tmp/openclaw/agents/work/sessions/abc-123.jsonl" },
      { sessionsDir },
    );

    expect(resolved).toBe(path.resolve(sessionsDir, "sess-1.jsonl"));
  });

  it("uses agent sessions dir fallback for transcript path", () => {
    const resolved = resolveSessionTranscriptPath("sess-1", "main");
    expect(resolved.endsWith(path.join("agents", "main", "sessions", "sess-1.jsonl"))).toBe(true);
  });

  it("prefers storePath when resolving session file options", () => {
    const opts = resolveSessionFilePathOptions({
      storePath: "/tmp/custom/agent-store/sessions.json",
      agentId: "ops",
    });
    expect(opts).toEqual({
      sessionsDir: path.resolve("/tmp/custom/agent-store"),
    });
  });

  it("falls back to agentId when storePath is absent", () => {
    const opts = resolveSessionFilePathOptions({ agentId: "ops" });
    expect(opts).toEqual({ agentId: "ops" });
  });
});
