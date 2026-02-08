#!/usr/bin/env python3
"""
《霧》Podcast Production Pipeline (v4 — paragraph architecture)

Usage:
    python3 produce.py                          # LLM generates script + produce
    python3 produce.py --seed "雨後的停車場"     # LLM with scene seed
    python3 produce.py --script ep01.txt        # Use existing script
    python3 produce.py --ambient rain           # Override ambient type
"""

import argparse
import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import requests

# ── Config ──
SCRIPT_DIR = Path(__file__).parent
SKILL_DIR = SCRIPT_DIR.parent
PROMPT_PATH = SKILL_DIR / "prompts" / "system.md"
AMBIENT_DIR = SKILL_DIR / "ambient"
OUTPUT_DIR = SKILL_DIR / "output"

FISH_API_KEY = os.environ.get("FISH_API_KEY", "d94e85fbf1c54627a0aeb13380c87387")
FISH_VOICE_ID = os.environ.get("FISH_VOICE_ID", "7f92f8afb8ec43bf81429cc1c9199cb1")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

# Ambient sound settings
AMBIENT_LEAD = 6.0    # seconds of ambient before voice
AMBIENT_TAIL = 2.0    # ambient continues after last line
AMBIENT_VOLUME = 0.15 # ambient volume relative to voice

# Pause rules (v4: between paragraphs only — within-paragraph flow is natural TTS)
PAUSE_PARAGRAPH = 2.0  # default silence between paragraphs
PAUSE_END = 0.0        # no trailing silence — hard stop

# Voice post-processing EQ (warm + clean)
VOICE_EQ = (
    "loudnorm=I=-16:TP=-1.5:LRA=11,"
    "equalizer=f=180:t=q:w=1.5:g=2.5,"   # warm low-mids
    "equalizer=f=2800:t=q:w=2:g=-1.5,"    # de-ess
    "equalizer=f=6000:t=q:w=2:g=-2,"      # de-metallic
    "acompressor=threshold=-20dB:ratio=3:attack=10:release=100:makeup=2"
)


# ── Ambient Sound Generation ──

AMBIENT_PROFILES = {
    "convenience_store": {
        "description": "Late night convenience store",
        "ffmpeg_filter": (
            "anoisesrc=s=44100:c=pink:a=0.003:d={dur},"
            "highpass=f=200,lowpass=f=2000"
        ),
    },
    "night_street": {
        "description": "Distant traffic on a quiet night",
        "ffmpeg_filter": (
            "anoisesrc=s=44100:c=brown:a=0.004:d={dur},"
            "highpass=f=80,lowpass=f=800"
        ),
    },
    "rain": {
        "description": "Light rain",
        "ffmpeg_filter": (
            "anoisesrc=s=44100:c=white:a=0.002:d={dur},"
            "highpass=f=1000,lowpass=f=8000"
        ),
    },
    "quiet_room": {
        "description": "Almost-silent room tone",
        "ffmpeg_filter": (
            "anoisesrc=s=44100:c=brown:a=0.001:d={dur},"
            "highpass=f=100,lowpass=f=500"
        ),
    },
    "rooftop": {
        "description": "Rooftop after rain — wind + distant city",
        "ffmpeg_filter": (
            "anoisesrc=s=44100:c=brown:a=0.003:d={dur},"
            "highpass=f=60,lowpass=f=600"
        ),
    },
}

# Map scene keywords to ambient type
SCENE_HINTS = {
    "便利商店": "convenience_store",
    "超商": "convenience_store",
    "咖啡": "convenience_store",
    "街": "night_street",
    "路": "night_street",
    "車站": "night_street",
    "捷運": "night_street",
    "停車場": "night_street",
    "頂樓": "rooftop",
    "陽台": "rooftop",
    "雨": "rain",
    "下雨": "rain",
    "窗": "quiet_room",
    "房間": "quiet_room",
    "床": "quiet_room",
    "搬家": "quiet_room",
    "冰箱": "quiet_room",
    "廚房": "quiet_room",
}


def detect_ambient(script_text: str) -> str:
    """Guess ambient type from the first line of the script."""
    first_line = script_text.strip().split("\n")[0]
    for keyword, ambient in SCENE_HINTS.items():
        if keyword in first_line:
            return ambient
    return "quiet_room"


