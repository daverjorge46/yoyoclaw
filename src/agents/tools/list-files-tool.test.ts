import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MoltbotConfig } from "../../config/config.js";
import { createListLocalFilesTool } from "./list-files-tool.js";
import type { ListFilesEntry, ListFilesError } from "./list-files-tool.js";

describe("list_local_files tool", () => {
  let tmpDir: string;
  let ingestRoot: string;
  let workspaceDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "listfiles-test-"));
    ingestRoot = path.join(tmpDir, "ingest-source");
    workspaceDir = path.join(tmpDir, "workspace");
    await fs.mkdir(ingestRoot, { recursive: true });
    await fs.mkdir(workspaceDir, { recursive: true });
    vi.stubEnv("SOPHIE_INGEST_ROOT", ingestRoot);
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  function createTool() {
    const cfg = { agents: { list: [{ id: "main", default: true }] } } as unknown as MoltbotConfig;
    return createListLocalFilesTool({
      config: cfg,
      agentSessionKey: "agent:main",
      workspaceDir,
    });
  }

  it("returns null when workspaceDir is not provided", () => {
    const cfg = { agents: { list: [{ id: "main", default: true }] } } as unknown as MoltbotConfig;
    const tool = createListLocalFilesTool({ config: cfg });
    expect(tool).toBeNull();
  });

  it("rejects paths outside allowlist (/etc)", async () => {
    const tool = createTool();
    expect(tool).not.toBeNull();
    await expect(tool!.execute("call_1", { root: "/etc" })).rejects.toThrow(
      "Path outside allowlist",
    );
  });

  it("rejects paths outside allowlist (/Users)", async () => {
    const tool = createTool();
    expect(tool).not.toBeNull();
    await expect(tool!.execute("call_2", { root: "/Users" })).rejects.toThrow(
      "Path outside allowlist",
    );
  });

  it("lists files under workspaceDir", async () => {
    await fs.writeFile(path.join(workspaceDir, "a.md"), "content a");
    await fs.writeFile(path.join(workspaceDir, "b.txt"), "content b");
    const tool = createTool()!;
    const result = await tool.execute("call_3", { root: workspaceDir });
    const details = result.details as { files: ListFilesEntry[]; count: number };
    expect(details.count).toBe(2);
    const paths = details.files.map((f) => f.path);
    expect(paths).toContain("a.md");
    expect(paths).toContain("b.txt");
    for (const file of details.files) {
      expect(typeof file.size).toBe("number");
      expect(file.size).toBeGreaterThan(0);
      expect(typeof file.modifiedAt).toBe("string");
    }
  });

  it("lists files under SOPHIE_INGEST_ROOT", async () => {
    await fs.writeFile(path.join(ingestRoot, "doc.md"), "ingested doc");
    const tool = createTool()!;
    const result = await tool.execute("call_4", { root: ingestRoot });
    const details = result.details as { files: ListFilesEntry[]; count: number };
    expect(details.count).toBe(1);
    expect(details.files[0].path).toBe("doc.md");
  });

  it("filters by glob pattern", async () => {
    await fs.writeFile(path.join(workspaceDir, "a.md"), "md file");
    await fs.writeFile(path.join(workspaceDir, "b.txt"), "txt file");
    await fs.writeFile(path.join(workspaceDir, "c.json"), "json file");
    const tool = createTool()!;
    const result = await tool.execute("call_5", { root: workspaceDir, glob: "*.md" });
    const details = result.details as { files: ListFilesEntry[]; count: number };
    expect(details.count).toBe(1);
    expect(details.files[0].path).toBe("a.md");
  });

  it("respects max_results cap", async () => {
    for (let i = 0; i < 5; i++) {
      await fs.writeFile(path.join(workspaceDir, `file${i}.md`), `content ${i}`);
    }
    const tool = createTool()!;
    const result = await tool.execute("call_6", { root: workspaceDir, max_results: 2 });
    const details = result.details as {
      files: ListFilesEntry[];
      count: number;
      truncated: boolean;
    };
    expect(details.count).toBe(2);
    expect(details.truncated).toBe(true);
  });

  it("throws for nonexistent directory (fail-closed)", async () => {
    const tool = createTool()!;
    const missingDir = path.join(workspaceDir, "does-not-exist");
    await expect(tool.execute("call_7", { root: missingDir })).rejects.toThrow(
      "Directory not found",
    );
  });

  it("records symlinks in errors[] instead of silently skipping", async () => {
    await fs.writeFile(path.join(workspaceDir, "real.md"), "real file");
    await fs.symlink(path.join(workspaceDir, "real.md"), path.join(workspaceDir, "link.md"));
    const tool = createTool()!;
    const result = await tool.execute("call_8", { root: workspaceDir });
    const details = result.details as {
      files: ListFilesEntry[];
      count: number;
      errors: ListFilesError[];
    };
    expect(details.count).toBe(1);
    expect(details.files[0].path).toBe("real.md");
    expect(details.errors).toBeDefined();
    expect(details.errors.length).toBe(1);
    expect(details.errors[0].path).toBe("link.md");
    expect(details.errors[0].code).toBe("symlink_skipped");
  });

  it("walks subdirectories and returns relative paths", async () => {
    const sub = path.join(workspaceDir, "sub");
    await fs.mkdir(sub, { recursive: true });
    await fs.writeFile(path.join(workspaceDir, "top.md"), "top level");
    await fs.writeFile(path.join(sub, "deep.md"), "nested file");
    const tool = createTool()!;
    const result = await tool.execute("call_9", { root: workspaceDir });
    const details = result.details as { files: ListFilesEntry[]; count: number };
    expect(details.count).toBe(2);
    const paths = details.files.map((f) => f.path);
    expect(paths).toContain("top.md");
    expect(paths).toContain(path.join("sub", "deep.md"));
  });
});
