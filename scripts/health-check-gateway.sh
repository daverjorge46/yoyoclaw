#!/bin/bash
# Moltbot Gateway Health Check and Recovery Script
# Monitors gateway health, detects hangs, and initiates recovery
# Designed to run as a cronjob or systemd timer (not interfering with other services)

set -e

GATEWAY_PORT=18789
GATEWAY_HOST="127.0.0.1"
GATEWAY_WS="ws://${GATEWAY_HOST}:${GATEWAY_PORT}"
HEALTH_CHECK_TIMEOUT=10
MAX_LOCK_AGE=600  # 10 minutes in seconds
LOCK_FILES=(
  ~/.clawdbot/gateway.lock
  ~/.clawdbot/moltbot.lock
  /tmp/moltbot-gateway.lock
)

LOG_FILE="/tmp/moltbot-health-check.log"

# Logging function
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check if gateway process is responding
check_gateway_responsive() {
  # Try to connect to gateway port
  if timeout 3 bash -c "echo > /dev/tcp/${GATEWAY_HOST}/${GATEWAY_PORT}" 2>/dev/null; then
    return 0  # Gateway is responding
  else
    return 1  # Gateway is not responding
  fi
}

# Check for stale lock files
check_stale_locks() {
  for lock_file in "${LOCK_FILES[@]}"; do
    if [ -f "$lock_file" ]; then
      file_age=$(($(date +%s) - $(stat -f%m "$lock_file" 2>/dev/null || stat -c%Y "$lock_file" 2>/dev/null)))
      if [ "$file_age" -gt "$MAX_LOCK_AGE" ]; then
        log "WARN: Stale lock file found: $lock_file (age: ${file_age}s)"
        return 1  # Stale lock detected
      fi
    fi
  done
  return 0  # No stale locks
}

# Check if gateway is in crash loop
check_crash_loop() {
  # Get restart count from systemd
  restart_count=$(systemctl show moltbot-gateway.service -p NRestarts --value 2>/dev/null || echo "0")
  if [ "$restart_count" -gt "10" ]; then
    log "WARN: Gateway in potential crash loop (restart count: $restart_count)"
    return 1
  fi
  return 0
}

# Clean stale lock files
cleanup_locks() {
  log "Cleaning stale lock files..."
  for lock_file in "${LOCK_FILES[@]}"; do
    if [ -f "$lock_file" ]; then
      rm -f "$lock_file" 2>/dev/null && log "Removed: $lock_file"
    fi
  done
}

# Graceful restart of gateway
restart_gateway() {
  log "Initiating graceful gateway restart..."
  systemctl restart moltbot-gateway.service
  sleep 5
  if check_gateway_responsive; then
    log "Gateway restarted successfully"
    return 0
  else
    log "ERROR: Gateway failed to respond after restart"
    return 1
  fi
}

# Main health check
main() {
  log "Starting gateway health check..."

  # Check if gateway is responsive
  if ! check_gateway_responsive; then
    log "ERROR: Gateway is not responding on port $GATEWAY_PORT"

    # Check for stale locks or crash loop
    if ! check_stale_locks || ! check_crash_loop; then
      log "Detected lock/crash issue. Cleaning and restarting..."
      cleanup_locks
      restart_gateway
    else
      log "ERROR: Gateway unresponsive but no recovery needed. Manual intervention required."
      exit 1
    fi
  else
    log "Gateway is healthy and responsive"
    return 0
  fi
}

# Run health check
main
