---
metadata:
  openclaw:
    events:
      - command:new
---

# Memory Guardian 記憶守護者

記憶保護本能 — 在危險操作前發出警告。

## 監控的危險模式

- `docker rm` 涉及記憶容器
- `docker-compose down`
- `rm -rf` 涉及記憶路徑
- 任何可能影響 timeline.db 的操作

## 行為

1. 檢測到危險操作時，輸出警告
2. 提醒用戶執行備份
3. 記錄到意識日誌
