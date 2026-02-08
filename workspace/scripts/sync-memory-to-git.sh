#!/bin/bash
# 🧠 記憶同步到 Git
# 將重要記憶資料導出為可追蹤的格式
#
# 用法：
#   sync-memory-to-git.sh           # 導出 + 自動 commit
#   sync-memory-to-git.sh --export  # 只導出不 commit

set -e

# 路徑配置
DATA_ROOT="${DATA_ROOT:-${HOME}/.openclaw/persistent/data}"
DB_FILE="${DATA_ROOT}/timeline.db"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXPORT_DIR="${SCRIPT_DIR}/../data/git-sync"

# 顏色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[git-sync]${NC} $1"; }
success() { echo -e "${GREEN}[git-sync] ✓${NC} $1"; }
warn() { echo -e "${YELLOW}[git-sync] ⚠${NC} $1"; }

# 確保目錄存在
mkdir -p "$EXPORT_DIR"

# 檢查資料庫
if [ ! -f "$DB_FILE" ]; then
    warn "資料庫不存在: $DB_FILE"
    exit 1
fi

log "導出記憶資料..."

# 1. 導出統計摘要
log "導出統計摘要..."
sqlite3 "$DB_FILE" <<'EOF' > "${EXPORT_DIR}/stats.md"
.mode markdown
.headers on

SELECT '# 記憶統計' AS '';
SELECT '' AS '';
SELECT '**最後更新**: ' || datetime('now', 'localtime') AS '';
SELECT '' AS '';

SELECT '## 總覽' AS '';
SELECT '' AS '';

SELECT
    '- 總訊息數: ' || COUNT(*) AS ''
FROM messages;

SELECT
    '- 最早記錄: ' || MIN(datetime(timestamp/1000, 'unixepoch', 'localtime')) AS ''
FROM messages;

SELECT
    '- 最新記錄: ' || MAX(datetime(timestamp/1000, 'unixepoch', 'localtime')) AS ''
FROM messages;

SELECT '' AS '';
SELECT '## 按項目統計' AS '';
SELECT '' AS '';

SELECT
    '| 項目 | 訊息數 |',
    '|------|--------|';

SELECT
    '| ' || COALESCE(resolved_project, 'unknown') || ' | ' || COUNT(*) || ' |'
FROM messages
GROUP BY resolved_project
ORDER BY COUNT(*) DESC;

SELECT '' AS '';
SELECT '## 按方向統計' AS '';
SELECT '' AS '';

SELECT
    '| 方向 | 數量 |',
    '|------|------|';

SELECT
    '| ' || direction || ' | ' || COUNT(*) || ' |'
FROM messages
GROUP BY direction;
EOF
success "統計摘要: ${EXPORT_DIR}/stats.md"

# 2. 導出知識庫（如果存在）
if sqlite3 "$DB_FILE" "SELECT 1 FROM knowledge_base LIMIT 1;" 2>/dev/null; then
    log "導出知識庫..."
    sqlite3 "$DB_FILE" <<'EOF' > "${EXPORT_DIR}/knowledge.md"
.mode markdown
.headers on

SELECT '# 知識庫' AS '';
SELECT '' AS '';
SELECT '**最後更新**: ' || datetime('now', 'localtime') AS '';
SELECT '' AS '';

SELECT
    '## ' || category AS '',
    '' AS '',
    '- **' || key || '**: ' || value AS ''
FROM knowledge_base
ORDER BY category, key;
EOF
    success "知識庫: ${EXPORT_DIR}/knowledge.md"
fi

# 3. 導出重要記憶（如果存在）
if sqlite3 "$DB_FILE" "SELECT 1 FROM memory_summaries LIMIT 1;" 2>/dev/null; then
    log "導出記憶摘要..."
    sqlite3 "$DB_FILE" <<'EOF' > "${EXPORT_DIR}/summaries.md"
.mode markdown
.headers on

SELECT '# 記憶摘要' AS '';
SELECT '' AS '';

SELECT
    '## ' || datetime(created_at/1000, 'unixepoch', 'localtime') AS '',
    '' AS '',
    '**時間範圍**: ' || datetime(start_time/1000, 'unixepoch', 'localtime') ||
    ' ~ ' || datetime(end_time/1000, 'unixepoch', 'localtime') AS '',
    '' AS '',
    summary AS ''
FROM memory_summaries
ORDER BY created_at DESC
LIMIT 20;
EOF
    success "記憶摘要: ${EXPORT_DIR}/summaries.md"
fi

# 4. 導出身份映射
log "導出身份映射..."
sqlite3 "$DB_FILE" <<'EOF' > "${EXPORT_DIR}/identities.md"
.mode markdown
.headers on

SELECT '# 身份映射' AS '';
SELECT '' AS '';

SELECT '| ID | 人物 | 角色 | 頻道 |';
SELECT '|----|------|------|------|';

SELECT
    '| ' || id || ' | ' || person || ' | ' || COALESCE(role, '-') || ' | ' || COALESCE(channel, '-') || ' |'
FROM identities
ORDER BY person;
EOF
success "身份映射: ${EXPORT_DIR}/identities.md"

# 5. 導出聊天室映射
log "導出聊天室映射..."
sqlite3 "$DB_FILE" <<'EOF' > "${EXPORT_DIR}/chats.md"
.mode markdown
.headers on

SELECT '# 聊天室映射' AS '';
SELECT '' AS '';

SELECT '| Chat ID | 名稱 | 項目 | 類型 |';
SELECT '|---------|------|------|------|';

SELECT
    '| ' || chat_id || ' | ' || name || ' | ' || COALESCE(project, '-') || ' | ' || COALESCE(type, '-') || ' |'
FROM chats
ORDER BY project, name;
EOF
success "聊天室映射: ${EXPORT_DIR}/chats.md"

# 6. 複製日記（最近 7 天）
DIARY_SRC="${DATA_ROOT}/diary"
DIARY_DST="${EXPORT_DIR}/diary"
if [ -d "$DIARY_SRC" ]; then
    log "同步最近日記..."
    mkdir -p "$DIARY_DST"
    find "$DIARY_SRC" -name "*.md" -mtime -7 -exec cp {} "$DIARY_DST/" \; 2>/dev/null || true
    diary_count=$(ls -1 "$DIARY_DST"/*.md 2>/dev/null | wc -l | tr -d ' ')
    success "日記: ${diary_count} 份"
fi

# Git commit（除非 --export）
if [ "$1" != "--export" ]; then
    log "提交到 Git..."
    cd "$(dirname "$EXPORT_DIR")"

    if git rev-parse --git-dir > /dev/null 2>&1; then
        git add git-sync/

        if git diff --cached --quiet; then
            warn "無變更需要提交"
        else
            git commit -m "memory: sync $(date +%Y-%m-%d)" --no-verify 2>/dev/null || true
            success "已提交到 Git"
        fi
    else
        warn "不在 Git 倉庫中，跳過提交"
    fi
fi

echo ""
log "導出完成: $EXPORT_DIR"
ls -la "$EXPORT_DIR"
