#!/usr/bin/env python3
"""Automatic subtitle generation pipeline.

Usage:
  python3 subtitle_gen.py --input video.mp4 --output output.mp4 --language zh
  python3 subtitle_gen.py --input audio.mp3 --srt-only
  python3 subtitle_gen.py --test
"""

import argparse
import json
import os
import subprocess
import sys
import tempfile

from prosody_director import generate_directed_audio, postprocess_audio
from srt_utils import segments_to_srt, write_srt
from subtitle_rules import (
    segment_words_to_subtitles,
    segment_text_by_time,
    detect_language,
    format_lines,
    validate_subtitle,
)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SKILL_DIR = os.path.dirname(SCRIPT_DIR)
OUTPUT_DIR = os.path.join(SKILL_DIR, "output")
FONT_PATH = "/System/Library/Fonts/STHeiti Medium.ttc"
VIDEO_EXTENSIONS = {".mp4", ".mov", ".mkv", ".avi", ".webm", ".flv"}
AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"}


def check_deps():
    """Verify required dependencies are available."""
    # ffmpeg
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
    except (FileNotFoundError, subprocess.CalledProcessError):
        print("ERROR: ffmpeg not found. Install with: brew install ffmpeg")
        sys.exit(1)

    # openai SDK (used for Groq OpenAI-compatible API)
    try:
        import openai  # noqa: F401
    except ImportError:
        print("ERROR: openai package not found. Install with: pip install openai")
        sys.exit(1)

    # Transcription: GROQ_API_KEY (primary) or OPENAI_API_KEY (fallback)
    if not os.environ.get("GROQ_API_KEY") and not os.environ.get("OPENAI_API_KEY"):
        print("ERROR: GROQ_API_KEY or OPENAI_API_KEY environment variable not set")
        sys.exit(1)

    # TTS: FISH_API_KEY (primary) or edge-tts (free fallback)
    if os.environ.get("FISH_API_KEY"):
        print("  TTS: Fish Audio S1 (primary)")
    else:
        print("  TTS: edge-tts (free fallback — set FISH_API_KEY for Fish Audio)")


def is_video(path: str) -> bool:
    return os.path.splitext(path)[1].lower() in VIDEO_EXTENSIONS


def is_audio(path: str) -> bool:
    return os.path.splitext(path)[1].lower() in AUDIO_EXTENSIONS


def extract_audio(video_path: str, output_path: str) -> str:
    """Extract audio from video as 16kHz mono WAV."""
    print(f"  Extracting audio from {os.path.basename(video_path)}...")
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", video_path,
            "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
            "-loglevel", "error", output_path,
        ],
        check=True,
    )
    return output_path


def _get_client():
    """Get OpenAI-compatible client (Groq preferred, OpenAI fallback)."""
    from openai import OpenAI

    groq_key = os.environ.get("GROQ_API_KEY")
    if groq_key:
        return OpenAI(api_key=groq_key, base_url="https://api.groq.com/openai/v1"), "groq"
    return OpenAI(), "openai"


def _parse_attr(obj, key, default=None):
    """Extract attribute from object or dict."""
    if hasattr(obj, key):
        return getattr(obj, key)
    if isinstance(obj, dict):
        return obj.get(key, default)
    return default


