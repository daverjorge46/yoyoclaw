import fsSync from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { chunkMarkdown, listMemoryFiles } from "./internal.js";

async function makeTempDir(prefix = "moltbot-memory-test-"): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

function canCreateSymlinks(): boolean {
  let tempDir: string | undefined;
  try {
    tempDir = fsSync.mkdtempSync(path.join(os.tmpdir(), "moltbot-symlink-test-"));
    const target = path.join(tempDir, "target.txt");
    const link = path.join(tempDir, "link.txt");
    fsSync.writeFileSync(target, "ok");
    fsSync.symlinkSync(target, link, "file");
    return true;
  } catch {
    return false;
  } finally {
    if (tempDir) {
      try {
        fsSync.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup; ignore failures on CI.
      }
    }
  }
}

describe("listMemoryFiles", () => {
  const symlinksAvailable = canCreateSymlinks();

  it.skipIf(!symlinksAvailable)("includes symlinked markdown files", async () => {
    const tempDir = await makeTempDir();
    const memoryDir = path.join(tempDir, "memory");
    await fs.mkdir(memoryDir);

    // Create a real file outside memory/
    const realFile = path.join(tempDir, "notes.md");
    await fs.writeFile(realFile, "# Notes\nSome content");

    // Create a symlink inside memory/ pointing to the real file
    const symlinkPath = path.join(memoryDir, "linked-notes.md");
    await fs.symlink(realFile, symlinkPath);

    const files = await listMemoryFiles(tempDir);
    expect(files).toContain(symlinkPath);

    // Cleanup
    await fs.rm(tempDir, { recursive: true });
  });

  it.skipIf(!symlinksAvailable)("includes files inside symlinked directories", async () => {
    const tempDir = await makeTempDir();
    const memoryDir = path.join(tempDir, "memory");
    await fs.mkdir(memoryDir);

    // Create a real directory with a markdown file outside memory/
    const realDir = path.join(tempDir, "external-notes");
    await fs.mkdir(realDir);
    await fs.writeFile(path.join(realDir, "doc.md"), "# Doc");

    // Create a symlinked directory inside memory/
    const symlinkDir = path.join(memoryDir, "linked-dir");
    await fs.symlink(realDir, symlinkDir);

    const files = await listMemoryFiles(tempDir);
    expect(files).toContain(path.join(symlinkDir, "doc.md"));

    // Cleanup
    await fs.rm(tempDir, { recursive: true });
  });

  it.skipIf(!symlinksAvailable)("skips dangling symlinks gracefully", async () => {
    const tempDir = await makeTempDir();
    const memoryDir = path.join(tempDir, "memory");
    await fs.mkdir(memoryDir);

    // Create a symlink pointing to a non-existent file
    const danglingSymlink = path.join(memoryDir, "dangling.md");
    await fs.symlink("/non/existent/path.md", danglingSymlink);

    // Should not throw and should return empty (no valid files)
    const files = await listMemoryFiles(tempDir);
    expect(files).not.toContain(danglingSymlink);

    // Cleanup
    await fs.rm(tempDir, { recursive: true });
  });
});

describe("chunkMarkdown", () => {
  it("splits overly long lines into max-sized chunks", () => {
    const chunkTokens = 400;
    const maxChars = chunkTokens * 4;
    const content = "a".repeat(maxChars * 3 + 25);
    const chunks = chunkMarkdown(content, { tokens: chunkTokens, overlap: 0 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(maxChars);
    }
  });
});
