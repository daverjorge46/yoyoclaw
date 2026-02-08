"""AI Prosody Director — Multi-provider TTS with LLM-directed prosody.

Provider priority: Fish Audio S1 (best Chinese) → edge-tts (free fallback).
LLM generates SSML-style speed/pause directives, parsed into per-segment
TTS calls with individual speed control.
"""

import asyncio
import os
import re
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET


DIRECTOR_PROMPT = """你是一位世界頂級的語音導演。你的工作是把純文字轉換成帶有豐富 SSML 標註的語音腳本，讓 TTS 引擎讀起來像真人旁白，而不是機器人。

## 你的工具

1. `<prosody rate="X%" pitch="YHz">` — 語速和音高
   - rate: -30% 到 +20%
   - pitch: -15Hz 到 +15Hz

2. `<break time="Nms"/>` — 停頓
   - 150-250ms: 子句間微停頓
   - 400-600ms: 句間呼吸停頓
   - 800-1200ms: 戲劇性停頓（揭露前、轉場）

3. `<emphasis level="moderate|strong">` — 重音強調
   - strong: 每段最多 1-2 個
   - moderate: 次要重點

## 核心規則

### 語速變化（最關鍵）
- 開場/打招呼: rate +5% 到 +10%（有活力）
- 過渡性/熟悉的內容: rate +5% 到 +15%（不要拖）
- 新資訊/重點: rate -5% 到 -15%（讓觀眾吸收）
- 揭露/轉折: rate -15% 到 -25%（戲劇張力）
- 結尾: rate -5% 到 -10%（從容、權威）
- 絕對不要連續超過 2 句使用相同語速

### 停頓建築學
- 逗號後: 不需要額外 break（TTS 自動處理）
- 句號後: 400-600ms
- 重要揭露前: 500-800ms
- 轉場: 800-1200ms
- 反問後: 600-900ms

### 音高動態
- 疑問/延續: pitch +5Hz 到 +15Hz
- 陳述/結論: pitch -5Hz 到 -10Hz
- 興奮/驚訝: pitch +8Hz 到 +15Hz
- 嚴肅/沉重: pitch -5Hz 到 -15Hz

### 節奏重置
每 2-3 句插入一次「節奏重置」：突然停頓 + 語速變化，防止聽眾大腦自動忽略。

## 輸出格式

只輸出 SSML 片段（不含 <speak> 和 <voice> 標籤），我會自己包裝。
不要加任何解釋。確保 XML 格式正確。"""


# === LLM Prosody Direction ===

def _get_llm_client():
    """Get LLM client for prosody direction (Groq preferred)."""
    from openai import OpenAI

    groq_key = os.environ.get("GROQ_API_KEY")
    if groq_key:
        return OpenAI(api_key=groq_key, base_url="https://api.groq.com/openai/v1"), "llama-3.3-70b-versatile"

    openai_key = os.environ.get("OPENAI_API_KEY")
    if openai_key:
        return OpenAI(api_key=openai_key), "gpt-4o-mini"

    return None, None


def direct_prosody(text: str) -> str:
    """Use LLM to transform plain text into SSML-annotated speech.

    Returns SSML fragment (without <speak>/<voice> wrappers).
    Falls back to rule-based SSML if no LLM available.
    """
    client, model = _get_llm_client()
    if not client:
        print("  No LLM available, using rule-based SSML...")
        return _rule_based_ssml(text)

    print(f"  Directing prosody with LLM ({model})...")
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": DIRECTOR_PROMPT},
                {"role": "user", "content": f"請為以下文字生成 SSML 標註：\n\n{text}"},
            ],
            temperature=0.3,
            max_tokens=2000,
        )
        ssml_fragment = response.choices[0].message.content.strip()

        # Clean up: remove any markdown code blocks the LLM might add
        if ssml_fragment.startswith("```"):
            lines = ssml_fragment.split("\n")
            ssml_fragment = "\n".join(
                l for l in lines if not l.startswith("```")
            ).strip()

        # Remove <speak> and <voice> wrappers if LLM included them
        for tag in ["<speak", "</speak>", "<voice", "</voice>"]:
            while tag in ssml_fragment:
                start = ssml_fragment.find(tag)
                end = ssml_fragment.find(">", start)
                if end >= 0:
                    ssml_fragment = ssml_fragment[:start] + ssml_fragment[end + 1:]
                else:
                    break

        return ssml_fragment

    except Exception as e:
        print(f"  LLM prosody direction failed ({e}), using rule-based fallback...")
        return _rule_based_ssml(text)


