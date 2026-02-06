#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# OpenClaw Ultimate Sandbox Setup Script
# =============================================================================
# 功能：集成浏览器和编程工具的完整沙盒环境一键部署脚本
# 作者：浮浮酱 (Claude Code Agent)
# 版本：2.0.0
#
# 更新日志：
#   v2.0.0 - 添加系统环境检查、硬件资源评估、部署前确认机制
#   v1.0.0 - 初始版本
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# 颜色输出定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# 默认配置
IMAGE_NAME="${IMAGE_NAME:-openclaw-sandbox-ultimate:bookworm-slim}"
INSTALL_BROWSER="${INSTALL_BROWSER:-1}"
INSTALL_DEV_TOOLS="${INSTALL_DEV_TOOLS:-1}"
INSTALL_PNPM="${INSTALL_PNPM:-1}"
INSTALL_BUN="${INSTALL_BUN:-1}"
INSTALL_BREW="${INSTALL_BREW:-0}"
INSTALL_NODE_VERSION="${INSTALL_NODE_VERSION:-1}"
INSTALL_GOLANG="${INSTALL_GOLANG:-1}"
INSTALL_RUST="${INSTALL_RUST:-1}"
INSTALL_PYTHON_TOOLS="${INSTALL_PYTHON_TOOLS:-1}"
INSTALL_FFmpeg="${INSTALL_FFmpeg:-1}"

# 系统信息存储
declare -A SYSTEM_INFO
declare -A DOCKER_INFO
declare -A RECOMMENDATION

# =============================================================================
# 日志和输出函数
# =============================================================================

show_banner() {
    echo -e "${PURPLE}${BOLD}"
    cat <<'BANNER'
   ___        __       ____
  / _ | __ __/ /_ ___ / __ \
 / __ |/ // / __// _ \/ /_/ /
/_/ |_|\_,_/\__/ \___/_____/

╔═══════════════════════════════════════════════════════════╗
║  OpenClaw Ultimate Sandbox - 全功能沙盒部署工具 v2.0      ║
║  集成浏览器 + 编程工具的完整开发环境                      ║
╚═══════════════════════════════════════════════════════════╝
BANNER
    echo -e "${NC}"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_section() {
    echo ""
    echo -e "${CYAN}${BOLD}═════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}${BOLD}  $1${NC}"
    echo -e "${CYAN}${BOLD}═════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# =============================================================================
# 系统环境检查
# =============================================================================

check_system_requirements() {
    log_section "1️⃣  系统环境检查"

    local all_good=true

    # 1. 操作系统检查
    log_info "检查操作系统..."
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        SYSTEM_INFO[OS]="${NAME}"
        SYSTEM_INFO[VERSION]="${VERSION_ID}"
        log_success "操作系统: ${SYSTEM_INFO[OS]} ${SYSTEM_INFO[VERSION]}"
    else
        log_warn "无法识别操作系统版本"
    fi

    # 2. 架构检查
    SYSTEM_INFO[ARCH]=$(uname -m)
    case "${SYSTEM_INFO[ARCH]}" in
        x86_64)
            SYSTEM_INFO[ARCH_FRIENDLY]="AMD64 (x86_64)"
            log_success "CPU 架构: ${SYSTEM_INFO[ARCH_FRIENDLY]}"
            ;;
        aarch64|arm64)
            SYSTEM_INFO[ARCH_FRIENDLY]="ARM64 (aarch64)"
            log_success "CPU 架构: ${SYSTEM_INFO[ARCH_FRIENDLY]}"
            ;;
        *)
            log_warn "CPU 架构: ${SYSTEM_INFO[ARCH]} (可能存在兼容性问题)"
            all_good=false
            ;;
    esac

    # 3. 内核版本
    SYSTEM_INFO[KERNEL]=$(uname -r)
    log_success "内核版本: ${SYSTEM_INFO[KERNEL]}"

    # 4. 必需工具检查
    log_info "检查必需的系统工具..."
    local required_tools=("bash" "curl" "grep" "awk" "sed")
    for tool in "${required_tools[@]}"; do
        if command -v "$tool" >/dev/null 2>&1; then
            log_success "$tool: $(command -v $tool)"
        else
            log_error "$tool: 未找到"
            all_good=false
        fi
    done

    if [[ "$all_good" == "false" ]]; then
        log_error "系统环境检查失败！请安装缺失的工具后重试。"
        exit 1
    fi

    echo ""
    log_success "系统环境检查完成 ✓"
}