def generate_ambient(ambient_type: str, duration: float, output_path: str):
    """Generate synthetic ambient sound using ffmpeg."""
    profile = AMBIENT_PROFILES.get(ambient_type, AMBIENT_PROFILES["quiet_room"])
    filt = profile["ffmpeg_filter"].format(dur=duration)
    subprocess.run([
        "ffmpeg", "-y", "-f", "lavfi", "-i", filt,
        "-t", str(duration), "-ar", "44100", "-ac", "1",
        output_path
    ], capture_output=True)
    return output_path


# ── Script Generation ──

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyAIfdw1ZO0XhUgaXKrasXV1v-tIsFyuT5M")
CRAFT_PATH = SKILL_DIR / "prompts" / "craft.md"


def generate_script(seed: str = None, idea: str = None) -> str:
    """Use Gemini to generate a 《霧》script."""
    system_prompt = PROMPT_PATH.read_text()
    craft = CRAFT_PATH.read_text() if CRAFT_PATH.exists() else ""

    full_system = system_prompt + "\n\n---\n\n" + craft

    if idea:
        user_msg = f"念頭：「{idea}」\n\n用你的技法把它包進一個場景。"
    elif seed:
        user_msg = f"場景：{seed}"
    else:
        user_msg = "場景：任何一個安靜的場景"

    models = ["gemini-2.5-pro-preview-05-06", "gemini-2.0-flash"]
    for model in models:
        try:
            resp = requests.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}",
                json={
                    "systemInstruction": {"parts": [{"text": full_system}]},
                    "contents": [{"parts": [{"text": user_msg}]}],
                    "generationConfig": {"temperature": 0.9, "maxOutputTokens": 8192},
                },
            )
            resp.raise_for_status()
            text = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
            print(f"  (model: {model})")
            return text
        except Exception as e:
            print(f"  {model} failed: {e}, trying next...")
    raise RuntimeError("All models failed")


# ── Polyphone Pre-processing ──
# Fish Audio has no phoneme annotation — rewrite known traps with context clues

# Homophone substitution for TTS only — script text stays clean.
# Replace polyphone characters with unambiguous same-sound characters.
# Format: (original, tts_replacement)
POLYPHONE_FIXES = [
    # 乾 (gān dry) — Fish reads as qián. Replace with 甘 (only gān).
    ("乾淨", "甘淨"),
    ("乾掉", "甘掉"),
    ("乾了", "甘了"),
    ("乾乾", "甘甘"),
    ("乾燥", "甘燥"),
    ("乾杯", "甘杯"),
    # Standalone 乾 as "dry" (after filtering compounds above)
    ("慢慢乾", "慢慢甘"),
    ("還沒乾", "還沒甘"),
    ("快乾", "快甘"),
    ("在乾", "在甘"),
    ("擦乾", "擦甘"),
    ("晾乾", "晾甘"),
    ("烘乾", "烘甘"),
    ("吹乾", "吹甘"),
    # 還 (hái still) — sometimes read as huán (return)
    # 還 context usually correct, add fixes only if needed
    # 重 (zhòng heavy) vs (chóng repeat)
    ("重新", "蟲新"),
    ("重複", "蟲複"),
    ("重來", "蟲來"),
    # 長 (zhǎng grow) vs (cháng long)
    ("長大", "掌大"),
    ("長出", "掌出"),
    # 行 (xíng ok/walk) vs (háng row/profession)
    ("不行", "不型"),
    ("可行", "可型"),
    # 便 (pián cheap) vs (biàn convenient)
    ("便宜", "騙宜"),
]


def fix_polyphones(text: str) -> str:
    """Homophone substitution for TTS — fixes polyphone misreads.

    Only modifies text sent to TTS engine, not the saved script.
    Uses unambiguous same-sound characters to force correct pronunciation.
    """
    for old, new in POLYPHONE_FIXES:
        text = text.replace(old, new)
    return text


# ── TTS ──

def tts_paragraph(text: str, output_path: str):
    """Generate TTS for a paragraph (multiple lines) using Fish Audio.

    v4 architecture: TTS per paragraph preserves natural speech flow.
    Lines within a paragraph are joined with commas for natural pausing.
    """
    text = fix_polyphones(text)
    resp = requests.post(
        "https://api.fish.audio/v1/tts",
        headers={
            "Authorization": f"Bearer {FISH_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "text": text,
            "reference_id": FISH_VOICE_ID,
            "format": "wav",
            "latency": "balanced",
        },
        stream=True,
    )
    resp.raise_for_status()
    with open(output_path, "wb") as f:
        for chunk in resp.iter_content(8192):
            f.write(chunk)


