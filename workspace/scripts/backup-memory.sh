#!/bin/bash
# 記憶備份腳本
# 用法：
#   backup-memory.sh hourly   # 每小時備份（保留 24 份）
#   backup-memory.sh daily    # 每日備份（保留 30 份）
#   backup-memory.sh manual   # 手動備份（帶時間戳）

set -e

# 路徑配置
PERSISTENT_DIR="${HOME}/.openclaw/persistent/data"
BACKUP_DIR="${HOME}/.openclaw/backups"
DB_FILE="${PERSISTENT_DIR}/timeline.db"

# 顏色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 日誌函數
log() { echo -e "${GREEN}[backup]${NC} $1"; }
warn() { echo -e "${YELLOW}[backup]${NC} $1"; }
error() { echo -e "${RED}[backup]${NC} $1"; }

# 檢查資料庫存在
if [ ! -f "$DB_FILE" ]; then
    error "資料庫不存在: $DB_FILE"
    exit 1
fi

# 取得備份類型
BACKUP_TYPE="${1:-manual}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

case "$BACKUP_TYPE" in
    hourly)
        TARGET_DIR="${BACKUP_DIR}/hourly"
        MAX_BACKUPS=24
        BACKUP_NAME="timeline_hourly.db"
        ;;
    daily)
        TARGET_DIR="${BACKUP_DIR}/daily"
        MAX_BACKUPS=30
        BACKUP_NAME="timeline_$(date +%Y%m%d).db"
        ;;
    manual|*)
        TARGET_DIR="${BACKUP_DIR}/manual"
        MAX_BACKUPS=10
        BACKUP_NAME="timeline_${TIMESTAMP}.db"
        ;;
esac

# 創建目錄
mkdir -p "$TARGET_DIR"

# 執行備份
BACKUP_PATH="${TARGET_DIR}/${BACKUP_NAME}"
log "備份中: $DB_FILE -> $BACKUP_PATH"

# 使用 SQLite 的 .backup 命令確保一致性
sqlite3 "$DB_FILE" ".backup '$BACKUP_PATH'"

# 驗證備份
if sqlite3 "$BACKUP_PATH" "SELECT COUNT(*) FROM messages;" > /dev/null 2>&1; then
    RECORD_COUNT=$(sqlite3 "$BACKUP_PATH" "SELECT COUNT(*) FROM messages;")
    log "備份成功: ${RECORD_COUNT} 條記錄"
else
    error "備份驗證失敗！"
    rm -f "$BACKUP_PATH"
    exit 1
fi

# 清理舊備份（保留最新 N 份）
if [ "$BACKUP_TYPE" != "manual" ]; then
    BACKUP_COUNT=$(ls -1 "$TARGET_DIR"/*.db 2>/dev/null | wc -l)
    if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
        DELETE_COUNT=$((BACKUP_COUNT - MAX_BACKUPS))
        log "清理舊備份: 刪除 $DELETE_COUNT 份"
        ls -1t "$TARGET_DIR"/*.db | tail -n "$DELETE_COUNT" | xargs rm -f
    fi
fi

# 輸出備份資訊
BACKUP_SIZE=$(ls -lh "$BACKUP_PATH" | awk '{print $5}')
log "完成: $BACKUP_PATH ($BACKUP_SIZE)"

# 列出當前備份
echo ""
log "當前備份清單:"
ls -lht "$TARGET_DIR"/*.db 2>/dev/null | head -5
