#!/usr/bin/env node
/**
 * Time Tunnel — sender_name 回填腳本
 *
 * 問題：LINE 渠道的歷史訊息 sender_name / resolved_sender_name 為 null，
 *       因為 bot-message-context.ts 之前沒有解析 SenderName。
 *
 * 策略：
 *   1. 讀取 line-profile-cache.json 建立 userId → displayName 映射
 *   2. 讀取 identity-map.json 建立 lineId → contactName 映射
 *   3. 掃描 timeline.db 中 channel='line' 且 sender_name IS NULL 的訊息
 *   4. 用 sender_id 查找對應的 displayName，更新 sender_name + resolved_sender_name
 *
 * 用法：
 *   node backfill-sender-name.js [--dry-run]
 */
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const DRY_RUN = process.argv.includes("--dry-run");

// 路徑配置
const DATA_ROOT = process.env.DATA_ROOT || "/app/persistent/data";
const FALLBACK_DATA_DIR = "/app/workspace/data";
const DATA_DIR = fs.existsSync(DATA_ROOT) ? DATA_ROOT : FALLBACK_DATA_DIR;
const DB_PATH = path.join(DATA_DIR, "timeline.db");

const WORKSPACE_DIR = process.env.WORKSPACE_DIR || "/app/workspace";
const CACHE_PATH = path.join(WORKSPACE_DIR, "references/line-profile-cache.json");
const IDENTITY_MAP_PATH = path.join(WORKSPACE_DIR, "references/identity-map.json");

// ============================================================
// 載入身份映射
// ============================================================
function loadJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function buildLookupTable() {
  const lookup = new Map(); // lineUserId → { displayName, contactName }

  // 1. 從 line-profile-cache.json 取 displayName
  const profileCache = loadJSON(CACHE_PATH);
  if (profileCache) {
    for (const [groupId, members] of Object.entries(profileCache)) {
      if (typeof members !== "object") continue;
      for (const [userId, displayName] of Object.entries(members)) {
        if (!lookup.has(userId)) {
          lookup.set(userId, { displayName, contactName: null });
        }
      }
    }
  }

  // 2. 從 identity-map.json 取 contactName
  const identityMap = loadJSON(IDENTITY_MAP_PATH);
  if (identityMap?.identities) {
    for (const identity of identityMap.identities) {
      const lineId = identity.channels?.line;
      if (!lineId) continue;

      const existing = lookup.get(lineId);
      if (existing) {
        existing.contactName = identity.name;
      } else {
        const displayName = identity.aliases?.[0] || identity.name;
        lookup.set(lineId, { displayName, contactName: identity.name });
      }
    }
  }

  return lookup;
}

// ============================================================
// 主流程
// ============================================================
function main() {
  console.log(`[backfill] ${DRY_RUN ? "DRY RUN — " : ""}Starting sender_name backfill`);
  console.log(`[backfill] DB: ${DB_PATH}`);

  if (!fs.existsSync(DB_PATH)) {
    console.error("[backfill] Database not found!");
    process.exit(1);
  }

  const lookup = buildLookupTable();
  console.log(`[backfill] Loaded ${lookup.size} LINE user mappings`);

  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode=WAL;");

  // 查找需要回填的訊息
  const nullRows = db
    .prepare(
      `SELECT id, sender_id, chat_id
       FROM messages
       WHERE channel = 'line'
         AND direction = 'inbound'
         AND (sender_name IS NULL OR sender_name = '')
         AND sender_id IS NOT NULL
       ORDER BY id`,
    )
    .all();

  console.log(`[backfill] Found ${nullRows.length} messages with null sender_name`);

  if (nullRows.length === 0) {
    console.log("[backfill] Nothing to do.");
    db.close();
    return;
  }

  const updateStmt = db.prepare(
    `UPDATE messages
     SET sender_name = ?, resolved_sender_name = ?
     WHERE id = ?`,
  );

  let updated = 0;
  let skipped = 0;

  for (const row of nullRows) {
    const info = lookup.get(row.sender_id);
    if (!info) {
      skipped++;
      continue;
    }

    const senderName = info.displayName;
    const resolvedName = info.contactName || info.displayName;

    if (DRY_RUN) {
      console.log(
        `  [dry-run] id=${row.id} sender_id=${row.sender_id} → "${senderName}" (resolved: "${resolvedName}")`,
      );
    } else {
      updateStmt.run(senderName, resolvedName, row.id);
    }
    updated++;
  }

  // 更新 FTS 索引（如果有實際更新的話）
  if (!DRY_RUN && updated > 0) {
    console.log("[backfill] Rebuilding FTS index for updated rows...");
    // FTS trigger 在 UPDATE 時會自動同步，但以防萬一手動重建
    try {
      db.exec(`
        INSERT INTO messages_fts(messages_fts) VALUES('rebuild');
      `);
      console.log("[backfill] FTS index rebuilt.");
    } catch (err) {
      console.warn("[backfill] FTS rebuild failed (non-critical):", err.message);
    }
  }

  db.close();

  console.log(`[backfill] Done: ${updated} updated, ${skipped} skipped (no mapping)`);
  if (DRY_RUN) {
    console.log("[backfill] This was a dry run. Re-run without --dry-run to apply.");
  }
}

main();
