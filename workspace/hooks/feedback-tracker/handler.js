// Feedback Tracker — 回饋迴路
//
// 監聽事件：message:sent, message:received
// 動作：追蹤回覆效果 + directive 遵守度

import { recordBotReply, recordFeedbackJudgment, recordReward } from "../time-tunnel/query.js";

async function handler(event) {
  const ctx = event.context || {};
  const direction = ctx.direction;
  const chatId = ctx.chatId;
  const channel = ctx.channel;

  if (!chatId) return;

  if (direction === "outbound" || event.action === "sent") {
    // Bot 剛回覆 — 記錄到 conversation_state
    handleOutbound(ctx);
  } else if (direction === "inbound" || event.action === "received") {
    // 收到新訊息 — 檢查是否為對上次回覆的回應
    handleInbound(ctx);
  }
}

function handleOutbound(ctx) {
  try {
    recordBotReply({
      chatId: ctx.chatId,
      channel: ctx.channel,
      replyTo: ctx.senderName || ctx.senderId,
      topic: (ctx.content || "").substring(0, 100),
    });
  } catch (err) {
    console.warn("[feedback-tracker] recordBotReply error:", err.message);
  }
}

function handleInbound(ctx) {
  try {
    const content = ctx.content || "";
    const sender = ctx.senderName || ctx.senderId || "";

    // 基本情感分析（快速規則式）
    const positiveWords = [
      "謝謝",
      "感謝",
      "好的",
      "收到",
      "了解",
      "讚",
      "棒",
      "厲害",
      "thank",
      "great",
      "good",
      "nice",
    ];
    const negativeWords = ["不對", "錯了", "別", "不要", "不是", "wrong", "no", "bad", "stop"];

    let sentiment = "neutral";
    const lower = content.toLowerCase();
    if (positiveWords.some((w) => lower.includes(w))) sentiment = "positive";
    if (negativeWords.some((w) => lower.includes(w))) sentiment = "negative";

    // 記錄判斷
    recordFeedbackJudgment({
      chatId: ctx.chatId,
      channel: ctx.channel,
      messageContent: content.substring(0, 200),
      sender,
      judgment: sentiment === "negative" ? "needs_improvement" : "acceptable",
      confidence: 0.5,
      reasoning: `Auto-detected sentiment: ${sentiment}`,
    });

    // 如果是正面回應，記錄 reward
    if (sentiment === "positive") {
      recordReward("trust", "positive_response", 1, `${sender} in ${ctx.chatName || ctx.chatId}`);
    } else if (sentiment === "negative") {
      recordReward("trust", "negative_response", -1, `${sender} in ${ctx.chatName || ctx.chatId}`);
    }
  } catch (err) {
    console.warn("[feedback-tracker] handleInbound error:", err.message);
  }
}

export default handler;
