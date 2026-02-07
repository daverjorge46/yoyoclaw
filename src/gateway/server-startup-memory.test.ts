import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveMemoryBackendConfig = vi.fn();
const getMemorySearchManager = vi.fn();

vi.mock("../memory/backend-config.js", () => ({
  resolveMemoryBackendConfig,
}));

vi.mock("../memory/search-manager.js", () => ({
  getMemorySearchManager,
}));

describe("startGatewayMemoryBackendOnBoot", () => {
  beforeEach(() => {
    resolveMemoryBackendConfig.mockReset();
    getMemorySearchManager.mockReset();
  });

  it("eagerly initializes QMD on boot for the default agent", async () => {
    resolveMemoryBackendConfig.mockReturnValue({
      backend: "qmd",
      citations: "auto",
      qmd: {},
    });
    getMemorySearchManager.mockResolvedValue({ manager: {} });

    const { startGatewayMemoryBackendOnBoot } = await import("./server-startup-memory.js");
    const cfg = { agents: { list: [{ id: "main", default: true }] } } as never;
    await startGatewayMemoryBackendOnBoot({ cfg });

    expect(getMemorySearchManager).toHaveBeenCalledTimes(1);
    expect(getMemorySearchManager).toHaveBeenCalledWith({ cfg, agentId: "main" });
  });

  it("does not initialize when memory backend is not qmd", async () => {
    resolveMemoryBackendConfig.mockReturnValue({
      backend: "builtin",
      citations: "auto",
    });

    const { startGatewayMemoryBackendOnBoot } = await import("./server-startup-memory.js");
    const cfg = { agents: { list: [{ id: "main", default: true }] } } as never;
    await startGatewayMemoryBackendOnBoot({ cfg });

    expect(getMemorySearchManager).not.toHaveBeenCalled();
  });
});
