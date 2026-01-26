---
name: Fix Nano Banana Config
overview: Configure Nano Banana Pro (gemini-3-pro-image-preview) as primary image model with local Qwen3-VL fallback.
todos:
  - id: backup-config
    content: Create timestamped backup of /home/liam/.clawdbot/clawdbot.json
    status: completed
  - id: update-google-provider
    content: Replace gemini-2.5-flash-image with gemini-3-pro-image-preview in models.providers.google.models
    status: completed
  - id: update-image-tool
    content: Set tools.media.image.models to [google/gemini-3-pro-image-preview, ollama/qwen3-vl:4b]
    status: completed
  - id: validate-config
    content: Run clawdbot config validation and verify schema compliance
    status: completed
  - id: restart-gateway
    content: Restart clawdbot-gateway.service and verify active status
    status: completed
  - id: apex-audit
    content: Run APEX audit checkpoint to verify no regressions
    status: completed
isProject: false
---

# Nano Banana Pro Image Model Configuration

**APEX Compliance**: v4.4.1

**Clawdbot Docs Reference**: `/home/liam/docs/nodes/media-understanding.md`, `/home/liam/src/config/zod-schema.core.ts:421-475`

## Problem Statement

| Aspect | Current (WRONG) | Target (CORRECT) |

|--------|-----------------|------------------|

| Model ID | `gemini-2.5-flash-image` | `gemini-3-pro-image-preview` |

| Display Name | "Nano Banana Pro" (mislabeled) | "Nano Banana Pro" (correct) |

| Google API Name | "Nano Banana" (basic) | "Nano Banana Pro" |

| Fallback | `ollama/qwen3-vl:4b` | `ollama/qwen3-vl:4b` (keep) |

## File to Modify

| File | Path | Purpose |

|------|------|---------|

| clawdbot.json | `/home/liam/.clawdbot/clawdbot.json` | Primary configuration |

## Execution Steps

### Step 1: Create Backup

```bash
cp /home/liam/.clawdbot/clawdbot.json /home/liam/.clawdbot/clawdbot.json.backup.$(date +%Y%m%d-%H%M%S)
```

**Success Criteria**: Backup file exists with current timestamp.

### Step 2: Update Google Provider Models Array

**Location**: `models.providers.google.models` (line ~24 in clawdbot.json)

**Current Value**:

```json
"models": [
  {
    "id": "gemini-2.5-flash-image",
    "name": "Nano Banana Pro",
    "input": ["text", "image"]
  }
]
```

**Target Value**:

```json
"models": [
  {
    "id": "gemini-3-pro-image-preview",
    "name": "Nano Banana Pro",
    "input": ["text", "image"],
    "thinking": true
  }
]
```

**Schema Reference** (`/home/liam/src/config/zod-schema.core.ts:177-195`):

- `id`: string (required) - must match Google API model name
- `name`: string (optional) - display alias
- `input`: array of "text"|"image"|"audio"|"video"
- `thinking`: boolean (optional) - model supports thinking

**Success Criteria**: `pnpm run clawdbot config get models.providers.google.models` returns model with id `gemini-3-pro-image-preview`.

### Step 3: Update Image Tool Models Array

**Location**: `tools.media.image.models` (line ~112 in clawdbot.json)

**Current Value**:

```json
"models": [
  {
    "provider": "google",
    "model": "gemini-2.5-flash-image"
  },
  {
    "provider": "ollama",
    "model": "qwen3-vl:4b"
  }
]
```

**Target Value**:

```json
"models": [
  {
    "provider": "google",
    "model": "gemini-3-pro-image-preview"
  },
  {
    "provider": "ollama",
    "model": "qwen3-vl:4b"
  }
]
```

**Schema Reference** (`/home/liam/src/config/zod-schema.core.ts:421-441`):

- `provider`: string (optional) - provider key from `models.providers`
- `model`: string (optional) - model id from provider's models array

**Fallback Behavior**: If `google/gemini-3-pro-image-preview` fails, automatically retries with `ollama/qwen3-vl:4b` (local, zero-cost).

**Success Criteria**: `pnpm run clawdbot config get tools.media.image.models` returns array with google model first, ollama second.

### Step 4: Validate Configuration

```bash
pnpm run clawdbot config get models.providers.google
pnpm run clawdbot config get tools.media.image
```

**Success Criteria**:

- No "Config validation failed" errors
- Google provider shows `gemini-3-pro-image-preview` model
- Image tool shows correct model order

### Step 5: Restart Gateway

```bash
systemctl --user restart clawdbot-gateway.service
sleep 3
systemctl --user status clawdbot-gateway.service
```

**Success Criteria**: Service shows `active (running)` status.

### Step 6: Verify API Connectivity

```bash
curl -s -o /dev/null -w "%{http_code}" "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview?key=AIzaSyAb6HIi4hAruXVu4NcmkwaURvDkZu5qP4g"
```

**Success Criteria**: HTTP response code is `200`.

## Rollback Procedure

If any step fails:

```bash
# Restore backup
cp /home/liam/.clawdbot/clawdbot.json.backup.YYYYMMDD-HHMMSS /home/liam/.clawdbot/clawdbot.json

# Restart gateway with original config
systemctl --user restart clawdbot-gateway.service
```

## APEX Audit Checkpoint

After Step 6, verify:

- [ ] Backup file exists
- [ ] Config validation passes (zero errors)
- [ ] Gateway service active
- [ ] Google API returns HTTP 200 for target model
- [ ] No regressions in existing functionality (Telegram channel still works)

## Final Verification Command

```bash
pnpm run clawdbot doctor 2>&1 | grep -E "(Telegram|Agents|error|Error)"
```

**Success Criteria**: Shows "Telegram: ok" and no errors.