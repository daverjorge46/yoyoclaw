---
name: openai-whisper-auto
description: "Local-first speech-to-text with optional OpenAI fallback."
homepage: https://huggingface.co/Mozilla/whisperfile
metadata: { "openclaw": { "emoji": "🎙️", "requires": { "bins": ["curl"] } } }
---

# Whisper Auto (Local First)

Use one command path that tries local transcription first and OpenAI only as fallback.

Order of operations:

1. Local server (`POST /inference`)
2. Local binary (`whisper -f <file>`)
3. OpenAI (`/v1/audio/transcriptions`) if local options fail

## Quick start

```bash
{baseDir}/scripts/transcribe.sh /path/to/audio.ogg --model whisper-1
```

## Modes

- `--fallback auto` (default): server -> binary -> cloud.
- `--fallback local-only`: server -> binary, then fail.
- `--fallback cloud-only`: skip local and force cloud.

## Useful options

- `--server http://127.0.0.1:8080`
- `--binary whisper`
- `--json` for JSON output (`.json` file)

## Notes

- Local server path uses `ffmpeg` if available to normalize audio for whisperfile.
- Cloud fallback requires `OPENAI_API_KEY`.
- Existing skills remain unchanged:
  - `openai-whisper` for local-only workflows
  - `openai-whisper-api` for cloud-only workflows