check_docker_environment() {
    log_section "2️⃣  Docker 环境检查"

    local has_issues=false

    # 1. Docker 可执行文件
    log_info "检查 Docker 安装..."
    if command -v docker >/dev/null 2>&1; then
        DOCKER_INFO[DOCKER_PATH]=$(command -v docker)
        DOCKER_INFO[DOCKER_VERSION]=$(docker --version | awk '{print $3}' | tr -d ',')
        log_success "Docker 已安装: ${DOCKER_INFO[DOCKER_VERSION]}"
    else
        log_error "Docker 未安装！"
        log_error "请访问 https://docs.docker.com/engine/install/ 安装 Docker Engine"
        exit 1
    fi

    # 2. Docker daemon 运行状态
    log_info "检查 Docker daemon..."
    if docker info >/dev/null 2>&1; then
        log_success "Docker daemon 正在运行"
    else
        log_error "Docker daemon 未运行！"
        log_error "请执行以下命令启动 Docker:"
        case "${SYSTEM_INFO[OS]}" in
            *Ubuntu*|*Debian*)
                echo "  sudo systemctl start docker"
                echo "  sudo systemctl enable docker"
                ;;
            *Fedora*|*CentOS*|*RHEL*)
                echo "  sudo systemctl start docker"
                echo "  sudo systemctl enable docker"
                ;;
            *)
                echo "  sudo service docker start"
                ;;
        esac
        exit 1
    fi

    # 3. Docker 权限检查
    log_info "检查 Docker 用户权限..."
    if docker ps >/dev/null 2>&1; then
        log_success "当前用户可以执行 Docker 命令"
        DOCKER_INFO[HAS_PERMISSION]="true"
    else
        log_warn "当前用户没有 Docker 权限"
        DOCKER_INFO[HAS_PERMISSION]="false"
        log_warn "每次执行 docker 命令需要 sudo"
        log_warn "建议将当前用户添加到 docker 组:"
        echo "  sudo usermod -aG docker \$USER"
        echo "  newgrp docker"
        echo ""
    fi

    # 4. Docker Compose 检查
    log_info "检查 Docker Compose..."
    if docker compose version >/dev/null 2>&1; then
        DOCKER_INFO[COMPOSE_VERSION]=$(docker compose version --short)
        log_success "Docker Compose: ${DOCKER_INFO[COMPOSE_VERSION]}"
    else
        log_warn "Docker Compose 未找到（本脚本不需要，但推荐安装）"
    fi

    # 5. Docker 存储驱动
    log_info "检查 Docker 存储配置..."
    DOCKER_INFO[STORAGE_DRIVER]=$(docker info 2>/dev/null | grep "Storage Driver" | awk '{print $3}')
    log_success "存储驱动: ${DOCKER_INFO[STORAGE_DRIVER]}"

    # 6. Docker 系统信息
    DOCKER_INFO[SERVER_VERSION]=$(docker version --format '{{.Server.Version}}' 2>/dev/null || echo "unknown")
    DOCKER_INFO[TOTAL_CONTAINERS]=$(docker ps -aq 2>/dev/null | wc -l)
    DOCKER_INFO[RUNNING_CONTAINERS]=$(docker ps -q 2>/dev/null | wc -l)
    DOCKER_INFO[TOTAL_IMAGES]=$(docker images -q 2>/dev/null | wc -l)

    echo ""
    log_info "Docker 环境统计:"
    echo "  服务器版本:    ${DOCKER_INFO[SERVER_VERSION]}"
    echo "  总容器数:      ${DOCKER_INFO[TOTAL_CONTAINERS]}"
    echo "  运行中容器:    ${DOCKER_INFO[RUNNING_CONTAINERS]}"
    echo "  镜像总数:      ${DOCKER_INFO[TOTAL_IMAGES]}"

    echo ""
    log_success "Docker 环境检查完成 ✓"
}

# =============================================================================
# 硬件资源评估
# =============================================================================

