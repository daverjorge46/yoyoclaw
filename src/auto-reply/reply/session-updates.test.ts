import { describe, expect, it, vi } from "vitest";

vi.mock("../../config/sessions.js", () => ({
  updateSessionStore: vi.fn(async (_path: string, fn: (store: Record<string, unknown>) => void) => {
    const store: Record<string, unknown> = {};
    fn(store);
    return store;
  }),
}));

import type { SessionEntry } from "../../config/sessions.js";
import { updateSessionStore } from "../../config/sessions.js";
import { incrementCompactionCount } from "./session-updates.js";

const mockedUpdateSessionStore = vi.mocked(updateSessionStore);

describe("incrementCompactionCount", () => {
  it("updates totalTokens in sessionStore when tokensAfter is provided", async () => {
    const sessionStore: Record<string, SessionEntry> = {
      main: {
        sessionId: "session-1",
        updatedAt: Date.now(),
        totalTokens: 181000,
        inputTokens: 160000,
        outputTokens: 21000,
        compactionCount: 0,
      },
    };

    const count = await incrementCompactionCount({
      sessionStore,
      sessionKey: "main",
      tokensAfter: 10000,
    });

    expect(count).toBe(1);
    expect(sessionStore.main.totalTokens).toBe(10000);
    expect(sessionStore.main.inputTokens).toBeUndefined();
    expect(sessionStore.main.outputTokens).toBeUndefined();
    expect(sessionStore.main.compactionCount).toBe(1);
  });

  it("does not update totalTokens when tokensAfter is not provided", async () => {
    const sessionStore: Record<string, SessionEntry> = {
      main: {
        sessionId: "session-1",
        updatedAt: Date.now(),
        totalTokens: 181000,
        inputTokens: 160000,
        outputTokens: 21000,
        compactionCount: 0,
      },
    };

    const count = await incrementCompactionCount({
      sessionStore,
      sessionKey: "main",
    });

    expect(count).toBe(1);
    // totalTokens should remain unchanged when tokensAfter is not provided
    expect(sessionStore.main.totalTokens).toBe(181000);
    expect(sessionStore.main.inputTokens).toBe(160000);
    expect(sessionStore.main.outputTokens).toBe(21000);
  });

  it("persists totalTokens to the store file when storePath is provided", async () => {
    const sessionStore: Record<string, SessionEntry> = {
      main: {
        sessionId: "session-1",
        updatedAt: Date.now(),
        totalTokens: 181000,
        compactionCount: 0,
      },
    };

    await incrementCompactionCount({
      sessionStore,
      sessionKey: "main",
      storePath: "/tmp/sessions.json",
      tokensAfter: 10000,
    });

    expect(mockedUpdateSessionStore).toHaveBeenCalledWith(
      "/tmp/sessions.json",
      expect.any(Function),
    );

    // Verify the update function writes totalTokens
    const updateFn = mockedUpdateSessionStore.mock.calls[0][1] as (
      store: Record<string, Partial<SessionEntry>>,
    ) => void;
    const fileStore: Record<string, Partial<SessionEntry>> = { main: { totalTokens: 181000 } };
    updateFn(fileStore);
    expect(fileStore.main.totalTokens).toBe(10000);
  });

  it("returns undefined when sessionStore or sessionKey is missing", async () => {
    const result1 = await incrementCompactionCount({
      sessionKey: "main",
      tokensAfter: 10000,
    });
    expect(result1).toBeUndefined();

    const result2 = await incrementCompactionCount({
      sessionStore: {},
      tokensAfter: 10000,
    });
    expect(result2).toBeUndefined();
  });
});
