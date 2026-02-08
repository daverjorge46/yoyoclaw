#!/bin/bash
# 🧠 記憶完整性檢查
# 啟動時驗證 timeline.db 是否完整可用
#
# 用法：
#   check-memory-integrity.sh          # 檢查並報告
#   check-memory-integrity.sh --repair # 嘗試修復

set -e

# 路徑配置
DATA_ROOT="${DATA_ROOT:-${HOME}/.openclaw/persistent/data}"
BACKUP_DIR="${BACKUP_ROOT:-${HOME}/.openclaw/backups}"
DB_FILE="${DATA_ROOT}/timeline.db"

# 顏色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日誌函數
log() { echo -e "${BLUE}[integrity]${NC} $1"; }
success() { echo -e "${GREEN}[integrity] ✓${NC} $1"; }
warn() { echo -e "${YELLOW}[integrity] ⚠${NC} $1"; }
error() { echo -e "${RED}[integrity] ✗${NC} $1"; }

# 檢查結果
ISSUES=()
CRITICAL=false

# 檢查 1: 資料庫檔案存在
check_file_exists() {
    log "檢查資料庫檔案..."
    if [ ! -f "$DB_FILE" ]; then
        error "資料庫不存在: $DB_FILE"
        ISSUES+=("DB_NOT_FOUND")
        CRITICAL=true
        return 1
    fi
    success "資料庫檔案存在"

    # 檢查檔案大小
    local size=$(ls -l "$DB_FILE" | awk '{print $5}')
    if [ "$size" -lt 1024 ]; then
        warn "資料庫檔案過小: ${size} bytes（可能為空）"
        ISSUES+=("DB_TOO_SMALL")
    fi
}

# 檢查 2: SQLite 完整性
check_sqlite_integrity() {
    log "檢查 SQLite 完整性..."

    local result=$(sqlite3 "$DB_FILE" "PRAGMA integrity_check;" 2>&1)
    if [ "$result" = "ok" ]; then
        success "SQLite 完整性檢查通過"
    else
        error "SQLite 完整性檢查失敗: $result"
        ISSUES+=("INTEGRITY_FAILED")
        CRITICAL=true
        return 1
    fi
}

