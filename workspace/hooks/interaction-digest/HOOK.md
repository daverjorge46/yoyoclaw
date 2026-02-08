---
name: interaction-digest
description: 對話結束後自動摘要互動重點，追加到 contact 檔案的「近況」區塊
metadata:
  openclaw:
    events:
      - conversation:end
      - session:idle
enabled: true
---

# Interaction Digest Hook

當一段對話結束（或 session idle 超時）時：

1. 從 Time Tunnel 拉取該 session 最近的訊息
2. 識別對話者（從 SenderName）
3. 生成 1-2 句摘要（用小模型，低成本）
4. 追加到 `memory/contacts/{name}.md` 的「近況」區塊

## 效果

下次跟同一個人聊天時，Agent 自動知道「上次她提到要去日本買藥妝」。
