---
name: sender-identity
description: Auto-inject contact profiles for LINE group members into agent bootstrap context
metadata:
  openclaw:
    events:
      - agent:bootstrap
enabled: true
---

# Sender Identity Hook

在 Agent 啟動時，自動偵測 LINE 群組 → 查詢成員名單 → 載入對應的 contact memory → 注入 bootstrap context。

## 運作原理

1. 從 session key 解析出 channel 和 groupId
2. 讀取 `references/line-profile-cache.json` 取得該群成員
3. 對每個成員，檢查 `memory/contacts/{name}.md` 是否存在
4. 將找到的 contact profiles 合併為一份 `group-members-context.md` 注入 bootstrapFiles

## 效果

Agent 在回覆任何群組訊息前，就已經知道：
- 這個群有哪些人
- 每個人的關係、個性、近況
- 不再需要猜測「你是誰」