check_hardware_resources() {
    log_section "3️⃣  硬件资源评估"

    # 1. CPU 信息
    log_info "评估 CPU 资源..."
    if [[ -f /proc/cpuinfo ]]; then
        SYSTEM_INFO[CPU_CORES]=$(nproc)
        SYSTEM_INFO[CPU_THREADS]=$(grep -c ^processor /proc/cpuinfo)
        SYSTEM_INFO[CPU_MODEL]=$(grep "model name" /proc/cpuinfo | head -1 | cut -d: -f2 | xargs)

        log_success "CPU 型号: ${SYSTEM_INFO[CPU_MODEL]}"
        log_success "CPU 核心: ${SYSTEM_INFO[CPU_CORES]} 物理核心 / ${SYSTEM_INFO[CPU_THREADS]} 线程"

        # CPU 推荐
        if [[ ${SYSTEM_INFO[CPU_CORES]} -ge 8 ]]; then
            RECOMMENDATION[CPU]="优秀 (≥8 核)"
            RECOMMENDATION[CPU_LIMITS]='cpus: "4"'
        elif [[ ${SYSTEM_INFO[CPU_CORES]} -ge 4 ]]; then
            RECOMMENDATION[CPU]="良好 (4-7 核)"
            RECOMMENDATION[CPU_LIMITS]='cpus: "2"'
        elif [[ ${SYSTEM_INFO[CPU_CORES]} -ge 2 ]]; then
            RECOMMENDATION[CPU]="一般 (2-3 核)"
            RECOMMENDATION[CPU_LIMITS]='cpus: "1"'
            log_warn "CPU 核心较少，建议关闭其他应用"
        else
            RECOMMENDATION[CPU]="不足 (<2 核)"
            RECOMMENDATION[CPU_LIMITS]='cpus: "0.5"'
            log_warn "CPU 核心不足，可能影响性能"
        fi
    fi

    # 2. 内存信息
    log_info "评估内存资源..."
    if [[ -f /proc/meminfo ]]; then
        local mem_total_mem_kb
        mem_total_mem_kb=$(grep MemTotal /proc/meminfo | awk '{print $2}')
        SYSTEM_INFO[RAM_GB]=$(awk "BEGIN {printf \"%.2f\", ${mem_total_mem_kb}/1024/1024}")

        local mem_available_kb
        mem_available_kb=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
        SYSTEM_INFO[RAM_AVAILABLE_GB]=$(awk "BEGIN {printf \"%.2f\", ${mem_available_kb}/1024/1024}")

        local mem_used_percent
        mem_used_percent=$(awk "BEGIN {printf \"%.1f\", 100*(1-${mem_available_kb}/${mem_total_mem_kb})}")

        log_success "总内存: ${SYSTEM_INFO[RAM_GB]} GB"
        log_success "可用内存: ${SYSTEM_INFO[RAM_AVAILABLE_GB]} GB (使用率: ${mem_used_percent}%)"

        # 内存推荐
        local ram_gb_int=${SYSTEM_INFO[RAM_GB]%.*}
        if [[ $ram_gb_int -ge 16 ]]; then
            RECOMMENDATION[RAM]="优秀 (≥16GB)"
            RECOMMENDATION[RAM_LIMITS]='memory: "4g", memorySwap: "8g"'
        elif [[ $ram_gb_int -ge 8 ]]; then
            RECOMMENDATION[RAM]="良好 (8-15GB)"
            RECOMMENDATION[RAM_LIMITS]='memory: "2g", memorySwap: "4g"'
        elif [[ $ram_gb_int -ge 4 ]]; then
            RECOMMENDATION[RAM]="一般 (4-7GB)"
            RECOMMENDATION[RAM_LIMITS]='memory: "1g", memorySwap: "2g"'
            log_warn "内存较少，建议关闭其他应用"
        else
            RECOMMENDATION[RAM]="不足 (<4GB)"
            RECOMMENDATION[RAM_LIMITS]='memory: "512m", memorySwap: "1g"'
            log_warn "内存严重不足，可能无法运行"
        fi
    fi

    # 3. 磁盘空间
    log_info "评估磁盘空间..."
    local disk_info
    disk_info=$(df -h "${ROOT_DIR}" | tail -1)
    SYSTEM_INFO[DISK_TOTAL]=$(echo "$disk_info" | awk '{print $2}')
    SYSTEM_INFO[DISK_USED]=$(echo "$disk_info" | awk '{print $3}')
    SYSTEM_INFO[DISK_AVAILABLE]=$(echo "$disk_info" | awk '{print $4}')
    SYSTEM_INFO[DISK_USE_PERCENT]=$(echo "$disk_info" | awk '{print $5}')

    log_success "项目所在分区: ${ROOT_DIR}"
    log_success "总容量: ${SYSTEM_INFO[DISK_TOTAL]}"
    log_success "已用: ${SYSTEM_INFO[DISK_USED]} (${SYSTEM_INFO[DISK_USE_PERCENT]})"
    log_success "可用: ${SYSTEM_INFO[DISK_AVAILABLE]}"

    # 磁盘推荐
    local available_gb
    available_gb=$(echo "${SYSTEM_INFO[DISK_AVAILABLE]}" | numfmt --from=iec --to=si --suffix=G 2>/dev/null || echo "0")
    if [[ ${SYSTEM_INFO[DISK_AVAILABLE]} =~ ([0-9.]+)([A-Z]) ]]; then
        local avail_num=${BASH_REMATCH[1]}
        local avail_unit=${BASH_REMATCH[2]}

        case $avail_unit in
            G|T)
                if (( $(awk "BEGIN {print ($avail_num >= 20)}") )); then
                    RECOMMENDATION[DISK]="充足 (≥20GB)"
                elif (( $(awk "BEGIN {print ($avail_num >= 10)}") )); then
                    RECOMMENDATION[DISK]="足够 (10-19GB)"
                elif (( $(awk "BEGIN {print ($avail_num >= 5)}") )); then
                    RECOMMENDATION[DISK]="紧张 (5-9GB)"
                    log_warn "磁盘空间较少，建议清理空间"
                else
                    RECOMMENDATION[DISK]="不足 (<5GB)"
                    log_error "磁盘空间严重不足，无法构建镜像"
                    exit 1
                fi
                ;;
            M)
                RECOMMENDATION[DISK]="严重不足 (<1GB)"
                log_error "磁盘空间不足，无法构建镜像"
                exit 1
                ;;
        esac
    fi

    # 4. Docker 目录空间（重要）
    log_info "评估 Docker 存储空间..."
    local docker_dir
    docker_dir=$(docker info 2>/dev/null | grep "Docker Root Dir" | awk '{print $4}')
    if [[ -n "$docker_dir" ]]; then
        local docker_disk
        docker_disk=$(df -h "$docker_dir" | tail -1)
        SYSTEM_INFO[DOCKER_DISK_AVAILABLE]=$(echo "$docker_disk" | awk '{print $4}')
        log_success "Docker 数据目录: $docker_dir"
        log_success "Docker 可用空间: ${SYSTEM_INFO[DOCKER_DISK_AVAILABLE]}"
    fi

    echo ""
    log_success "硬件资源评估完成 ✓"
}