def _rule_based_ssml(text: str) -> str:
    """Fallback: simple rule-based SSML annotation."""
    sentences = re.split(r'([。！？])', text)
    merged = []
    i = 0
    while i < len(sentences):
        s = sentences[i]
        if i + 1 < len(sentences) and sentences[i + 1] in "。！？":
            merged.append(s + sentences[i + 1])
            i += 2
        else:
            if s.strip():
                merged.append(s)
            i += 1

    rates = ["+5%", "-5%", "+0%", "-10%", "-5%"]
    pitches = ["+3Hz", "-2Hz", "+0Hz", "-5Hz", "+0Hz"]
    parts = []
    for i, sentence in enumerate(merged):
        sentence = sentence.strip()
        if not sentence:
            continue
        rate = rates[i % len(rates)]
        pitch = pitches[i % len(pitches)]
        parts.append(f'<prosody rate="{rate}" pitch="{pitch}">{sentence}</prosody>')
        if i < len(merged) - 1:
            parts.append('<break time="500ms"/>')

    return "\n".join(parts)


# === SSML Parsing ===

def parse_ssml_segments(ssml_fragment: str) -> list[dict]:
    """Parse SSML fragment into a flat list of speech and break segments.

    Returns:
      [{"type": "speech", "text": "你好", "rate": "+10%", "pitch": "+5Hz"},
       {"type": "break", "time_ms": 500},
       ...]
    """
    try:
        root = ET.fromstring(f"<root>{ssml_fragment}</root>")
    except ET.ParseError:
        text = re.sub(r'<[^>]+/?>', '', ssml_fragment).strip()
        if text:
            return [{"type": "speech", "text": text, "rate": "+0%", "pitch": "+0Hz"}]
        return []

    segments = []
    _collect(root, segments, rate="+0%", pitch="+0Hz")

    # Merge consecutive speech segments with identical prosody
    merged = []
    for seg in segments:
        if (merged
                and seg["type"] == "speech"
                and merged[-1]["type"] == "speech"
                and seg.get("rate") == merged[-1].get("rate")
                and seg.get("pitch") == merged[-1].get("pitch")):
            merged[-1]["text"] += seg["text"]
        else:
            merged.append(dict(seg))

    return [s for s in merged
            if s["type"] == "break" or (s["type"] == "speech" and s["text"].strip())]


def _collect(element, segments, rate, pitch):
    """Recursively collect speech/break segments from an SSML element tree."""
    tag = element.tag
    cur_rate = rate
    cur_pitch = pitch

    if tag == "prosody":
        cur_rate = element.get("rate", rate)
        cur_pitch = element.get("pitch", pitch)
    elif tag == "emphasis":
        level = element.get("level", "moderate")
        cur_rate = "-10%" if level == "strong" else "-5%"

    if tag == "break":
        time_str = element.get("time", "0ms")
        ms = int(re.sub(r'[^0-9]', '', time_str) or "0")
        if ms > 0:
            segments.append({"type": "break", "time_ms": ms})
        return

    if element.text and element.text.strip():
        segments.append({
            "type": "speech", "text": element.text.strip(),
            "rate": cur_rate, "pitch": cur_pitch,
        })

    for child in element:
        _collect(child, segments, cur_rate, cur_pitch)
        if child.tail and child.tail.strip():
            segments.append({
                "type": "speech", "text": child.tail.strip(),
                "rate": cur_rate, "pitch": cur_pitch,
            })


# === Provider: Fish Audio ===

def _get_fish_client():
    """Get Fish Audio client if API key is set."""
    api_key = os.environ.get("FISH_API_KEY")
    if not api_key:
        return None
    try:
        from fishaudio import FishAudio
        return FishAudio(api_key=api_key)
    except ImportError:
        return None


def _rate_to_speed(rate_str: str) -> float:
    """Convert SSML rate percentage to Fish Audio speed multiplier.

    '+10%' → 1.10, '-15%' → 0.85, '+0%' → 1.0
    Clamped to Fish Audio's 0.5–2.0 range.
    """
    rate_str = rate_str.strip().replace("%", "")
    try:
        pct = float(rate_str)
        return max(0.5, min(2.0, 1.0 + pct / 100.0))
    except ValueError:
        return 1.0


