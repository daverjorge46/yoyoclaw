#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat >&2 <<'USAGE'
Usage:
  transcribe.sh <audio-file> [--model whisper-1] [--out /path/to/out.txt] [--language en] [--prompt "hint"] [--json] [--server http://127.0.0.1:8080] [--binary whisper] [--fallback auto|local-only|cloud-only]
USAGE
  exit 2
}

if [[ "${1:-}" == "" || "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
fi

in="${1:-}"
shift || true

model="whisper-1"
out=""
language=""
prompt=""
response_format="text"
server="${WHISPERFILE_URL:-http://127.0.0.1:8080}"
fallback_mode="${WHISPER_FALLBACK_MODE:-auto}"
binary_cmd="${WHISPER_BINARY:-whisper}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --model)
      model="${2:-}"
      shift 2
      ;;
    --out)
      out="${2:-}"
      shift 2
      ;;
    --language)
      language="${2:-}"
      shift 2
      ;;
    --prompt)
      prompt="${2:-}"
      shift 2
      ;;
    --json)
      response_format="json"
      shift 1
      ;;
    --server)
      server="${2:-}"
      shift 2
      ;;
    --binary)
      binary_cmd="${2:-}"
      shift 2
      ;;
    --fallback)
      fallback_mode="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown arg: $1" >&2
      usage
      ;;
  esac
done

if [[ ! -f "$in" ]]; then
  echo "File not found: $in" >&2
  exit 1
fi

case "$fallback_mode" in
  auto|local-only|cloud-only)
    ;;
  *)
    echo "Invalid --fallback value: $fallback_mode (use auto|local-only|cloud-only)" >&2
    exit 2
    ;;
esac

if [[ "$out" == "" ]]; then
  base="${in%.*}"
  if [[ "$response_format" == "json" ]]; then
    out="${base}.json"
  else
    out="${base}.txt"
  fi
fi

mkdir -p "$(dirname "$out")"

if [[ "$server" == */inference ]]; then
  request_url="${server%/}"
else
  request_url="${server%/}/inference"
fi

cleanup_paths=()
register_cleanup() {
  cleanup_paths+=("$1")
}
cleanup() {
  if [[ "${#cleanup_paths[@]}" -gt 0 ]]; then
    rm -f "${cleanup_paths[@]}"
  fi
}
trap cleanup EXIT

command_exists() {
  local cmd="$1"
  if [[ "$cmd" == */* ]]; then
    [[ -x "$cmd" ]]
  else
    command -v "$cmd" >/dev/null 2>&1
  fi
}

raw=""
backend=""
local_server_err=""
local_binary_err=""

local_format="text"
cloud_format="text"
if [[ "$response_format" == "json" ]]; then
  local_format="json"
  cloud_format="json"
fi

if [[ "$fallback_mode" != "cloud-only" ]]; then
  if command_exists ffmpeg; then
    tmp_wav="$(mktemp /tmp/whisperfile-XXXXXX.wav)"
    register_cleanup "$tmp_wav"
    server_err_file="$(mktemp /tmp/whisper-server-XXXXXX.err)"
    register_cleanup "$server_err_file"

    if ffmpeg -y -i "$in" -ar 16000 -ac 1 "$tmp_wav" >/dev/null 2>"$server_err_file"; then
      if raw="$(curl -sS --fail --max-time "${WHISPER_LOCAL_TIMEOUT:-8}" --request POST --url "$request_url" --form "file=@$tmp_wav" --form "response_format=$local_format" 2>>"$server_err_file")"; then
        backend="local-server"
      else
        local_server_err="$(cat "$server_err_file" 2>/dev/null || true)"
      fi
    else
      local_server_err="ffmpeg conversion failed: $(cat "$server_err_file" 2>/dev/null || true)"
    fi
  else
    local_server_err="ffmpeg not found; cannot convert audio for local server"
  fi
fi

if [[ "$backend" == "" && "$fallback_mode" != "cloud-only" ]]; then
  if [[ "$response_format" != "text" ]]; then
    local_binary_err="local binary mode supports text output only"
  elif command_exists "$binary_cmd"; then
    binary_err_file="$(mktemp /tmp/whisper-binary-XXXXXX.err)"
    register_cleanup "$binary_err_file"
    if raw_bin="$("$binary_cmd" -f "$in" 2>"$binary_err_file")"; then
      raw="$raw_bin"
      backend="local-binary"
    else
      local_binary_err="$(cat "$binary_err_file" 2>/dev/null || true)"
    fi
  else
    local_binary_err="whisper binary not found: $binary_cmd"
  fi
fi

if [[ "$backend" == "" ]]; then
  local_summary="server=${local_server_err:-not-attempted}; binary=${local_binary_err:-not-attempted}"

  if [[ "$fallback_mode" == "local-only" ]]; then
    echo "Local transcription failed and fallback is local-only ($local_summary)" >&2
    exit 1
  fi

  if [[ -z "${OPENAI_API_KEY:-}" ]]; then
    echo "Local transcription unavailable and OPENAI_API_KEY is not set for cloud fallback ($local_summary)" >&2
    exit 1
  fi

  cloud_args=(
    -sS
    --fail
    --request POST
    --url "https://api.openai.com/v1/audio/transcriptions"
    -H "Authorization: Bearer ${OPENAI_API_KEY}"
    -F "file=@${in}"
    -F "model=${model}"
    -F "response_format=${cloud_format}"
  )

  if [[ -n "$language" ]]; then
    cloud_args+=( -F "language=${language}" )
  fi
  if [[ -n "$prompt" ]]; then
    cloud_args+=( -F "prompt=${prompt}" )
  fi

  raw="$(curl "${cloud_args[@]}")"
  backend="cloud"
fi

printf "%s\n" "$raw" >"$out"

echo "$out"