# =============================================================================
# 部署信息估算
# =============================================================================

estimate_deployment_resources() {
    log_section "4️⃣  部署资源估算"

    # 估算镜像大小
    local base_size=800  # Debian base ~80MB but we'll add padding
    local browser_size=0
    local tools_size=0

    if [[ "${INSTALL_BROWSER}" = "1" ]]; then
        browser_size=400  # Chromium + fonts + Xvfb + noVNC
    fi

    if [[ "${INSTALL_NODE_VERSION}" = "1" ]]; then
        tools_size=$((tools_size + 100))  # Node.js + npm
    fi

    if [[ "${INSTALL_PNPM}" = "1" ]]; then
        tools_size=$((tools_size + 10))  # pnpm
    fi

    if [[ "${INSTALL_BUN}" = "1" ]]; then
        tools_size=$((tools_size + 20))  # Bun
    fi

    if [[ "${INSTALL_GOLANG}" = "1" ]]; then
        tools_size=$((tools_size + 200))  # Go
    fi

    if [[ "${INSTALL_RUST}" = "1" ]]; then
        tools_size=$((tools_size + 100))  # Rust + Cargo
    fi

    if [[ "${INSTALL_PYTHON_TOOLS}" = "1" ]]; then
        tools_size=$((tools_size + 50))  # Python tools
    fi

    if [[ "${INSTALL_FFmpeg}" = "1" ]]; then
        tools_size=$((tools_size + 80))  # FFmpeg
    fi

    if [[ "${INSTALL_BREW}" = "1" ]]; then
        tools_size=$((tools_size + 500))  # Homebrew
    fi

    local estimated_size=$((base_size + browser_size + tools_size))
    SYSTEM_INFO[ESTIMATED_IMAGE_SIZE]="${estimated_size}MB"

    echo ""
    echo -e "${BOLD}📊 镜像大小估算:${NC}"
    echo "  基础镜像 (Debian):       ~${base_size} MB"
    [[ "${INSTALL_BROWSER}" = "1" ]] && echo "  浏览器组件:            ~${browser_size} MB"
    [[ "${INSTALL_NODE_VERSION}" = "1" ]] && echo "  Node.js + npm:          ~100 MB"
    [[ "${INSTALL_PNPM}" = "1" ]] && echo "  pnpm:                  ~10 MB"
    [[ "${INSTALL_BUN}" = "1" ]] && echo "  Bun:                   ~20 MB"
    [[ "${INSTALL_GOLANG}" = "1" ]] && echo "  Go (Golang):           ~200 MB"
    [[ "${INSTALL_RUST}" = "1" ]] && echo "  Rust + Cargo:          ~100 MB"
    [[ "${INSTALL_PYTHON_TOOLS}" = "1" ]] && echo "  Python 工具:           ~50 MB"
    [[ "${INSTALL_FFmpeg}" = "1" ]] && echo "  FFmpeg:                ~80 MB"
    [[ "${INSTALL_BREW}" = "1" ]] && echo "  Homebrew:              ~${tools_size} MB"
    echo "  ${BOLD}────────────────────────────────────${NC}"
    echo "  ${BOLD}预计镜像大小:          ~${estimated_size} MB${NC}"

    # 计算构建过程中的临时空间需求（通常是镜像大小的2-3倍）
    local build_space=$((estimated_size * 3))
    SYSTEM_INFO[REQUIRED_BUILD_SPACE]="${build_space}MB"

    echo ""
    echo -e "${BOLD}💾 磁盘空间需求:${NC}"
    echo "  构建时临时空间:        ~${build_space} MB"
    echo "  最终镜像占用:          ~${estimated_size} MB"
    echo "  Docker 缓存:           ~500 MB (可清理)"

    # Docker 镜像存储位置
    local docker_root
    docker_root=$(docker info 2>/dev/null | grep "Docker Root Dir" | awk '{print $4}')
    echo -e "  ${CYAN}Docker 镜像存储位置:${NC} ${docker_root}"

    echo ""
    log_success "资源估算完成 ✓"
}

# =============================================================================
# 配置显示和确认
# =============================================================================