def get_duration(path: str) -> float:
    r = subprocess.run(
        ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
         "-of", "csv=p=0", path],
        capture_output=True, text=True,
    )
    return float(r.stdout.strip())


# ── Paragraph Parser ──

def parse_paragraphs(text: str) -> list[dict]:
    """Parse script into paragraphs with pause durations.

    Returns list of:
        {"text": "paragraph text (lines joined)", "pause_after": seconds}

    v4 architecture: each paragraph is one TTS unit.
    Blank lines = paragraph breaks with designed silence gaps.
    """
    paragraphs = []
    current_lines = []
    raw_lines = text.strip().split("\n")

    for line in raw_lines:
        stripped = line.strip()
        # Skip instruction/meta lines
        if stripped.startswith("（") or stripped.startswith("("):
            continue
        if not stripped:
            if current_lines:
                paragraphs.append(current_lines)
                current_lines = []
        else:
            current_lines.append(stripped)

    if current_lines:
        paragraphs.append(current_lines)

    if not paragraphs:
        return []

    # Build paragraph list with context-aware pause durations
    n = len(paragraphs)
    result = []
    for i, lines in enumerate(paragraphs):
        # Join lines within paragraph — TTS reads as continuous speech
        # Don't add comma if line already ends with punctuation
        if len(lines) > 1:
            parts = []
            for line in lines:
                parts.append(line)
            joined = ""
            for j, part in enumerate(parts):
                joined += part
                if j < len(parts) - 1 and not part[-1] in "，。！？、：；…":
                    joined += "，"
        else:
            joined = lines[0]

        # Context-aware pauses (last paragraph has no pause after)
        if i == n - 1:
            pause = PAUSE_END
        elif i == 0:
            pause = 1.5  # after opening scene — brief
        elif i >= n * 0.55 and i <= n * 0.7:
            pause = 2.5  # cognitive gap area — let it sink in
        else:
            pause = PAUSE_PARAGRAPH

        result.append({"text": joined, "lines": lines, "pause_after": pause})

    return result


# ── Assembly ──

def make_silence(duration: float, output_path: str):
    """Generate a silence WAV file."""
    subprocess.run([
        "ffmpeg", "-y", "-f", "lavfi",
        "-i", "anullsrc=r=44100:cl=mono",
        "-t", str(duration), output_path
    ], capture_output=True)


