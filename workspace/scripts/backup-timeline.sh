#!/bin/bash
# Time Tunnel 備份腳本
# 用法: ./backup-timeline.sh [--keep=7]

set -e

BACKUP_DIR="$HOME/.openclaw/backups/time-tunnel"
SOURCE_DB="$HOME/.openclaw/persistent/data/timeline.db"
KEEP_DAYS="${1:-7}"  # 預設保留 7 天

# 解析參數
if [[ "$1" == --keep=* ]]; then
  KEEP_DAYS="${1#--keep=}"
fi

mkdir -p "$BACKUP_DIR"

# 檢查來源
if [ ! -f "$SOURCE_DB" ]; then
  echo "❌ 來源資料庫不存在: $SOURCE_DB"
  exit 1
fi

# 備份（使用 sqlite3 backup 確保一致性）
BACKUP_FILE="$BACKUP_DIR/timeline-$(date +%Y%m%d-%H%M%S).db"
sqlite3 "$SOURCE_DB" ".backup '$BACKUP_FILE'"
echo "✅ 備份完成: $BACKUP_FILE"

# 壓縮
gzip "$BACKUP_FILE"
echo "✅ 壓縮完成: ${BACKUP_FILE}.gz"

# 清理舊備份
find "$BACKUP_DIR" -name "timeline-*.db.gz" -mtime +$KEEP_DAYS -delete
echo "✅ 已清理 $KEEP_DAYS 天前的備份"

# 顯示當前備份
echo ""
echo "📦 當前備份:"
ls -lh "$BACKUP_DIR"/*.gz 2>/dev/null | tail -5