def transcribe(audio_path: str, language: str = "zh") -> list[dict]:
    """Transcribe audio and return Netflix-compliant subtitle segments.

    Strategy:
    1. Request word-level timestamps from Whisper API
    2. Regroup words into subtitle segments using Netflix rules
    3. Fall back to segment-level + text splitting if word timestamps unavailable
    """
    client, provider = _get_client()
    model = "whisper-large-v3-turbo" if provider == "groq" else "whisper-1"

    print(f"  Transcribing with {provider} Whisper ({model}, language={language})...")

    # Try word-level timestamps first
    with open(audio_path, "rb") as f:
        kwargs = {
            "model": model,
            "file": f,
            "response_format": "verbose_json",
            "language": language,
        }
        if provider == "openai":
            kwargs["timestamp_granularities"] = ["word", "segment"]
        result = client.audio.transcriptions.create(**kwargs)

    # Extract word-level data if available
    raw_words = _parse_attr(result, "words")
    raw_segments = _parse_attr(result, "segments")
    full_text = _parse_attr(result, "text", "")

    lang = detect_language(full_text) if language == "auto" else language

    # Path A: word-level timestamps → Netflix segmentation
    if raw_words:
        words = []
        for w in raw_words:
            word = str(_parse_attr(w, "word", "")).strip()
            start = float(_parse_attr(w, "start", 0))
            end = float(_parse_attr(w, "end", 0))
            if word and end > start:
                words.append({"word": word, "start": start, "end": end})
        if words:
            print(f"  Got {len(words)} words with timestamps → Netflix segmentation...")
            segments = segment_words_to_subtitles(words, lang=lang)
            _print_segment_summary(segments, lang)
            return segments

    # Path B: segment-level timestamps → post-process long segments
    if raw_segments:
        print(f"  Got {len(list(raw_segments))} raw segments → post-processing...")
        segments = []
        for seg in raw_segments:
            start = float(_parse_attr(seg, "start", 0))
            end = float(_parse_attr(seg, "end", 0))
            text = str(_parse_attr(seg, "text", "")).strip()
            if not text:
                continue
            # Split oversized segments using Netflix rules
            subs = segment_text_by_time(text, start, end, lang=lang)
            segments.extend(subs)
        if segments:
            _print_segment_summary(segments, lang)
            return segments

    # Path C: no timestamps at all → split full text
    print("  No timestamps available → splitting by text rules...")
    duration = get_duration(audio_path)
    segments = segment_text_by_time(str(full_text), 0.0, duration, lang=lang)
    _print_segment_summary(segments, lang)
    return segments


def _print_segment_summary(segments: list[dict], lang: str):
    total_chars = sum(len(s["text"]) for s in segments)
    warnings = 0
    for s in segments:
        if validate_subtitle(s, lang):
            warnings += 1
    status = f", {warnings} warnings" if warnings else ", all PASS"
    print(f"  → {len(segments)} subtitle segments, {total_chars} chars{status}")


def get_duration(media_path: str) -> float:
    """Get media duration in seconds using ffprobe."""
    result = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            media_path,
        ],
        capture_output=True, text=True,
    )
    return float(result.stdout.strip())


def get_video_dimensions(video_path: str) -> tuple[int, int]:
    """Get video width and height."""
    result = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height",
            "-of", "csv=p=0",
            video_path,
        ],
        capture_output=True, text=True,
    )
    w, h = result.stdout.strip().split(",")
    return int(w), int(h)


def has_subtitle_filter() -> bool:
    """Check if ffmpeg has the subtitles filter (requires libass)."""
    result = subprocess.run(
        ["ffmpeg", "-hide_banner", "-filters"],
        capture_output=True, text=True,
    )
    return "subtitles" in result.stdout


def burn_with_libass(video_path: str, srt_path: str, output_path: str):
    """Burn subtitles using ffmpeg's subtitles filter (requires libass)."""
    print("  Burning subtitles with libass...")
    style = (
        "FontName=Heiti SC,FontSize=24,PrimaryColour=&H00FFFFFF,"
        "OutlineColour=&H00000000,Outline=2,MarginV=40"
    )
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", video_path,
            "-vf", f"subtitles={srt_path}:force_style='{style}'",
            "-c:a", "copy",
            "-loglevel", "error", output_path,
        ],
        check=True,
    )