def produce(script_text: str, ambient_type: str = None, output_name: str = None):
    """Full production pipeline: script -> audio file.

    v4 architecture:
    - TTS per paragraph (not per line) — preserves natural speech flow
    - Precision silences between paragraphs — designed rhythm
    - Warm voice EQ + ambient mix
    """
    tmp = tempfile.mkdtemp()
    paragraphs = parse_paragraphs(script_text)

    if not paragraphs:
        print("  No paragraphs found in script")
        return None

    if not ambient_type:
        ambient_type = detect_ambient(script_text)

    print(f"  Paragraphs: {len(paragraphs)}")
    print(f"  Ambient: {ambient_type}")

    # 1. TTS all paragraphs
    print("  TTS...")
    tts_paths = []
    for i, para in enumerate(paragraphs):
        p = os.path.join(tmp, f"para_{i:02d}.wav")
        tts_paragraph(para["text"], p)
        tts_paths.append(p)
        time.sleep(0.3)
        preview = para["text"][:30]
        print(f"  [{i+1}/{len(paragraphs)}] {preview}...")

    # 2. Build concat list: ambient lead-in + (paragraph + silence) pairs
    print("  Assembly...")

    # Ambient lead-in silence
    sil_lead = os.path.join(tmp, "sil_lead.wav")
    make_silence(AMBIENT_LEAD, sil_lead)

    # Pre-generate silence files for each unique duration
    silence_cache = {}
    for para in paragraphs:
        d = para["pause_after"]
        if d > 0 and d not in silence_cache:
            path = os.path.join(tmp, f"sil_{d:.1f}.wav")
            make_silence(d, path)
            silence_cache[d] = path

    # Build concat list
    concat_list = os.path.join(tmp, "concat.txt")
    with open(concat_list, "w") as f:
        f.write(f"file '{sil_lead}'\n")
        for i, (para, tts_path) in enumerate(zip(paragraphs, tts_paths)):
            f.write(f"file '{tts_path}'\n")
            if para["pause_after"] > 0:
                f.write(f"file '{silence_cache[para['pause_after']]}'\n")

    # Concat voice track
    voice_raw = os.path.join(tmp, "voice_raw.wav")
    subprocess.run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", concat_list, "-c", "copy", voice_raw
    ], capture_output=True)

    # 3. Voice processing (warm EQ + normalize + compress)
    print("  Voice processing...")
    voice_proc = os.path.join(tmp, "voice_proc.wav")
    subprocess.run([
        "ffmpeg", "-y", "-i", voice_raw,
        "-af", VOICE_EQ,
        voice_proc
    ], capture_output=True)

    voice_duration = get_duration(voice_proc)
    total_duration = voice_duration + AMBIENT_TAIL
    print(f"  Voice: {voice_duration:.1f}s | Total: {total_duration:.1f}s")

    # 4. Generate ambient track (full duration)
    print("  Ambient...")
    ambient_track = os.path.join(tmp, "ambient.wav")
    generate_ambient(ambient_type, total_duration, ambient_track)

    # 5. Mix voice + ambient
    print("  Mix...")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    if not output_name:
        first_line = paragraphs[0]["lines"][0] if paragraphs else "fog"
        output_name = first_line[:10].replace(" ", "_")

    final_path = OUTPUT_DIR / f"{output_name}.mp3"

    subprocess.run([
        "ffmpeg", "-y",
        "-i", voice_proc,
        "-i", ambient_track,
        "-filter_complex",
        f"[1:a]volume={AMBIENT_VOLUME}[amb];"
        f"[0:a][amb]amix=inputs=2:duration=longest:dropout_transition=0[out]",
        "-map", "[out]",
        "-c:a", "libmp3lame", "-b:a", "192k",
        "-t", str(total_duration),
        str(final_path)
    ], capture_output=True)

    final_dur = get_duration(str(final_path))
    final_size = os.path.getsize(final_path) / 1024 / 1024

    print(f"\n  {final_path}")
    print(f"  {final_dur:.1f}s | {final_size:.1f}MB")

    # 6. Save script alongside
    script_path = final_path.with_suffix(".txt")
    script_path.write_text(script_text)
    print(f"  Script: {script_path}")

    # 7. Generate Threads excerpt
    all_lines = []
    for p in paragraphs:
        all_lines.extend(p["lines"])
    threads_excerpt = generate_threads_excerpt(all_lines)
    threads_path = final_path.with_suffix(".threads.txt")
    threads_path.write_text(threads_excerpt)
    print(f"  Threads: {threads_path}")

    return str(final_path)


def generate_threads_excerpt(lines: list) -> str:
    """Pick 2-4 lines for Threads. No hashtag, no emoji, no explanation."""
    if len(lines) <= 3:
        return "\n".join(lines)

    # Take lines around the cognitive gap (60-70% area)
    mid = int(len(lines) * 0.6)
    start = max(0, mid - 1)
    end = min(len(lines), mid + 2)
    selected = lines[start:end]
    return "\n".join(selected)


# ── CLI ──

def main():
    parser = argparse.ArgumentParser(description="《霧》Podcast Producer (v4)")
    parser.add_argument("--seed", type=str, help="Scene seed for LLM generation")
    parser.add_argument("--idea", type=str, help="Raw idea to wrap in fog")
    parser.add_argument("--script", type=str, help="Path to existing script file")
    parser.add_argument("--ambient", type=str, choices=list(AMBIENT_PROFILES.keys()),
                        help="Override ambient sound type")
    parser.add_argument("--name", type=str, help="Output filename (without extension)")
    args = parser.parse_args()

    print("《霧》v4")
    print()

    if args.script:
        script_text = Path(args.script).read_text()
        print(f"  Script: {args.script}")
    elif args.idea:
        print(f"  Idea: {args.idea}")
        print("  Generating...")
        script_text = generate_script(idea=args.idea)
        print()
        print("─" * 40)
        print(script_text)
        print("─" * 40)
        print()
    else:
        print("  Generating...")
        script_text = generate_script(seed=args.seed)
        print()
        print("─" * 40)
        print(script_text)
        print("─" * 40)
        print()

    produce(script_text, ambient_type=args.ambient, output_name=args.name)


if __name__ == "__main__":
    main()
