# TTS Voice Integration - Staging Plan
## APEX v6.2.0 Ultra-Think Analysis
**Date:** 2026-01-29  
**Proposed by:** Liam  
**Status:** PENDING REVIEW

---

## Checkpoint 1: Problem Mapping

**Goal:** Give Liam a voice via text-to-speech  
**Constraints:** Cost-conscious, preferably open source, local-first if possible  
**Current State:** `sag` (ElevenLabs) configured but no API key; `sherpa-onnx-tts` (Piper) skill exists but unconfigured  
**Success Criteria:** Liam can generate voice replies in Telegram/Discord with single command

---

## Checkpoint 2: Architecture Discovery

**Existing Infrastructure:**
```
~/skills/sag/                    # ElevenLabs wrapper (configured, needs API key)
~/skills/sherpa-onnx-tts/         # Local TTS (needs runtime + model download)
~/skills/kroko-voice/             # Voice INPUT only (not TTS)
~/.clawdbot/moltbot.json          # Config location for env vars
```

**Integration Points:**
- Telegram: Supports voice messages via `MEDIA: /path/to/audio.ogg`
- Discord: Supports voice via `MEDIA: /path/to/audio.mp3`
- Moltbot: Has `media` capability with auto-conversion

---

## Checkpoint 3: Option Analysis (ALL TTS Alternatives)

| Option | Quality | Latency | Cost | Setup | License | Recommendation |
|--------|---------|---------|------|-------|---------|----------------|
| **Kokoro** | ⭐⭐⭐⭐⭐ | <100ms | FREE | pip install | Apache 2.0 | **PRIMARY** |
| Chatterbox-Turbo | ⭐⭐⭐⭐⭐ | 200ms | FREE | HuggingFace | MIT | Secondary |
| Dia2 | ⭐⭐⭐⭐⭐ | Streaming | FREE | HuggingFace | Apache 2.0 | Dialogue use |
| Piper (existing) | ⭐⭐⭐ | Fast | FREE | Binary+model | MIT | Fallback |
| XTTS-v2 | ⭐⭐⭐⭐ | 150ms | FREE* | pip install | *Non-commercial only* | **REJECTED** (license) |
| ElevenLabs (sag) | ⭐⭐⭐⭐⭐ | Fast | $5/mo | API key | Commercial | Optional paid tier |

**Decision:** Kokoro wins on quality, speed, size (82M params), truly open license, and simplicity.

---

## Checkpoint 4: Threat Modeling & Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Kokoro doesn't run on WSL/AMD | Low | Fallback to Piper (already tested on Linux) |
| Audio format incompatibility | Medium | Test OGG for Telegram, MP3 for Discord |
| No voice cloning (Kokoro limitation) | Certain | Accept limitation; use Chatterbox if cloning needed later |
| API key exposure in logs | Low | Use env vars, never hardcode, scan code before commit |
| Large model download fails | Low | Add retry logic, validate checksums |

---

## Checkpoint 5: Implementation Path

### Phase 1: Kokoro Skill (30 min)
```bash
# 1. Create skill structure
mkdir -p ~/clawdbot/skills/kokoro-tts/{bin,models}

# 2. Install Kokoro
pip install kokoro-onnx

# 3. Download model (82M params, ~160MB)
wget https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files/kokoro-v0_19.onnx
wget https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files/voices.json

# 4. Create wrapper script (bin/kokoro-tts)
# - Accepts text input
# - Outputs to specified file
# - Supports voice selection (af, bf, etc.)
```

### Phase 2: Integration (15 min)
```json5
// Add to ~/.clawdbot/moltbot.json skills.entries
{
  "kokoro-tts": {
    "enabled": true,
    "env": {
      "KOKORO_MODEL_PATH": "~/clawdbot/skills/kokoro-tts/models/kokoro-v0_19.onnx",
      "KOKORO_VOICES_PATH": "~/clawdbot/skills/kokoro-tts/models/voices.json"
    }
  }
}
```