def _generate_fish_clips(segments, fish_client, work_dir):
    """Generate audio clips using Fish Audio (per-segment speed control).

    Returns (clip_paths, timings) where timings maps each segment to its
    actual time range in the concatenated output.
    """
    reference_id = os.environ.get("FISH_VOICE_ID")
    clip_paths = []
    timings = []
    offset = 0.0

    for i, seg in enumerate(segments):
        clip_path = os.path.join(work_dir, f"clip_{i:03d}.mp3")

        if seg["type"] == "break":
            _generate_silence(seg["time_ms"], clip_path)
            clip_paths.append(clip_path)
            dur = seg["time_ms"] / 1000
            timings.append({"type": "break", "start": offset, "end": offset + dur})
            offset += dur
            print(f"    [{i}] pause {seg['time_ms']}ms")

        elif seg["type"] == "speech":
            text = seg["text"].strip()
            speed = _rate_to_speed(seg.get("rate", "+0%"))
            try:
                audio_bytes = fish_client.tts.convert(
                    text=text,
                    reference_id=reference_id,
                    speed=speed,
                    model="s1",
                )
                with open(clip_path, "wb") as f:
                    f.write(audio_bytes)
                clip_paths.append(clip_path)
                dur = _get_audio_duration(clip_path)
                timings.append({"type": "speech", "text": text, "start": offset, "end": offset + dur})
                offset += dur
            except Exception as e:
                print(f"    [{i}] FAILED: {e} — skipping")
                continue
            label = text[:25] + ("..." if len(text) > 25 else "")
            print(f'    [{i}] "{label}" speed={speed:.2f}')

    return clip_paths, timings


def _generate_fish_simple(text, fish_client, output_path):
    """Simple full-text Fish Audio generation (no per-segment control)."""
    reference_id = os.environ.get("FISH_VOICE_ID")
    audio_bytes = fish_client.tts.convert(
        text=text,
        reference_id=reference_id,
        model="s1",
    )
    with open(output_path, "wb") as f:
        f.write(audio_bytes)


# === Provider: edge-tts (fallback) ===

def _normalize_prosody(val: str, default: str) -> str:
    """Ensure prosody value has explicit +/- sign prefix (edge-tts requirement)."""
    val = val.strip()
    if not val:
        return default
    if val[0].isdigit():
        return f"+{val}"
    return val


async def _generate_edge_clips(segments, voice, work_dir):
    """Generate audio clips using edge-tts (per-segment rate/pitch).

    Returns (clip_paths, timings).
    """
    import edge_tts

    clip_paths = []
    timings = []
    offset = 0.0

    for i, seg in enumerate(segments):
        clip_path = os.path.join(work_dir, f"clip_{i:03d}.mp3")

        if seg["type"] == "break":
            _generate_silence(seg["time_ms"], clip_path)
            clip_paths.append(clip_path)
            dur = seg["time_ms"] / 1000
            timings.append({"type": "break", "start": offset, "end": offset + dur})
            offset += dur
            print(f"    [{i}] pause {seg['time_ms']}ms")

        elif seg["type"] == "speech":
            text = seg["text"].strip()
            rate = _normalize_prosody(seg.get("rate", "+0%"), "+0%")
            pitch = _normalize_prosody(seg.get("pitch", "+0Hz"), "+0Hz")
            try:
                communicate = edge_tts.Communicate(
                    text, voice=voice, rate=rate, pitch=pitch,
                )
                await communicate.save(clip_path)
                clip_paths.append(clip_path)
                dur = _get_audio_duration(clip_path)
                timings.append({"type": "speech", "text": text, "start": offset, "end": offset + dur})
                offset += dur
            except Exception as e:
                print(f"    [{i}] FAILED: {e} — skipping")
                continue
            label = text[:25] + ("..." if len(text) > 25 else "")
            print(f'    [{i}] "{label}" rate={rate} pitch={pitch}')

    return clip_paths, timings


# === Shared Utilities ===

def _generate_silence(duration_ms: int, output_path: str):
    """Generate a silent audio clip."""
    subprocess.run(
        [
            "ffmpeg", "-y",
            "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono",
            "-t", f"{duration_ms / 1000:.3f}",
            "-c:a", "libmp3lame", "-q:a", "9",
            "-loglevel", "error",
            output_path,
        ],
        check=True,
    )


def _get_audio_duration(path: str) -> float:
    """Get audio file duration in seconds via ffprobe."""
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", path],
        capture_output=True, text=True,
    )
    return float(result.stdout.strip())


def _concat_clips(clip_paths: list[str], output_path: str, work_dir: str):
    """Concatenate audio clips using ffmpeg concat demuxer."""
    list_path = os.path.join(work_dir, "concat.txt")
    with open(list_path, "w") as f:
        for p in clip_paths:
            f.write(f"file '{p}'\n")

    subprocess.run(
        [
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0", "-i", list_path,
            "-c:a", "libmp3lame", "-q:a", "2",
            "-loglevel", "error",
            output_path,
        ],
        check=True,
    )


