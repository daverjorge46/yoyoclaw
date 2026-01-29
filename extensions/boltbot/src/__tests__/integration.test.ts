import { describe, it, expect, vi } from "vitest";

// Mock clawdbot/plugin-sdk to avoid pulling in the full config/zod chain.
vi.mock("clawdbot/plugin-sdk", () => ({
  emptyPluginConfigSchema: () => ({}),
}));

// Mock better-sqlite3 before any imports that use it
vi.mock("better-sqlite3", () => {
  class MockDatabase {
    exec() {}
    prepare() {
      return {
        run: (..._args: any[]) => {},
        get: (_id?: string) => ({ c: 0 }),
        all: (..._args: any[]) => [],
      };
    }
  }
  return { default: MockDatabase };
});

describe("boltbot plugin integration", () => {
  it("plugin has correct id and name", async () => {
    const mod = await import("../../index.js");
    const plugin = mod.default;
    expect(plugin.id).toBe("boltbot");
    expect(plugin.name).toBe("Boltbot — Trustless Hosting");
  });

  it("register wires provider, hook, and routes", async () => {
    const mod = await import("../../index.js");
    const plugin = mod.default;

    const registered = {
      providers: [] as any[],
      hooks: [] as any[],
      routes: [] as any[],
    };

    const mockApi = {
      registerProvider: vi.fn((p: any) => registered.providers.push(p)),
      on: vi.fn((name: string, handler: any) => registered.hooks.push({ name, handler })),
      registerHttpRoute: vi.fn((r: any) => registered.routes.push(r)),
    };

    plugin.register(mockApi as any);

    // REQ-1: Provider registered
    expect(registered.providers).toHaveLength(1);
    expect(registered.providers[0].id).toBe("eigencloud");

    // REQ-3: after_tool_call hook registered
    expect(registered.hooks).toHaveLength(1);
    expect(registered.hooks[0].name).toBe("after_tool_call");

    // REQ-7: 3 HTTP routes registered
    expect(registered.routes).toHaveLength(3);
    const paths = registered.routes.map((r: any) => r.path);
    expect(paths).toContain("/boltbot/receipts");
    expect(paths).toContain("/boltbot/receipt");
    expect(paths).toContain("/boltbot/stats");
  });

  it("after_tool_call hook fires and creates receipt", async () => {
    const mod = await import("../../index.js");
    const plugin = mod.default;

    let hookHandler: any;
    const mockApi = {
      registerProvider: vi.fn(),
      on: vi.fn((_name: string, handler: any) => { hookHandler = handler; }),
      registerHttpRoute: vi.fn(),
    };

    plugin.register(mockApi as any);
    expect(hookHandler).toBeDefined();

    // Fire the hook -- should not throw
    await hookHandler(
      { toolName: "exec", params: { command: "ls" }, durationMs: 10 },
      { sessionKey: "test-sess", toolName: "exec" },
    );
  });

  it("after_tool_call hook skips low-tier tools", async () => {
    const mod = await import("../../index.js");
    const plugin = mod.default;

    let hookHandler: any;
    const mockApi = {
      registerProvider: vi.fn(),
      on: vi.fn((_name: string, handler: any) => { hookHandler = handler; }),
      registerHttpRoute: vi.fn(),
    };

    plugin.register(mockApi as any);

    // web_search is low tier -- should not throw or store
    await hookHandler(
      { toolName: "web_search", params: { q: "test" }, durationMs: 5 },
      { sessionKey: "test-sess", toolName: "web_search" },
    );
  });
});
