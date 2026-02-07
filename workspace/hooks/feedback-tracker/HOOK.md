---
metadata:
  openclaw:
    events:
      - message:sent
      - message:received
---

# Feedback Tracker Hook

回饋迴路：追蹤回覆的效果，讓系統從結果中學習。

## 功能

1. **message:sent** — 記錄每次 outbound 回覆到 `conversation_state`
2. **message:received** — 檢查上次回覆是否得到回應，記錄 `conversation_judgments`
3. 追蹤 warroom directive 遵守度，寫入 `reward_tracking`

## 資料流

```
Bot 回覆 → 記錄 conversation_state (last_bot_reply_at, last_topic)
     ↓
下一條 inbound → 比對時間差、情感
     ↓
寫入 conversation_judgments (was_responded, response_delay, sentiment)
```
