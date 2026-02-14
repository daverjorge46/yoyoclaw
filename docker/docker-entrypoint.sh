#!/usr/bin/env bash
set -euo pipefail

# 統一 Docker entrypoint
#
# 模式：
#   --setup-only  只做前置（tailscale/credentials），不 exec；供 justfile 等先跑 build-app 再 exec
#   (預設)        前置 + sidecar daemons + exec（gateway 正式啟動路徑）
#
# 以 exec 結束讓 node 成為 PID 1，正確接收 Docker SIGTERM。

SETUP_ONLY=0
if [[ "${1:-}" == "--setup-only" ]]; then
  SETUP_ONLY=1
  shift
fi

# ── 前置：tailscale / credentials / brew ────────────────────────────────────

# 讓 gateway 的 tailscale CLI 一律用此 socket（與下方 tailscaled 相同路徑）
export TAILSCALE_SOCKET="${TAILSCALE_SOCKET:-/home/node/.openclaw/tailscale/tailscaled.sock}"
# 確保 entrypoint 與子行程能找到 tailscale/tailscaled（Debian: tailscaled 在 /usr/sbin）
export PATH="/usr/sbin:/usr/bin:/bin:${PATH:-}"

# 確保 credentials 目錄存在且權限 700，消除 security audit 的「Credentials dir is readable by others」警告
mkdir -p /home/node/.openclaw/credentials
chmod 700 /home/node/.openclaw/credentials

# 若掛載了 brew volume 且為空，從映像內 tarball 還原，讓 brew install 可持久化
if [[ ! -x /home/linuxbrew/.linuxbrew/bin/brew ]] && [[ -f /tmp/brew-initial.tar ]]; then
  tar xf /tmp/brew-initial.tar -C /home/linuxbrew --no-same-owner 2>/dev/null || true
fi

# ── Tailscale ────────────────────────────────────────────────────────────────

