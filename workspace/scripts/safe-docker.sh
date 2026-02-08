#!/bin/bash
# 🛡️ 安全 Docker 包裝器
# 在執行危險操作前自動備份記憶
#
# 用法：
#   safe-docker.sh rm <container>      # 移除容器前備份
#   safe-docker.sh compose down        # compose down 前備份
#   safe-docker.sh <any>               # 其他命令直接執行

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="${SCRIPT_DIR}/backup-memory.sh"
DANGEROUS_CONTAINER="moltbot-core.router.wuji.01"

# 顏色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

warn() { echo -e "${YELLOW}[safe-docker]${NC} $1"; }
error() { echo -e "${RED}[safe-docker]${NC} $1"; }
success() { echo -e "${GREEN}[safe-docker]${NC} $1"; }

# 檢查是否為危險操作
is_dangerous() {
    local cmd="$1"
    local args="$2"

    # docker rm 涉及我們的容器
    if [[ "$cmd" == "rm" ]] && [[ "$args" == *"$DANGEROUS_CONTAINER"* ]]; then
        return 0
    fi

    # docker-compose down
    if [[ "$cmd" == "compose" ]] && [[ "$args" == *"down"* ]]; then
        return 0
    fi

    # docker stop + rm 組合
    if [[ "$cmd" == "stop" ]] && [[ "$args" == *"$DANGEROUS_CONTAINER"* ]]; then
        return 0
    fi

    return 1
}

# 執行備份
do_backup() {
    warn "⚠️  檢測到危險操作，執行記憶備份..."
    if [ -f "$BACKUP_SCRIPT" ]; then
        if "$BACKUP_SCRIPT" manual; then
            success "✓ 記憶備份完成，繼續執行操作"
        else
            error "備份失敗！"
            read -p "是否繼續執行操作？(y/N) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                error "操作取消"
                exit 1
            fi
        fi
    else
        warn "備份腳本不存在，跳過備份"
    fi
}

# 主函數
main() {
    if [ $# -eq 0 ]; then
        echo "用法: safe-docker.sh <docker-command> [args...]"
        echo ""
        echo "這是一個 docker 包裝器，會在危險操作前自動備份記憶。"
        echo ""
        echo "受保護的操作："
        echo "  - docker rm $DANGEROUS_CONTAINER*"
        echo "  - docker compose down"
        echo "  - docker stop $DANGEROUS_CONTAINER*"
        exit 0
    fi

    local cmd="$1"
    shift
    local args="$*"

    # 檢查是否為危險操作
    if is_dangerous "$cmd" "$args"; then
        do_backup
    fi

    # 執行原始命令
    docker "$cmd" $args
}

main "$@"