show_config() {
    echo -e "${CYAN}${BOLD}"
    cat <<'CONFIG'

═════════════════════════════════════════════════════════════
                     构建配置选项
═════════════════════════════════════════════════════════════
CONFIG
    echo -e "${NC}"

    # 添加说明
    echo -e "${CYAN}💡 说明: 以下工具将安装到 Docker 容器内，与主机系统无关${NC}"
    echo -e "${BOLD}镜像名称:${NC}          ${GREEN}${IMAGE_NAME}${NC}"
    echo ""

    echo -e "${BOLD}浏览器组件:${NC}"

    if [[ "${INSTALL_BROWSER}" = "1" ]]; then
        echo -e "  Chromium + CDP        ${GREEN}✓ 包含${NC}        ${CYAN}(浏览器自动化支持, +400MB)${NC}"
        echo -e "  Xvfb (显示服务器)     ${GREEN}✓ 包含${NC}        ${CYAN}(无头显示环境)${NC}"
        echo -e "  noVNC (远程桌面)      ${GREEN}✓ 包含${NC}        ${CYAN}(Web 远程访问)${NC}"
    else
        echo -e "  Chromium + CDP        ${RED}✗ 不包含${NC}      ${YELLOW}(Agent 将无法使用浏览器工具)${NC}"
        echo -e "  Xvfb (显示服务器)     ${RED}✗ 不包含${NC}      ${YELLOW}(无显示环境支持)${NC}"
        echo -e "  noVNC (远程桌面)      ${RED}✗ 不包含${NC}      ${YELLOW}(无远程桌面访问)${NC}"
    fi

    echo ""
    echo -e "${BOLD}编程工具:${NC}"

    if [[ "${INSTALL_NODE_VERSION}" = "1" ]]; then
        echo -e "  Node.js + npm         ${GREEN}✓ 包含${NC}        ${CYAN}(JavaScript 运行时, +100MB)${NC}"
    else
        echo -e "  Node.js + npm         ${RED}✗ 不包含${NC}      ${YELLOW}(容器内无法运行 Node.js 项目)${NC}"
    fi

    if [[ "${INSTALL_PNPM}" = "1" ]]; then
        echo -e "  pnpm                  ${GREEN}✓ 包含${NC}        ${CYAN}(快速包管理器, +10MB)${NC}"
    else
        echo -e "  pnpm                  ${RED}✗ 不包含${NC}      ${YELLOW}(只能使用 npm)${NC}"
    fi

    if [[ "${INSTALL_BUN}" = "1" ]]; then
        echo -e "  Bun                   ${GREEN}✓ 包含${NC}        ${CYAN}(高性能 JS 运行时, +20MB)${NC}"
    else
        echo -e "  Bun                   ${RED}✗ 不包含${NC}      ${YELLOW}(无 Bun 运行时支持)${NC}"
    fi

    if [[ "${INSTALL_GOLANG}" = "1" ]]; then
        echo -e "  Go (Golang)           ${GREEN}✓ 包含${NC}        ${CYAN}(Go 编程语言, +200MB)${NC}"
    else
        echo -e "  Go (Golang)           ${RED}✗ 不包含${NC}      ${YELLOW}(容器内无法编译 Go 代码)${NC}"
    fi

    if [[ "${INSTALL_RUST}" = "1" ]]; then
        echo -e "  Rust + Cargo          ${GREEN}✓ 包含${NC}        ${CYAN}(Rust 编程语言, +100MB)${NC}"
    else
        echo -e "  Rust + Cargo          ${RED}✗ 不包含${NC}      ${YELLOW}(容器内无法编译 Rust 代码)${NC}"
    fi

    if [[ "${INSTALL_PYTHON_TOOLS}" = "1" ]]; then
        echo -e "  Python 工具           ${GREEN}✓ 包含${NC}        ${CYAN}(pip + venv, +50MB)${NC}"
    else
        echo -e "  Python 工具           ${RED}✗ 不包含${NC}      ${YELLOW}(无 Python 包管理工具)${NC}"
    fi

    if [[ "${INSTALL_BREW}" = "1" ]]; then
        echo -e "  Homebrew (Linux)      ${GREEN}✓ 包含${NC}        ${CYAN}(包管理器, +500MB)${NC}"
    else
        echo -e "  Homebrew (Linux)      ${YELLOW}○ 不包含${NC}      ${CYAN}(可选, 通常不需要, 节省 +500MB)${NC}"
    fi

    if [[ "${INSTALL_FFmpeg}" = "1" ]]; then
        echo -e "  FFmpeg                ${GREEN}✓ 包含${NC}        ${CYAN}(音视频处理, +80MB)${NC}"
    else
        echo -e "  FFmpeg                ${RED}✗ 不包含${NC}      ${YELLOW}(容器内无法处理音视频)${NC}"
    fi

    echo ""
}

show_recommendations() {
    echo -e "${CYAN}${BOLD}"
    cat <<'REC'

═════════════════════════════════════════════════════════════
                     资源配置建议
═════════════════════════════════════════════════════════════
REC
    echo -e "${NC}"

    echo -e "${BOLD}硬件评估结果:${NC}"
    echo -e "  CPU:          ${RECOMMENDATION[CPU]}"
    echo -e "  内存:         ${RECOMMENDATION[RAM]}"
    echo -e "  磁盘空间:     ${RECOMMENDATION[DISK]}"
    echo ""
    echo -e "${BOLD}推荐的 Docker 资源限制:${NC}"
    echo -e "  ${GREEN}${RECOMMENDATION[CPU_LIMITS]}${NC}"
    echo -e "  ${GREEN}${RECOMMENDATION[RAM_LIMITS]}${NC}"
    echo ""
    echo -e "${BOLD}建议配置 (~/.openclaw/config):${NC}"
    echo -e "  ${CYAN}agents.defaults.sandbox.docker:${NC}"
    echo -e "    ${CYAN}cpus:${NC} ${RECOMMENDATION[CPU_LIMITS]}"
    echo -e "    ${CYAN}memory:${NC} ${RECOMMENDATION[RAM_LIMITS]}"
    echo ""
}