# === Main Entry Point ===

def generate_directed_audio(text: str, output_path: str, voice: str = "zh-TW-HsiaoChenNeural"):
    """Generate TTS audio with LLM-directed prosody variation.

    Provider priority: Fish Audio S1 → edge-tts.
    Both use LLM SSML direction for per-segment speed/pause control.
    """
    # Step 1: LLM generates SSML directives
    fragment = direct_prosody(text)
    print(f"  SSML preview: {fragment[:150]}...")

    # Step 2: Parse into segments
    segments = parse_ssml_segments(fragment)
    speech_count = sum(1 for s in segments if s["type"] == "speech")
    break_count = sum(1 for s in segments if s["type"] == "break")
    print(f"  Parsed: {speech_count} speech + {break_count} pause segments")

    if not segments:
        # No segments — generate full text directly
        return _fallback_plain(text, output_path, voice)

    # Step 3: Try Fish Audio first
    fish = _get_fish_client()
    if fish:
        try:
            print("  TTS provider: Fish Audio S1")
            return _directed_with_provider(
                segments, output_path,
                lambda segs, tmp: _generate_fish_clips(segs, fish, tmp),
            )
        except Exception as e:
            print(f"  Fish Audio failed ({e}), falling back to edge-tts...")

    # Step 4: Fallback to edge-tts
    print("  TTS provider: edge-tts")
    return _directed_with_provider(
        segments, output_path,
        lambda segs, tmp: asyncio.run(_generate_edge_clips(segs, voice, tmp)),
    )


def _directed_with_provider(segments, output_path, generate_fn):
    """Shared logic: generate clips with a provider, then concatenate.

    Returns (output_path, timings).
    """
    with tempfile.TemporaryDirectory() as tmp:
        clip_paths, timings = generate_fn(segments, tmp)

        if not clip_paths:
            raise RuntimeError("All clips failed")

        if len(clip_paths) == 1:
            shutil.copy2(clip_paths[0], output_path)
        else:
            print(f"  Concatenating {len(clip_paths)} clips...")
            _concat_clips(clip_paths, output_path, tmp)

    print(f"  Directed audio saved: {output_path}")
    return output_path, timings


def _fallback_plain(text, output_path, voice):
    """Last resort: plain TTS without prosody direction."""
    fish = _get_fish_client()
    if fish:
        print("  Fallback: Fish Audio plain")
        _generate_fish_simple(text, fish, output_path)
        return output_path, []

    print("  Fallback: edge-tts plain")
    import edge_tts
    asyncio.run(edge_tts.Communicate(text, voice=voice, rate="-10%").save(output_path))
    return output_path, []


def postprocess_audio(input_path: str, output_path: str):
    """Post-process audio: loudnorm + subtle room tone + EQ."""
    print("  Post-processing audio (loudnorm + EQ)...")
    subprocess.run(
        [
            "ffmpeg", "-y",
            "-i", input_path,
            "-f", "lavfi", "-i", "anoisesrc=d=600:c=pink:a=0.0005",
            "-filter_complex",
            "[1:a]atrim=0:duration=600[tone];"
            "[0:a][tone]amix=inputs=2:duration=first:weights=1 0.003[mixed];"
            "[mixed]highpass=f=80,"
            "equalizer=f=3000:t=q:w=1.5:g=1.5,"
            "acompressor=threshold=-22dB:ratio=2.5:attack=15:release=200:makeup=1.5dB,"
            "loudnorm=I=-16:TP=-1.5:LRA=11[out]",
            "-map", "[out]",
            "-loglevel", "error", output_path,
        ],
        check=True,
    )


if __name__ == "__main__":
    text = "你好，這是一個自動字幕測試。AI 可以把語音轉換成文字，然後生成字幕檔案。這個功能非常實用。"

    print("=== Prosody Director Self-Test ===\n")
    print("Input:", text)

    fragment = direct_prosody(text)
    print("\nSSML Fragment:")
    print(fragment)

    print("\nParsed Segments:")
    segments = parse_ssml_segments(fragment)
    for i, seg in enumerate(segments):
        if seg["type"] == "speech":
            speed = _rate_to_speed(seg.get("rate", "+0%"))
            print(f"  [{i}] speech: \"{seg['text'][:30]}\" rate={seg['rate']} → speed={speed:.2f}")
        else:
            print(f"  [{i}] {seg}")

    # Generate audio
    if "--audio" in sys.argv:
        out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "output", "prosody_test.mp3")
        os.makedirs(os.path.dirname(out), exist_ok=True)
        generate_directed_audio(text, out)
        print(f"\nAudio: {out}")
