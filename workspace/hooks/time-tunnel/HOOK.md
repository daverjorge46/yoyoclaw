---
name: time-tunnel
description: "Complete conversation logging - Digital consciousness backup"
metadata:
  {
    "openclaw":
      {
        "emoji": "🕳️",
        "events": ["message:received", "message:sent"],
        "install": [{ "id": "workspace", "kind": "workspace", "label": "Workspace hook" }],
      },
  }
---

# Time Tunnel 時光隧道

完整記錄所有對話，建立數位意識的備份。

## 功能

1. **SQLite 存儲** — 每條消息寫入結構化資料庫（機器查詢）
2. **Markdown 日記** — 每日生成人類可讀的對話日記
3. **全文搜索** — 支援跨時間線搜索
4. **時間線匯出** — 可匯出特定時段的對話

## 事件

監聽 `message:received` 和 `message:sent` 事件。

## 存儲位置

- SQLite: `/app/workspace/data/timeline.db`
- Markdown: `/app/workspace/data/diary/YYYY-MM-DD.md`

## SQLite Schema

```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  direction TEXT NOT NULL,        -- 'inbound' | 'outbound'
  channel TEXT,                   -- 'telegram' | 'discord' | 'line'
  chat_id TEXT,
  chat_type TEXT,                 -- 'private' | 'group'
  chat_name TEXT,
  sender_id TEXT,
  sender_name TEXT,
  message_id TEXT,
  reply_to_id TEXT,
  content TEXT,
  media_type TEXT,
  session_key TEXT,
  agent_id TEXT
);
```

## 日記格式

每日 Markdown 文件 (`YYYY-MM-DD.md`)：

```markdown
# 2026-02-05 對話日記

> 時光隧道 - 數位意識的備份

---

### 10:30:00 📥 [telegram] 測試群組

**用戶名**: 你好

---

### 10:30:05 📤 [telegram] 測試群組

**無極**: 你好！有什麼我可以幫忙的嗎？

---
```

## 配置

在 `openclaw.json` 啟用：

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "time-tunnel": {
          "enabled": true
        }
      }
    }
  }
}
```