show_deployment_summary() {
    echo -e "${YELLOW}${BOLD}"
    cat <<'SUMMARY'

═════════════════════════════════════════════════════════════
                     部署前确认
═════════════════════════════════════════════════════════════
SUMMARY
    echo -e "${NC}"

    echo -e "${BOLD}系统信息:${NC}"
    echo -e "  操作系统:       ${SYSTEM_INFO[OS]} ${SYSTEM_INFO[VERSION]}"
    echo -e "  CPU 架构:       ${SYSTEM_INFO[ARCH_FRIENDLY]}"
    echo -e "  Docker 版本:    ${DOCKER_INFO[DOCKER_VERSION]}"
    echo ""
    echo -e "${BOLD}当前系统状态:${NC}"
    echo -e "  CPU:            ${SYSTEM_INFO[CPU_CORES]} 核 / ${SYSTEM_INFO[RAM_GB]} GB RAM"
    echo -e "  磁盘可用:       ${SYSTEM_INFO[DISK_AVAILABLE]}"
    echo -e "  Docker 可用:    ${SYSTEM_INFO[DOCKER_DISK_AVAILABLE]}"
    echo ""
    echo -e "${BOLD}将要执行的操作:${NC}"
    echo -e "  • 下载 Debian 基础镜像"
    echo -e "  • 安装系统包和编程工具"
    echo -e "  • 构建 Docker 镜像 (${GREEN}${SYSTEM_INFO[ESTIMATED_IMAGE_SIZE]}${NC})"
    echo -e "  • 需要临时空间 ${YELLOW}${SYSTEM_INFO[REQUIRED_BUILD_SPACE]}${NC}"
    echo ""
    echo -e "${BOLD}预计时间:${NC} 5-15 分钟（取决于网络速度和硬件性能）"
    echo ""

    if [[ "${RECOMMENDATION[RAM]}" == *"不足"* ]] || [[ "${RECOMMENDATION[DISK]}" == *"不足"* ]]; then
        echo -e "${RED}${BOLD}⚠️  警告: 系统资源不足，可能无法完成构建！${NC}"
        echo ""
        read -rp "是否继续？建议先升级硬件配置。[y/N]: " confirm_risk
        if [[ ! "${confirm_risk}" =~ ^[Yy]$ ]]; then
            log_info "用户取消部署"
            exit 0
        fi
    fi

    echo -e "${BOLD}是否开始构建？${NC}"
    echo "  [Enter] 是，开始构建"
    echo "  [n]     否，取消部署"
    echo "  [c]     查看详细配置"
    echo ""
    read -rp "请选择: " confirm_start

    case "${confirm_start}" in
        n|N|no|NO|No)
            log_info "用户取消部署"
            exit 0
            ;;
        c|C)
            echo ""
            show_recommendations
            echo ""
            read -rp "按 Enter 键继续，或 Ctrl+C 退出..."
            ;;
        *)
            # 默认继续
            ;;
    esac
}

prompt_customization() {
    echo ""
    echo -e "${YELLOW}是否自定义配置？${NC}"
    echo "  [Enter] 使用默认配置（推荐）"
    echo "  [c]     自定义配置"
    echo ""
    read -rp "请选择: " choice

    if [[ "${choice}" =~ ^[Cc]$ ]]; then
        echo ""
        log_info "进入自定义配置模式..."

        read -rp "是否安装浏览器组件？ [Y/n]: " install_browser
        INSTALL_BROWSER="${install_browser:-Y}"
        [[ ! "${INSTALL_BROWSER}" =~ ^[Yy]$ ]] && INSTALL_BROWSER=0

        read -rp "是否安装 Node.js + npm？ [Y/n]: " install_node
        INSTALL_NODE_VERSION="${install_node:-Y}"
        [[ ! "${INSTALL_NODE_VERSION}" =~ ^[Yy]$ ]] && INSTALL_NODE_VERSION=0

        read -rp "是否安装 pnpm？ [Y/n]: " install_pnpm
        INSTALL_PNPM="${install_pnpm:-Y}"
        [[ ! "${INSTALL_PNPM}" =~ ^[Yy]$ ]] && INSTALL_PNPM=0

        read -rp "是否安装 Bun？ [Y/n]: " install_bun
        INSTALL_BUN="${install_bun:-Y}"
        [[ ! "${INSTALL_BUN}" =~ ^[Yy]$ ]] && INSTALL_BUN=0

        read -rp "是否安装 Go (Golang)？ [Y/n]: " install_golang
        INSTALL_GOLANG="${install_golang:-Y}"
        [[ ! "${INSTALL_GOLANG}" =~ ^[Yy]$ ]] && INSTALL_GOLANG=0

        read -rp "是否安装 Rust + Cargo？ [Y/n]: " install_rust
        INSTALL_RUST="${install_rust:-Y}"
        [[ ! "${INSTALL_RUST}" =~ ^[Yy]$ ]] && INSTALL_RUST=0

        read -rp "是否安装 Python 工具 (pip, venv)？ [Y/n]: " install_python
        INSTALL_PYTHON_TOOLS="${install_python:-Y}"
        [[ ! "${INSTALL_PYTHON_TOOLS}" =~ ^[Yy]$ ]] && INSTALL_PYTHON_TOOLS=0

        read -rp "是否安装 Homebrew (Linux)？ [y/N]: " install_brew
        INSTALL_BREW="${install_brew:-N}"
        [[ "${INSTALL_BREW}" =~ ^[Yy]$ ]] && INSTALL_BREW=1 || INSTALL_BREW=0

        read -rp "是否安装 FFmpeg？ [Y/n]: " install_ffmpeg
        INSTALL_FFmpeg="${install_ffmpeg:-Y}"
        [[ ! "${INSTALL_FFmpeg}" =~ ^[Yy]$ ]] && INSTALL_FFmpeg=0

        echo ""
        show_config
        echo ""
    fi
}

