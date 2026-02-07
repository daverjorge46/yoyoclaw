#!/usr/bin/env bash
set -u

PROOF_DIR="${PROOF_DIR:-}"
LATEST_PROOF="${LATEST_PROOF:-}"
GATEWAY_URL="${GATEWAY_URL:-http://127.0.0.1:18789}"

mkdir -p "${PROOF_DIR}"
mkdir -p "${PROOF_DIR}/luna_tests"
mkdir -p "${PROOF_DIR}/gateway"
BLOCKER_PATH="${PROOF_DIR}/BLOCKER.md"

write_blocker() {
  local step="$1"
  local exit_code="$2"
  local http_code="$3"
  local note="$4"
  cat > "${BLOCKER_PATH}" <<EOF_INNER
Step failed: ${step}

Exit code: ${exit_code}
HTTP code: ${http_code}
Log files:
- ${PROOF_DIR}/luna_tests/${step}.log
- ${PROOF_DIR}/luna_tests/quicktests_run.log

Details:
${note}

Next action:
- Review the logs above and retry quicktests after gateway readiness or timeout adjustments.
EOF_INNER
}

if [[ -z "${PROOF_DIR}" ]]; then
  write_blocker "preflight" 2 "" "PROOF_DIR is required."
  exit 2
fi

if [[ -z "${LATEST_PROOF}" ]]; then
  write_blocker "preflight" 2 "" "LATEST_PROOF is required."
  exit 2
fi

log_step() {
  local name="$1"
  local message="$2"
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] ${name}: ${message}" >> "${PROOF_DIR}/luna_tests/quicktests_run.log"
}

write_summary() {
  local json="$1"
  echo "${json}" > "${PROOF_DIR}/luna_tests/quicktests_summary.json"
}

wait_gateway_ready() {
  local url="${GATEWAY_URL}/__openclaw__/canvas/"
  local max_wait_sec=90
  local waited=0
  : > "${PROOF_DIR}/luna_tests/gateway_wait.log"
  while [[ "${waited}" -lt "${max_wait_sec}" ]]; do
    local http_code="000"
    local exit_code=0
    http_code=$(curl -sS --connect-timeout 2 --max-time 3 -o /dev/null -w "%{http_code}" "${url}")
    exit_code=$?
    echo "ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ") attempt=${waited} exit=${exit_code} http=${http_code}" >> "${PROOF_DIR}/luna_tests/gateway_wait.log"
    if [[ "${http_code}" =~ ^(200|204|302|401|403|404)$ ]]; then
      return 0
    fi
    sleep 1
    waited=$((waited + 1))
  done
  return 1
}

curl_tool_call() {
  local name="$1"
  local request_file="$2"
  local response_file="$3"
  local http_file="$4"
  local log_file="$5"
  local max_attempts=8
  local attempt=1
  local backoff=1
  local start_time
  start_time=$(date +%s)
  while [[ "${attempt}" -le "${max_attempts}" ]]; do
    curl -sS --connect-timeout 20 --max-time 120 \
      -H "content-type: application/json" \
      -H "authorization: Bearer ${OPENCLAW_GATEWAY_TOKEN}" \
      --data-binary @"${request_file}" \
      -w "%{http_code}" \
      -o "${response_file}" \
      "${GATEWAY_URL}/tools/invoke" > "${http_file}" 2>> "${log_file}"
    local exit_code=$?
    local http_code
    http_code="$(cat "${http_file}" 2>/dev/null || echo 000)"
    if [[ "${exit_code}" -eq 0 && "${http_code}" != "000" ]]; then
      return 0
    fi
    local now
    now=$(date +%s)
    if [[ $((now - start_time)) -ge 120 ]]; then
      return 1
    fi
    sleep "${backoff}"
    if [[ "${backoff}" -lt 10 ]]; then
      backoff=$((backoff * 2))
      if [[ "${backoff}" -gt 10 ]]; then
        backoff=10
      fi
    fi
    attempt=$((attempt + 1))
  done
  return 1
}

