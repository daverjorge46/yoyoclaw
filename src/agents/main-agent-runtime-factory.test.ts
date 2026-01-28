import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type { MoltbotConfig } from "../config/config.js";

// Mock the dependent modules
vi.mock("./pi-agent-runtime.js", () => ({
  createPiAgentRuntime: vi.fn(() => ({
    kind: "pi",
    displayName: "Pi Agent",
    run: vi.fn(),
  })),
}));

vi.mock("./agent-scope.js", () => ({
  resolveAgentConfig: vi.fn(),
}));

vi.mock("../logging/subsystem.js", () => ({
  createSubsystemLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// Dynamic import mock for CCSDK
const mockCcSdkRuntime = {
  kind: "ccsdk" as const,
  displayName: "Claude Code SDK",
  run: vi.fn(),
};
const mockIsSdkAvailable = vi.fn(() => true);
const mockCreateCcSdkAgentRuntime = vi.fn(() => mockCcSdkRuntime);

vi.mock("./claude-agent-sdk/index.js", () => ({
  createCcSdkAgentRuntime: mockCreateCcSdkAgentRuntime,
  isSdkAvailable: mockIsSdkAvailable,
}));

import {
  resolveAgentRuntimeKind,
  createAgentRuntime,
  isCcSdkRuntimeAvailable,
} from "./main-agent-runtime-factory.js";
import { createPiAgentRuntime } from "./pi-agent-runtime.js";
import { resolveAgentConfig } from "./agent-scope.js";

describe("main-agent-runtime-factory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsSdkAvailable.mockReturnValue(true);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("resolveAgentRuntimeKind", () => {
    it("returns per-agent runtime when configured as 'pi'", () => {
      vi.mocked(resolveAgentConfig).mockReturnValue({ runtime: "pi" });

      const result = resolveAgentRuntimeKind({} as MoltbotConfig, "test-agent");

      expect(result).toBe("pi");
    });

    it("returns per-agent runtime when configured as 'ccsdk'", () => {
      vi.mocked(resolveAgentConfig).mockReturnValue({ runtime: "ccsdk" });

      const result = resolveAgentRuntimeKind({} as MoltbotConfig, "test-agent");

      expect(result).toBe("ccsdk");
    });

    it("falls back to defaults.runtime when per-agent not configured", () => {
      vi.mocked(resolveAgentConfig).mockReturnValue(undefined);

      const config: MoltbotConfig = {
        agents: {
          defaults: {
            runtime: "ccsdk",
          },
        },
      };

      const result = resolveAgentRuntimeKind(config, "test-agent");

      expect(result).toBe("ccsdk");
    });

    it("falls back to 'pi' when no runtime is configured", () => {
      vi.mocked(resolveAgentConfig).mockReturnValue(undefined);

      const config: MoltbotConfig = {};

      const result = resolveAgentRuntimeKind(config, "test-agent");

      expect(result).toBe("pi");
    });

    it("ignores invalid per-agent runtime values", () => {
      vi.mocked(resolveAgentConfig).mockReturnValue({ runtime: "invalid" as any });

      const config: MoltbotConfig = {
        agents: {
          defaults: {
            runtime: "ccsdk",
          },
        },
      };

      const result = resolveAgentRuntimeKind(config, "test-agent");

      expect(result).toBe("ccsdk");
    });

    it("ignores invalid defaults.runtime values", () => {
      vi.mocked(resolveAgentConfig).mockReturnValue(undefined);

      const config: MoltbotConfig = {
        agents: {
          defaults: {
            runtime: "bogus" as any,
          },
        },
      };

      const result = resolveAgentRuntimeKind(config, "test-agent");

      expect(result).toBe("pi");
    });

    it("prefers per-agent runtime over defaults", () => {
      vi.mocked(resolveAgentConfig).mockReturnValue({ runtime: "pi" });

      const config: MoltbotConfig = {
        agents: {
          defaults: {
            runtime: "ccsdk",
          },
        },
      };

      const result = resolveAgentRuntimeKind(config, "test-agent");

      expect(result).toBe("pi");
    });
  });

  describe("createAgentRuntime", () => {
    it("creates Pi runtime when resolved kind is 'pi'", async () => {
      vi.mocked(resolveAgentConfig).mockReturnValue({ runtime: "pi" });

      const runtime = await createAgentRuntime({} as MoltbotConfig, "test-agent");

      expect(createPiAgentRuntime).toHaveBeenCalled();
      expect(runtime.kind).toBe("pi");
    });

    it("creates CCSDK runtime when resolved kind is 'ccsdk' and SDK available", async () => {
      vi.mocked(resolveAgentConfig).mockReturnValue({ runtime: "ccsdk" });
      mockIsSdkAvailable.mockReturnValue(true);

      const runtime = await createAgentRuntime({} as MoltbotConfig, "test-agent");

      expect(mockCreateCcSdkAgentRuntime).toHaveBeenCalled();
      expect(runtime.kind).toBe("ccsdk");
    });

    it("falls back to Pi runtime when CCSDK requested but SDK unavailable", async () => {
      vi.mocked(resolveAgentConfig).mockReturnValue({ runtime: "ccsdk" });
      mockIsSdkAvailable.mockReturnValue(false);

      const runtime = await createAgentRuntime({} as MoltbotConfig, "test-agent");

      expect(createPiAgentRuntime).toHaveBeenCalled();
      expect(runtime.kind).toBe("pi");
    });

    it("respects forceKind parameter to override config resolution", async () => {
      vi.mocked(resolveAgentConfig).mockReturnValue({ runtime: "pi" });
      mockIsSdkAvailable.mockReturnValue(true);

      const runtime = await createAgentRuntime({} as MoltbotConfig, "test-agent", "ccsdk");

      expect(mockCreateCcSdkAgentRuntime).toHaveBeenCalled();
      expect(runtime.kind).toBe("ccsdk");
    });

    it("passes CCSDK config to createCcSdkAgentRuntime", async () => {
      const ccsdkConfig = { modelTiers: { primary: "claude-sonnet-4-20250514" } };
      vi.mocked(resolveAgentConfig).mockReturnValue({
        runtime: "ccsdk",
        ccsdk: ccsdkConfig,
      });
      mockIsSdkAvailable.mockReturnValue(true);

      const config: MoltbotConfig = {};
      await createAgentRuntime(config, "test-agent");

      expect(mockCreateCcSdkAgentRuntime).toHaveBeenCalledWith({
        config,
        ccsdkConfig,
      });
    });
  });

  describe("isCcSdkRuntimeAvailable", () => {
    it("returns true when SDK is available", async () => {
      mockIsSdkAvailable.mockReturnValue(true);

      const result = await isCcSdkRuntimeAvailable();

      expect(result).toBe(true);
    });

    it("returns false when SDK is unavailable", async () => {
      mockIsSdkAvailable.mockReturnValue(false);

      const result = await isCcSdkRuntimeAvailable();

      expect(result).toBe(false);
    });
  });
});
