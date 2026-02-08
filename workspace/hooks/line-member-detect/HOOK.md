---
name: line-member-detect
description: 偵測 LINE 群組新成員加入，自動更新 profile cache 並建立 contact 骨架
metadata:
  openclaw:
    events:
      - message:received
enabled: true
---

# LINE Member Detect Hook

監聽 LINE webhook 的 memberJoined 事件：

1. 從事件中提取新成員的 userId 和 displayName
2. 更新 `references/line-profile-cache.json`
3. 如果 `memory/contacts/{name}.md` 不存在，建立骨架檔案
4. 記錄到 console 方便追蹤

## 觸發條件

LINE webhook 的 `memberJoined` 類型事件（透過 message:received 管道轉入）