# =============================================================================
# Docker 构建函数
# =============================================================================

build_apt_packages_list() {
    local packages="bash ca-certificates curl git jq python3 ripgrep"

    # 浏览器相关
    if [[ "${INSTALL_BROWSER}" = "1" ]]; then
        packages+=" chromium fonts-liberation fonts-noto-color-emoji novnc socat websockify x11vnc xvfb"
    fi

    # 编程工具基础
    if [[ "${INSTALL_DEV_TOOLS}" = "1" ]]; then
        packages+=" coreutils grep unzip pkg-config libasound2-dev build-essential file wget"
    fi

    # Node.js
    if [[ "${INSTALL_NODE_VERSION}" = "1" ]]; then
        packages+=" nodejs npm"
    fi

    # Go
    if [[ "${INSTALL_GOLANG}" = "1" ]]; then
        packages+=" golang-go"
    fi

    # Rust
    if [[ "${INSTALL_RUST}" = "1" ]]; then
        packages+=" rustc cargo"
    fi

    # Python 工具
    if [[ "${INSTALL_PYTHON_TOOLS}" = "1" ]]; then
        packages+=" python3-pip python3-venv"
    fi

    # FFmpeg
    if [[ "${INSTALL_FFmpeg}" = "1" ]]; then
        packages+=" ffmpeg"
    fi

    echo "${packages}"
}