load_gateway_token() {
  if [[ -n "${OPENCLAW_GATEWAY_TOKEN:-}" ]]; then
    return 0
  fi
  if [[ -f "/home/dado/openclaw/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "/home/dado/openclaw/.env"
    set +a
  fi
  if [[ -z "${OPENCLAW_GATEWAY_TOKEN:-}" ]]; then
    echo "OPENCLAW_GATEWAY_TOKEN is required" >&2
    return 1
  fi
  return 0
}

run_step() {
  local name="$1"
  local command="$2"
  local log="${PROOF_DIR}/luna_tests/${name}.log"
  log_step "${name}" "start"
  bash -lc "${command}" > "${log}" 2>&1
  local code=$?
  echo "${code}" > "${PROOF_DIR}/luna_tests/${name}.exitcode"
  if [[ "${code}" -ne 0 ]]; then
    log_step "${name}" "fail (${code})"
  else
    log_step "${name}" "ok"
  fi
  return "${code}"
}

candidate_select_cmd="PROOF_DIR=\"${PROOF_DIR}\" LATEST_PROOF=\"${LATEST_PROOF}\" node /home/dado/openclaw/scripts/luna_candidate_select.mjs"
candidate_read_cmd="node /home/dado/openclaw/scripts/luna_candidate_read.mjs \"${PROOF_DIR}/luna_tests/candidate_entities.json\""

run_step "candidate_select" "${candidate_select_cmd}"
candidate_select_code=$?

run_step "candidate_read" "${candidate_read_cmd}"
candidate_read_code=$?

LIGHT=""
FAN=""
OUTLET=""
if [[ -f "${PROOF_DIR}/luna_tests/candidate_read.log" ]]; then
  read -r LIGHT FAN OUTLET < "${PROOF_DIR}/luna_tests/candidate_read.log" || true
  echo "${LIGHT} ${FAN} ${OUTLET}" > "${PROOF_DIR}/luna_tests/candidate_entities_parsed.txt"
fi

ha_ping_code=1
ha_light_code=1
ha_fan_code=1
ha_outlet_code=1
ha_ping_http="0"
ha_light_http=""
ha_fan_http=""
ha_outlet_http=""

if ! wait_gateway_ready; then
  write_blocker "gateway_wait" 1 000 "Gateway did not respond with a ready HTTP code within 90s."
  exit 1
fi

if load_gateway_token; then
  echo "{\"tool\":\"ha_ping\",\"args\":{},\"sessionKey\":\"main\"}" > "${PROOF_DIR}/luna_tests/ha_ping_request.json"
  curl_tool_call "ha_ping" \
    "${PROOF_DIR}/luna_tests/ha_ping_request.json" \
    "${PROOF_DIR}/luna_tests/ha_ping.json" \
    "${PROOF_DIR}/luna_tests/ha_ping.http" \
    "${PROOF_DIR}/luna_tests/ha_ping.log"
  ha_ping_code=$?
  ha_ping_http="$(cat "${PROOF_DIR}/luna_tests/ha_ping.http" 2>/dev/null || echo 0)"
  echo "${ha_ping_code}" > "${PROOF_DIR}/luna_tests/ha_ping.exitcode"

  if [[ -n "${LIGHT}" ]]; then
    echo "{\"tool\":\"ha_universal_control\",\"args\":{\"target\":{\"entity_id\":\"${LIGHT}\"},\"safe_probe\":true},\"sessionKey\":\"main\"}" > "${PROOF_DIR}/luna_tests/ha_uc_light_request.json"
    curl_tool_call "ha_uc_light" \
      "${PROOF_DIR}/luna_tests/ha_uc_light_request.json" \
      "${PROOF_DIR}/luna_tests/ha_uc_light.json" \
      "${PROOF_DIR}/luna_tests/ha_uc_light.http" \
      "${PROOF_DIR}/luna_tests/ha_uc_light.log"
    ha_light_code=$?
    ha_light_http="$(cat "${PROOF_DIR}/luna_tests/ha_uc_light.http" 2>/dev/null || echo 0)"
    echo "${ha_light_code}" > "${PROOF_DIR}/luna_tests/ha_uc_light.exitcode"
  else
    ha_light_code=0
    echo "skipped:no_candidate" > "${PROOF_DIR}/luna_tests/ha_uc_light.log"
  fi

  if [[ -n "${FAN}" ]]; then
    echo "{\"tool\":\"ha_universal_control\",\"args\":{\"target\":{\"entity_id\":\"${FAN}\"},\"safe_probe\":true},\"sessionKey\":\"main\"}" > "${PROOF_DIR}/luna_tests/ha_uc_fan_request.json"
    curl_tool_call "ha_uc_fan" \
      "${PROOF_DIR}/luna_tests/ha_uc_fan_request.json" \
      "${PROOF_DIR}/luna_tests/ha_uc_fan.json" \
      "${PROOF_DIR}/luna_tests/ha_uc_fan.http" \
      "${PROOF_DIR}/luna_tests/ha_uc_fan.log"
    ha_fan_code=$?
    ha_fan_http="$(cat "${PROOF_DIR}/luna_tests/ha_uc_fan.http" 2>/dev/null || echo 0)"
    echo "${ha_fan_code}" > "${PROOF_DIR}/luna_tests/ha_uc_fan.exitcode"
  else
    ha_fan_code=0
    echo "skipped:no_candidate" > "${PROOF_DIR}/luna_tests/ha_uc_fan.log"
  fi

  if [[ -n "${OUTLET}" ]]; then
    echo "{\"tool\":\"ha_universal_control\",\"args\":{\"target\":{\"entity_id\":\"${OUTLET}\"},\"safe_probe\":true},\"sessionKey\":\"main\"}" > "${PROOF_DIR}/luna_tests/ha_uc_outlet_request.json"
    curl_tool_call "ha_uc_outlet" \
      "${PROOF_DIR}/luna_tests/ha_uc_outlet_request.json" \
      "${PROOF_DIR}/luna_tests/ha_uc_outlet.json" \
      "${PROOF_DIR}/luna_tests/ha_uc_outlet.http" \
      "${PROOF_DIR}/luna_tests/ha_uc_outlet.log"
    ha_outlet_code=$?
    ha_outlet_http="$(cat "${PROOF_DIR}/luna_tests/ha_uc_outlet.http" 2>/dev/null || echo 0)"
    echo "${ha_outlet_code}" > "${PROOF_DIR}/luna_tests/ha_uc_outlet.exitcode"
  else
    ha_outlet_code=0
    echo "skipped:no_candidate" > "${PROOF_DIR}/luna_tests/ha_uc_outlet.log"
  fi
else
  echo "Failed to load OPENCLAW_GATEWAY_TOKEN" > "${PROOF_DIR}/luna_tests/token_load.log"
fi

summary=$(cat <<EOF_INNER
{
  "candidate_select": { "ok": $( [[ "${candidate_select_code}" -eq 0 ]] && echo true || echo false ), "exit_code": ${candidate_select_code}, "log": "luna_tests/candidate_select.log" },
  "candidate_read": { "ok": $( [[ "${candidate_read_code}" -eq 0 ]] && echo true || echo false ), "exit_code": ${candidate_read_code}, "log": "luna_tests/candidate_read.log" },
  "ha_ping": { "ok": $( [[ "${ha_ping_code}" -eq 0 && "${ha_ping_http}" -ge 200 && "${ha_ping_http}" -lt 300 ]] && echo true || echo false ), "exit_code": ${ha_ping_code}, "http_code": "${ha_ping_http}" },
  "ha_uc_light": { "ok": $( [[ "${ha_light_code}" -eq 0 ]] && echo true || echo false ), "exit_code": ${ha_light_code}, "http_code": "${ha_light_http}", "candidate": "${LIGHT}", "skipped": $( [[ -z "${LIGHT}" ]] && echo true || echo false ) },
  "ha_uc_fan": { "ok": $( [[ "${ha_fan_code}" -eq 0 ]] && echo true || echo false ), "exit_code": ${ha_fan_code}, "http_code": "${ha_fan_http}", "candidate": "${FAN}", "skipped": $( [[ -z "${FAN}" ]] && echo true || echo false ) },
  "ha_uc_outlet": { "ok": $( [[ "${ha_outlet_code}" -eq 0 ]] && echo true || echo false ), "exit_code": ${ha_outlet_code}, "http_code": "${ha_outlet_http}", "candidate": "${OUTLET}", "skipped": $( [[ -z "${OUTLET}" ]] && echo true || echo false ) }
}
EOF_INNER
)

write_summary "${summary}"

if [[ "${candidate_select_code}" -ne 0 ]]; then
  write_blocker "candidate_select" "${candidate_select_code}" "" "Candidate selection failed. Check candidate_select.log."
  exit 1
fi
if [[ "${candidate_read_code}" -ne 0 ]]; then
  write_blocker "candidate_read" "${candidate_read_code}" "" "Candidate read failed. Check candidate_read.log."
  exit 1
fi
if [[ "${ha_ping_code}" -ne 0 || "${ha_ping_http}" -lt 200 || "${ha_ping_http}" -ge 300 ]]; then
  write_blocker "ha_ping" "${ha_ping_code}" "${ha_ping_http}" "ha_ping failed. Check ha_ping.log and ha_ping.json."
  exit 1
fi
if [[ -n "${LIGHT}" && ("${ha_light_code}" -ne 0 || "${ha_light_http}" -lt 200 || "${ha_light_http}" -ge 300) ]]; then
  write_blocker "ha_uc_light" "${ha_light_code}" "${ha_light_http}" "Light safe_probe failed. Check ha_uc_light.log and ha_uc_light.json."
  exit 1
fi
if [[ -n "${FAN}" && ("${ha_fan_code}" -ne 0 || "${ha_fan_http}" -lt 200 || "${ha_fan_http}" -ge 300) ]]; then
  write_blocker "ha_uc_fan" "${ha_fan_code}" "${ha_fan_http}" "Fan safe_probe failed. Check ha_uc_fan.log and ha_uc_fan.json."
  exit 1
fi
if [[ -n "${OUTLET}" && ("${ha_outlet_code}" -ne 0 || "${ha_outlet_http}" -lt 200 || "${ha_outlet_http}" -ge 300) ]]; then
  write_blocker "ha_uc_outlet" "${ha_outlet_code}" "${ha_outlet_http}" "Outlet safe_probe failed. Check ha_uc_outlet.log and ha_uc_outlet.json."
  exit 1
fi

exit 0
