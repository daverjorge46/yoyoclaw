#!/bin/bash
# Coding Swarm Management Script
# Usage: swarm.sh <command> [args]

set -euo pipefail

SWARM_DIR="${CLAWDBOT_SWARM_DIR:-$HOME/.clawdbot/swarm}"
SOCKET="${SWARM_DIR}/swarm.sock"
AGENTS_DIR="${SWARM_DIR}/agents"
LOGS_DIR="${SWARM_DIR}/logs"

mkdir -p "$AGENTS_DIR" "$LOGS_DIR"

require_bin() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required binary: $1"
    exit 1
  fi
}

require_bin tmux
require_bin jq

iso_now() {
  date -u +%Y-%m-%dT%H:%M:%SZ
}

strip_ansi() {
  sed -E 's/\x1b\[[0-9;]*[A-Za-z]//g'
}

escape_shell_arg() {
  printf "%q" "$1"
}

send_wake() {
  local text="$1"
  if command -v clawdbot >/dev/null 2>&1; then
    clawdbot wake --text "$text" --mode now >/dev/null 2>&1 || true
  fi
}

append_note() {
  local file="$1"
  local note="$2"
  local tmp
  tmp=$(mktemp "${SWARM_DIR}/agent.XXXXXX") || exit 1
  jq --arg note "$note" --arg ts "$(iso_now)" \
    '.notes = (.notes // []) + [{text: $note, at: $ts}]' \
    "$file" > "$tmp"
  mv "$tmp" "$file"
}

update_status() {
  local file="$1"
  local status="$2"
  local note="${3:-}"
  local tmp
  tmp=$(mktemp "${SWARM_DIR}/agent.XXXXXX") || exit 1
  jq --arg status "$status" --arg ts "$(iso_now)" \
    '.status = $status | .statusUpdatedAt = $ts' \
    "$file" > "$tmp"
  mv "$tmp" "$file"
  if [ -n "$note" ]; then
    append_note "$file" "$note"
  fi
}

cmd_init() {
  echo "🐝 Initializing swarm..."
  mkdir -p "$AGENTS_DIR" "$LOGS_DIR"
  echo "   Socket: $SOCKET"
  echo "   Agents: $AGENTS_DIR"
  echo "✅ Swarm initialized"
}

cmd_spawn() {
  local agent_id="$1"
  local tool="$2"
  local task="$3"
  local workdir="${4:-$(mktemp -d)}"

  if [ -z "$agent_id" ] || [ -z "$tool" ] || [ -z "$task" ]; then
    echo "Usage: swarm spawn <id> <tool> '<task>' [workdir]"
    exit 1
  fi

  if [ -f "${AGENTS_DIR}/${agent_id}.json" ]; then
    echo "Agent already exists: $agent_id"
    exit 1
  fi

  if tmux -S "$SOCKET" has-session -t "$agent_id" 2>/dev/null; then
    echo "Tmux session already exists: $agent_id"
    exit 1
  fi

  # Create tmux session
  tmux -S "$SOCKET" new-session -d -s "$agent_id" 2>/dev/null || true

  # Build command
  local cmd=""
  local escaped_task
  escaped_task=$(escape_shell_arg "$task")
  case "$tool" in
    codex)   cmd="codex --yolo $escaped_task" ;;
    claude)  cmd="claude $escaped_task" ;;
    pi)      cmd="pi -p $escaped_task" ;;
    opencode) cmd="opencode run $escaped_task" ;;
    *)       echo "Unknown tool: $tool"; exit 1 ;;
  esac

  tmux -S "$SOCKET" send-keys -t "$agent_id" "cd '$workdir' && $cmd" Enter

  cat > "${AGENTS_DIR}/${agent_id}.json" << EOF
{
  "id": "$agent_id",
  "tool": "$tool",
  "task": "$task",
  "workdir": "$workdir",
  "socket": "$SOCKET",
  "session": "$agent_id",
  "status": "running",
  "startedAt": "$(iso_now)",
  "statusUpdatedAt": "$(iso_now)",
  "notes": []
}
EOF

  echo "🐝 Spawned: $agent_id ($tool)"
  echo "   Task: $task"
  echo "   Monitor: tmux -S '$SOCKET' attach -t '$agent_id'"
}

