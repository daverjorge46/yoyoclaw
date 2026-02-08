/**
 * LINE Member Detect Hook — 偵測新成員加入群組
 *
 * 事件：message:received（過濾 LINE memberJoined 事件）
 *
 * 功能：
 *   1. 偵測 LINE webhook 的 memberJoined 類型事件
 *   2. 取得新成員的 userId 和 displayName
 *   3. 更新 line-profile-cache.json
 *   4. 為未知成員建立 contact 骨架檔案
 */
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";

const WORKSPACE_DIR = process.env.WORKSPACE_DIR || "/app/workspace";
const CACHE_PATH = path.join(WORKSPACE_DIR, "references/line-profile-cache.json");
const CONTACTS_DIR = path.join(WORKSPACE_DIR, "memory/contacts");

// ============================================================
// Cache 操作
// ============================================================
function loadCacheSync() {
  try {
    return JSON.parse(fsSync.readFileSync(CACHE_PATH, "utf-8"));
  } catch {
    return {};
  }
}

async function saveCache(cache) {
  await fs.writeFile(CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");
}

// ============================================================
// Contact 骨架建立
// ============================================================
async function ensureContactFile(displayName, userId, groupId) {
  const candidates = [
    path.join(CONTACTS_DIR, `${displayName.toLowerCase()}.md`),
    path.join(CONTACTS_DIR, `${displayName}.md`),
  ];

  // 檢查是否已存在
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return false; // 已存在，不需要建立
    } catch {
      // 不存在，繼續
    }
  }

  // 建立骨架
  const filePath = path.join(CONTACTS_DIR, `${displayName.toLowerCase()}.md`);
  const content = `# ${displayName}

**關係**：<!-- 待補充 -->
**LINE ID**：${userId}

---

## 基本資訊

- **所在地**：<!-- 待補充 -->
- **職業**：<!-- 待補充 -->

---

## 個性與溝通風格

- <!-- 待補充 -->

---

## 近況

<!-- 由 interaction-digest hook 自動追加 -->

---

## 備註

- 透過 LINE 群組 ${groupId || "unknown"} 自動偵測加入
- 首次偵測日期：${new Date().toISOString().split("T")[0]}
`;

  // 確保目錄存在
  await fs.mkdir(CONTACTS_DIR, { recursive: true });
  await fs.writeFile(filePath, content, "utf-8");

  console.log(`[line-member-detect] Created contact skeleton: ${filePath}`);
  return true;
}

// ============================================================
// 主處理函數
// ============================================================
async function handler(event) {
  if (event.type !== "message" || event.action !== "received") return;

  const context = event.context || {};
  const { channel, rawEvent } = context;

  // 只處理 LINE 渠道
  if (channel !== "line") return;

  // 偵測 memberJoined 事件
  // LINE webhook 的 memberJoined 事件結構：
  // { type: "memberJoined", joined: { members: [{ type: "user", userId: "..." }] }, source: { groupId: "..." } }
  const lineEvent = rawEvent?.events?.[0] || rawEvent;
  if (!lineEvent || lineEvent.type !== "memberJoined") return;

  const groupId = lineEvent.source?.groupId;
  const members = lineEvent.joined?.members;

  if (!groupId || !Array.isArray(members) || members.length === 0) return;

  console.log(
    `[line-member-detect] memberJoined in group ${groupId}: ${members.length} new member(s)`,
  );

  // 載入 cache
  const cache = loadCacheSync();
  if (!cache[groupId]) {
    cache[groupId] = {};
  }

  let cacheUpdated = false;

  for (const member of members) {
    if (member.type !== "user" || !member.userId) continue;

    const userId = member.userId;

    // 如果 cache 中已有此 userId，跳過
    if (cache[groupId][userId]) {
      console.log(
        `[line-member-detect] ${userId} already cached as "${cache[groupId][userId]}"`,
      );
      continue;
    }

    // 嘗試取得 displayName
    // memberJoined 事件不一定帶 displayName，可能需要 API 查詢
    // 但我們先用 userId 佔位，等 sender-name-cache 的 API fallback 補齊
    const displayName = member.displayName || member.userId;

    cache[groupId][userId] = displayName;
    cacheUpdated = true;

    console.log(
      `[line-member-detect] New member: ${userId} → "${displayName}" in ${groupId}`,
    );

    // 如果有 displayName，嘗試建立 contact 骨架
    if (member.displayName) {
      try {
        await ensureContactFile(displayName, userId, groupId);
      } catch (err) {
        console.warn(
          `[line-member-detect] Failed to create contact for ${displayName}:`,
          err.message,
        );
      }
    }
  }

  // 寫回 cache
  if (cacheUpdated) {
    try {
      await saveCache(cache);
      console.log("[line-member-detect] Profile cache updated");
    } catch (err) {
      console.error("[line-member-detect] Failed to save cache:", err.message);
    }
  }
}

export default handler;
