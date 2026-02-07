// Learning Engine Hook — 接上 Time Tunnel 學習循環
//
// 監聽事件：message:received
// 動作：逐訊息學習 + 週期性智慧循環

import {
  learnFromMessage,
  runIntelligenceCycle,
  runLearningLoop,
  embedMessage,
  batchEmbedHistorical,
} from "../time-tunnel/query.js";

// 計數器與防抖
let messageCount = 0;
let lastCycleTime = 0;
let historicalEmbedDone = false;
const CYCLE_INTERVAL_MS = 30 * 60 * 1000; // 30 分鐘
const CYCLE_MESSAGE_THRESHOLD = 50; // 每 50 條訊息

async function handler(event) {
  const ctx = event.context || {};
  const direction = ctx.direction || "inbound";

  // 只處理 inbound 訊息
  if (direction !== "inbound") return;

  const content = ctx.content || "";
  if (!content || content.length < 5) return;

  messageCount++;

  // 1. 逐訊息學習（fire-and-forget）
  try {
    learnFromMessage({
      content,
      sender: ctx.senderName || ctx.senderId,
      project: ctx.agentId,
      chat: ctx.chatName,
      direction,
      reply_to_id: ctx.replyToId,
      chat_id: ctx.chatId,
    });
  } catch (err) {
    console.warn("[learning-engine] learnFromMessage error:", err.message);
  }

  // 2. 向量嵌入（fire-and-forget，讓語義搜索有資料）
  const msgId = ctx.messageId;
  if (msgId && content.length >= 10) {
    embedMessage(Number(msgId), content).catch((err) =>
      console.warn("[learning-engine] embedMessage error:", err.message),
    );
  }

  // 2. 週期性智慧循環
  const now = Date.now();
  const shouldRunCycle =
    messageCount >= CYCLE_MESSAGE_THRESHOLD ||
    (lastCycleTime > 0 && now - lastCycleTime >= CYCLE_INTERVAL_MS) ||
    lastCycleTime === 0; // 首次啟動也跑一次

  if (shouldRunCycle) {
    messageCount = 0;
    lastCycleTime = now;

    // 非同步執行，不阻塞回覆
    runCycleInBackground();
  }
}

async function runCycleInBackground() {
  try {
    console.log("[learning-engine] Starting intelligence cycle...");

    // 先跑批次學習（處理漏掉的訊息）
    const loopResult = await runLearningLoop();
    console.log(
      `[learning-engine] Learning loop: ${loopResult.messagesProcessed} msgs, ${loopResult.totalLearnings} learnings`,
    );

    // 再跑智慧循環（整合 + 提取知識 + 建立提醒）
    const cycleResult = await runIntelligenceCycle();
    console.log("[learning-engine] Intelligence cycle complete:", {
      consolidation: cycleResult.consolidation ? "done" : "skipped",
      knowledge: cycleResult.knowledge ? "done" : "skipped",
      reminders: cycleResult.reminders ? "done" : "skipped",
    });

    // 首次啟動：批量嵌入歷史訊息（最多 500 條，fire-and-forget）
    if (!historicalEmbedDone) {
      historicalEmbedDone = true;
      const embedResult = await batchEmbedHistorical({ maxMessages: 500 });
      console.log("[learning-engine] Historical embed:", embedResult);
    }
  } catch (err) {
    console.error("[learning-engine] Intelligence cycle error:", err.message);
  }
}

export default handler;