# 檢查 3: 必要表存在
check_tables() {
    log "檢查必要表..."

    local required_tables=("messages" "messages_fts")
    local missing=()

    for table in "${required_tables[@]}"; do
        if ! sqlite3 "$DB_FILE" "SELECT 1 FROM $table LIMIT 1;" > /dev/null 2>&1; then
            missing+=("$table")
        fi
    done

    if [ ${#missing[@]} -eq 0 ]; then
        success "所有必要表存在"
    else
        error "缺少表: ${missing[*]}"
        ISSUES+=("MISSING_TABLES")
        CRITICAL=true
        return 1
    fi
}

# 檢查 4: 記錄數量
check_record_count() {
    log "檢查記錄數量..."

    local count=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM messages;" 2>/dev/null || echo "0")

    if [ "$count" -eq 0 ]; then
        warn "資料庫為空（0 條記錄）"
        ISSUES+=("EMPTY_DB")
    else
        success "記錄數量: $count 條"
    fi

    # 檢查最近活動
    local last_time=$(sqlite3 "$DB_FILE" "SELECT datetime(timestamp/1000, 'unixepoch', 'localtime') FROM messages ORDER BY timestamp DESC LIMIT 1;" 2>/dev/null || echo "")
    if [ -n "$last_time" ]; then
        log "最後記錄時間: $last_time"
    fi
}

# 檢查 5: WAL 狀態
check_wal_status() {
    log "檢查 WAL 狀態..."

    local journal=$(sqlite3 "$DB_FILE" "PRAGMA journal_mode;" 2>/dev/null || echo "unknown")

    if [ "$journal" = "wal" ]; then
        success "WAL 模式已啟用"

        # 檢查 WAL 檔案
        if [ -f "${DB_FILE}-wal" ]; then
            local wal_size=$(ls -lh "${DB_FILE}-wal" | awk '{print $5}')
            log "WAL 檔案大小: $wal_size"
        fi
    else
        warn "未使用 WAL 模式 (當前: $journal)"
        ISSUES+=("NO_WAL")
    fi
}

# 檢查 6: 備份可用性
check_backup_availability() {
    log "檢查備份可用性..."

    if [ ! -d "$BACKUP_DIR" ]; then
        warn "備份目錄不存在"
        ISSUES+=("NO_BACKUP_DIR")
        return
    fi

    local backup_count=$(find "$BACKUP_DIR" -name "*.db" 2>/dev/null | wc -l | tr -d ' ')

    if [ "$backup_count" -eq 0 ]; then
        warn "無可用備份"
        ISSUES+=("NO_BACKUPS")
    else
        success "可用備份數: $backup_count"

        # 找最近的備份
        local latest=$(find "$BACKUP_DIR" -name "*.db" -type f -exec ls -t {} + 2>/dev/null | head -1)
        if [ -n "$latest" ]; then
            local latest_time=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$latest" 2>/dev/null || stat -c "%y" "$latest" 2>/dev/null | cut -d. -f1)
            log "最近備份: $latest_time"
        fi
    fi
}

# 嘗試修復
attempt_repair() {
    log "嘗試修復..."

    # 如果資料庫不存在，從備份恢復
    if [[ " ${ISSUES[*]} " =~ "DB_NOT_FOUND" ]]; then
        local latest_backup=$(find "$BACKUP_DIR" -name "*.db" -type f -exec ls -t {} + 2>/dev/null | head -1)

        if [ -n "$latest_backup" ]; then
            log "從備份恢復: $latest_backup"
            mkdir -p "$(dirname "$DB_FILE")"
            cp "$latest_backup" "$DB_FILE"

            # 驗證恢復
            if sqlite3 "$DB_FILE" "PRAGMA integrity_check;" | grep -q "ok"; then
                success "恢復成功！"
                return 0
            else
                error "恢復的資料庫損壞"
                return 1
            fi
        else
            error "無可用備份，無法恢復"
            return 1
        fi
    fi

    # SQLite 自動修復
    if [[ " ${ISSUES[*]} " =~ "INTEGRITY_FAILED" ]]; then
        log "嘗試 SQLite recover..."

        local recovery_file="${DB_FILE}.recovered"
        if sqlite3 "$DB_FILE" ".recover" | sqlite3 "$recovery_file" 2>/dev/null; then
            if sqlite3 "$recovery_file" "PRAGMA integrity_check;" | grep -q "ok"; then
                mv "$DB_FILE" "${DB_FILE}.corrupted.$(date +%Y%m%d%H%M%S)"
                mv "$recovery_file" "$DB_FILE"
                success "SQLite recover 成功！"
                return 0
            fi
        fi

        error "自動修復失敗"
        return 1
    fi

    warn "無需修復或無法自動修復"
    return 1
}

# 主函數
main() {
    echo ""
    echo "========================================"
    echo "  🧠 記憶完整性檢查"
    echo "  資料庫: $DB_FILE"
    echo "========================================"
    echo ""

    # 執行檢查
    check_file_exists || true

    if [ ! -f "$DB_FILE" ]; then
        check_backup_availability

        if [ "$1" = "--repair" ]; then
            echo ""
            attempt_repair
        fi
    else
        check_sqlite_integrity || true
        check_tables || true
        check_record_count || true
        check_wal_status || true
        check_backup_availability
    fi

    # 總結
    echo ""
    echo "========================================"

    if [ ${#ISSUES[@]} -eq 0 ]; then
        success "所有檢查通過 ✓"
        echo "========================================"
        exit 0
    else
        if [ "$CRITICAL" = true ]; then
            error "發現嚴重問題！"
        else
            warn "發現 ${#ISSUES[@]} 個問題"
        fi

        echo ""
        echo "問題清單:"
        for issue in "${ISSUES[@]}"; do
            echo "  - $issue"
        done

        if [ "$1" != "--repair" ]; then
            echo ""
            echo "提示: 執行 '$0 --repair' 嘗試自動修復"
        fi

        echo "========================================"

        if [ "$CRITICAL" = true ]; then
            exit 2
        else
            exit 1
        fi
    fi
}

main "$@"