build_dockerfile() {
    local packages
    packages="$(build_apt_packages_list)"

    log_info "生成 Dockerfile..."

    cat > "${ROOT_DIR}/Dockerfile.sandbox-ultimate" <<EOF
FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

# 安装基础工具和编程环境
RUN apt-get update \\
  && apt-get install -y --no-install-recommends ${packages} \\
  && rm -rf /var/lib/apt/lists/*

EOF

    # Node.js / pnpm / Bun
    if [[ "${INSTALL_PNPM}" = "1" ]]; then
        cat >> "${ROOT_DIR}/Dockerfile.sandbox-ultimate" <<'EOF'
# 安装 pnpm
RUN npm install -g pnpm

EOF
    fi

    if [[ "${INSTALL_BUN}" = "1" ]]; then
        cat >> "${ROOT_DIR}/Dockerfile.sandbox-ultimate" <<'EOF'
# 安装 Bun
ENV BUN_INSTALL=/opt/bun
RUN curl -fsSL https://bun.sh/install | bash \\
  && ln -sf /opt/bun/bin/bun /usr/local/bin/bun
ENV PATH="/opt/bun/bin:${PATH}"

EOF
    fi

    # Homebrew
    if [[ "${INSTALL_BREW}" = "1" ]]; then
        cat >> "${ROOT_DIR}/Dockerfile.sandbox-ultimate" <<'EOF'
# 安装 Homebrew (Linux)
ENV HOMEBREW_PREFIX=/home/linuxbrew/.linuxbrew
ENV HOMEBREW_CELLAR=/home/linuxbrew/.linuxbrew/Cellar
ENV HOMEBREW_REPOSITORY=/home/linuxbrew/.linuxbrew/Homebrew
RUN if ! id -u linuxbrew >/dev/null 2>&1; then useradd -m -s /bin/bash linuxbrew; fi \\
  && mkdir -p /home/linuxbrew/.linuxbrew \\
  && chown -R linuxbrew:linuxbrew /home/linuxbrew \\
  && su - linuxbrew -c "NONINTERACTIVE=1 CI=1 /bin/bash -c '\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)'" \\
  && ln -sf /home/linuxbrew/.linuxbrew/bin/brew /usr/local/bin/brew
ENV PATH="/home/linuxbrew/.linuxbrew/bin:/home/linuxbrew/.linuxbrew/sbin:${PATH}"

EOF
    fi

    # 浏览器入口脚本
    if [[ "${INSTALL_BROWSER}" = "1" ]]; then
        cat >> "${ROOT_DIR}/Dockerfile.sandbox-ultimate" <<'EOF'
# 复制浏览器入口脚本
COPY scripts/sandbox-browser-entrypoint.sh /usr/local/bin/openclaw-sandbox-browser
RUN chmod +x /usr/local/bin/openclaw-sandbox-browser

# 暴露端口
EXPOSE 9222 5900 6080

EOF
    fi

    cat >> "${ROOT_DIR}/Dockerfile.sandbox-ultimate" <<EOF
# 工作目录
WORKDIR /workspace

# 默认命令
$([ "${INSTALL_BROWSER}" = "1" ] && echo 'CMD ["openclaw-sandbox-browser"]' || echo 'CMD ["sleep", "infinity"]')
EOF

    log_success "Dockerfile 生成完成"
}

build_image() {
    log_section "5️⃣  开始构建 Docker 镜像"

    log_info "这可能需要几分钟时间，请耐心等待..."
    log_info "构建过程中会显示详细输出，如果失败请检查错误信息"

    echo ""
    local start_time=$(date +%s)

    if docker build \
        -t "${IMAGE_NAME}" \
        -f "${ROOT_DIR}/Dockerfile.sandbox-ultimate" \
        "${ROOT_DIR}"; then

        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        local minutes=$((duration / 60))
        local seconds=$((duration % 60))

        echo ""
        log_success "镜像构建成功！耗时: ${minutes}分${seconds}秒"
    else
        echo ""
        log_error "镜像构建失败！"
        log_error "请检查上方的错误信息，常见问题："
        echo "  • 网络连接问题（无法下载包）"
        echo "  • 磁盘空间不足"
        echo "  • Docker 权限问题"
        exit 1
    fi
}

# =============================================================================
# 构建后信息
# =============================================================================

show_post_build_info() {
    log_section "✅ 构建成功！"

    echo ""
    echo -e "${GREEN}${BOLD}╔═════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}${BOLD}║                  镜像构建成功！                             ║${NC}"
    echo -e "${GREEN}${BOLD}╚═════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    local final_size=$(docker images "${IMAGE_NAME}" --format "{{.Size}}")

    echo -e "${BOLD}📦 镜像信息:${NC}"
    echo "  名称:              ${IMAGE_NAME}"
    echo "  最终大小:          ${final_size}"
    echo ""

    echo -e "${BOLD}📍 Docker 存储位置:${NC}"
    local docker_root
    docker_root=$(docker info 2>/dev/null | grep "Docker Root Dir" | awk '{print $4}')
    echo "  ${docker_root}/"
    echo ""

    echo -e "${BOLD}🚀 下一步操作:${NC}"
    echo ""
    echo -e "${CYAN}1. 配置 OpenClaw 使用此沙盒:${NC}"
    echo "   编辑 ~/.openclaw/config，添加:"
    echo ""
    echo -e "   ${GREEN}agents:${NC}"
    echo -e "   ${GREEN}  defaults:${NC}"
    echo -e "   ${GREEN}    sandbox:${NC}"
    echo -e "   ${GREEN}      docker:${NC}"
    echo -e "   ${GREEN}        image: \"${IMAGE_NAME}\"${NC}"
    echo -e "   ${GREEN}        ${RECOMMENDATION[CPU_LIMITS]}${NC}"
    echo -e "   ${GREEN}        ${RECOMMENDATION[RAM_LIMITS]}${NC}"
    echo ""
    if [[ "${INSTALL_BROWSER}" = "1" ]]; then
    echo -e "   ${GREEN}      browser:${NC}"
    echo -e "   ${GREEN}        enabled: true${NC}"
    echo ""
    fi

    echo -e "${CYAN}2. 重启 OpenClaw Gateway:${NC}"
    echo "   # 如果是 systemd 服务"
    echo "   sudo systemctl restart openclaw-gateway"
    echo ""
    echo "   # 如果是手动运行"
    echo "   pkill -f openclaw-gateway"
    echo "   nohup openclaw gateway run > /tmp/openclaw-gateway.log 2>&1 &"
    echo ""

    echo -e "${CYAN}3. 清理旧的沙盒容器（如需完全重建）:${NC}"
    echo "   docker rm -f \$(docker ps -aq --filter label=openclaw.sandbox=1)"
    echo ""

    if [[ "${INSTALL_BROWSER}" = "1" ]]; then
    echo -e "${BOLD}🌐 浏览器端口:${NC}"
    echo "  CDP (Chrome DevTools Protocol): 9222"
    echo "  VNC:                            5900"
    echo "  noVNC (Web):                    6080"
    echo ""
    fi

    echo -e "${BOLD}📚 详细文档:${NC}"
    echo "  https://docs.openclaw.ai/install/sandbox-ultimate"
    echo ""
}

# =============================================================================
# 主流程
# =============================================================================

main() {
    show_banner

    # 阶段 1: 系统环境检查
    check_system_requirements

    # 阶段 2: Docker 环境检查
    check_docker_environment

    # 阶段 3: 硬件资源评估
    check_hardware_resources

    # 阶段 4: 显示配置并自定义
    show_config
    prompt_customization

    # 阶段 5: 估算部署资源
    estimate_deployment_resources

    # 阶段 6: 显示建议
    show_recommendations

    # 阶段 7: 部署前确认
    show_deployment_summary

    # 阶段 8: 构建
    build_dockerfile
    build_image

    # 阶段 9: 显示后续步骤
    show_post_build_info

    echo ""
    log_success "🎉 全部完成！ฅ'ω'ฅ"
}

# 执行主流程
main "$@"
