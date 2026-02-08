/**
 * Interaction Digest Hook — 對話結束後自動摘要，追加到 contact 近況
 *
 * 事件：conversation:end, session:idle
 *
 * 流程：
 *   1. 從 Time Tunnel 拉取該 session 最近的訊息
 *   2. 識別對話者（從 resolved_sender_name）
 *   3. 生成 1-2 句摘要
 *   4. 追加到 memory/contacts/{name}.md 的「近況」區塊
 */
import fs from "node:fs/promises";
import path from "node:path";
import { search } from "../time-tunnel/query.js";

const WORKSPACE_DIR = process.env.WORKSPACE_DIR || "/app/workspace";
const CONTACTS_DIR = path.join(WORKSPACE_DIR, "memory/contacts");

// 防抖：同一個人 30 分鐘內不重複摘要
const digestCooldowns = new Map(); // contactName → lastDigestTimestamp
const DIGEST_COOLDOWN_MS = 30 * 60 * 1000;

// 摘要的最大字數
const SUMMARY_MAX_CHARS = 120;

/**
 * 從最近訊息中提取簡單摘要（不靠 LLM，用規則提取關鍵句）
 */
function extractDigest(messages, senderName) {
  if (!messages || messages.length === 0) return null;

  // 只看對方（非 bot）的訊息
  const humanMsgs = messages.filter(
    (m) => m.direction === "inbound" && m.content && m.content.length > 2,
  );

  if (humanMsgs.length === 0) return null;

  // 策略：取最後 3 條有意義的訊息，串成摘要
  const recent = humanMsgs.slice(-3);
  const topics = [];

  for (const msg of recent) {
    const content = msg.content.trim();
    // 跳過純表情、貼圖、太短的訊息
    if (content.length < 4) continue;
    if (/^[\p{Emoji}\s]+$/u.test(content)) continue;

    // 取前 60 字
    const snippet = content.length > 60 ? content.substring(0, 57) + "..." : content;
    topics.push(snippet);
  }

  if (topics.length === 0) return null;

  // 組合
  const date = new Date().toISOString().split("T")[0];
  const summary = topics.join("；");
  const trimmed =
    summary.length > SUMMARY_MAX_CHARS
      ? summary.substring(0, SUMMARY_MAX_CHARS - 3) + "..."
      : summary;

  return `- ${date}：${trimmed}`;
}

/**
 * 找到 contact 檔案並追加到「近況」區塊
 */
async function appendToContact(contactName, digestLine) {
  const candidates = [
    path.join(CONTACTS_DIR, `${contactName.toLowerCase()}.md`),
    path.join(CONTACTS_DIR, `${contactName}.md`),
  ];

  let filePath = null;
  let content = null;

  for (const candidate of candidates) {
    try {
      content = await fs.readFile(candidate, "utf-8");
      filePath = candidate;
      break;
    } catch {
      // 繼續
    }
  }

  if (!filePath || !content) {
    console.log(`[interaction-digest] No contact file for "${contactName}", skipping`);
    return false;
  }

  // 找「近況」區塊
  const sectionRegex = /^## 近況\s*$/m;
  const match = sectionRegex.exec(content);

  let updated;
  if (match) {
    // 在「近況」標題後插入
    const insertPos = match.index + match[0].length;
    // 找到下一個空行或下一個 ## 標題
    const afterSection = content.substring(insertPos);
    const nextSectionMatch = afterSection.match(/\n## /);
    const insertAt = nextSectionMatch
      ? insertPos + nextSectionMatch.index
      : content.length;

    // 避免重複：檢查是否已有相同日期的摘要
    const today = new Date().toISOString().split("T")[0];
    const sectionContent = content.substring(insertPos, insertAt);
    if (sectionContent.includes(today)) {
      console.log(
        `[interaction-digest] Already has digest for ${contactName} today, skipping`,
      );
      return false;
    }

    updated =
      content.substring(0, insertAt).trimEnd() +
      "\n\n" +
      digestLine +
      "\n" +
      content.substring(insertAt);
  } else {
    // 沒有「近況」區塊，在文件末尾加一個
    updated =
      content.trimEnd() +
      "\n\n---\n\n## 近況\n\n" +
      digestLine +
      "\n";
  }

  await fs.writeFile(filePath, updated, "utf-8");
  console.log(`[interaction-digest] Appended digest to ${filePath}`);
  return true;
}

// ============================================================
// 主處理函數
// ============================================================
async function handler(event) {
  // 只處理對話結束或 session idle
  if (event.type === "conversation" && event.action === "end") {
    // ok
  } else if (event.type === "session" && event.action === "idle") {
    // ok
  } else {
    return;
  }

  const context = event.context || {};
  const { sessionKey, chatId, channel } = context;

  if (!chatId && !sessionKey) return;

  try {
    // 從 Time Tunnel 拉取最近 30 分鐘的訊息
    const results = search("", {
      chatId: chatId,
      limit: 20,
      direction: "inbound",
    });

    if (!results || results.length === 0) return;

    // 按 resolved_sender_name 分組
    const bySender = new Map();
    for (const msg of results) {
      const sender = msg.resolved_sender_name || msg.sender_name;
      if (!sender) continue;
      // 排除 bot 自己
      if (sender === "無極") continue;

      if (!bySender.has(sender)) {
        bySender.set(sender, []);
      }
      bySender.get(sender).push(msg);
    }

    // 為每個對話者生成摘要
    for (const [senderName, messages] of bySender) {
      // 防抖檢查
      const lastDigest = digestCooldowns.get(senderName) || 0;
      if (Date.now() - lastDigest < DIGEST_COOLDOWN_MS) {
        continue;
      }

      const digestLine = extractDigest(messages, senderName);
      if (!digestLine) continue;

      const success = await appendToContact(senderName, digestLine);
      if (success) {
        digestCooldowns.set(senderName, Date.now());
      }
    }
  } catch (err) {
    console.error("[interaction-digest] Error:", err.message);
  }
}

export default handler;