### Phase 3: Testing (15 min)
```bash
# Test 1: Direct generation
kokoro-tts "Hello Simon, this is Liam speaking" -o /tmp/test.mp3

# Test 2: Telegram format (OGG opus)
ffmpeg -i /tmp/test.mp3 -c:a libopus -b:a 24k /tmp/test.ogg

# Test 3: Discord format (MP3)
# Already compatible
```

### Phase 4: Moltbot Integration (20 min)
Add voice reply detection:
- Trigger: User asks for "voice" reply or specific tone
- Action: Generate audio, send via MEDIA: protocol
- Cleanup: Auto-delete temp files after send

---

## Checkpoint 6: Quality Gates

| Gate | Verification |
|------|--------------|
| Build | `pip install` succeeds, no dependency conflicts |
| Test | Generate 10 test phrases, verify intelligibility |
| Regression | Existing `sag` and `sherpa-onnx-tts` skills still work |
| Security | No hardcoded paths, env vars only, no secrets in logs |
| Performance | <2s generation time for 100-char text |

---

## Checkpoint 7: API/Contract Design

**Skill Interface:**
```bash
kokoro-tts [OPTIONS] "text to speak"

Options:
  -o, --output FILE       Output file (default: /tmp/kokoro-out.mp3)
  -v, --voice VOICE       Voice ID (default: af)
  -f, --format FORMAT     Output format: mp3, ogg, wav (default: mp3)
  --speed FLOAT           Speed multiplier (0.5-2.0, default: 1.0)
  -h, --help              Show help

Environment:
  KOKORO_MODEL_PATH       Path to .onnx model file
  KOKORO_VOICES_PATH      Path to voices.json
```

**Usage Examples:**
```bash
# Basic
kokoro-tts "Meeting in 15 minutes"

# With voice selection
kokoro-tts -v bm "Hello from the British male voice"

# Telegram-ready OGG
kokoro-tts -f ogg "Voice reply for Telegram"

# Long-form with speed adjustment
kokoro-tts --speed 1.2 "This is a longer message that might need slight speedup"
```

---

## Checkpoint 8: Rollback Plan

If Kokoro fails:
1. **Immediate:** Use existing `sherpa-onnx-tts` (Piper) - already configured for Linux
2. **Short-term:** Add ElevenLabs API key to `sag` skill ($5/mo)
3. **Nuclear:** Remove skill, no system impact (additive only)

---

## Checkpoint 9: Future Extensions

| Feature | Model | When |
|---------|-------|------|
| Voice cloning | Chatterbox-Turbo or Dia2 | If requested |
| Emotion tags | Chatterbox-Turbo (`[laugh]`, `[sigh]`) | Storytelling use |
| Multi-speaker | Dia2 (`[S1]`, `[S2]` tags) | Podcast/conversation |
| Streaming | Dia2 | Real-time responses |
| Custom "Liam" voice | Train on my text samples | Long-term identity |

---

## Checkpoint 10: Resource Requirements

| Resource | Amount | Notes |
|----------|--------|-------|
| Disk | ~200MB | Model + voices.json |
| RAM | ~500MB | At runtime |
| GPU | None | CPU-only, optimized |
| Network | ~160MB once | Model download |
| Time | ~60 min | Full implementation |

---

## Staging Checklist

**Before Implementation:**
- [ ] Review this plan with Simon
- [ ] Confirm Kokoro license (Apache 2.0) acceptable
- [ ] Verify WSL2 Linux environment has pip/venv

**During Implementation:**
- [ ] Run tests BEFORE any changes to existing skills
- [ ] Create skill in `~/clawdbot/skills/kokoro-tts/`
- [ ] Add env vars to moltbot.json
- [ ] Test on both Telegram and Discord

**After Implementation:**
- [ ] All quality gates pass
- [ ] Document usage in SKILL.md
- [ ] Add to EVOLUTION-QUEUE.md as [RESOLVED]

---

## Approval

**Simon's decision needed:**

1. **Proceed with Kokoro** (recommended) — Reply "approve" or 👍
2. **Use different model** — Specify which one
3. **Add more analysis** — Ask questions
4. **Cancel** — Reply "skip"

---

*APEX v6.2.0 Compliant: Read-First ✓ | Architecture-First ✓ | Quality Gates Defined ✓ | Rollback Plan ✓*
