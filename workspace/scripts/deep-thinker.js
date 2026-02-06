#!/usr/bin/env node
/**
 * 深度思考處理器
 *
 * 定期處理待回答的問題，用 Opus 生成深度回覆，存入彈夾
 *
 * Usage:
 *   node deep-thinker.js          # 處理一批
 *   node deep-thinker.js --watch  # 持續監控
 */

import { DatabaseSync } from "node:sqlite";

const DB_PATH = "/app/workspace/data/timeline.db";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// 初始化表
function initTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS deep_thinking_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      chat_id TEXT NOT NULL,
      question TEXT NOT NULL,
      quick_reply TEXT,
      status TEXT DEFAULT 'pending',
      result TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      processed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS line_magazine (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      chat_id TEXT NOT NULL,
      content TEXT NOT NULL,
      context TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      priority INTEGER DEFAULT 0,
      fired INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_queue_pending
    ON deep_thinking_queue(status) WHERE status = 'pending';
  `);
}

// 獲取待處理的問題
function getPendingQuestions(db, limit = 5) {
  return db
    .prepare(`
    SELECT id, user_id, chat_id, question, quick_reply
    FROM deep_thinking_queue
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT ?
  `)
    .all(limit);
}

// 調用 Opus API
async function callOpus(question, quickReply) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-5-20251101",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `用戶問：「${question}」

之前的快速回覆：「${quickReply || "(無)"}」

現在請深入、詳細地回答這個問題。保持友善的語氣，像跟朋友解釋一樣。
這個回覆會在用戶下次發話時發送給他。

詳細回覆：`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Opus API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

// 處理一個問題
async function processQuestion(db, item) {
  console.log(`[deep-thinker] 🧠 Processing: ${item.question.substring(0, 50)}...`);

  try {
    // 標記處理中
    db.prepare(`UPDATE deep_thinking_queue SET status = 'processing' WHERE id = ?`).run(item.id);

    // 調用 Opus
    const result = await callOpus(item.question, item.quick_reply);

    // 存入彈夾
    db.prepare(`
      INSERT INTO line_magazine (user_id, chat_id, content, context, priority)
      VALUES (?, ?, ?, ?, 1)
    `).run(item.user_id, item.chat_id, result, item.question);

    // 標記完成
    db.prepare(`
      UPDATE deep_thinking_queue
      SET status = 'completed', result = ?, processed_at = datetime('now')
      WHERE id = ?
    `).run(result, item.id);

    console.log(`[deep-thinker] ✅ Completed: ${item.id}`);
    return true;
  } catch (err) {
    console.error(`[deep-thinker] ❌ Failed: ${err.message}`);

    // 標記失敗
    db.prepare(`
      UPDATE deep_thinking_queue
      SET status = 'failed', result = ?
      WHERE id = ?
    `).run(err.message, item.id);

    return false;
  }
}

// 處理一批
async function processBatch() {
  const db = new DatabaseSync(DB_PATH);

  try {
    initTables(db);

    const pending = getPendingQuestions(db);

    if (pending.length === 0) {
      console.log("[deep-thinker] 📭 No pending questions");
      return 0;
    }

    console.log(`[deep-thinker] 📬 Found ${pending.length} pending questions`);

    let processed = 0;
    for (const item of pending) {
      if (await processQuestion(db, item)) {
        processed++;
      }
      // 避免 rate limit
      await new Promise((r) => setTimeout(r, 1000));
    }

    return processed;
  } finally {
    db.close();
  }
}

// 統計
function showStats() {
  const db = new DatabaseSync(DB_PATH);

  try {
    initTables(db);

    const queueStats = db
      .prepare(`
      SELECT status, COUNT(*) as count
      FROM deep_thinking_queue
      GROUP BY status
    `)
      .all();

    const magazineStats = db
      .prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN fired = 0 THEN 1 ELSE 0 END) as pending
      FROM line_magazine
    `)
      .get();

    console.log("\n📊 Deep Thinker Stats");
    console.log("═".repeat(40));
    console.log("\nQueue:");
    for (const s of queueStats) {
      console.log(`  ${s.status}: ${s.count}`);
    }
    console.log("\nMagazine:");
    console.log(`  Pending: ${magazineStats.pending}`);
    console.log(`  Total: ${magazineStats.total}`);
  } finally {
    db.close();
  }
}

// 主函數
async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--stats")) {
    showStats();
    return;
  }

  if (args.includes("--watch")) {
    console.log("[deep-thinker] 👁️ Watch mode started (every 30s)");
    while (true) {
      await processBatch();
      await new Promise((r) => setTimeout(r, 30000));
    }
  } else {
    await processBatch();
  }
}

main().catch(console.error);
