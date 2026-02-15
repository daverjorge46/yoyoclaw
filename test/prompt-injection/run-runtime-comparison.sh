#!/usr/bin/env bash
#
# Run prompt-injection suite against both runtimes and capture markdown outputs.
#
# Output files:
#   test/prompt-injection/BASELINE-RESULTS.md  (pi)
#   test/prompt-injection/CAMEL-RESULTS.md     (camel)
#
# Environment:
#   OPENCLAW_PROFILE  - profile name (default: dev)
#   OPENCLAW_ARGS     - extra args passed to openclaw (overrides profile)
#   OPENCLAW_AGENT    - agent id (default: dev)
#   INJECTION_MODEL   - model to set for this run (default: openai/gpt-4o-mini)
#   NODE_BIN          - node binary for tiny JSON helpers (default: node)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_SCRIPT="$SCRIPT_DIR/run-camel.sh"
BASELINE_OUT="${BASELINE_RESULTS_PATH:-$SCRIPT_DIR/BASELINE-RESULTS.md}"
CAMEL_OUT="${CAMEL_RESULTS_PATH:-$SCRIPT_DIR/CAMEL-RESULTS.md}"

PROFILE="${OPENCLAW_PROFILE:-dev}"
EXTRA_ARGS_RAW="${OPENCLAW_ARGS:-}"
AGENT="${OPENCLAW_AGENT:-dev}"
MODEL="${INJECTION_MODEL:-openai/gpt-4o-mini}"
NODE_BIN="${NODE_BIN:-node}"

TMPDIR_BASE=$(mktemp -d /tmp/openclaw-runtime-comparison-XXXXXX)

defaults_model_state="missing"
defaults_runtime_state="missing"
agent_runtime_state="missing"
agent_runtime_path=""

defaults_model_file="$TMPDIR_BASE/defaults-model-primary.json"
defaults_runtime_file="$TMPDIR_BASE/defaults-runtime-engine.json"
agent_runtime_file="$TMPDIR_BASE/agent-runtime-engine.json"

CLI_ARGS=()
if [ -n "$EXTRA_ARGS_RAW" ]; then
  # shellcheck disable=SC2206
  CLI_ARGS=($EXTRA_ARGS_RAW)
else
  CLI_ARGS=(--profile "$PROFILE")
fi

run_openclaw() {
  pnpm openclaw "${CLI_ARGS[@]}" "$@"
}

capture_path() {
  local path="$1"
  local file="$2"
  local state_var="$3"

  if run_openclaw config get "$path" --json >"$file" 2>/dev/null; then
    printf -v "$state_var" "%s" "present"
  else
    printf -v "$state_var" "%s" "missing"
  fi
}

restore_path() {
  local path="$1"
  local state="$2"
  local file="$3"

  if [ "$state" = "present" ]; then
    local value
    value="$(cat "$file")"
    run_openclaw config set "$path" "$value" --json >/dev/null
  else
    run_openclaw config unset "$path" >/dev/null 2>&1 || true
  fi
}

find_agent_index() {
  local target="$1"
  local raw

  raw="$(run_openclaw config get agents.list --json 2>/dev/null || true)"
  LIST_JSON="$raw" TARGET_AGENT="$target" "$NODE_BIN" <<'NODE'
const raw = process.env.LIST_JSON ?? "[]";
const target = process.env.TARGET_AGENT ?? "";

try {
  const list = JSON.parse(raw);
  if (!Array.isArray(list)) {
    process.exit(0);
  }
  const idx = list.findIndex((entry) => {
    if (!entry || typeof entry !== "object") {
      return false;
    }
    return String(entry.id ?? "") === target;
  });
  if (idx >= 0) {
    process.stdout.write(String(idx));
  }
} catch {
  // ignore
}
NODE
}

set_runtime() {
  local runtime="$1"
  run_openclaw config set agents.defaults.runtimeEngine "\"$runtime\"" --json >/dev/null
  if [ -n "$agent_runtime_path" ]; then
    run_openclaw config set "$agent_runtime_path" "\"$runtime\"" --json >/dev/null
  fi
}

set_model() {
  run_openclaw config set agents.defaults.model.primary "\"$MODEL\"" --json >/dev/null
}

restore_config() {
  if [ -n "$agent_runtime_path" ]; then
    restore_path "$agent_runtime_path" "$agent_runtime_state" "$agent_runtime_file"
  fi
  restore_path "agents.defaults.runtimeEngine" "$defaults_runtime_state" "$defaults_runtime_file"
  restore_path "agents.defaults.model.primary" "$defaults_model_state" "$defaults_model_file"
}

cleanup() {
  restore_config || true
  rm -rf "$TMPDIR_BASE"
}
trap cleanup EXIT

capture_path "agents.defaults.model.primary" "$defaults_model_file" defaults_model_state
capture_path "agents.defaults.runtimeEngine" "$defaults_runtime_file" defaults_runtime_state

agent_index="$(find_agent_index "$AGENT")"
if [ -n "$agent_index" ]; then
  agent_runtime_path="agents.list[$agent_index].runtimeEngine"
  capture_path "$agent_runtime_path" "$agent_runtime_file" agent_runtime_state
fi

set_model

run_suite() {
  local runtime="$1"
  local output_file="$2"
  local status=0

  set_runtime "$runtime"

  echo "==> Running runtime=$runtime model=$MODEL agent=$AGENT" >&2
  echo "==> Writing results to $output_file" >&2

  set +e
  INJECTION_MODEL="$MODEL" \
  OPENCLAW_MODEL="$MODEL" \
  OPENCLAW_AGENT="$AGENT" \
  OPENCLAW_PROFILE="$PROFILE" \
  OPENCLAW_ARGS="$EXTRA_ARGS_RAW" \
  "$RUN_SCRIPT" >"$output_file"
  status=$?
  set -e

  echo "==> runtime=$runtime exit=$status" >&2
  echo "$status"
}

baseline_status="$(run_suite "pi" "$BASELINE_OUT")"
camel_status="$(run_suite "camel" "$CAMEL_OUT")"

echo "" >&2
echo "Baseline (pi) exit: $baseline_status" >&2
echo "Camel exit: $camel_status" >&2

# Baseline is expected to fail when vulnerable; enforce camel success.
if [ "$camel_status" -ne 0 ]; then
  exit "$camel_status"
fi

exit 0
