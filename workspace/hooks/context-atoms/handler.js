// Context Atoms Indexer — 把 workspace .md 拆成向量原子
//
// 監聽事件：gateway:startup, session:start
// 動作：掃描 workspace .md 檔 → chunk → embed → 存入 context_atoms

import fs from "fs";
import path from "path";
import { indexContextAtoms, getContextAtomStats } from "../time-tunnel/query.js";

const WORKSPACE_DIR = "/app/workspace";

// 要索引的檔案（SOUL.md 不索引，永遠全載）
const FILES_TO_INDEX = [
  "MEMORY.md",
  "TOOLS.md",
  "AGENTS.md",
  "TASKS.md",
  "CONTACTS.md",
  "ROUTING.md",
  "GROUPS.md",
];

// 額外要掃描的目錄（內含 .md 個別檔案）
const DIRS_TO_INDEX = [
  "memory/contacts",
];

// 防抖：10 分鐘內不重複索引
let lastIndexTime = 0;
const INDEX_COOLDOWN_MS = 10 * 60 * 1000;

/**
 * 掃描目錄下所有 .md 檔案
 */
function scanMarkdownFiles(dirPath) {
  const results = [];
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".md")) {
        results.push(path.join(dirPath, entry.name));
      }
    }
  } catch {
    // 目錄不存在就跳過
  }
  return results;
}

async function handler(event) {
  const now = Date.now();
  if (now - lastIndexTime < INDEX_COOLDOWN_MS) {
    return;
  }
  lastIndexTime = now;

  console.log("[context-atoms] Starting workspace indexing...");

  let totalIndexed = 0;
  let filesProcessed = 0;

  // 1. 索引頂層檔案
  for (const fileName of FILES_TO_INDEX) {
    const filePath = path.join(WORKSPACE_DIR, fileName);
    if (!fs.existsSync(filePath)) continue;

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      if (!content || content.length < 50) continue;

      const result = indexContextAtoms(filePath, content);
      totalIndexed += result.indexed;
      filesProcessed++;
    } catch (err) {
      console.warn(`[context-atoms] Failed to index ${fileName}:`, err.message);
    }
  }

  // 2. 索引子目錄（memory/contacts/*.md 等）
  for (const relDir of DIRS_TO_INDEX) {
    const dirPath = path.join(WORKSPACE_DIR, relDir);
    const mdFiles = scanMarkdownFiles(dirPath);

    for (const filePath of mdFiles) {
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        if (!content || content.length < 30) continue;

        const result = indexContextAtoms(filePath, content);
        totalIndexed += result.indexed;
        filesProcessed++;
      } catch (err) {
        const name = path.basename(filePath);
        console.warn(`[context-atoms] Failed to index ${name}:`, err.message);
      }
    }
  }

  const stats = getContextAtomStats();
  console.log(
    `[context-atoms] Done: ${filesProcessed} files, ${totalIndexed} new atoms. ` +
      `Total: ${stats.atomCount} atoms, ${stats.vecCount} vectors`,
  );
}

export default handler;