cmd_status() {
  echo "🐝 Coding Swarm Status"
  echo ""

  local count=0
  for f in "${AGENTS_DIR}"/*.json; do
    [ -f "$f" ] || continue
    count=$((count + 1))

    local id
    local tool
    local task
    local status
    local note
    id=$(jq -r '.id' "$f")
    tool=$(jq -r '.tool' "$f")
    task=$(jq -r '.task' "$f" | cut -c1-60)
    status=$(jq -r '.status' "$f")
    note=$(jq -r '.notes // [] | last | .text // empty' "$f")

    if [ "$status" = "running" ]; then
      if ! tmux -S "$SOCKET" has-session -t "$id" 2>/dev/null; then
        status="orphaned"
        update_status "$f" "$status" "tmux session missing"
      else
        local pane
        local clean_pane
        local last_line
        local done_reason=""
        pane=$(tmux -S "$SOCKET" capture-pane -p -t "$id" -S -20 2>/dev/null || true)
        clean_pane=$(printf "%s" "$pane" | strip_ansi)
        last_line=$(printf "%s" "$clean_pane" | tail -1)
        if printf "%s" "$clean_pane" | grep -qi "waiting for input"; then
          done_reason="waiting for input"
        elif [[ "$last_line" =~ (❯|\$|#|%|>)\ ?$ ]]; then
          done_reason="shell prompt"
        fi

        if [ -n "$done_reason" ]; then
          status="done"
          update_status "$f" "$status" "$done_reason"
          send_wake "Swarm: ${id} ${status} (${done_reason})"
        fi
      fi
    fi

    local last
    last=$(tmux -S "$SOCKET" capture-pane -p -t "$id" -S -3 2>/dev/null | strip_ansi | grep -v '^$' | tail -1 | cut -c1-60)

    case "$status" in
      running)  echo "  🔄 $id ($tool): $task..." ;;
      done)     echo "  ✅ $id ($tool): $task..." ;;
      failed)   echo "  ❌ $id ($tool): $task..." ;;
      stuck)    echo "  🧊 $id ($tool): $task..." ;;
      orphaned) echo "  👻 $id ($tool): $task..." ;;
      killed)   echo "  🛑 $id ($tool): $task..." ;;
      *)        echo "  ❔ $id ($tool): $task..." ;;
    esac
    [ -n "$last" ] && echo "     └─ $last"
    [ -n "$note" ] && echo "     📝 $note"
    echo ""
  done

  [ $count -eq 0 ] && echo "  No agents. Spawn with: swarm spawn <id> <tool> '<task>'"
}

cmd_log() {
  local id="$1" lines="${2:-200}"
  tmux -S "$SOCKET" capture-pane -p -t "$id" -S -"$lines" 2>/dev/null || echo "Session not found"
}

cmd_attach() {
  tmux -S "$SOCKET" attach -t "$1"
}

cmd_kill() {
  local id="$1"
  tmux -S "$SOCKET" send-keys -t "$id" C-c 2>/dev/null
  sleep 1
  tmux -S "$SOCKET" kill-session -t "$id" 2>/dev/null || true
  if [ -f "${AGENTS_DIR}/${id}.json" ]; then
    update_status "${AGENTS_DIR}/${id}.json" "killed"
  fi
  echo "🛑 Killed: $id"
}

cmd_mark() {
  local id="$1"
  local status="$2"
  shift 2 || true
  local note="$*"

  if [ -z "$id" ] || [ -z "$status" ]; then
    echo "Usage: swarm mark <id> <status> [note]"
    exit 1
  fi

  case "$status" in
    running|done|failed|stuck|killed|orphaned) ;;
    *) echo "Invalid status: $status"; exit 1 ;;
  esac

  local f="${AGENTS_DIR}/${id}.json"
  if [ ! -f "$f" ]; then
    echo "Agent not found: $id"
    exit 1
  fi

  update_status "$f" "$status" "$note"
  echo "Updated: $id -> $status"
}

cmd_cleanup() {
  for f in "${AGENTS_DIR}"/*.json; do
    [ -f "$f" ] || continue
    local status=$(jq -r '.status' "$f")
    local id=$(jq -r '.id' "$f")
    if [ "$status" != "running" ]; then
      tmux -S "$SOCKET" capture-pane -p -t "$id" -S -500 > "${LOGS_DIR}/${id}.log" 2>/dev/null || true
      tmux -S "$SOCKET" kill-session -t "$id" 2>/dev/null || true
      mv "$f" "${AGENTS_DIR}/.archived_${id}.json"
      echo "Archived: $id"
    fi
  done
}

cmd_note() {
  local id="$1"
  shift
  local note="$*"

  if [ -z "$id" ] || [ -z "$note" ]; then
    echo "Usage: swarm note <id> <note text>"
    exit 1
  fi

  local f="${AGENTS_DIR}/${id}.json"
  if [ ! -f "$f" ]; then
    echo "Agent not found: $id"
    exit 1
  fi

  append_note "$f" "$note"
  echo "📝 Note added to $id"
}

cmd_help() {
  cat << 'EOF'
🐝 Coding Swarm

Commands:
  init                    Initialize swarm
  spawn <id> <tool> <task> [workdir]  Spawn agent
  status                  Dashboard
  log <id> [lines]        Show output
  attach <id>             Attach to tmux
  kill <id>               Kill agent
  mark <id> <status> [note]  Update agent status
  cleanup                 Archive completed
  note <id> <text>        Add a note to agent

Tools: codex, claude, pi, opencode
EOF
}

case "${1:-help}" in
  init)    cmd_init ;;
  spawn)   shift; cmd_spawn "$@" ;;
  status)  cmd_status ;;
  log)     shift; cmd_log "$@" ;;
  attach)  shift; cmd_attach "$@" ;;
  kill)    shift; cmd_kill "$@" ;;
  mark)    shift; cmd_mark "$@" ;;
  cleanup) cmd_cleanup ;;
  note)    shift; cmd_note "$@" ;;
  *)       cmd_help ;;
esac
