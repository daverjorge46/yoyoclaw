/**
 * Sender Identity Hook v2 — 通用身份辨識 + 人設注入
 *
 * 事件：agent:bootstrap
 *
 * 適用場景：
 *   A. LINE 群組 → 讀 line-profile-cache.json 取成員名單
 *   B. 任何渠道群組 → 讀 identity-map.json 查已知成員
 *   C. DM → 從 sessionKey 取 peerId，查 identity-map 找對應 contact
 *
 * 對每個識別出的人，查找 memory/contacts/{name}.md 並注入 bootstrapFiles
 */
import fs from "node:fs/promises";
import path from "node:path";

// ============================================================
// Session Key 解析
// ============================================================
function parseSessionKey(sessionKey) {
  if (!sessionKey) return { channel: null, groupId: null, peerId: null, isGroup: false };

  const parts = sessionKey.split(":");

  let channel = null;
  let groupId = null;
  let peerId = null;
  let isGroup = false;

  for (let i = 0; i < parts.length; i++) {
    if (["line", "telegram", "discord", "signal", "whatsapp", "imessage", "slack"].includes(parts[i])) {
      channel = parts[i];
      const groupIndex = parts.indexOf("group", i);
      if (groupIndex !== -1 && parts[groupIndex + 1]) {
        isGroup = true;
        if (parts[groupIndex + 1] === "group" && parts[groupIndex + 2]) {
          groupId = parts[groupIndex + 2];
        } else {
          groupId = parts[groupIndex + 1];
        }
      } else {
        // DM: 最後一段是 peerId
        peerId = parts[parts.length - 1];
      }
      break;
    }
  }

  return { channel, groupId, peerId, isGroup };
}

// ============================================================
// 資料讀取
// ============================================================
async function loadJSON(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function loadContactProfile(workspaceDir, name) {
  const candidates = [
    path.resolve(workspaceDir, `memory/contacts/${name.toLowerCase()}.md`),
    path.resolve(workspaceDir, `memory/contacts/${name}.md`),
  ];

  for (const filePath of candidates) {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      return { name, content, path: filePath };
    } catch {
      // 繼續
    }
  }
  return null;
}

// ============================================================
// 從 identity-map.json 查找：channel + id → contact name
// ============================================================
function lookupIdentity(identityMap, channel, id) {
  if (!identityMap?.identities || !channel || !id) return null;

  for (const entry of identityMap.identities) {
    const channelId = entry.channels?.[channel];
    if (channelId === id) {
      return entry;
    }
  }
  return null;
}

function getAllIdentitiesForChannel(identityMap, channel) {
  if (!identityMap?.identities || !channel) return [];
  return identityMap.identities.filter((e) => e.channels?.[channel]);
}

// ============================================================
// 主處理函數
// ============================================================
const handler = async (event) => {
  if (event.type !== "agent" || event.action !== "bootstrap") {
    return;
  }

  const context = event.context || {};
  const { workspaceDir, bootstrapFiles, sessionKey } = context;

  if (!workspaceDir || !bootstrapFiles || !sessionKey) {
    return;
  }

  const { channel, groupId, peerId, isGroup } = parseSessionKey(sessionKey);
  if (!channel) return;

  // 載入 identity-map.json（通用）
  const identityMap = await loadJSON(
    path.resolve(workspaceDir, "references/identity-map.json"),
  );

  const sections = [];
  let loadedCount = 0;

  if (isGroup && groupId) {
    // ============================================================
    // 群組模式：收集所有已知成員
    // ============================================================

    // 來源 1: LINE profile cache（LINE 群組專用）
    const memberMap = new Map(); // displayName → userId

    if (channel === "line") {
      const profileCache = await loadJSON(
        path.resolve(workspaceDir, "references/line-profile-cache.json"),
      );
      const groupMembers = profileCache?.[groupId];
      if (groupMembers && typeof groupMembers === "object") {
        for (const [userId, displayName] of Object.entries(groupMembers)) {
          memberMap.set(displayName, userId);
        }
      }
    }

    // 來源 2: identity-map.json（所有渠道通用）
    if (identityMap) {
      const channelIdentities = getAllIdentitiesForChannel(identityMap, channel);
      for (const identity of channelIdentities) {
        const displayName = identity.aliases?.[0] || identity.name;
        if (!memberMap.has(displayName)) {
          memberMap.set(displayName, identity.channels[channel]);
        }
      }
    }

    if (memberMap.size === 0) return;

    console.log(
      `[sender-identity] ${channel} group ${groupId}: ${memberMap.size} members`,
    );

    for (const [displayName, userId] of memberMap) {
      const profile = await loadContactProfile(workspaceDir, displayName);
      if (profile) {
        sections.push(profile.content);
        loadedCount++;
      } else {
        sections.push(
          `# ${displayName}\n\n**${channel.toUpperCase()} ID**：${userId}\n（尚未建立詳細檔案）\n`,
        );
      }
    }
  } else if (peerId && identityMap) {
    // ============================================================
    // DM 模式：從 peerId 查找對應 contact
    // ============================================================
    const identity = lookupIdentity(identityMap, channel, peerId);
    if (identity) {
      const profile = await loadContactProfile(workspaceDir, identity.name);
      if (profile) {
        sections.push(profile.content);
        loadedCount++;
        console.log(
          `[sender-identity] DM: ${channel}/${peerId} → ${identity.name}`,
        );
      }
    }
  }

  if (sections.length === 0) return;

  // 合併注入
  const modeLabel = isGroup ? "群組" : "私訊";
  const header = `# ${modeLabel}對話者身份資訊（自動生成）\n\n> 請根據 [from: 名字] 標記辨識發話者。絕對不要猜測身份。\n\n---\n\n`;
  const combined = header + sections.join("\n---\n\n");

  if (Array.isArray(context.bootstrapFiles)) {
    context.bootstrapFiles.push({
      name: "sender-identity-context.md",
      path: `[auto-generated by sender-identity hook]`,
      content: combined,
      missing: false,
    });

    console.log(
      `[sender-identity] Injected ${sections.length} profiles (${loadedCount} detailed) for ${channel} ${isGroup ? "group" : "DM"}`,
    );
  }
};

export default handler;
