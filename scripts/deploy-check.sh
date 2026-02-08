#!/bin/bash
#
# Pre-deployment Safety Check
# 部署前檢查：確認沒有活躍對話 + 備份狀態
#

CONTAINER_NAME="${CONTAINER_NAME:-moltbot-core.router.wuji.01-stg}"
BACKUP_DIR="${HOME}/.openclaw/backups"

echo "========================================"
echo "  Pre-Deployment Safety Check"
echo "========================================"
echo ""

# 0. 檢查備份狀態（記憶層保護）
echo "0. 🧠 記憶備份狀態："
if [ -d "$BACKUP_DIR" ]; then
    latest_manual=$(ls -t "$BACKUP_DIR/manual"/*.db 2>/dev/null | head -1)
    latest_hourly=$(ls -t "$BACKUP_DIR/hourly"/*.db 2>/dev/null | head -1)

    if [ -n "$latest_manual" ]; then
        manual_time=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$latest_manual" 2>/dev/null || stat -c "%y" "$latest_manual" 2>/dev/null | cut -d. -f1)
        manual_size=$(ls -lh "$latest_manual" | awk '{print $5}')
        echo "   最近手動備份: $manual_time ($manual_size)"
    else
        echo "   ⚠️  無手動備份"
    fi

    if [ -n "$latest_hourly" ]; then
        hourly_time=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$latest_hourly" 2>/dev/null || stat -c "%y" "$latest_hourly" 2>/dev/null | cut -d. -f1)
        hourly_size=$(ls -lh "$latest_hourly" | awk '{print $5}')
        echo "   最近小時備份: $hourly_time ($hourly_size)"
    fi

    total_backups=$(find "$BACKUP_DIR" -name "*.db" 2>/dev/null | wc -l | tr -d ' ')
    echo "   總備份數: $total_backups"
else
    echo "   ⚠️  備份目錄不存在: $BACKUP_DIR"
fi
echo ""

# 1. 檢查 container 狀態
echo "1. Container 狀態："
docker ps --format "   {{.Names}}: {{.Status}}" | grep "$CONTAINER_NAME" || echo "   未運行"
echo ""

# 2. 檢查最近消息活動
echo "2. 最近 60 秒消息活動："
recent=$(docker logs "$CONTAINER_NAME" --since 60s 2>&1 | grep -E "📥|📤" | wc -l | tr -d ' ')
echo "   收發消息數: $recent"

if [ "$recent" -gt 0 ]; then
    echo "   ⚠️  有活躍對話，建議等待完成"
    echo ""
    echo "   最近消息："
    docker logs "$CONTAINER_NAME" --since 60s 2>&1 | grep "📥\|📤" | tail -5 | sed 's/^/   /'
else
    echo "   ✓ 無活躍對話，可以部署"
fi
echo ""

# 3. 檢查 Gateway 狀態
echo "3. Gateway 狀態："
if pgrep -f "openclaw.*gateway" > /dev/null; then
    gateway_telegram=$(grep -c "telegram.*enabled.*true" ~/.openclaw/openclaw.json 2>/dev/null || echo "0")
    if [ "$gateway_telegram" -gt 0 ]; then
        echo "   ⚠️  Gateway 的 Telegram 可能還在啟用"
    else
        echo "   ✓ Gateway Telegram 已禁用"
    fi
else
    echo "   Gateway 未運行"
fi
echo ""

# 4. 建議
echo "4. 建議："
if [ "$recent" -eq 0 ]; then
    echo "   ✓ 現在可以安全部署"
    echo "   執行: ./scripts/zero-downtime-deploy.sh"
else
    echo "   等待 2-3 分鐘後再檢查"
    echo "   或在低流量時段部署（凌晨）"
fi
echo ""
echo "========================================"
