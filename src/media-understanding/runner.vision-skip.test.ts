import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi, afterEach } from "vitest";

import type { MsgContext } from "../auto-reply/templating.js";
import type { OpenClawConfig } from "../config/config.js";
import {
  buildProviderRegistry,
  createMediaAttachmentCache,
  normalizeMediaAttachments,
  runCapability,
} from "./runner.js";

const catalog = [
  {
    id: "gpt-4.1",
    name: "GPT-4.1",
    provider: "openai",
    input: ["text", "image"] as const,
  },
];

vi.mock("../agents/model-catalog.js", async () => {
  const actual = await vi.importActual<typeof import("../agents/model-catalog.js")>(
    "../agents/model-catalog.js",
  );
  return {
    ...actual,
    loadModelCatalog: vi.fn(async () => catalog),
  };
});

describe("runCapability image skip", () => {
  let tempFiles: string[] = [];

  afterEach(async () => {
    for (const file of tempFiles) {
      await fs.unlink(file).catch(() => {});
    }
    tempFiles = [];
  });

  it("skips image understanding when the active model supports vision", async () => {
    const ctx: MsgContext = { MediaPath: "/tmp/image.png", MediaType: "image/png" };
    const media = normalizeMediaAttachments(ctx);
    const cache = createMediaAttachmentCache(media);
    const cfg = {} as OpenClawConfig;

    try {
      const result = await runCapability({
        capability: "image",
        cfg,
        ctx,
        attachments: cache,
        media,
        providerRegistry: buildProviderRegistry(),
        activeModel: { provider: "openai", model: "gpt-4.1" },
      });

      expect(result.outputs).toHaveLength(0);
      expect(result.decision.outcome).toBe("skipped");
      expect(result.decision.attachments).toHaveLength(1);
      expect(result.decision.attachments[0]?.attachmentIndex).toBe(0);
      expect(result.decision.attachments[0]?.attempts[0]?.outcome).toBe("skipped");
      expect(result.decision.attachments[0]?.attempts[0]?.reason).toBe(
        "primary model supports vision natively",
      );
    } finally {
      await cache.cleanup();
    }
  });

  it("does NOT skip when image exceeds 5MB even if model supports vision", async () => {
    // Create a real 6MB file
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-test-"));
    const largePath = path.join(tmpDir, "large.png");
    tempFiles.push(largePath);

    // Write 6MB of data
    await fs.writeFile(largePath, Buffer.alloc(6 * 1024 * 1024));

    const ctx: MsgContext = { MediaPath: largePath, MediaType: "image/png" };
    const media = normalizeMediaAttachments(ctx);
    const cache = createMediaAttachmentCache(media);
    const cfg = {} as OpenClawConfig;

    try {
      const result = await runCapability({
        capability: "image",
        cfg,
        ctx,
        attachments: cache,
        media,
        providerRegistry: buildProviderRegistry(),
        activeModel: { provider: "openai", model: "gpt-4.1" },
      });

      // Should NOT skip with reason "primary model supports vision natively"
      // The image exceeds 5MB, so native vision should be bypassed
      const skipReason = result.decision.attachments[0]?.chosen?.reason;

      // The key assertion: it should NOT skip because of native vision
      expect(skipReason).not.toBe("primary model supports vision natively");
    } finally {
      await cache.cleanup();
    }
  });
});