# 是否為「gateway + --tailscale serve/funnel」：需要 tailscaled daemon 在跑
need_tailscale_daemon() {
  local has_gateway=0 has_serve_or_funnel=0
  while [[ $# -gt 0 ]]; do
    [[ "$1" == "gateway" ]] && has_gateway=1
    if [[ "$1" == "--tailscale" ]] && [[ -n "${2:-}" ]]; then
      [[ "$2" == "serve" ]] || [[ "$2" == "funnel" ]] && has_serve_or_funnel=1
    fi
    shift
  done
  [[ $has_gateway -eq 1 && $has_serve_or_funnel -eq 1 ]]
}

# 使用絕對路徑：tailscaled 在 Debian 裝於 /usr/sbin，tailscale CLI 在 /usr/bin
TS_BIN_TAILSCALED="/usr/sbin/tailscaled"
TS_BIN_TAILSCALE="/usr/bin/tailscale"
[[ ! -x "${TS_BIN_TAILSCALED}" ]] && TS_BIN_TAILSCALED="/usr/bin/tailscaled" || true
[[ ! -x "${TS_BIN_TAILSCALED}" ]] && TS_BIN_TAILSCALED="" || true
[[ ! -x "${TS_BIN_TAILSCALE}" ]] && TS_BIN_TAILSCALE="" || true
if [[ -z "${TS_BIN_TAILSCALED}" ]] || [[ -z "${TS_BIN_TAILSCALE}" ]]; then
  TS_BIN_TAILSCALED="$(command -v tailscaled 2>/dev/null)" || TS_BIN_TAILSCALED=""
  TS_BIN_TAILSCALE="$(command -v tailscale 2>/dev/null)" || TS_BIN_TAILSCALE=""
fi

# 僅啟動 tailscaled daemon 並等待 socket；不執行 tailscale up（留給 start_tailscale_if_enabled 在 autologin 時做）
start_tailscaled_daemon() {
  local ts_state_dir="${TAILSCALE_STATE_DIR:-/home/node/.openclaw/tailscale}"
  local ts_socket="${TAILSCALE_SOCKET:-${ts_state_dir}/tailscaled.sock}"
  local ts_tun_mode="${TAILSCALE_TUN_MODE:-userspace-networking}"
  local ts_state_file="${ts_state_dir}/tailscaled.state"
  mkdir -p "${ts_state_dir}"
  export TAILSCALE_SOCKET="${ts_socket}"
  if ! pgrep -x tailscaled >/dev/null 2>&1; then
    [[ -S "${ts_socket}" ]] && rm -f "${ts_socket}"
    nohup "${TS_BIN_TAILSCALED}" --state="${ts_state_file}" --socket="${ts_socket}" --tun="${ts_tun_mode}" </dev/null >>/tmp/tailscaled.log 2>&1 &
    disown -a 2>/dev/null || true
  fi
}

ensure_tailscaled_daemon() {
  if [[ -z "${TS_BIN_TAILSCALED}" ]] || [[ -z "${TS_BIN_TAILSCALE}" ]]; then
    echo "openclaw entrypoint: tailscale not installed; gateway will run without Tailscale serve" >&2
    return 1
  fi
  local ts_state_dir="${TAILSCALE_STATE_DIR:-/home/node/.openclaw/tailscale}"
  local ts_socket="${TAILSCALE_SOCKET:-${ts_state_dir}/tailscaled.sock}"
  start_tailscaled_daemon
  for _ in $(seq 1 45); do
    if [[ -S "${ts_socket}" ]]; then
      sleep 2
      return 0
    fi
    sleep 1
  done
  echo "openclaw entrypoint: tailscaled socket did not appear" >&2
  if [[ -r /tmp/tailscaled.log ]]; then
    tail -n 40 /tmp/tailscaled.log >&2
  fi
  return 1
}

start_tailscale_if_enabled() {
  if [[ "${OPENCLAW_TAILSCALE_AUTOLOGIN:-0}" != "1" ]]; then
    return
  fi

  if [[ -z "${TS_BIN_TAILSCALED}" ]] || [[ -z "${TS_BIN_TAILSCALE}" ]]; then
    echo "openclaw entrypoint: tailscale binary not installed; skipping autologin" >&2
    return
  fi

  if [[ -z "${TAILSCALE_AUTHKEY:-}" ]]; then
    echo "openclaw entrypoint: TAILSCALE_AUTHKEY is empty; skipping autologin" >&2
    return
  fi

  local ts_state_dir="${TAILSCALE_STATE_DIR:-/home/node/.openclaw/tailscale}"
  local ts_socket="${TAILSCALE_SOCKET:-${ts_state_dir}/tailscaled.sock}"
  mkdir -p "${ts_state_dir}"
  export TAILSCALE_SOCKET="${ts_socket}"

  # 若尚未啟動 daemon，則在此啟動並等待 socket
  if ! [[ -S "${ts_socket}" ]]; then
    if ! ensure_tailscaled_daemon; then
      return
    fi
  fi

  # Give daemon time to listen, then retry "tailscale up" until it connects
  sleep 10
  local -a up_args=(--authkey="${TAILSCALE_AUTHKEY}")
  if [[ -n "${TAILSCALE_HOSTNAME:-}" ]]; then
    up_args+=(--hostname="${TAILSCALE_HOSTNAME}")
  fi
  if [[ "${TAILSCALE_ACCEPT_ROUTES:-0}" == "1" ]]; then
    up_args+=(--accept-routes)
  fi
  local i
  for i in $(seq 1 30); do
    if "${TS_BIN_TAILSCALE}" --socket="${ts_socket}" up "${up_args[@]}" 2>/tmp/tailscale-up.log; then
      return 0
    fi
    local err
    err=$(cat /tmp/tailscale-up.log 2>/dev/null || true)
    if ! echo "${err}" | grep -q "doesn't appear to be running\|connection refused\|no such file"; then
      echo "openclaw entrypoint: tailscale up failed (non-recoverable): ${err}" >&2
      break
    fi
    if ! pgrep -x tailscaled >/dev/null 2>&1; then
      echo "openclaw entrypoint: tailscaled process not running (may have exited)" >&2
      break
    fi
    sleep 3
  done
  echo "openclaw entrypoint: tailscale up failed after retries" >&2
  if [[ -s /tmp/tailscale-up.log ]]; then
    echo "openclaw entrypoint: /tmp/tailscale-up.log:" >&2
    cat /tmp/tailscale-up.log >&2
  fi
  if [[ -r /tmp/tailscaled.log ]]; then
    echo "openclaw entrypoint: last 40 lines of /tmp/tailscaled.log:" >&2
    tail -n 40 /tmp/tailscaled.log >&2
  fi
  # Do not exit: continue to exec gateway so it runs without Tailscale
  return 0
}

# 使用 --tailscale serve/funnel 時必須先有 tailscaled；失敗則 exit 以利存取（不可 skipped）
# PM2 模式下 command 不含 gateway args，透過 OPENCLAW_GATEWAY_FORCE_TAILSCALED=1 強制啟動 daemon。
if need_tailscale_daemon "$@" || [[ "${OPENCLAW_GATEWAY_FORCE_TAILSCALED:-0}" == "1" ]]; then
  if [[ "${OPENCLAW_GATEWAY_TAILSCALED_BLOCK_STARTUP:-0}" == "1" ]]; then
    if ! ensure_tailscaled_daemon; then
      if [[ "${OPENCLAW_GATEWAY_REQUIRE_TAILSCALED:-0}" == "1" ]]; then
        exit 1
      fi
      echo "openclaw entrypoint: tailscaled unavailable; continuing without blocking startup" >&2
    fi
  else
    if [[ -z "${TS_BIN_TAILSCALED}" ]]; then
      echo "openclaw entrypoint: tailscaled binary missing; skip daemon prestart" >&2
    else
      start_tailscaled_daemon || true
    fi
  fi
fi
start_tailscale_if_enabled

# ── --setup-only 到此結束 ───────────────────────────────────────────────────

if [[ "${SETUP_ONLY}" == "1" ]]; then
  exit 0
fi

# ── 以下僅在正式啟動（非 --setup-only）時執行 ─────────────────────────────────

# 清理 anti-timeout queue 的殘留 lock（容器重啟後可自動恢復）
rm -rf /home/node/.openclaw/workspace/queues/anti-timeout-orchestrator/lock || true

# Source profile for runtime commands (including tests run via docker compose run).
if [[ -f /home/node/.profile ]]; then
  # shellcheck disable=SC1091
  source /home/node/.profile
fi

# Control UI assets auto-build（約 1-2 秒）
if [[ ! -f /app/dist/control-ui/index.html ]]; then
  echo "openclaw entrypoint: Control UI assets missing, building…" >&2
  if [[ -f /app/scripts/ui.js ]] && command -v pnpm >/dev/null 2>&1; then
    (cd /app && node scripts/ui.js build 2>&1 | tail -3) || echo "openclaw entrypoint: ui:build failed (non-fatal)" >&2
  fi
fi

# session-tg-sync daemon（背景監控 session 更新 → Telegram forum topics）
# 設 OPENCLAW_SESSION_TG_SYNC=0 可關閉
if [[ "${OPENCLAW_SESSION_TG_SYNC:-1}" == "1" ]] && [[ -f /app/scripts/session-tg-sync.py ]] && command -v python3 >/dev/null 2>&1; then
  _tg_sync_dir="/home/node/.openclaw/agents/main/sessions"
  if [[ -d "${_tg_sync_dir}" ]]; then
    echo "openclaw entrypoint: starting session-tg-sync daemon" >&2
    nohup python3 -u /app/scripts/session-tg-sync.py \
      --dir "${_tg_sync_dir}" \
      --interval 3 \
      --filter important \
      </dev/null >>/tmp/session-tg-sync.log 2>&1 &
    disown -a 2>/dev/null || true
  fi
fi

# exec 取代本腳本，node 成為 PID 1
if [[ "${1:-}" == "node" ]] && [[ -n "${2:-}" ]]; then
  exec "$@"
else
  exec node /app/openclaw.mjs "$@"
fi
