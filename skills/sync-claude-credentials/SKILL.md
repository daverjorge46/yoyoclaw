---
name: sync-claude-credentials
description: Sync Claude Code OAuth credentials vào Kubernetes secret.yaml. Sử dụng khi cần cập nhật CLAUDE_AI_SESSION_KEY, CLAUDE_WEB_SESSION_KEY cho k8s deployment.
---

# Sync Claude Credentials

Skill này sync credentials từ Claude Code (`~/.claude/.credentials.json`) vào `k8s/secret.yaml`.

## Khi nào sử dụng

- Khi cần cập nhật Claude session credentials cho k8s deployment
- Khi token hết hạn và cần refresh
- Sau khi chạy `claude login` để lấy token mới

## Cách sử dụng

### Tự động sync (chạy script)

```bash
bash skills/sync-claude-credentials/scripts/sync.sh
```

Script sẽ:
1. Đọc credentials từ `~/.claude/.credentials.json`
2. Cập nhật `CLAUDE_AI_SESSION_KEY` trong `k8s/secret.yaml`
3. Hiển thị kết quả

### Thủ công

1. Đọc file credentials:
```bash
cat ~/.claude/.credentials.json
```

2. Lấy `accessToken` từ field `claudeAiOauth`

3. Cập nhật vào `k8s/secret.yaml`:
```yaml
CLAUDE_AI_SESSION_KEY: "sk-ant-oat01-..."
```

## Lưu ý

- Access token có thời hạn (~1 tuần), cần refresh định kỳ
- Khi token hết hạn, chạy `claude login` để lấy token mới
- Không commit `k8s/secret.yaml` lên git (chứa credentials)

## Sau khi sync

Apply secret lên k8s cluster:

```bash
kubectl apply -f k8s/secret.yaml
```
