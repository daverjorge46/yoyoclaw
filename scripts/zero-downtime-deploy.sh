#!/bin/bash
#
# Zero-Downtime Deployment Script
# Level 50+: 確保消息不丟失的部署流程
#
# 原理：
# 1. Telegram 會 queue 消息（最長 24 小時）
# 2. 只要新舊 container 不同時輪詢，就不會衝突
# 3. 短暫 gap 期間的消息會在新 container 啟動後被處理
#

set -e

# === 記憶層強化：變更前自動備份 ===
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="${SCRIPT_DIR}/../workspace/scripts/backup-memory.sh"

pre_deploy_backup() {
    echo ""
    log "Step 0: 🧠 變更前記憶備份..."
    if [ -f "$BACKUP_SCRIPT" ]; then
        if "$BACKUP_SCRIPT" manual 2>/dev/null; then
            success "記憶備份完成"
        else
            warn "備份失敗，但繼續部署（資料庫可能不存在）"
        fi
    else
        warn "備份腳本不存在: $BACKUP_SCRIPT"
    fi
}
# === End 記憶層強化 ===

# 配置
CONTAINER_NAME="${CONTAINER_NAME:-moltbot-core.router.wuji.01-stg}"
IMAGE_NAME="${IMAGE_NAME:-moltbot:local}"
# 注意：這個容器不是用 compose 啟動的，用 docker start/stop 即可
USE_COMPOSE="${USE_COMPOSE:-0}"
COMPOSE_FILE="${COMPOSE_FILE:-}"

# 顏色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')] ✓${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ✗${NC} $1"
}

# 檢查 container 是否在運行
check_container_running() {
    docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"
}

# 檢查 container 健康狀態
check_container_healthy() {
    local status=$(docker inspect --format='{{.State.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "not found")
    [ "$status" = "running" ]
}

# 等待 container 完全停止
wait_for_stop() {
    local max_wait=30
    local waited=0

    while check_container_running && [ $waited -lt $max_wait ]; do
        sleep 1
        waited=$((waited + 1))
        echo -n "."
    done
    echo ""

    if check_container_running; then
        error "Container 未能在 ${max_wait} 秒內停止"
        return 1
    fi
    return 0
}

# 等待 container 啟動並接收消息
wait_for_healthy() {
    local max_wait=60
    local waited=0

    while ! check_container_healthy && [ $waited -lt $max_wait ]; do
        sleep 1
        waited=$((waited + 1))
        echo -n "."
    done
    echo ""

    if ! check_container_healthy; then
        error "Container 未能在 ${max_wait} 秒內啟動"
        return 1
    fi

    # 額外等待 Telegram 連接建立
    sleep 3
    return 0
}

# 檢查是否有 in-flight 請求（Level 50）
check_in_flight() {
    # 嘗試從 container 獲取 in-flight 狀態
    local result=$(docker exec "$CONTAINER_NAME" curl -s http://localhost:18799/health 2>/dev/null || echo "{}")
    echo "$result"
}

# 主部署流程
main() {
    echo ""
    echo "========================================"
    echo "  Zero-Downtime Deployment"
    echo "  Container: $CONTAINER_NAME"
    echo "========================================"
    echo ""

    local start_time=$(date +%s)

    # Step 0: 變更前備份（記憶層保護）
    pre_deploy_backup

    # Step 1: 檢查當前狀態
    log "Step 1: 檢查當前狀態..."
    if check_container_running; then
        success "Container 正在運行"
    else
        warn "Container 未運行，將直接啟動新版本"
    fi

    # Step 2: 構建新 image（可選）
    if [ "$SKIP_BUILD" != "1" ]; then
        log "Step 2: 構建新 Docker image..."
        if [ "$USE_COMPOSE" = "1" ] && [ -f "$COMPOSE_FILE" ]; then
            docker compose -f "$COMPOSE_FILE" build --quiet
            success "Image 構建完成"
        elif [ -f "Dockerfile" ]; then
            docker build -t "$IMAGE_NAME" . --quiet
            success "Image 構建完成"
        else
            warn "跳過構建（無 compose/Dockerfile）"
        fi
    else
        log "Step 2: 跳過構建（SKIP_BUILD=1）"
    fi

    # Step 3: 停止舊 container
    if check_container_running; then
        log "Step 3: 停止舊 container..."

        # 記錄停止時間
        local stop_start=$(date +%s.%N)

        # 發送 SIGTERM 讓 container graceful shutdown
        docker stop --time=35 "$CONTAINER_NAME" > /dev/null 2>&1 || true

        # 等待完全停止
        wait_for_stop

        local stop_end=$(date +%s.%N)
        local stop_duration=$(echo "$stop_end - $stop_start" | bc)
        success "舊 container 已停止（耗時 ${stop_duration}s）"
    else
        log "Step 3: 無需停止（container 未運行）"
    fi

    # Step 4: 啟動新 container
    log "Step 4: 啟動新 container..."
    local start_start=$(date +%s.%N)

    if [ "$USE_COMPOSE" = "1" ] && [ -f "$COMPOSE_FILE" ]; then
        docker compose -f "$COMPOSE_FILE" up -d
    else
        # 直接啟動已有的 container（已經配置好）
        docker start "$CONTAINER_NAME"
    fi

    # 等待啟動完成
    wait_for_healthy

    local start_end=$(date +%s.%N)
    local start_duration=$(echo "$start_end - $start_start" | bc)
    success "新 container 已啟動（耗時 ${start_duration}s）"

    # Step 5: 驗證
    log "Step 5: 驗證部署..."
    sleep 2

    # 檢查 Telegram 連接
    local telegram_ok=false
    for i in {1..5}; do
        if docker logs "$CONTAINER_NAME" 2>&1 | tail -20 | grep -q "starting provider.*@"; then
            telegram_ok=true
            break
        fi
        sleep 1
    done

    if [ "$telegram_ok" = true ]; then
        success "Telegram 連接已建立"
    else
        warn "無法確認 Telegram 連接狀態"
    fi

    # 檢查是否有衝突錯誤
    if docker logs "$CONTAINER_NAME" 2>&1 | tail -20 | grep -q "409.*Conflict"; then
        error "檢測到 409 衝突！可能有其他 instance 在運行"
    fi

    # 計算總時間
    local end_time=$(date +%s)
    local total_duration=$((end_time - start_time))

    echo ""
    echo "========================================"
    echo "  部署完成"
    echo "  總耗時: ${total_duration} 秒"
    echo "  Gap 時間: 約 ${stop_duration:-0}s + ${start_duration:-0}s"
    echo "========================================"
    echo ""

    # 顯示最近日誌
    log "最近日誌："
    docker logs "$CONTAINER_NAME" 2>&1 | tail -10
}

# 執行
main "$@"
