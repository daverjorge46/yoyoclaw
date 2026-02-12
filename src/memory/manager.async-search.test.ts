import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMemorySearchManager, type MemoryIndexManager } from "./index.js";

const embedBatch = vi.fn(async () => []);
const embedQuery = vi.fn(async () => [0.2, 0.2, 0.2]);

vi.mock("./embeddings.js", () => ({
  createEmbeddingProvider: async () => ({
    requestedProvider: "openai",
    provider: {
      id: "openai",
      model: "text-embedding-3-small",
      embedQuery,
      embedBatch,
    },
    openAi: {
      baseUrl: "https://api.openai.com/v1",
      headers: { Authorization: "Bearer test", "Content-Type": "application/json" },
      model: "text-embedding-3-small",
    },
  }),
}));

describe("memory search awaits sync", () => {
  let workspaceDir: string;
  let indexPath: string;
  let manager: MemoryIndexManager | null = null;

  beforeEach(async () => {
    workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-mem-async-"));
    indexPath = path.join(workspaceDir, "index.sqlite");
    await fs.mkdir(path.join(workspaceDir, "memory"));
    await fs.writeFile(path.join(workspaceDir, "memory", "2026-01-07.md"), "hello\n");
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    if (manager) {
      await manager.close();
      manager = null;
    }
    await fs.rm(workspaceDir, { recursive: true, force: true });
  });

  it("awaits sync before returning search results", async () => {
    const cfg = {
      agents: {
        defaults: {
          workspace: workspaceDir,
          memorySearch: {
            provider: "openai",
            model: "text-embedding-3-small",
            store: { path: indexPath },
            sync: { watch: false, onSessionStart: false, onSearch: true },
            query: { minScore: 0 },
            remote: { batch: { enabled: true, wait: true } },
          },
        },
        list: [{ id: "main", default: true }],
      },
    };

    const result = await getMemorySearchManager({ cfg, agentId: "main" });
    expect(result.manager).not.toBeNull();
    if (!result.manager) {
      throw new Error("manager missing");
    }
    manager = result.manager;

    // Track sync call order relative to search completion
    let syncStarted = false;
    let syncFinished = false;
    let searchReturnedWhileSyncPending = false;

    const originalSync = manager.sync.bind(manager);
    const syncSpy = vi.fn(async (...args: Parameters<typeof manager.sync>) => {
      syncStarted = true;
      await originalSync(...args);
      syncFinished = true;
    });
    (manager as unknown as { sync: typeof syncSpy }).sync = syncSpy;

    // Mark manager as dirty so sync triggers on search
    (manager as unknown as { dirty: boolean }).dirty = true;

    const results = await manager.search("hello");
    // After search returns, sync should have finished (because we now await it)
    if (syncStarted && !syncFinished) {
      searchReturnedWhileSyncPending = true;
    }

    expect(searchReturnedWhileSyncPending).toBe(false);
    // sync must have been called since dirty was true and onSearch is enabled
    expect(syncSpy).toHaveBeenCalled();
    expect(Array.isArray(results)).toBe(true);
  });

  it("blocks search until sync resolves when dirty", async () => {
    const cfg = {
      agents: {
        defaults: {
          workspace: workspaceDir,
          memorySearch: {
            provider: "openai",
            model: "text-embedding-3-small",
            store: { path: indexPath },
            sync: { watch: false, onSessionStart: false, onSearch: true },
            query: { minScore: 0 },
            remote: { batch: { enabled: true, wait: true } },
          },
        },
        list: [{ id: "main", default: true }],
      },
    };

    const result = await getMemorySearchManager({ cfg, agentId: "main" });
    expect(result.manager).not.toBeNull();
    if (!result.manager) {
      throw new Error("manager missing");
    }
    manager = result.manager;

    // Replace sync with a controlled deferred promise
    let resolveSync!: () => void;
    const syncPromise = new Promise<void>((r) => {
      resolveSync = r;
    });
    const syncMock = vi.fn(async () => syncPromise);
    (manager as unknown as { sync: typeof syncMock }).sync = syncMock;
    (manager as unknown as { dirty: boolean }).dirty = true;

    let searchResolved = false;
    const searchPromise = manager.search("hello").then((r) => {
      searchResolved = true;
      return r;
    });

    // Give event loop a chance to proceed
    await new Promise((r) => setTimeout(r, 50));
    // search should NOT have resolved because sync is still pending
    expect(searchResolved).toBe(false);

    // Now resolve sync
    resolveSync();
    await searchPromise;
    expect(searchResolved).toBe(true);
    expect(syncMock).toHaveBeenCalled();
  });

  it("does not block search when not dirty", async () => {
    const cfg = {
      agents: {
        defaults: {
          workspace: workspaceDir,
          memorySearch: {
            provider: "openai",
            model: "text-embedding-3-small",
            store: { path: indexPath },
            sync: { watch: false, onSessionStart: false, onSearch: true },
            query: { minScore: 0 },
            remote: { batch: { enabled: true, wait: true } },
          },
        },
        list: [{ id: "main", default: true }],
      },
    };

    const result = await getMemorySearchManager({ cfg, agentId: "main" });
    expect(result.manager).not.toBeNull();
    if (!result.manager) {
      throw new Error("manager missing");
    }
    manager = result.manager;

    // sync should not be called when not dirty
    const syncMock = vi.fn(async () => {});
    (manager as unknown as { sync: typeof syncMock }).sync = syncMock;
    // dirty defaults to false after initial sync, but ensure it
    (manager as unknown as { dirty: boolean }).dirty = false;
    (manager as unknown as { sessionsDirty: boolean }).sessionsDirty = false;

    const results = await manager.search("hello");
    expect(syncMock).not.toHaveBeenCalled();
    expect(Array.isArray(results)).toBe(true);
  });
});
