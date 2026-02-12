import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MsgContext } from "../auto-reply/templating.js";
import type { OpenClawConfig } from "../config/config.js";

vi.mock("../agents/model-auth.js", () => ({
  resolveApiKeyForProvider: vi.fn(async () => ({
    apiKey: "test-key",
    source: "test",
    mode: "api-key",
  })),
  requireApiKey: (auth: { apiKey?: string; mode?: string }, provider: string) => {
    if (auth?.apiKey) {
      return auth.apiKey;
    }
    throw new Error(`No API key resolved for provider "${provider}".`);
  },
}));

vi.mock("../media/fetch.js", () => ({
  fetchRemoteMedia: vi.fn(),
}));

vi.mock("../process/exec.js", () => ({
  runExec: vi.fn(),
}));

async function loadApply() {
  return await import("./apply.js");
}

describe("applyMediaUnderstanding – binary file detection", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "binary-detect-"));
    process.env.HOME = tmpDir;
    process.env.USERPROFILE = tmpDir;
    const mediaDir = path.join(tmpDir, ".openclaw", "media", "inbound");
    await fs.mkdir(mediaDir, { recursive: true });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  const baseCfg = {} as OpenClawConfig;

  function buildCtx(overrides: Partial<MsgContext>): MsgContext {
    return {
      Body: "test",
      From: "user",
      To: "bot",
      ...overrides,
    } as MsgContext;
  }

  it("skips .docx files (ZIP-based binary) and does not inject content into Body", async () => {
    // Create a minimal ZIP/docx-like file (ZIP magic bytes + binary content)
    const zipHeader = Buffer.from([
      0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00, 0x08, 0x00, 0x00, 0x00, 0x21, 0x00,
    ]);
    const binaryPadding = Buffer.alloc(4096, 0xab);
    const docxBuffer = Buffer.concat([zipHeader, binaryPadding]);
    const filePath = path.join(tmpDir, ".openclaw", "media", "inbound", "report.docx");
    await fs.writeFile(filePath, docxBuffer);

    const ctx = buildCtx({
      MediaPath: filePath,
      MediaPaths: [filePath],
      MediaType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      MediaTypes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    });

    const { applyMediaUnderstanding } = await loadApply();
    const result = await applyMediaUnderstanding({ ctx, cfg: baseCfg });

    // The .docx should NOT be extracted as a file block
    expect(result.appliedFile).toBe(false);
    // Body should not contain <file> blocks with binary content
    expect(ctx.Body).not.toContain("<file");
  });

  it("skips executable binary files and does not inject content into Body", async () => {
    // ELF binary header
    const elfHeader = Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00]);
    const binaryContent = Buffer.alloc(4096, 0x00);
    const elfBuffer = Buffer.concat([elfHeader, binaryContent]);
    const filePath = path.join(tmpDir, ".openclaw", "media", "inbound", "program.bin");
    await fs.writeFile(filePath, elfBuffer);

    const ctx = buildCtx({
      MediaPath: filePath,
      MediaPaths: [filePath],
      MediaType: "application/octet-stream",
      MediaTypes: ["application/octet-stream"],
    });

    const { applyMediaUnderstanding } = await loadApply();
    const result = await applyMediaUnderstanding({ ctx, cfg: baseCfg });

    expect(result.appliedFile).toBe(false);
    expect(ctx.Body).not.toContain("<file");
  });

  it("still extracts legitimate text files", async () => {
    const textContent = "Hello, this is a perfectly normal text file.\nLine 2.\n";
    const filePath = path.join(tmpDir, ".openclaw", "media", "inbound", "readme.txt");
    await fs.writeFile(filePath, textContent, "utf-8");

    const ctx = buildCtx({
      MediaPath: filePath,
      MediaPaths: [filePath],
      MediaType: "text/plain",
      MediaTypes: ["text/plain"],
    });

    const { applyMediaUnderstanding } = await loadApply();
    const result = await applyMediaUnderstanding({ ctx, cfg: baseCfg });

    expect(result.appliedFile).toBe(true);
    expect(ctx.Body).toContain("<file");
    expect(ctx.Body).toContain("Hello, this is a perfectly normal text file.");
  });

  it("skips files with high null-byte density (binary indicator)", async () => {
    // Binary file with lots of null bytes interspersed with ASCII
    const content = Buffer.alloc(4096);
    for (let i = 0; i < content.length; i += 2) {
      content[i] = 0x41; // 'A'
      content[i + 1] = 0x00; // null
    }
    const filePath = path.join(tmpDir, ".openclaw", "media", "inbound", "data.bin");
    await fs.writeFile(filePath, content);

    const ctx = buildCtx({
      MediaPath: filePath,
      MediaPaths: [filePath],
      MediaType: "application/octet-stream",
      MediaTypes: ["application/octet-stream"],
    });

    const { applyMediaUnderstanding } = await loadApply();
    const result = await applyMediaUnderstanding({ ctx, cfg: baseCfg });

    expect(result.appliedFile).toBe(false);
    expect(ctx.Body).not.toContain("<file");
  });
});
