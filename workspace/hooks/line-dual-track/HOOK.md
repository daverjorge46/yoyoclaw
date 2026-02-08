---
metadata:
  openclaw:
    events:
      - message:received
---

# LINE 雙軌回覆系統

## 概述

實現 LINE 消息的「快速回覆 + 深度彈夾」策略，最大化 Reply Token 使用。

## 架構

```
┌─────────────────────────────────────────────────────────────┐
│  LINE 消息進入                                               │
│       ↓                                                      │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 1. 檢查彈夾（該用戶待發送的深度回覆）                     │ │
│  │ 2. Sonnet 4.5 生成快速回覆（<3秒）                        │ │
│  │ 3. 用 Reply Token 發送：彈夾內容 + 快速回覆（≤5則）       │ │
│  └─────────────────────────────────────────────────────────┘ │
│       ↓                                                      │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 4. 背景：Opus 深度思考                                    │ │
│  │ 5. 結果存入該用戶的彈夾（下次發送）                       │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 數據結構

### 彈夾表 (`line_magazine`)

```sql
CREATE TABLE IF NOT EXISTS line_magazine (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,           -- LINE user ID
  chat_id TEXT NOT NULL,           -- LINE group/room ID
  content TEXT NOT NULL,           -- 待發送的深度回覆
  context TEXT,                    -- 原始問題上下文
  created_at TEXT DEFAULT (datetime('now')),
  priority INTEGER DEFAULT 0,      -- 優先級（越高越先發）
  fired INTEGER DEFAULT 0          -- 是否已發送
);

CREATE INDEX IF NOT EXISTS idx_magazine_user ON line_magazine(user_id, chat_id, fired);
```

## 配置

```json
{
  "line-dual-track": {
    "enabled": true,
    "quickModel": "anthropic/claude-sonnet-4-5",
    "deepModel": "anthropic/claude-opus-4-5",
    "quickMaxTokens": 150,
    "deepMaxTokens": 1000,
    "magazineLimit": 3
  }
}
```

## 事件流

### `line:message:before-process`

新增事件，在 LINE 消息進入代理處理前觸發。

```javascript
{
  type: 'line:message:before-process',
  userId: 'U...',
  chatId: 'C...',
  replyToken: 'xxx',
  message: '你記得 Mimi 嗎',
  timestamp: 1234567890
}
```

### 處理流程

1. **Fire Magazine** - 發送該用戶待發的彈夾內容
2. **Quick Reply** - Sonnet 4.5 快速回覆
3. **Use Reply Token** - 一次性發送（≤5則）
4. **Queue Deep Thinking** - 背景任務
5. **Store to Magazine** - 深度回覆存入彈夾

## 實現方式

由於需要在代理處理前攔截，有兩種方案：

### 方案 A：修改 OpenClaw 核心（推薦）

修改 `src/line/bot-handlers.ts`：

```typescript
async function handleMessageEvent(event: MessageEvent, context: LineHandlerContext) {
  // ... existing code ...

  // NEW: Quick reply before agent processing
  if (context.cfg.channels?.line?.dualTrack?.enabled) {
    await handleLineDualTrack({
      event,
      messageContext,
      account: context.account,
    });
    return; // Skip normal agent processing
  }

  await processMessage(messageContext);
}
```

### 方案 B：Internal Hook + Agent 改造

1. 創建 `line-dual-track` internal hook
2. 在 `time-tunnel` hook 中標記 LINE 消息
3. Agent TOOLS.md 指示不要回覆 LINE（改存彈夾）
4. 下次消息時由 hook 發送

## 快速回覆 Prompt

```
你是即時回覆助手。用戶問：「{message}」

規則：
1. 用 1-2 句話簡短回覆
2. 友善、自然
3. 如果需要深入回答，說「讓我想想...」然後給一個初步答案
4. 不要用 emoji（除非用戶用了）

回覆：
```

## 狀態追蹤

在 `consciousness_state` 表新增：

```sql
UPDATE consciousness_state SET
  line_magazine_count = (SELECT COUNT(*) FROM line_magazine WHERE fired = 0),
  last_quick_reply_at = datetime('now')
WHERE key = 'line_dual_track';
```
