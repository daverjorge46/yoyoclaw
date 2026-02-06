# LINE 雙軌回覆系統設置指南

## 概述

解決 LINE Reply Token 30 秒過期問題，實現：

- 快速回覆（Sonnet 4.5，<3 秒）
- 深度思考（Opus，背景處理）
- 彈夾機制（下次對話時發送深度回覆）

## 架構

```
用戶發話 → [快速回覆 Sonnet] → Reply Token（免費）
              ↓
         [深度思考 Opus] → 彈夾存儲
              ↓
下次發話 → [彈夾 + 快速回覆] → Reply Token（免費）
```

## 設置步驟

### 1. 創建 LINE 專用 Agent

在 Container 的 `~/.openclaw/openclaw.json` 中添加 agent：

```json
{
  "agents": {
    "list": [
      {
        "id": "line-quick",
        "model": {
          "primary": "anthropic/claude-sonnet-4-5"
        },
        "workspace": "/app/workspace",
        "instructions": "/app/workspace/agents/line-quick/INSTRUCTIONS.md",
        "maxTurns": 3,
        "tools": {
          "allowlist": ["read", "bash"]
        }
      }
    ]
  }
}
```

### 2. 配置 LINE 路由

添加 binding 將 LINE 消息路由到快速 agent：

```json
{
  "bindings": [
    {
      "agentId": "line-quick",
      "match": {
        "channel": "line"
      }
    }
  ]
}
```

### 3. 初始化數據庫表

```bash
docker exec moltbot-core.router.wuji.01-stg sqlite3 /app/workspace/data/timeline.db "
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

CREATE INDEX IF NOT EXISTS idx_magazine_pending ON line_magazine(user_id, chat_id, fired) WHERE fired = 0;
CREATE INDEX IF NOT EXISTS idx_queue_pending ON deep_thinking_queue(status) WHERE status = 'pending';
"
```

### 4. 啟動深度思考處理器

```bash
# 在 Container 中啟動背景處理
docker exec -d moltbot-core.router.wuji.01-stg node /app/workspace/scripts/deep-thinker.js --watch
```

或添加到 cron：

```bash
# 每分鐘處理一次
* * * * * docker exec moltbot-core.router.wuji.01-stg node /app/workspace/scripts/deep-thinker.js
```

### 5. 驗證

```bash
# 檢查統計
docker exec moltbot-core.router.wuji.01-stg node /app/workspace/scripts/deep-thinker.js --stats

# 查看彈夾
docker exec moltbot-core.router.wuji.01-stg sqlite3 /app/workspace/data/timeline.db "SELECT * FROM line_magazine WHERE fired=0"

# 查看隊列
docker exec moltbot-core.router.wuji.01-stg sqlite3 /app/workspace/data/timeline.db "SELECT * FROM deep_thinking_queue ORDER BY created_at DESC LIMIT 10"
```

## 快速測試

1. 發送 LINE 消息
2. 應該在 3 秒內收到快速回覆
3. 等待 30 秒（深度思考處理）
4. 再發一條消息
5. 應該收到：彈夾內容 + 新的快速回覆

## 監控

```bash
# 查看 LINE 活動
./workspace/scripts/unified-logs line

# 查看 429 錯誤
./workspace/scripts/monitor-429

# 查看彈夾統計
docker exec moltbot-core.router.wuji.01-stg node /app/workspace/scripts/deep-thinker.js --stats
```

## 故障排除

### 快速回覆太慢

- 檢查 Sonnet 4.5 API 延遲
- 減少 INSTRUCTIONS.md 中的指令量
- 確保沒有讀取大文件

### 彈夾沒有發送

- 檢查 `line_magazine` 表是否有 `fired=0` 的記錄
- 確認 agent 有讀取數據庫的權限
- 查看 agent 日誌

### 深度思考沒有處理

- 檢查 `deep-thinker.js` 是否在運行
- 確認 `ANTHROPIC_API_KEY` 環境變量
- 查看 `deep_thinking_queue` 表的 status
