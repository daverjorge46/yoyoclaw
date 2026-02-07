---
metadata:
  openclaw:
    events:
      - message:received
---

# Learning Engine Hook

每條訊息進來時自動觸發學習循環，讓 Time Tunnel 持續累積知識。

## 功能

1. **逐訊息學習** — 每條 inbound 訊息呼叫 `learnFromMessage()`，提取關鍵詞、人員模式、QA 模式、情感
2. **週期性智慧循環** — 每 50 條訊息或 30 分鐘自動執行 `runIntelligenceCycle()`，整合記憶、提取知識、自動建立提醒規則

## 設計原則

- Fire-and-forget：學習不阻塞回覆流程
- 失敗靜默：任何錯誤只記 log，不影響消息處理
- 防抖：intelligence cycle 有最小間隔保護

## 依賴

- `time-tunnel/query.js` — `learnFromMessage()`, `runIntelligenceCycle()`, `runLearningLoop()`
