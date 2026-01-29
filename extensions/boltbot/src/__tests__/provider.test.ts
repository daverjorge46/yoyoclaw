import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { eigenCloudProvider } from "../provider.js";

describe("eigenCloudProvider", () => {
  const originalEnv = process.env.EIGENCLOUD_API_KEY;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.EIGENCLOUD_API_KEY = originalEnv;
    } else {
      delete process.env.EIGENCLOUD_API_KEY;
    }
  });

  it("has correct id", () => {
    expect(eigenCloudProvider.id).toBe("eigencloud");
  });

  it("has correct label", () => {
    expect(eigenCloudProvider.label).toBe("EigenCloud (EigenAI)");
  });

  it("has aliases", () => {
    expect(eigenCloudProvider.aliases).toContain("eigenai");
  });

  it("auth kind is api_key", () => {
    expect(eigenCloudProvider.auth[0].kind).toBe("api_key");
  });

  describe("with EIGENCLOUD_API_KEY set", () => {
    beforeEach(() => {
      process.env.EIGENCLOUD_API_KEY = "test-key-123";
    });

    it("returns profiles with profileId and credential", async () => {
      const result = await eigenCloudProvider.auth[0].run({} as any);
      expect(result.profiles).toHaveLength(1);
      expect(result.profiles[0].profileId).toBe("eigencloud");
      expect(result.profiles[0].credential).toEqual({
        type: "api_key",
        key: "test-key-123",
      });
    });

    it("returns nested configPatch", async () => {
      const result = await eigenCloudProvider.auth[0].run({} as any);
      const patch = result.configPatch as any;
      expect(patch.models.providers.eigencloud.baseUrl).toBe(
        "https://eigenai.eigencloud.xyz/v1",
      );
    });

    it("sets x-api-key header in configPatch", async () => {
      const result = await eigenCloudProvider.auth[0].run({} as any);
      const patch = result.configPatch as any;
      expect(patch.models.providers.eigencloud.headers["x-api-key"]).toBe(
        "test-key-123",
      );
    });

    it("model input is text array", async () => {
      const result = await eigenCloudProvider.auth[0].run({} as any);
      const patch = result.configPatch as any;
      const model = patch.models.providers.eigencloud.models[0];
      expect(model.input).toEqual(["text"]);
      expect(model.contextWindow).toBe(128_000);
    });

    it("sets defaultModel", async () => {
      const result = await eigenCloudProvider.auth[0].run({} as any);
      expect(result.defaultModel).toBe("gpt-oss-120b-f16");
    });
  });

  describe("without EIGENCLOUD_API_KEY", () => {
    beforeEach(() => {
      delete process.env.EIGENCLOUD_API_KEY;
    });

    it("returns empty profiles with note", async () => {
      const result = await eigenCloudProvider.auth[0].run({} as any);
      expect(result.profiles).toHaveLength(0);
      expect(result.notes).toBeDefined();
      expect(result.notes!.length).toBeGreaterThan(0);
    });
  });
});