def render_subtitle_image(
    text: str, output_path: str, width: int, height: int,
    font_size: int = 56,
):
    """Render subtitle text as a transparent PNG overlay using PIL.

    Netflix-style: white text, black outline, bottom-center, semi-transparent bg band.
    """
    from PIL import Image, ImageDraw, ImageFont

    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    try:
        font = ImageFont.truetype(FONT_PATH, font_size)
    except OSError:
        font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), text, font=font, anchor="lt")
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (width - text_w) // 2
    y = height - text_h - 120  # 120px margin from bottom

    # Semi-transparent background band for readability
    pad_x, pad_y = 24, 12
    draw.rounded_rectangle(
        [x - pad_x, y - pad_y, x + text_w + pad_x, y + text_h + pad_y],
        radius=8,
        fill=(0, 0, 0, 160),
    )

    # Black outline (3px thick)
    for dx in range(-3, 4):
        for dy in range(-3, 4):
            if dx == 0 and dy == 0:
                continue
            if abs(dx) + abs(dy) > 4:
                continue
            draw.text((x + dx, y + dy), text, font=font, fill=(0, 0, 0, 230))

    # White text
    draw.text((x, y), text, font=font, fill=(255, 255, 255, 255))
    img.save(output_path, "PNG")


def burn_with_pil_overlay(
    video_path: str, segments: list[dict], output_path: str, work_dir: str,
):
    """Burn subtitles using PIL-rendered overlays + ffmpeg overlay filter."""
    print("  Burning subtitles with PIL overlay (no libass)...")
    width, height = get_video_dimensions(video_path)

    inputs = ["-i", video_path]
    filter_parts = []

    for i, seg in enumerate(segments):
        text = seg["text"].strip()
        if not text:
            continue
        overlay_path = os.path.join(work_dir, f"sub_{i}.png")
        render_subtitle_image(text, overlay_path, width, height)
        inputs.extend(["-i", overlay_path])

        input_idx = i + 1
        src = f"[tmp{i}]" if i > 0 else "[0:v]"
        is_last = i == len(segments) - 1
        dst = "[outv]" if is_last else f"[tmp{i + 1}]"
        start = seg["start"]
        end = seg["end"]
        filter_parts.append(
            f"{src}[{input_idx}:v]overlay=0:0:enable='between(t,{start:.3f},{end:.3f})'{dst}"
        )

    if not filter_parts:
        # No segments to burn, just copy
        subprocess.run(
            ["ffmpeg", "-y", "-i", video_path, "-c", "copy", "-loglevel", "error", output_path],
            check=True,
        )
        return

    filter_complex = ";".join(filter_parts)
    cmd = [
        "ffmpeg", "-y", *inputs,
        "-filter_complex", filter_complex,
        "-map", "[outv]", "-map", "0:a?",
        "-c:v", "libx264", "-preset", "fast", "-c:a", "copy",
        "-loglevel", "error", output_path,
    ]
    subprocess.run(cmd, check=True)


def generate_test_audio(output_path: str, work_dir: str) -> str:
    """Generate test audio using AI-directed SSML prosody + edge-tts."""
    text = "你好，這是一個自動字幕測試。AI 可以把語音轉換成文字，然後生成字幕檔案。這個功能非常實用。"

    raw_path = os.path.join(work_dir, "tts_raw.mp3")

    # AI-directed TTS (Fish Audio S1 → edge-tts fallback)
    try:
        generate_directed_audio(text, raw_path)
    except Exception as e:
        print(f"  Directed TTS failed ({e}), using plain fallback...")
        # Try Fish Audio plain, then edge-tts
        fish_key = os.environ.get("FISH_API_KEY")
        if fish_key:
            from prosody_director import _get_fish_client, _generate_fish_simple
            fish = _get_fish_client()
            if fish:
                _generate_fish_simple(text, fish, raw_path)
            else:
                import edge_tts, asyncio
                asyncio.run(edge_tts.Communicate(text, "zh-TW-HsiaoChenNeural", rate="-10%").save(raw_path))
        else:
            import edge_tts, asyncio
            asyncio.run(edge_tts.Communicate(text, "zh-TW-HsiaoChenNeural", rate="-10%").save(raw_path))

    # Post-process: loudnorm + room tone + EQ
    processed_path = os.path.join(work_dir, "tts_processed.mp3")
    try:
        postprocess_audio(raw_path, processed_path)
    except Exception as e:
        print(f"  Post-processing failed ({e}), using raw audio...")
        processed_path = raw_path

    # Convert to 16kHz mono for Whisper compatibility
    subprocess.run(
        ["ffmpeg", "-y", "-i", processed_path,
         "-ar", "16000", "-ac", "1", "-loglevel", "error", output_path],
        check=True,
    )
    print(f"  Test audio saved: {output_path}")
    return output_path


