---
metadata:
  openclaw:
    events:
      - message:received
---

# Message Mirror Hook

將所有進入的訊息鏡像到 Telegram Log 群組。

## Events

- `message:received` - 收到訊息時觸發

## Config

```yaml
hooks:
  message-mirror:
    enabled: true
    logBotToken: "..."
    logGroupId: ""
```

## Format

```
📨 [頻道] 來源
時間: YYYY-MM-DD HH:mm
---
訊息內容
```
