import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

import { isPathWithinBase } from "../../test/helpers/paths.js";
import { withTempHome } from "../../test/helpers/temp-home.js";

describe("media store", () => {
  async function withTempStore<T>(
    fn: (store: typeof import("./store.js"), home: string) => Promise<T>,
  ): Promise<T> {
    return await withTempHome(async (home) => {
      vi.resetModules();
      const store = await import("./store.js");
      return await fn(store, home);
    });
  }

  it("creates and returns media directory", async () => {
    await withTempStore(async (store, home) => {
      const dir = await store.ensureMediaDir();
      expect(isPathWithinBase(home, dir)).toBe(true);
      expect(path.normalize(dir)).toContain(`${path.sep}.clawdbot${path.sep}media`);
      const stat = await fs.stat(dir);
      expect(stat.isDirectory()).toBe(true);
    });
  });

  it("saves buffers and enforces size limit", async () => {
    await withTempStore(async (store) => {
      const buf = Buffer.from("hello");
      const saved = await store.saveMediaBuffer(buf, "text/plain");
      const savedStat = await fs.stat(saved.path);
      expect(savedStat.size).toBe(buf.length);
      expect(saved.contentType).toBe("text/plain");
      expect(saved.path.endsWith(".txt")).toBe(true);

      const jpeg = await sharp({
        create: { width: 2, height: 2, channels: 3, background: "#123456" },
      })
        .jpeg({ quality: 80 })
        .toBuffer();
      const savedJpeg = await store.saveMediaBuffer(jpeg, "image/jpeg");
      expect(savedJpeg.contentType).toBe("image/jpeg");
      expect(savedJpeg.path.endsWith(".jpg")).toBe(true);

      const huge = Buffer.alloc(5 * 1024 * 1024 + 1);
      await expect(store.saveMediaBuffer(huge)).rejects.toThrow("Media exceeds 5MB limit");
    });
  });

  it("copies local files and cleans old media", async () => {
    await withTempStore(async (store, home) => {
      const srcFile = path.join(home, "tmp-src.txt");
      await fs.mkdir(home, { recursive: true });
      await fs.writeFile(srcFile, "local file");
      const saved = await store.saveMediaSource(srcFile);
      expect(saved.size).toBe(10);
      const savedStat = await fs.stat(saved.path);
      expect(savedStat.isFile()).toBe(true);
      expect(path.extname(saved.path)).toBe(".txt");

      // make the file look old and ensure cleanOldMedia removes it
      const past = Date.now() - 10_000;
      await fs.utimes(saved.path, past / 1000, past / 1000);
      await store.cleanOldMedia(1);
      await expect(fs.stat(saved.path)).rejects.toThrow();
    });
  });

  it("deletes sidecar files when parent media is deleted", async () => {
    await withTempStore(async (store) => {
      const mediaDir = await store.ensureMediaDir();

      // Create a media file with sidecars
      const mediaPath = path.join(mediaDir, "test-audio.ogg");
      const transcriptPath = `${mediaPath}.transcript.txt`;
      const descriptionPath = `${mediaPath}.description.txt`;

      await fs.writeFile(mediaPath, "audio content");
      await fs.writeFile(transcriptPath, "transcript text");
      await fs.writeFile(descriptionPath, "description text");

      // Verify all files exist
      await expect(fs.stat(mediaPath)).resolves.toBeDefined();
      await expect(fs.stat(transcriptPath)).resolves.toBeDefined();
      await expect(fs.stat(descriptionPath)).resolves.toBeDefined();

      // Make files old
      const past = Date.now() - 10_000;
      await fs.utimes(mediaPath, past / 1000, past / 1000);

      // Run cleanup
      await store.cleanOldMedia(1);

      // Verify all files are deleted
      await expect(fs.stat(mediaPath)).rejects.toThrow();
      await expect(fs.stat(transcriptPath)).rejects.toThrow();
      await expect(fs.stat(descriptionPath)).rejects.toThrow();
    });
  });

  it("deletes orphaned sidecar files when their parent no longer exists", async () => {
    await withTempStore(async (store) => {
      const mediaDir = await store.ensureMediaDir();

      // Create orphaned sidecars (no parent media file)
      const transcriptPath = path.join(mediaDir, "orphan.ogg.transcript.txt");
      const descriptionPath = path.join(mediaDir, "orphan.ogg.description.txt");

      await fs.writeFile(transcriptPath, "orphaned transcript");
      await fs.writeFile(descriptionPath, "orphaned description");

      // Make sidecars old
      const past = Date.now() - 10_000;
      await fs.utimes(transcriptPath, past / 1000, past / 1000);
      await fs.utimes(descriptionPath, past / 1000, past / 1000);

      // Run cleanup
      await store.cleanOldMedia(1);

      // Orphaned sidecars should be cleaned as regular old files
      await expect(fs.stat(transcriptPath)).rejects.toThrow();
      await expect(fs.stat(descriptionPath)).rejects.toThrow();
    });
  });

  it("keeps sidecars when parent media is not old enough", async () => {
    await withTempStore(async (store) => {
      const mediaDir = await store.ensureMediaDir();

      // Create a fresh media file with sidecars
      const mediaPath = path.join(mediaDir, "fresh-audio.ogg");
      const transcriptPath = `${mediaPath}.transcript.txt`;

      await fs.writeFile(mediaPath, "fresh audio");
      await fs.writeFile(transcriptPath, "fresh transcript");

      // Run cleanup with very short TTL, but files are brand new
      await store.cleanOldMedia(1);

      // Files should still exist (not old enough)
      await expect(fs.stat(mediaPath)).resolves.toBeDefined();
      await expect(fs.stat(transcriptPath)).resolves.toBeDefined();
    });
  });

  it("sets correct mime for xlsx by extension", async () => {
    await withTempStore(async (store, home) => {
      const xlsxPath = path.join(home, "sheet.xlsx");
      await fs.mkdir(home, { recursive: true });
      await fs.writeFile(xlsxPath, "not really an xlsx");

      const saved = await store.saveMediaSource(xlsxPath);
      expect(saved.contentType).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      expect(path.extname(saved.path)).toBe(".xlsx");
    });
  });

  it("renames media based on detected mime even when extension is wrong", async () => {
    await withTempStore(async (store, home) => {
      const pngBytes = await sharp({
        create: { width: 2, height: 2, channels: 3, background: "#00ff00" },
      })
        .png()
        .toBuffer();
      const bogusExt = path.join(home, "image-wrong.bin");
      await fs.writeFile(bogusExt, pngBytes);

      const saved = await store.saveMediaSource(bogusExt);
      expect(saved.contentType).toBe("image/png");
      expect(path.extname(saved.path)).toBe(".png");

      const buf = await fs.readFile(saved.path);
      expect(buf.equals(pngBytes)).toBe(true);
    });
  });

  it("sniffs xlsx mime for zip buffers and renames extension", async () => {
    await withTempStore(async (store, home) => {
      const zip = new JSZip();
      zip.file(
        "[Content_Types].xml",
        '<Types><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>',
      );
      zip.file("xl/workbook.xml", "<workbook/>");
      const fakeXlsx = await zip.generateAsync({ type: "nodebuffer" });
      const bogusExt = path.join(home, "sheet.bin");
      await fs.writeFile(bogusExt, fakeXlsx);

      const saved = await store.saveMediaSource(bogusExt);
      expect(saved.contentType).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      expect(path.extname(saved.path)).toBe(".xlsx");
    });
  });
});