def mix_bgm(voice_path: str, output_path: str, work_dir: str, bgm_volume: float = 0.10):
    """Mix voice with BGM at specified volume ratio. Returns output path."""
    # Look for BGM file in threads-video assets or skill assets
    bgm_candidates = [
        os.path.join(SKILL_DIR, "assets", "bgm.mp3"),
        os.path.join(SKILL_DIR, "..", "threads-video", "assets", "bgm.mp3"),
    ]
    bgm_path = None
    for p in bgm_candidates:
        if os.path.isfile(p):
            bgm_path = os.path.abspath(p)
            break

    if not bgm_path:
        print("  No BGM file found, skipping BGM mix")
        # Just copy voice as-is
        subprocess.run(["ffmpeg", "-y", "-i", voice_path, "-c", "copy",
                         "-loglevel", "error", output_path], check=True)
        return output_path

    print(f"  Mixing BGM at {int(bgm_volume * 100)}% volume...")
    subprocess.run(
        [
            "ffmpeg", "-y",
            "-i", voice_path,
            "-i", bgm_path,
            "-filter_complex",
            f"[1:a]volume={bgm_volume}[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[out]",
            "-map", "[out]",
            "-ar", "16000", "-ac", "1",
            "-loglevel", "error", output_path,
        ],
        check=True,
    )
    return output_path


def generate_test_video(audio_path: str, output_path: str, width: int = 1080, height: int = 1920):
    """Generate a dark gradient background video matching audio duration."""
    duration = get_duration(audio_path)
    print(f"  Generating {width}x{height} test video ({duration:.1f}s)...")
    # Dark blue gradient background instead of pure black
    subprocess.run(
        [
            "ffmpeg", "-y",
            "-f", "lavfi", "-i",
            f"gradients=s={width}x{height}:c0=#1a1a2e:c1=#16213e:d={duration}:r=30:speed=0.01",
            "-i", audio_path,
            "-c:v", "libx264", "-preset", "fast", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k",
            "-shortest", "-loglevel", "error", output_path,
        ],
        check=True,
    )
    return output_path


def run_test():
    """Run end-to-end self-test: TTS → transcribe → SRT → burn."""
    print("\n=== Lv.3 Subtitle Generation Test ===\n")
    check_deps()
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        # Step 1: Generate test audio (shimmer 0.9x → edge-tts → macOS say)
        voice_path = os.path.join(tmp, "voice_raw.mp3")
        generate_test_audio(voice_path, tmp)

        # Step 1b: Mix BGM at 10% volume
        audio_path = os.path.join(tmp, "test_audio.mp3")
        mix_bgm(voice_path, audio_path, tmp, bgm_volume=0.10)

        # Step 2: Transcribe (from voice-only for accuracy)
        segments = transcribe(voice_path, language="zh")

        # Step 3: Generate SRT
        srt_path = os.path.join(OUTPUT_DIR, "test.srt")
        write_srt(segments, srt_path, lang="zh")
        print(f"\n  SRT saved: {srt_path}")
        print("  --- SRT content ---")
        with open(srt_path, encoding="utf-8") as f:
            print(f.read())
        print("  --- end ---")

        # Netflix QA validation
        print("  --- Netflix QA ---")
        all_pass = True
        for i, seg in enumerate(segments, 1):
            warns = validate_subtitle(seg, "zh")
            dur = (seg['end'] - seg['start']) * 1000
            cps = len(seg['text'].strip()) / max(dur / 1000, 0.1)
            status = "PASS" if not warns else f"WARN: {'; '.join(warns)}"
            if warns:
                all_pass = False
            print(f"  [{i}] {dur:.0f}ms {cps:.1f}CPS {status}")
        print(f"  Result: {'ALL PASS' if all_pass else 'HAS WARNINGS'}")
        print("  --- end ---\n")

        # Step 4: Generate black video with audio
        base_video = os.path.join(tmp, "base.mp4")
        generate_test_video(audio_path, base_video)

        # Step 5: Burn subtitles
        output_path = os.path.join(OUTPUT_DIR, "test_with_subs.mp4")
        if has_subtitle_filter():
            burn_with_libass(base_video, srt_path, output_path)
        else:
            burn_with_pil_overlay(base_video, segments, output_path, tmp)

        # Summary
        duration = get_duration(output_path)
        size_mb = os.path.getsize(output_path) / (1024 * 1024)
        print(f"\n=== Test Complete ===")
        print(f"  Segments: {len(segments)}")
        print(f"  Duration: {duration:.1f}s")
        print(f"  SRT:      {srt_path}")
        print(f"  Video:    {output_path} ({size_mb:.1f} MB)")
        print(f"  Method:   {'libass' if has_subtitle_filter() else 'PIL overlay'}")


def run_pipeline(input_path: str, output_path: str | None, language: str, srt_only: bool):
    """Run the full subtitle generation pipeline."""
    check_deps()
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    basename = os.path.splitext(os.path.basename(input_path))[0]

    with tempfile.TemporaryDirectory() as tmp:
        # Step 1: Get audio
        if is_video(input_path):
            audio_path = os.path.join(tmp, "audio.wav")
            extract_audio(input_path, audio_path)
        elif is_audio(input_path):
            audio_path = input_path
        else:
            print(f"ERROR: Unsupported file type: {input_path}")
            sys.exit(1)

        # Step 2: Transcribe
        segments = transcribe(audio_path, language=language)

        # Step 3: Generate SRT
        srt_path = os.path.join(OUTPUT_DIR, f"{basename}.srt")
        write_srt(segments, srt_path)
        print(f"\n  SRT saved: {srt_path}")

        if srt_only:
            print("\n  Done (--srt-only mode)")
            return

        # Step 4: Burn subtitles
        if not is_video(input_path):
            print("\n  Input is audio-only. Use --input with a video file to burn subtitles.")
            print("  Or use the generated SRT file with your video editor.")
            return

        if output_path is None:
            output_path = os.path.join(OUTPUT_DIR, f"{basename}_subs.mp4")

        if has_subtitle_filter():
            burn_with_libass(input_path, srt_path, output_path)
        else:
            burn_with_pil_overlay(input_path, segments, output_path, tmp)

        duration = get_duration(output_path)
        size_mb = os.path.getsize(output_path) / (1024 * 1024)
        print(f"\n=== Done ===")
        print(f"  Segments: {len(segments)}")
        print(f"  Duration: {duration:.1f}s")
        print(f"  SRT:      {srt_path}")
        print(f"  Video:    {output_path} ({size_mb:.1f} MB)")


def main():
    parser = argparse.ArgumentParser(description="Automatic subtitle generation")
    parser.add_argument("--input", "-i", help="Input video or audio file")
    parser.add_argument("--output", "-o", help="Output video path (default: output/<name>_subs.mp4)")
    parser.add_argument("--language", "-l", default="zh", help="Language code (default: zh)")
    parser.add_argument("--srt-only", action="store_true", help="Only generate SRT, don't burn")
    parser.add_argument("--test", action="store_true", help="Run end-to-end self-test")
    args = parser.parse_args()

    if args.test:
        run_test()
    elif args.input:
        if not os.path.isfile(args.input):
            print(f"ERROR: File not found: {args.input}")
            sys.exit(1)
        run_pipeline(args.input, args.output, args.language, args.srt_only)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
