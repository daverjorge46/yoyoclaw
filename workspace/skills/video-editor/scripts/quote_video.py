#!/usr/bin/env python3
"""Quote-style video generator — typewriter text over static or AI-generated backgrounds.

Modes:
  Basic:  static background (image or gradient) + typewriter text
  Reels:  AI-generated images per segment + Ken Burns animation + typewriter text

Usage:
  python3 quote_video.py --text "你的語錄" --bg cherry.jpg -o output.mp4
  python3 quote_video.py --test
  python3 quote_video.py --test --reels    # AI images + Ken Burns
"""

import argparse
import os
import subprocess
import sys
import tempfile

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SKILL_DIR = os.path.dirname(SCRIPT_DIR)
OUTPUT_DIR = os.path.join(SKILL_DIR, "output")
GEMINI_MEDIA_DIR = os.path.join(SKILL_DIR, "..", "gemini-media")
FONT_PATH = "/System/Library/Fonts/PingFang.ttc"
FONT_FALLBACK = "/System/Library/Fonts/STHeiti Medium.ttc"

WIDTH = 1080
HEIGHT = 1920
CHARS_PER_LINE = 7


def split_quote_lines(text: str, max_chars: int = CHARS_PER_LINE) -> list[str]:
    """Split quote text into centered display lines."""
    text = text.strip().replace("\n", "")
    lines = []
    current = ""
    for char in text:
        current += char
        if char in "。！？" or len(current) >= max_chars:
            lines.append(current)
            current = ""
        elif char in "，、；：" and len(current) >= max_chars - 2:
            lines.append(current)
            current = ""
    if current.strip():
        lines.append(current)
    return lines


def compute_appear_times(
    flat_text: str, audio_duration: float, segment_timings: list[dict] | None = None,
) -> list[float]:
    """Map each character to its appear time, aligned to TTS segment timing.

    If segment_timings is provided (from prosody_director), characters are
    distributed within each speech segment's actual time range.
    Otherwise falls back to even distribution.
    """
    if not segment_timings:
        return _compute_appear_times_even(flat_text, audio_duration)

    speech_segs = [s for s in segment_timings if s["type"] == "speech"]
    if not speech_segs:
        return _compute_appear_times_even(flat_text, audio_duration)

    # Scale timings if post-processing changed duration
    raw_end = max(s["end"] for s in segment_timings)
    scale = audio_duration / raw_end if raw_end > 0.01 else 1.0

    times = [0.0] * len(flat_text)
    char_cursor = 0

    for seg in speech_segs:
        seg_text = seg["text"]
        seg_start = seg["start"] * scale
        seg_end = seg["end"] * scale
        seg_dur = seg_end - seg_start
        n = len(seg_text)
        if n == 0:
            continue

        interval = seg_dur / n
        for j in range(n):
            if char_cursor < len(flat_text):
                times[char_cursor] = seg_start + j * interval
                char_cursor += 1

    # Fill any remaining characters at last known time
    last_t = times[char_cursor - 1] if char_cursor > 0 else 0.0
    while char_cursor < len(flat_text):
        times[char_cursor] = last_t
        char_cursor += 1

    return times


def _compute_appear_times_even(flat_text: str, audio_duration: float) -> list[float]:
    """Fallback: distribute characters evenly across duration."""
    content_indices = [i for i, ch in enumerate(flat_text) if ch.strip()]
    n = len(content_indices)
    if n == 0:
        return [0.0] * len(flat_text)

    interval = (audio_duration * 0.92) / n
    times = [0.0] * len(flat_text)
    t = 0.15

    for idx in content_indices:
        times[idx] = t
        ch = flat_text[idx]
        t += interval
        if ch in "。！？":
            t += 0.4
        elif ch in "，、；：":
            t += 0.15

    last_t = 0.0
    for i in range(len(times)):
        if flat_text[i].strip():
            last_t = times[i]
        else:
            times[i] = last_t

    return times


def _load_bg(image_path, width, height):
    """Load and fit background image, or create gradient."""
    from PIL import Image, ImageFilter

    if image_path and os.path.isfile(image_path):
        img = Image.open(image_path).convert("RGB")
        # Fill-crop to target dimensions
        w, h = img.size
        ratio = max(width / w, height / h)
        img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
        left = (img.width - width) // 2
        top = (img.height - height) // 2
        img = img.crop((left, top, left + width, top + height))
        # Subtle blur for readability
        img = img.filter(ImageFilter.GaussianBlur(radius=4))
        return img

    # Fallback: dark gradient via PIL
    img = Image.new("RGB", (width, height))
    pixels = img.load()
    for y in range(height):
        r = y / height
        color = (int(26 + r * -4), int(26 + r * 7), int(46 + r * 16))
        for x in range(width):
            pixels[x, y] = color
    return img


def _load_font(size: int):
    """Load font with PingFang primary, STHeiti fallback."""
    from PIL import ImageFont

    for path in (FONT_PATH, FONT_FALLBACK):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def _draw_soft_shadow(frame, draw, x, y, text, font, width, height):
    """Draw soft Gaussian blur shadow behind text (Netflix-style)."""
    from PIL import Image, ImageDraw as ID, ImageFilter

    shadow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    sd = ID.Draw(shadow)
    sd.text((x + 3, y + 4), text, font=font, fill=(0, 0, 0, 180))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=8))
    # Composite shadow onto frame
    if frame.mode == "RGBA":
        return Image.alpha_composite(frame, shadow)
    # For RGB frames (basic mode), paste with mask
    frame.paste(shadow, mask=shadow.split()[3])
    return frame


def _draw_text_state(bg, lines, visible_count, font, font_size, width, height):
    """Render a single frame with typewriter text state."""
    from PIL import ImageDraw

    frame = bg.copy()
    draw = ImageDraw.Draw(frame)
    line_height = font_size + 18
    total_height = len(lines) * line_height
    y_start = (height - total_height) // 2

    char_idx = 0
    for line_idx, line in enumerate(lines):
        visible_in_line = ""
        for ch in line:
            if char_idx < visible_count:
                visible_in_line += ch
            char_idx += 1

        if not visible_in_line:
            continue

        y = y_start + line_idx * line_height
        bbox = draw.textbbox((0, 0), visible_in_line, font=font)
        text_w = bbox[2] - bbox[0]
        x = (width - text_w) // 2

        # Soft shadow + white text
        frame = _draw_soft_shadow(frame, draw, x, y, visible_in_line, font, width, height)
        draw = ImageDraw.Draw(frame)
        draw.text((x, y), visible_in_line, font=font, fill=(255, 255, 255))

    return frame


def render_typewriter_video(
    lines, appear_times, bg_image_path, output_path, duration,
    width=WIDTH, height=HEIGHT, font_size=72,
):
    """Render typewriter animation as a video using image concat."""
    bg = _load_bg(bg_image_path, width, height)
    font = _load_font(font_size)

    flat_text = "".join(lines)
    total_chars = len(flat_text)

    # Find unique transition times
    unique_times = sorted(set(appear_times))

    with tempfile.TemporaryDirectory() as tmp:
        entries = []

        # Initial blank state
        if unique_times and unique_times[0] > 0.01:
            png = os.path.join(tmp, "state_blank.png")
            bg.save(png)
            entries.append((unique_times[0], png))

        for si, t in enumerate(unique_times):
            visible = sum(1 for at in appear_times if at <= t)
            png = os.path.join(tmp, f"state_{si:04d}.png")
            frame = _draw_text_state(bg, lines, visible, font, font_size, width, height)
            frame.save(png)

            if si + 1 < len(unique_times):
                dur = unique_times[si + 1] - t
            else:
                dur = duration - t + 1.5  # Hold final state
            entries.append((dur, png))

        # Write concat file
        concat_path = os.path.join(tmp, "concat.txt")
        with open(concat_path, "w") as f:
            for dur, png in entries:
                f.write(f"file '{png}'\n")
                f.write(f"duration {dur:.6f}\n")
            # Repeat last (ffmpeg concat quirk)
            f.write(f"file '{entries[-1][1]}'\n")

        print(f"  Rendered {len(entries)} text states")

        subprocess.run(
            [
                "ffmpeg", "-y",
                "-f", "concat", "-safe", "0", "-i", concat_path,
                "-vsync", "cfr", "-r", "30",
                "-c:v", "libx264", "-preset", "fast", "-pix_fmt", "yuv420p",
                "-loglevel", "error",
                output_path,
            ],
            check=True,
        )


def _find_quote_bgm() -> str | None:
    """Find BGM file for quote videos."""
    candidates = [
        os.path.join(SKILL_DIR, "assets", "quote_bgm.mp3"),
        os.path.join(SKILL_DIR, "assets", "bgm.mp3"),
    ]
    for p in candidates:
        if os.path.isfile(p):
            return os.path.abspath(p)
    return None


def _mix_quote_bgm(voice_path: str, output_path: str, bgm_volume: float = 0.10):
    """Mix voice with BGM using sidechain ducking (BGM lowers when voice speaks)."""
    bgm_path = _find_quote_bgm()
    if not bgm_path:
        print("  No BGM found, voice-only output")
        subprocess.run(["ffmpeg", "-y", "-i", voice_path, "-c", "copy",
                         "-loglevel", "error", output_path], check=True)
        return

    dur = _get_duration(voice_path)
    fade_out_start = max(dur - 2, 0)

    print(f"  Mixing quote BGM at {int(bgm_volume * 100)}% volume with ducking: {bgm_path}")
    subprocess.run(
        [
            "ffmpeg", "-y",
            "-i", voice_path,
            "-i", bgm_path,
            "-filter_complex",
            # BGM: volume + fade in/out
            f"[1:a]volume={bgm_volume},"
            f"afade=t=in:d=1.5,"
            f"afade=t=out:st={fade_out_start:.1f}:d=2[bgm];"
            # Sidechain: voice signal compresses BGM
            f"[bgm][0:a]sidechaincompress="
            f"threshold=0.02:ratio=4:attack=200:release=1000[ducked];"
            # Mix voice + ducked BGM
            f"[0:a][ducked]amix=inputs=2:duration=first:dropout_transition=3[out]",
            "-map", "[out]",
            "-loglevel", "error", output_path,
        ],
        check=True,
    )


def _get_duration(path: str) -> float:
    """Get media duration in seconds."""
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", path],
        capture_output=True, text=True,
    )
    return float(result.stdout.strip())


def _tts_single_voice(text: str, output_path: str, speed: float = 1.0):
    """Single TTS call for the full text — consistent voice, no segment artifacts."""
    api_key = os.environ.get("FISH_API_KEY")
    if not api_key:
        raise RuntimeError("FISH_API_KEY required for TTS")

    from fishaudio import FishAudio
    client = FishAudio(api_key=api_key)
    reference_id = os.environ.get("FISH_VOICE_ID")

    print(f"  Fish Audio S1: \"{text[:30]}...\" speed={speed:.2f}")
    audio_bytes = client.tts.convert(
        text=text,
        reference_id=reference_id,
        speed=speed,
        model="s1",
    )
    with open(output_path, "wb") as f:
        f.write(audio_bytes)
    dur = _get_duration(output_path)
    print(f"  Duration: {dur:.1f}s")


def generate_quote_video(
    text: str,
    output_path: str,
    bg_image: str | None = None,
    voice_id: str | None = None,
    bgm_volume: float = 0.08,
):
    """Full pipeline: text → TTS → typewriter video."""
    from prosody_director import generate_directed_audio, postprocess_audio

    print("\n=== Quote Video Generator ===\n")
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        # Step 1: TTS (capture segment timing for alignment)
        print("Step 1: Generating TTS...")
        if voice_id:
            os.environ["FISH_VOICE_ID"] = voice_id
        raw_audio = os.path.join(tmp, "voice_raw.mp3")
        _, timings = generate_directed_audio(text, raw_audio)

        # Step 2: Post-process
        print("\nStep 2: Post-processing audio...")
        processed = os.path.join(tmp, "voice_proc.mp3")
        try:
            postprocess_audio(raw_audio, processed)
        except Exception:
            processed = raw_audio

        # Step 3: BGM (quote-specific calm ambient)
        print("\nStep 3: Mixing BGM...")
        final_audio = os.path.join(tmp, "audio_final.mp3")
        _mix_quote_bgm(processed, final_audio, bgm_volume=bgm_volume)

        duration = _get_duration(final_audio)

        # Step 4: Typewriter video (timing-aligned to TTS segments)
        print("\nStep 4: Rendering typewriter animation...")
        lines = split_quote_lines(text)
        flat = "".join(lines)
        appear_times = compute_appear_times(flat, duration, segment_timings=timings)
        print(f"  {len(lines)} lines, {len(flat)} chars, {duration:.1f}s audio")
        if timings:
            speech_segs = [s for s in timings if s["type"] == "speech"]
            print(f"  Aligned to {len(speech_segs)} TTS segments")

        video_only = os.path.join(tmp, "video.mp4")
        render_typewriter_video(lines, appear_times, bg_image, video_only, duration)

        # Step 5: Combine
        print("\nStep 5: Merging video + audio...")
        subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", video_only, "-i", final_audio,
                "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                "-shortest",
                "-loglevel", "error",
                output_path,
            ],
            check=True,
        )

        size_mb = os.path.getsize(output_path) / (1024 * 1024)
        print(f"\n=== Done ===")
        print(f"  Duration: {duration:.1f}s")
        print(f"  Output:   {output_path} ({size_mb:.1f} MB)")


# =====================================================================
# Reels Pipeline — AI-generated images + Ken Burns + typewriter overlay
# =====================================================================

SCENE_PROMPT = """You are a Netflix cinematographer designing scene backgrounds for a quote video.

Given {n} Chinese quote segments, generate one English image prompt per segment.

Quote segments:
{segments}

Cinematic rules:
- Vertical 9:16 portrait composition
- Specify LIGHTING: direction (side-lit, overhead, backlit), color temperature (warm 3200K, cool 5500K, golden hour)
- Specify DEPTH: shallow DOF f/1.8-2.8, bokeh background
- Specify COLOR PALETTE: 2-3 dominant colors, e.g. "desaturated teal and warm amber"
- Specify MOOD: one emotional keyword aligned to the quote's feeling
- Film stock aesthetic: 35mm grain, natural textures
- NO text, NO faces, NO readable words (silhouettes, backs, hands OK)
- Each scene visually distinct but forming a cohesive narrative arc
- Composition: rule of thirds, leading lines, negative space

Output exactly {n} lines, one prompt per line, no numbering."""


def _generate_scene_prompts(speech_segs: list[dict]) -> list[str]:
    """Use LLM to generate image prompts for each speech segment."""
    from openai import OpenAI

    texts = [s["text"] for s in speech_segs]
    n = len(texts)
    fallback = "Abstract atmospheric scene, soft cinematic light, vertical 9:16, no text"

    groq_key = os.environ.get("GROQ_API_KEY")
    if not groq_key:
        return [fallback] * n

    client = OpenAI(api_key=groq_key, base_url="https://api.groq.com/openai/v1")
    seg_text = "\n".join(f'{i+1}. "{t}"' for i, t in enumerate(texts))
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": SCENE_PROMPT.format(n=n, segments=seg_text)}],
        temperature=0.7,
        max_tokens=500,
    )
    prompts = [l.strip() for l in response.choices[0].message.content.strip().split("\n") if l.strip()]
    while len(prompts) < n:
        prompts.append(fallback)
    return prompts[:n]


SHOT_VARIATIONS = [
    "extreme close-up, shallow depth of field",
    "wide establishing shot, negative space",
    "medium shot, slightly off-center composition",
    "detail shot, bokeh background",
    "overhead angle, moody directional lighting",
]


def _densify_scenes(
    scene_prompts: list[str], act_boundaries: list[float],
    total_duration: float, target_interval: float = 2.0,
) -> tuple[list[str], list[float]]:
    """Expand scene prompts so visuals change every ~target_interval seconds.

    Returns (expanded_prompts, scene_boundaries).
    """
    n_scenes = max(len(scene_prompts), round(total_duration / target_interval))
    interval = total_duration / n_scenes

    expanded = []
    boundaries = []
    for i in range(n_scenes):
        t = i * interval
        boundaries.append(t)
        # Find which act this time falls into
        act_idx = 0
        for j in range(len(act_boundaries) - 1):
            if t >= act_boundaries[j]:
                act_idx = j
        act_idx = min(act_idx, len(scene_prompts) - 1)
        base_prompt = scene_prompts[act_idx]
        shot = SHOT_VARIATIONS[i % len(SHOT_VARIATIONS)]
        expanded.append(f"{base_prompt} {shot}.")

    return expanded, boundaries


def _generate_scene_images(prompts: list[str], work_dir: str) -> list[str]:
    """Generate images via Gemini, with gradient fallback."""
    sys.path.insert(0, GEMINI_MEDIA_DIR)
    from gemini_media import generate_image

    paths = []
    for i, prompt in enumerate(prompts):
        out = os.path.join(work_dir, f"scene_{i:02d}.png")
        print(f"  [{i}] Generating...")
        try:
            generate_image(prompt, out)
            # Resize to target dimensions
            _fit_image(out, out, WIDTH, HEIGHT)
            paths.append(out)
        except Exception as e:
            print(f"  [{i}] Gemini failed ({e}), using gradient")
            _load_bg(None, WIDTH, HEIGHT).save(out)
            paths.append(out)
    return paths


def _fit_image(src: str, dst: str, width: int, height: int):
    """Fill-crop image to exact target dimensions."""
    from PIL import Image

    img = Image.open(src).convert("RGB")
    w, h = img.size
    ratio = max(width / w, height / h)
    img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
    left = (img.width - width) // 2
    top = (img.height - height) // 2
    img = img.crop((left, top, left + width, top + height))
    img.save(dst)


LETTERBOX_H = 110  # px each side on 1920h → ~11.5% total (2.35:1 feel)


def _cinematic_filters(letterbox: bool = True) -> str:
    """Cinematic post-processing: teal-orange grade + film grain + letterbox."""
    filt = (
        # Teal-Orange color grade: cool shadows, warm highlights
        ",colorbalance=rs=-0.08:gs=0.04:bs=0.12:rm=0.02:gm=-0.01:bm=-0.02"
        ":rh=0.12:gh=0.02:bh=-0.08"
        ",eq=contrast=1.08:brightness=0.02:saturation=0.92:gamma=1.04"
        ",vignette=PI/5"
        ",noise=alls=4:allf=t"
        ",unsharp=3:3:0.3"
    )
    if letterbox:
        filt += (
            f",drawbox=x=0:y=0:w=iw:h={LETTERBOX_H}:color=black@0.95:t=fill"
            f",drawbox=x=0:y=ih-{LETTERBOX_H}:w=iw:h={LETTERBOX_H}:color=black@0.95:t=fill"
        )
    return filt


def _add_particle_overlay(
    video_path: str, output_path: str, duration: float,
    width: int = WIDTH, height: int = HEIGHT,
):
    """Composite floating dust/ember particles over video using screen blend."""
    # Generate sparse random dots as particles, blur them, drift slowly upward
    # Using ffmpeg: random noise → threshold for sparse dots → blur → screen blend
    particle_filter = (
        f"color=s={width}x{height}:d={duration:.2f}:r=30:c=black[base];"
        f"[base]noise=alls=80:allf=t,"
        f"curves=lighter,"
        f"colorlevels=rimin=0.95:gimin=0.95:bimin=0.95,"
        f"boxblur=3:3,"
        f"scroll=vertical=0.003:horizontal=0.001,"
        f"format=yuva420p,colorchannelmixer=aa=0.15[particles];"
        f"[0:v][particles]overlay=0:0:format=auto"
    )
    subprocess.run(
        [
            "ffmpeg", "-y",
            "-i", video_path,
            "-filter_complex", particle_filter,
            "-c:v", "libx264", "-preset", "fast", "-pix_fmt", "yuv420p",
            "-t", str(duration + 0.5),
            "-loglevel", "error",
            output_path,
        ],
        check=True,
    )


def _ken_burns_clip(
    image_path: str, output_path: str, duration: float,
    effect_idx: int = 0, width: int = WIDTH, height: int = HEIGHT, fps: int = 30,
    color_filters: str = None,
):
    """Create Ken Burns animation clip with smoothstep easing + cinematic grading."""
    total_frames = max(int(fps * duration), 2)

    # Smoothstep easing: t*t*(3-2*t) — starts slow, accelerates, decelerates
    T = f"(on/{total_frames})"
    smooth = f"({T}*{T}*(3-2*{T}))"

    effects = [
        # zoom in + upward drift
        {"z": f"1+0.15*{smooth}",
         "x": "iw/2-(iw/zoom/2)",
         "y": f"ih/2-(ih/zoom/2)-30*{smooth}"},
        # zoom out + rightward drift
        {"z": f"1.18-0.18*{smooth}",
         "x": f"iw/2-(iw/zoom/2)+40*{smooth}",
         "y": "ih/2-(ih/zoom/2)"},
        # slow zoom in + subtle leftward
        {"z": f"1+0.10*{smooth}",
         "x": f"iw/2-(iw/zoom/2)-20*{smooth}",
         "y": "ih/2-(ih/zoom/2)"},
        # zoom out + downward drift
        {"z": f"1.15-0.15*{smooth}",
         "x": "iw/2-(iw/zoom/2)",
         "y": f"ih/2-(ih/zoom/2)+25*{smooth}"},
    ]
    e = effects[effect_idx % len(effects)]
    vf = (
        f"zoompan=z='{e['z']}':x='{e['x']}':y='{e['y']}'"
        f":d={total_frames}:s={width}x{height}:fps={fps}"
        f"{color_filters if color_filters is not None else _cinematic_filters()}"
    )

    subprocess.run(
        [
            "ffmpeg", "-y",
            "-loop", "1", "-i", image_path,
            "-vf", vf,
            "-t", str(duration),
            "-c:v", "libx264", "-preset", "fast", "-pix_fmt", "yuv420p",
            "-loglevel", "error",
            output_path,
        ],
        check=True,
    )


TRANSITIONS = ["fade", "fadeblack", "smoothleft", "smoothright"]


def _concat_with_transitions(
    clips: list[str], durations: list[float], output_path: str,
    transition_dur: float = 0.4, offsets: list[float] | None = None,
):
    """Concatenate video clips with varied transitions + head/tail fades.

    If offsets is provided, use those as xfade start times (aligned to audio
    boundaries). Otherwise compute from accumulated durations.
    """
    import shutil

    if len(clips) == 1:
        total_dur = durations[0]
        fade_out_start = max(total_dur - 0.8, 0)
        subprocess.run(
            [
                "ffmpeg", "-y", "-i", clips[0],
                "-vf", f"fade=t=in:d=0.5,fade=t=out:st={fade_out_start:.3f}:d=0.8",
                "-c:v", "libx264", "-preset", "fast", "-pix_fmt", "yuv420p",
                "-loglevel", "error",
                output_path,
            ],
            check=True,
        )
        return

    inputs = []
    for c in clips:
        inputs.extend(["-i", c])

    filter_parts = []
    for i in range(len(clips) - 1):
        src_a = f"[{i}:v]" if i == 0 else f"[v{i-1}]"
        src_b = f"[{i+1}:v]"
        out_label = "[xout]" if i == len(clips) - 2 else f"[v{i}]"
        if offsets:
            offset = offsets[i]
        else:
            offset = sum(durations[:i + 1]) - (i + 1) * transition_dur
        transition = TRANSITIONS[i % len(TRANSITIONS)]
        filter_parts.append(
            f"{src_a}{src_b}xfade=transition={transition}:duration={transition_dur}:offset={offset:.3f}{out_label}"
        )

    # Compute total output duration for fade-out timing
    if offsets:
        total_dur = offsets[-1] + durations[-1]
    else:
        total_dur = sum(durations) - (len(clips) - 1) * transition_dur
    fade_out_start = max(total_dur - 0.8, 0)
    filter_parts.append(
        f"[xout]fade=t=in:d=0.5,fade=t=out:st={fade_out_start:.3f}:d=0.8[vout]"
    )

    subprocess.run(
        [
            "ffmpeg", "-y", *inputs,
            "-filter_complex", ";".join(filter_parts),
            "-map", "[vout]",
            "-c:v", "libx264", "-preset", "fast", "-pix_fmt", "yuv420p",
            "-loglevel", "error",
            output_path,
        ],
        check=True,
    )


EMOTION_KEYWORDS = [
    "不", "沒", "從來", "別人", "自己", "為什麼", "怎麼", "快樂",
    "痛", "愛", "恨", "累", "苦", "怕", "感受", "委屈", "忍",
    "假裝", "拒絕", "善良", "努力", "考慮", "第一", "總", "把",
    "永遠", "離開", "放棄", "心", "淚", "孤獨", "承認",
]


def _find_keyword_indices(text: str) -> set[int]:
    """Find character indices of emotional keywords in text."""
    indices = set()
    for kw in EMOTION_KEYWORDS:
        start = 0
        while True:
            pos = text.find(kw, start)
            if pos == -1:
                break
            for i in range(pos, pos + len(kw)):
                indices.add(i)
            start = pos + 1
    return indices


def _draw_text_overlay(lines, visible_count, font, font_size, width, height,
                       highlight_start=0, keyword_indices=None):
    """Render text overlay with karaoke-style highlight + keyword emphasis.

    Chars 0..highlight_start-1 = dim (past), highlight_start..visible_count-1 = bright.
    Keyword chars in highlight range → bright gold; non-keyword → warm white.
    """
    from PIL import Image, ImageDraw, ImageFilter

    # Color palette
    PAST_COLOR = (200, 200, 215, 170)       # cool dim
    HIGHLIGHT_COLOR = (255, 245, 210, 255)   # warm golden white
    KEYWORD_COLOR = (255, 200, 60, 255)      # bright gold for emotional keywords
    SHADOW_COLOR = (0, 0, 0, 180)

    keyword_indices = keyword_indices or set()
    # Check if current highlight batch contains keywords
    has_keyword = any(
        i in keyword_indices for i in range(highlight_start, visible_count)
    )
    active_color = KEYWORD_COLOR if has_keyword else HIGHLIGHT_COLOR

    frame = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    if visible_count == 0:
        return frame

    line_height = font_size + 18
    total_height = len(lines) * line_height
    y_start = (height - total_height) // 2

    char_idx = 0
    for line_idx, line in enumerate(lines):
        # Split line into past / highlight / hidden parts
        past_part = ""
        highlight_part = ""
        for ch in line:
            if char_idx < highlight_start:
                past_part += ch
            elif char_idx < visible_count:
                highlight_part += ch
            char_idx += 1

        visible_in_line = past_part + highlight_part
        if not visible_in_line:
            continue

        y = y_start + line_idx * line_height
        draw = ImageDraw.Draw(frame)
        bbox = draw.textbbox((0, 0), visible_in_line, font=font)
        text_w = bbox[2] - bbox[0]
        x = (width - text_w) // 2

        # Soft shadow for all visible text
        shadow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        sd = ImageDraw.Draw(shadow)
        sd.text((x + 3, y + 4), visible_in_line, font=font, fill=SHADOW_COLOR)
        shadow = shadow.filter(ImageFilter.GaussianBlur(radius=8))
        frame = Image.alpha_composite(frame, shadow)

        draw = ImageDraw.Draw(frame)
        if past_part and highlight_part:
            # Two-tone: dim past + bright current (keyword = gold)
            draw.text((x, y), past_part, font=font, fill=PAST_COLOR)
            past_bbox = draw.textbbox((0, 0), past_part, font=font)
            past_w = past_bbox[2] - past_bbox[0]
            draw.text((x + past_w, y), highlight_part, font=font, fill=active_color)
        elif highlight_part:
            draw.text((x, y), highlight_part, font=font, fill=active_color)
        else:
            draw.text((x, y), past_part, font=font, fill=PAST_COLOR)

    return frame


def _composite_text_on_video(
    bg_video: str, lines: list[str], appear_times: list[float],
    output_path: str, duration: float,
    width: int = WIDTH, height: int = HEIGHT, font_size: int = 72,
):
    """Render transparent text overlays and composite onto Ken Burns video."""
    font = _load_font(font_size)
    flat = "".join(lines)
    keyword_idx = _find_keyword_indices(flat)

    unique_times = sorted(set(appear_times))

    with tempfile.TemporaryDirectory() as tmp:
        # Build overlay entries: (start, end, png_path)
        entries = []
        prev_visible = 0
        for si, t in enumerate(unique_times):
            visible = sum(1 for at in appear_times if at <= t)
            if visible == 0:
                prev_visible = visible
                continue
            highlight_start = prev_visible
            png = os.path.join(tmp, f"txt_{si:04d}.png")
            frame = _draw_text_overlay(
                lines, visible, font, font_size, width, height,
                highlight_start=highlight_start,
                keyword_indices=keyword_idx,
            )
            frame.save(png, "PNG")

            end = unique_times[si + 1] if si + 1 < len(unique_times) else None
            entries.append((t, end, png))
            prev_visible = visible

        if not entries:
            import shutil
            shutil.copy2(bg_video, output_path)
            return

        print(f"  Rendered {len(entries)} text overlays")

        # Build ffmpeg overlay chain
        inputs = ["-i", bg_video]
        for _, _, png_path in entries:
            inputs.extend(["-i", png_path])

        filter_parts = []
        for i, (start, end, _) in enumerate(entries):
            src = "[0:v]" if i == 0 else f"[v{i-1}]"
            out = "[vout]" if i == len(entries) - 1 else f"[v{i}]"
            if end is None:
                enable = f"gte(t,{start:.3f})"
            else:
                enable = f"between(t,{start:.3f},{end:.3f})"
            filter_parts.append(f"{src}[{i+1}:v]overlay=0:0:enable='{enable}'{out}")

        subprocess.run(
            [
                "ffmpeg", "-y", *inputs,
                "-filter_complex", ";".join(filter_parts),
                "-map", "[vout]",
                "-c:v", "libx264", "-preset", "fast", "-pix_fmt", "yuv420p",
                "-t", str(duration + 1.5),
                "-loglevel", "error",
                output_path,
            ],
            check=True,
        )


def generate_reels_video(
    text: str,
    output_path: str,
    voice_id: str | None = None,
    bgm_volume: float = 0.08,
):
    """Reels pipeline: text → TTS → AI images → Ken Burns → typewriter → audio."""
    from prosody_director import generate_directed_audio, postprocess_audio

    print("\n=== Reels Quote Video Generator ===\n")
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        # Step 1: TTS
        print("Step 1: Generating TTS...")
        if voice_id:
            os.environ["FISH_VOICE_ID"] = voice_id
        raw_audio = os.path.join(tmp, "voice_raw.mp3")
        _, timings = generate_directed_audio(text, raw_audio)

        # Step 2: Post-process
        print("\nStep 2: Post-processing audio...")
        processed = os.path.join(tmp, "voice_proc.mp3")
        try:
            postprocess_audio(raw_audio, processed)
        except Exception:
            processed = raw_audio

        # Step 3: BGM
        print("\nStep 3: Mixing BGM...")
        final_audio = os.path.join(tmp, "audio_final.mp3")
        _mix_quote_bgm(processed, final_audio, bgm_volume=bgm_volume)
        duration = _get_duration(final_audio)

        # Step 4: Scene prompts
        print("\nStep 4: Generating scene prompts...")
        speech_segs = [s for s in timings if s["type"] == "speech"] if timings else []
        if not speech_segs:
            speech_segs = [{"type": "speech", "text": text, "start": 0, "end": duration}]
        prompts = _generate_scene_prompts(speech_segs)
        for i, p in enumerate(prompts):
            print(f"  [{i}] {p[:80]}...")

        # Step 5: Generate images
        print("\nStep 5: Generating images (Gemini)...")
        images = _generate_scene_images(prompts, tmp)

        # Step 6: Ken Burns clips (with timing aligned to audio boundaries)
        print("\nStep 6: Creating Ken Burns animations...")
        raw_end = max(s["end"] for s in timings) if timings else duration
        scale = duration / raw_end if raw_end > 0.01 else 1.0
        transition_dur = 0.4

        # Audio boundaries: where each speech segment starts (scaled)
        boundaries = [seg["start"] * scale for seg in speech_segs]

        # xfade offsets: center each transition on the audio boundary
        xfade_offsets = []
        for i in range(len(speech_segs) - 1):
            xfade_offsets.append(max(boundaries[i + 1] - transition_dur / 2, 0))

        # Clip durations: each must be long enough for the xfade chain
        kb_clips = []
        scene_durations = []
        for i in range(len(speech_segs)):
            if len(speech_segs) == 1:
                clip_dur = duration + 1.5
            elif i == 0:
                # First clip: lasts until first xfade ends
                clip_dur = xfade_offsets[0] + transition_dur
            elif i < len(speech_segs) - 1:
                # Middle clips: span between adjacent xfades + overlap
                clip_dur = xfade_offsets[i] - xfade_offsets[i - 1] + transition_dur
            else:
                # Last clip: from last xfade to end + hold
                clip_dur = (duration + 1.5) - xfade_offsets[-1]
            clip_dur = max(clip_dur, 0.5)

            clip_path = os.path.join(tmp, f"kb_{i:02d}.mp4")
            effect_name = ["zoom-in+up", "zoom-out+right", "zoom-in+left", "zoom-out+down"][i % 4]
            _ken_burns_clip(images[i], clip_path, clip_dur, effect_idx=i)
            kb_clips.append(clip_path)
            scene_durations.append(clip_dur)
            print(f"  [{i}] {clip_dur:.1f}s clip → boundary {boundaries[i]:.2f}s ({effect_name})")

        # Step 7: Concatenate scenes (offsets from audio boundaries)
        print("\nStep 7: Concatenating with crossfade...")
        bg_video = os.path.join(tmp, "bg_video.mp4")
        _concat_with_transitions(
            kb_clips, scene_durations, bg_video,
            transition_dur=transition_dur, offsets=xfade_offsets,
        )

        # Step 8: Text overlay
        print("\nStep 8: Compositing typewriter text...")
        lines = split_quote_lines(text)
        flat = "".join(lines)
        appear_times = compute_appear_times(flat, duration, segment_timings=timings)
        print(f"  {len(lines)} lines, {len(flat)} chars")

        video_with_text = os.path.join(tmp, "with_text.mp4")
        _composite_text_on_video(bg_video, lines, appear_times, video_with_text, duration)

        # Step 9: Merge audio
        print("\nStep 9: Merging video + audio...")
        subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", video_with_text, "-i", final_audio,
                "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                "-shortest",
                "-loglevel", "error",
                output_path,
            ],
            check=True,
        )

        size_mb = os.path.getsize(output_path) / (1024 * 1024)
        print(f"\n=== Done ===")
        print(f"  Duration: {duration:.1f}s")
        print(f"  Scenes:   {len(speech_segs)}")
        print(f"  Output:   {output_path} ({size_mb:.1f} MB)")


# =====================================================================
# Cinematic Pipeline — Narrative Director + AI video + silence gap
# =====================================================================


def _generate_whoosh(output_path: str, duration: float = 0.35):
    """Generate a synthetic whoosh sound effect (bandpass noise sweep)."""
    subprocess.run(
        [
            "ffmpeg", "-y",
            "-f", "lavfi", "-i",
            f"anoisesrc=d={duration}:c=pink:a=0.3",
            "-af",
            f"afade=t=in:d={duration*0.3:.2f},"
            f"afade=t=out:st={duration*0.4:.2f}:d={duration*0.6:.2f},"
            f"highpass=f=800,lowpass=f=4000,"
            f"aecho=0.6:0.3:20:0.3",
            "-loglevel", "error",
            output_path,
        ],
        check=True,
    )


def _mix_whoosh_at_transitions(
    audio_path: str, output_path: str,
    boundaries: list[float], whoosh_volume: float = 0.5,
):
    """Mix whoosh sound effects at scene transition points."""
    if len(boundaries) < 2:
        import shutil
        shutil.copy2(audio_path, output_path)
        return

    with tempfile.TemporaryDirectory() as tmp:
        whoosh_path = os.path.join(tmp, "whoosh.mp3")
        _generate_whoosh(whoosh_path)

        # Build filter: overlay whoosh at each transition point
        inputs = ["-i", audio_path, "-i", whoosh_path]
        delays = []
        for b in boundaries[1:]:  # skip first (start of video)
            delay_ms = max(int((b - 0.15) * 1000), 0)  # center whoosh on boundary
            delays.append(f"adelay={delay_ms}|{delay_ms}")

        n = len(delays)
        filter_parts = []
        for i, d in enumerate(delays):
            filter_parts.append(f"[1:a]{d},volume={whoosh_volume}[w{i}]")
        mix_inputs = "[0:a]" + "".join(f"[w{i}]" for i in range(n))
        filter_parts.append(f"{mix_inputs}amix=inputs={n+1}:duration=first:normalize=0[out]")

        subprocess.run(
            [
                "ffmpeg", "-y", *inputs,
                "-filter_complex", ";".join(filter_parts),
                "-map", "[out]",
                "-loglevel", "error",
                output_path,
            ],
            check=True,
        )


def _mix_bgm_with_arc(
    voice_path: str, output_path: str, bgm_arc: list[float],
    act_boundaries: list[float], silence_gap: float, base_volume: float = 0.10,
):
    """Mix BGM with per-act volume curve driven by blueprint."""
    bgm_path = _find_quote_bgm()
    if not bgm_path:
        subprocess.run(["ffmpeg", "-y", "-i", voice_path, "-c", "copy",
                         "-loglevel", "error", output_path], check=True)
        return

    voice_dur = _get_duration(voice_path)
    total_dur = voice_dur + silence_gap

    # Build ffmpeg volume expression from act boundaries + bgm_arc
    # Silence gap gets the lowest volume
    parts = []
    for i, vol in enumerate(bgm_arc):
        start = act_boundaries[i] if i < len(act_boundaries) else 0
        v = vol * base_volume
        if i == 0:
            parts.append(f"if(lt(t,{act_boundaries[1] if len(act_boundaries) > 1 else voice_dur:.3f}),{v:.4f}")
        elif i < len(bgm_arc) - 1:
            next_b = act_boundaries[i + 1] if i + 1 < len(act_boundaries) else voice_dur
            parts.append(f"if(lt(t,{next_b:.3f}),{v:.4f}")
        else:
            parts.append(f"{v:.4f}")

    # Close nested ifs
    vol_expr = ",".join(parts) + ")" * (len(parts) - 1) if len(parts) > 1 else parts[0]
    # Silence gap: fade to near-zero
    vol_expr = f"if(gt(t,{voice_dur:.3f}),{0.02 * base_volume:.4f},{vol_expr})"

    print(f"  BGM arc: {[f'{v:.1f}' for v in bgm_arc]} → silence")
    subprocess.run(
        [
            "ffmpeg", "-y",
            "-i", voice_path,
            "-i", bgm_path,
            "-filter_complex",
            f"[0:a]apad=whole_dur={total_dur:.3f},asplit=2[vpad1][vpad2];"
            f"[1:a]volume='{vol_expr}',"
            f"afade=t=in:d=1.0,"
            f"afade=t=out:st={total_dur - 1.5:.1f}:d=1.5[bgm];"
            f"[bgm][vpad2]sidechaincompress="
            f"threshold=0.02:ratio=4:attack=200:release=1000[ducked];"
            f"[vpad1][ducked]amix=inputs=2:duration=first:dropout_transition=3[out]",
            "-map", "[out]",
            "-t", str(total_dur),
            "-loglevel", "error", output_path,
        ],
        check=True,
    )


def _compute_act_appear_times(
    blueprint: dict, lines: list[str], timings: list[dict] | None,
    audio_duration: float,
) -> tuple[list[float], list[str]]:
    """Compute per-character appear times + animation type, driven by blueprint.

    Returns (appear_times, anim_types) where anim_types[i] is 'flash' or 'typewriter'.
    When timings is None, distributes proportionally by character count.
    """
    flat = "".join(lines)
    total_chars = len(flat)
    times = [0.0] * total_chars
    anim_types = ["typewriter"] * total_chars

    acts = blueprint["acts"]
    all_act_chars = sum(len(a["text"]) for a in acts)
    char_cursor = 0

    # Proportional: compute act start/end from character ratios
    act_char_cursor = 0
    for act_idx, act in enumerate(acts):
        act_text = act["text"]
        act_chars = len(act_text)
        anim = act.get("text_anim", "typewriter")

        act_start = audio_duration * act_char_cursor / max(all_act_chars, 1)
        act_char_cursor += act_chars
        act_end = audio_duration * act_char_cursor / max(all_act_chars, 1)
        act_dur = act_end - act_start

        if anim == "flash":
            # All chars appear at act_start
            for j in range(act_chars):
                if char_cursor + j < total_chars:
                    times[char_cursor + j] = act_start
                    anim_types[char_cursor + j] = "flash"
        else:
            # Typewriter: distribute across act duration
            interval = act_dur / max(act_chars, 1)
            for j in range(act_chars):
                if char_cursor + j < total_chars:
                    times[char_cursor + j] = act_start + j * interval
                    anim_types[char_cursor + j] = "typewriter"

        char_cursor += act_chars

    # Fill remaining
    last_t = times[char_cursor - 1] if char_cursor > 0 else 0.0
    while char_cursor < total_chars:
        times[char_cursor] = last_t
        char_cursor += 1

    return times, anim_types


def _generate_veo_clips(
    scene_prompts: list[str], motion_prompts: list[str],
    durations: list[float], work_dir: str,
    brand_config: dict, fast: bool = False,
) -> list[str]:
    """Generate Veo 3 video clips per act. Falls back to Ken Burns on failure."""
    sys.path.insert(0, GEMINI_MEDIA_DIR)
    from gemini_media import generate_image, generate_video

    model = "veo-3.0-fast-generate-001" if fast else "veo-3.0-generate-001"
    negative = brand_config["visual_ip"]["negative"]
    clips = []

    for i, (s_prompt, m_prompt, dur) in enumerate(zip(scene_prompts, motion_prompts, durations)):
        print(f"  [{i}] Generating image...")
        img_path = os.path.join(work_dir, f"veo_img_{i:02d}.png")
        try:
            generate_image(s_prompt, img_path)
            _fit_image(img_path, img_path, WIDTH, HEIGHT)
        except Exception as e:
            print(f"  [{i}] Image failed ({e}), using gradient")
            _load_bg(None, WIDTH, HEIGHT).save(img_path)

        print(f"  [{i}] Generating video (Veo 3)...")
        vid_path = os.path.join(work_dir, f"veo_raw_{i:02d}.mp4")
        trimmed = os.path.join(work_dir, f"veo_{i:02d}.mp4")
        try:
            generate_video(
                prompt=m_prompt, output_path=vid_path,
                image_path=img_path, aspect_ratio="9:16",
                model=model, negative_prompt=negative,
            )
            # Trim to act duration + apply cinematic filters
            subprocess.run(
                [
                    "ffmpeg", "-y", "-i", vid_path,
                    "-t", str(dur),
                    "-vf", f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=decrease,"
                           f"pad={WIDTH}:{HEIGHT}:(ow-iw)/2:(oh-ih)/2"
                           f"{_cinematic_filters()}",
                    "-c:v", "libx264", "-preset", "fast", "-pix_fmt", "yuv420p",
                    "-an", "-loglevel", "error", trimmed,
                ],
                check=True,
            )
            clips.append(trimmed)
        except Exception as e:
            print(f"  [{i}] Veo failed ({e}), falling back to Ken Burns")
            kb_path = os.path.join(work_dir, f"kb_fallback_{i:02d}.mp4")
            _ken_burns_clip(img_path, kb_path, dur, effect_idx=i)
            clips.append(kb_path)

    return clips


def generate_cinematic_video(
    text: str,
    output_path: str,
    voice_id: str | None = None,
    bgm_volume: float = 0.10,
    use_veo: bool = False,
    veo_fast: bool = False,
    brand: str = "dark_awakening",
):
    """PR 99 pipeline: narrative director -> scene gen -> text animation -> silence."""
    from narrative_director import (
        generate_blueprint,
        blueprint_to_scene_prompts, blueprint_to_motion_prompts,
    )
    import json as _json

    print("\n=== Cinematic Quote Video (PR 99) ===\n")
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

    # Step 1: Narrative Blueprint
    print("Step 1: Generating narrative blueprint...")
    blueprint = generate_blueprint(text, brand=brand)
    acts = blueprint["acts"]
    silence_gap = blueprint.get("silence_gap_s", 2.0)
    bgm_arc = blueprint.get("bgm_arc", [0.5] * len(acts))

    for i, act in enumerate(acts):
        role = act["role"].upper()
        print(f"  [{role}] \"{act['text']}\" (emotion={act['emotion']}, pace={act['pace']}, anim={act['text_anim']})")
    print(f"  Silence gap: {silence_gap}s")

    with tempfile.TemporaryDirectory() as tmp:
        # Step 2: Single-voice TTS (one call, consistent tone)
        print("\nStep 2: Generating TTS (single voice)...")
        if voice_id:
            os.environ["FISH_VOICE_ID"] = voice_id

        raw_audio = os.path.join(tmp, "voice_raw.mp3")
        _tts_single_voice(text, raw_audio)

        # Step 3: Post-process
        print("\nStep 3: Post-processing audio...")
        processed = os.path.join(tmp, "voice_proc.mp3")
        from prosody_director import postprocess_audio
        try:
            postprocess_audio(raw_audio, processed)
        except Exception:
            processed = raw_audio
        voice_duration = _get_duration(processed)

        # Step 4: BGM with emotion curve + silence gap
        print("\nStep 4: Mixing BGM with emotion curve...")
        final_audio = os.path.join(tmp, "audio_final.mp3")

        # Compute act boundaries proportionally by character count
        total_chars = sum(len(a["text"]) for a in acts)
        act_boundaries = [0.0]
        cursor = 0
        for act in acts[:-1]:
            cursor += len(act["text"])
            act_boundaries.append(voice_duration * cursor / total_chars)

        _mix_bgm_with_arc(processed, final_audio, bgm_arc, act_boundaries, silence_gap, bgm_volume)
        total_duration = _get_duration(final_audio)

        # Step 5: Scene visuals
        brand_config = _json.load(open(os.path.join(SKILL_DIR, "data", "brand_profiles.json")))[brand]
        scene_prompts = blueprint_to_scene_prompts(blueprint, brand_config)
        motion_prompts = blueprint_to_motion_prompts(blueprint)

        transition_dur = 0.4

        if use_veo:
            print("\nStep 5: Generating Veo 3 video clips...")
            act_durs = []
            for i in range(len(acts)):
                if i < len(act_boundaries) - 1:
                    act_durs.append(act_boundaries[i + 1] - act_boundaries[i])
                else:
                    act_durs.append(voice_duration - act_boundaries[-1] + silence_gap)
            scene_clips = _generate_veo_clips(
                scene_prompts, motion_prompts, act_durs, tmp,
                brand_config, fast=veo_fast,
            )
            scene_durations = [_get_duration(c) for c in scene_clips]
            xfade_offsets = None
            scene_boundaries = act_boundaries[:]
        else:
            # Densify: split into ~2s sub-scenes for retention
            dense_prompts, scene_boundaries = _densify_scenes(
                scene_prompts, act_boundaries, total_duration, target_interval=2.0,
            )
            n_scenes = len(dense_prompts)
            print(f"\nStep 5: Generating {n_scenes} scenes (every ~2s)...")
            images = _generate_scene_images(dense_prompts, tmp)

            xfade_offsets = [max(b - transition_dur / 2, 0) for b in scene_boundaries[1:]]

            scene_clips = []
            scene_durations = []
            for i in range(n_scenes):
                if n_scenes == 1:
                    clip_dur = total_duration
                elif i == 0:
                    clip_dur = xfade_offsets[0] + transition_dur if xfade_offsets else total_duration
                elif i < n_scenes - 1:
                    clip_dur = xfade_offsets[i] - xfade_offsets[i - 1] + transition_dur
                else:
                    clip_dur = total_duration - xfade_offsets[-1] if xfade_offsets else total_duration
                clip_dur = max(clip_dur, 0.5)

                clip_path = os.path.join(tmp, f"kb_{i:02d}.mp4")
                _ken_burns_clip(images[i], clip_path, clip_dur, effect_idx=i)
                scene_clips.append(clip_path)
                scene_durations.append(clip_dur)
                print(f"  [{i}] {clip_dur:.1f}s")

        # Step 6: Concatenate scenes
        print("\nStep 6: Concatenating with transitions...")
        bg_video = os.path.join(tmp, "bg_video.mp4")
        _concat_with_transitions(
            scene_clips, scene_durations, bg_video,
            transition_dur=transition_dur,
            offsets=xfade_offsets if len(scene_clips) > 1 else None,
        )

        # Step 6b: Particle/dust overlay for atmosphere
        print("  Adding particle overlay...")
        bg_particles = os.path.join(tmp, "bg_particles.mp4")
        _add_particle_overlay(bg_video, bg_particles, total_duration)
        bg_video = bg_particles

        # Step 7: Text overlay with act-aware animation
        print("\nStep 7: Compositing text (act-aware animation)...")
        lines = split_quote_lines(text)
        flat = "".join(lines)
        appear_times, _ = _compute_act_appear_times(blueprint, lines, None, voice_duration)
        print(f"  {len(lines)} lines, {len(flat)} chars")
        for i, act in enumerate(acts):
            print(f"  {act['role']}: {act['text_anim']}")

        video_with_text = os.path.join(tmp, "with_text.mp4")
        _composite_text_on_video(
            bg_video, lines, appear_times, video_with_text, total_duration,
        )

        # Step 7b: Whoosh sound effects at scene transitions
        if len(scene_boundaries) > 1:
            print("  Adding whoosh transitions...")
            audio_with_whoosh = os.path.join(tmp, "audio_whoosh.mp3")
            _mix_whoosh_at_transitions(final_audio, audio_with_whoosh, scene_boundaries)
            final_audio = audio_with_whoosh

        # Step 8: Merge video + audio
        print("\nStep 8: Merging video + audio...")
        subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", video_with_text, "-i", final_audio,
                "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                "-shortest",
                "-loglevel", "error",
                output_path,
            ],
            check=True,
        )

        size_mb = os.path.getsize(output_path) / (1024 * 1024)
        print(f"\n=== Done ===")
        print(f"  Duration: {total_duration:.1f}s (voice {voice_duration:.1f}s + silence {silence_gap:.1f}s)")
        print(f"  Acts:     {len(acts)} ({' → '.join(a['role'] for a in acts)} → silence)")
        print(f"  Backend:  {'Veo 3' if use_veo else 'Ken Burns'}")
        print(f"  Output:   {output_path} ({size_mb:.1f} MB)")


def _draw_dialogue_overlay(lines_data, visible_count, font, font_size, width, height,
                           highlight_start=0, keyword_indices=None, caption_box=True):
    """Render dialogue text with colored caption boxes (A=dark red box, B=cool blue box)."""
    from PIL import Image, ImageDraw, ImageFilter

    # Text colors — white on colored boxes for max readability
    TEXT_COLOR = (255, 255, 255, 255)
    TEXT_DIM = (200, 200, 200, 150)
    # Box colors per speaker
    BOX_A = (140, 30, 50, 200)       # dark crimson (devil/master/narrator)
    BOX_B = (40, 70, 130, 200)       # deep blue (angel/disciple/her)
    BOX_PAD_X = 24
    BOX_PAD_Y = 8
    BOX_RADIUS = 16
    keyword_indices = keyword_indices or set()

    frame = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    if visible_count == 0:
        return frame

    line_height = font_size + 24
    total_height = len(lines_data) * line_height
    y_start = (height - total_height) // 2

    char_idx = 0
    for line_idx, (text, speaker) in enumerate(lines_data):
        past_part = ""
        highlight_part = ""
        for ch in text:
            if char_idx < highlight_start:
                past_part += ch
            elif char_idx < visible_count:
                highlight_part += ch
            char_idx += 1

        visible_in_line = past_part + highlight_part
        if not visible_in_line:
            continue

        box_color = BOX_A if speaker == "A" else BOX_B
        y = y_start + line_idx * line_height
        draw = ImageDraw.Draw(frame)
        bbox = draw.textbbox((0, 0), visible_in_line, font=font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]
        x = (width - text_w) // 2

        if caption_box:
            # Draw rounded-rect caption box
            bx0 = x - BOX_PAD_X
            by0 = y - BOX_PAD_Y
            bx1 = x + text_w + BOX_PAD_X
            by1 = y + text_h + BOX_PAD_Y
            draw.rounded_rectangle(
                [(bx0, by0), (bx1, by1)],
                radius=BOX_RADIUS,
                fill=box_color,
            )

        # Text rendering — white on box, with dim for past chars
        if past_part and highlight_part:
            draw.text((x, y), past_part, font=font, fill=TEXT_DIM)
            past_bbox = draw.textbbox((0, 0), past_part, font=font)
            past_w = past_bbox[2] - past_bbox[0]
            draw.text((x + past_w, y), highlight_part, font=font, fill=TEXT_COLOR)
        elif highlight_part:
            draw.text((x, y), highlight_part, font=font, fill=TEXT_COLOR)
        else:
            draw.text((x, y), past_part, font=font, fill=TEXT_DIM)

    return frame


def _draw_retro_overlay(lines_data, visible_count, font, font_size, width, height,
                       highlight_start=0, keyword_indices=None, caption_box=True):
    """Retro karaoke: yellow bold text with black outline, current word highlighted."""
    from PIL import Image, ImageDraw, ImageFont

    YELLOW = (255, 220, 50, 255)        # bright yellow (active)
    WHITE = (240, 240, 230, 200)        # off-white (past)
    OUTLINE = (0, 0, 0, 255)
    STROKE_W = 4
    keyword_indices = keyword_indices or set()

    frame = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    if visible_count == 0:
        return frame

    line_height = font_size + 28
    total_height = len(lines_data) * line_height
    y_start = (height - total_height) // 2

    draw = ImageDraw.Draw(frame)
    char_idx = 0
    for line_idx, (text, speaker) in enumerate(lines_data):
        past_part = ""
        highlight_part = ""
        for ch in text:
            if char_idx < highlight_start:
                past_part += ch
            elif char_idx < visible_count:
                highlight_part += ch
            char_idx += 1

        visible_in_line = past_part + highlight_part
        if not visible_in_line:
            continue

        y = y_start + line_idx * line_height
        bbox = draw.textbbox((0, 0), visible_in_line, font=font)
        text_w = bbox[2] - bbox[0]
        x = (width - text_w) // 2

        # Outlined text: draw black stroke then colored fill
        if past_part and highlight_part:
            # Past in white
            draw.text((x, y), past_part, font=font, fill=WHITE,
                      stroke_width=STROKE_W, stroke_fill=OUTLINE)
            past_bbox = draw.textbbox((0, 0), past_part, font=font)
            past_w = past_bbox[2] - past_bbox[0]
            # Highlight in yellow
            draw.text((x + past_w, y), highlight_part, font=font, fill=YELLOW,
                      stroke_width=STROKE_W, stroke_fill=OUTLINE)
        elif highlight_part:
            draw.text((x, y), highlight_part, font=font, fill=YELLOW,
                      stroke_width=STROKE_W, stroke_fill=OUTLINE)
        else:
            draw.text((x, y), past_part, font=font, fill=WHITE,
                      stroke_width=STROKE_W, stroke_fill=OUTLINE)

    return frame


def _render_ticker_bar(text: str, width: int = WIDTH, bar_y: int = 100, bar_h: int = 70,
                       font_size: int = 42) -> "Image":
    """Render a static retro ticker bar as a PIL RGBA image (to composite on every frame)."""
    from PIL import Image, ImageDraw
    font = _load_font(font_size)
    bar = Image.new("RGBA", (width, bar_y + bar_h + 10), (0, 0, 0, 0))
    draw = ImageDraw.Draw(bar)
    # Semi-transparent black bar
    draw.rectangle([(0, bar_y), (width, bar_y + bar_h)], fill=(0, 0, 0, 180))
    # Yellow text centered in bar
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    tx = (width - tw) // 2
    ty = bar_y + (bar_h - font_size) // 2
    draw.text((tx, ty), text, font=font, fill=(255, 220, 50, 255),
              stroke_width=2, stroke_fill=(0, 0, 0, 255))
    return bar


def _retro_filters(letterbox: bool = True) -> str:
    """Retro/vintage color grading: warm sepia, lower saturation, CRT vibe."""
    filt = (
        # Warm vintage: push reds/yellows, desaturate, slight fade
        ",colorbalance=rs=0.12:gs=0.04:bs=-0.08:rm=0.06:gm=0.02:bm=-0.04"
        ":rh=0.08:gh=0.04:bh=-0.06"
        ",eq=contrast=1.12:brightness=0.03:saturation=0.75:gamma=0.95"
        # Heavier grain for retro feel
        ",noise=alls=12:allf=t"
        ",vignette=PI/4"
        ",unsharp=3:3:0.4"
    )
    if letterbox:
        filt += (
            f",drawbox=x=0:y=0:w=iw:h={LETTERBOX_H}:color=black@0.95:t=fill"
            f",drawbox=x=0:y=ih-{LETTERBOX_H}:w=iw:h={LETTERBOX_H}:color=black@0.95:t=fill"
        )
    return filt


def _composite_dialogue_text(
    bg_video: str, lines_data: list[tuple[str, str]],
    appear_times: list[float], output_path: str, duration: float,
    width: int = WIDTH, height: int = HEIGHT, font_size: int = 72,
    template: str = "captionbox",
):
    """Composite dialogue text overlays with per-character colors."""
    font = _load_font(font_size)
    draw_fn = _draw_retro_overlay if template == "retro" else _draw_dialogue_overlay
    flat = "".join(t for t, _ in lines_data)
    keyword_idx = _find_keyword_indices(flat)
    unique_times = sorted(set(appear_times))

    with tempfile.TemporaryDirectory() as tmp:
        entries = []
        prev_visible = 0
        for si, t in enumerate(unique_times):
            visible = sum(1 for at in appear_times if at <= t)
            if visible == 0:
                prev_visible = visible
                continue
            png = os.path.join(tmp, f"txt_{si:04d}.png")
            frame = draw_fn(
                lines_data, visible, font, font_size, width, height,
                highlight_start=prev_visible, keyword_indices=keyword_idx,
            )
            frame.save(png, "PNG")
            end = unique_times[si + 1] if si + 1 < len(unique_times) else None
            entries.append((t, end, png))
            prev_visible = visible

        if not entries:
            import shutil
            shutil.copy2(bg_video, output_path)
            return

        print(f"  Rendered {len(entries)} text overlays")

        inputs = ["-i", bg_video]
        for _, _, png_path in entries:
            inputs.extend(["-i", png_path])

        filter_parts = []
        for i, (start, end, _) in enumerate(entries):
            src = "[0:v]" if i == 0 else f"[v{i-1}]"
            out = "[vout]" if i == len(entries) - 1 else f"[v{i}]"
            if end is None:
                enable = f"gte(t,{start:.3f})"
            else:
                enable = f"between(t,{start:.3f},{end:.3f})"
            filter_parts.append(f"{src}[{i+1}:v]overlay=0:0:enable='{enable}'{out}")

        subprocess.run(
            [
                "ffmpeg", "-y", *inputs,
                "-filter_complex", ";".join(filter_parts),
                "-map", "[vout]",
                "-c:v", "libx264", "-preset", "fast", "-pix_fmt", "yuv420p",
                "-t", str(duration + 1.5),
                "-loglevel", "error",
                output_path,
            ],
            check=True,
        )


def generate_dialogue_video(
    text: str,
    output_path: str,
    bgm_volume: float = 0.10,
    brand: str = "dark_awakening",
    dynamic: str = "auto",
    template: str = "captionbox",
):
    """Dual-voice dialogue pipeline: quote → dialogue blueprint → two voices → cinematic output."""
    from narrative_director import (
        generate_dialogue_blueprint, dialogue_to_scene_prompts,
        DIALOGUE_DYNAMICS,
    )
    import json as _json

    print("\n=== Dual-Voice Dialogue Video ===\n")
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

    # Step 1: Dialogue Blueprint
    print(f"Step 1: Generating dialogue blueprint (dynamic={dynamic})...")
    bp = generate_dialogue_blueprint(text, brand=brand, dynamic=dynamic)
    lines = bp["lines"]
    fmt = bp["format"]
    context = bp.get("context", "")
    silence_gap = bp.get("silence_gap_s", 2.0)
    bgm_arc = bp.get("bgm_arc", [0.5] * len(lines))
    voices = bp["voices"]

    used_dyn = bp.get("dynamic", dynamic)
    dyn_label = DIALOGUE_DYNAMICS.get(used_dyn, {}).get("name", used_dyn)
    print(f"  Dynamic: {dyn_label}")
    print(f"  Format: {fmt}")
    if context:
        print(f"  Context: {context}")
    for line in lines:
        c = line["char"]
        print(f"  [{c}] \"{line['text']}\" (emotion={line['emotion']}, pause={line['pause_after_ms']}ms)")
    print(f"  Silence gap: {silence_gap}s")

    with tempfile.TemporaryDirectory() as tmp:
        # Step 2: TTS — generate each line with the correct voice
        print("\nStep 2: Generating dual-voice TTS...")
        from fishaudio import FishAudio
        fish = FishAudio(api_key=os.environ["FISH_API_KEY"])

        audio_clips = []
        line_durations = []
        offset = 0.0
        line_boundaries = [0.0]

        for i, line in enumerate(lines):
            voice_id = voices[line["char"]]
            clip_path = os.path.join(tmp, f"line_{i:02d}.mp3")
            label = "A" if line["char"] == "A" else "B"

            audio_bytes = fish.tts.convert(
                text=line["text"], reference_id=voice_id, model="s1",
            )
            with open(clip_path, "wb") as f:
                f.write(audio_bytes)

            dur = _get_duration(clip_path)
            pause = line.get("pause_after_ms", 500) / 1000
            audio_clips.append(clip_path)
            line_durations.append(dur)
            offset += dur + pause
            line_boundaries.append(offset)
            print(f"  [{label}] \"{line['text'][:15]}...\" → {dur:.1f}s + {pause:.1f}s pause")

            # Generate pause clip
            if pause > 0:
                pause_path = os.path.join(tmp, f"pause_{i:02d}.mp3")
                subprocess.run(
                    ["ffmpeg", "-y", "-f", "lavfi", "-i",
                     f"anullsrc=r=44100:cl=mono", "-t", str(pause),
                     "-loglevel", "error", pause_path],
                    check=True,
                )
                audio_clips.append(pause_path)

        # Concatenate all voice clips
        voice_concat = os.path.join(tmp, "voice_all.mp3")
        list_file = os.path.join(tmp, "clips.txt")
        with open(list_file, "w") as f:
            for c in audio_clips:
                f.write(f"file '{c}'\n")
        subprocess.run(
            ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", list_file,
             "-c", "copy", "-loglevel", "error", voice_concat],
            check=True,
        )
        voice_duration = _get_duration(voice_concat)
        print(f"  Total voice: {voice_duration:.1f}s")

        # Step 3: Post-process
        print("\nStep 3: Post-processing audio...")
        from prosody_director import postprocess_audio
        processed = os.path.join(tmp, "voice_proc.mp3")
        try:
            postprocess_audio(voice_concat, processed)
        except Exception:
            processed = voice_concat
        voice_duration = _get_duration(processed)

        # Step 4: BGM
        print("\nStep 4: Mixing BGM with emotion curve...")
        final_audio = os.path.join(tmp, "audio_final.mp3")
        _mix_bgm_with_arc(processed, final_audio, bgm_arc, line_boundaries[:-1], silence_gap, bgm_volume)
        total_duration = _get_duration(final_audio)

        # Step 5: Scene visuals (one per line, densified)
        brand_config = _json.load(open(os.path.join(SKILL_DIR, "data", "brand_profiles.json")))[brand]
        scene_prompts = dialogue_to_scene_prompts(bp, brand_config)

        # Densify if needed
        dense_prompts, scene_boundaries = _densify_scenes(
            scene_prompts, line_boundaries[:-1], total_duration, target_interval=2.0,
        )
        n_scenes = len(dense_prompts)
        print(f"\nStep 5: Generating {n_scenes} scenes...")
        images = _generate_scene_images(dense_prompts, tmp)

        transition_dur = 0.4
        xfade_offsets = [max(b - transition_dur / 2, 0) for b in scene_boundaries[1:]]
        scene_clips = []
        scene_durations = []
        for i in range(n_scenes):
            if n_scenes == 1:
                clip_dur = total_duration
            elif i == 0:
                clip_dur = xfade_offsets[0] + transition_dur if xfade_offsets else total_duration
            elif i < n_scenes - 1:
                clip_dur = xfade_offsets[i] - xfade_offsets[i - 1] + transition_dur
            else:
                clip_dur = total_duration - xfade_offsets[-1] if xfade_offsets else total_duration
            clip_dur = max(clip_dur, 0.5)
            clip_path = os.path.join(tmp, f"kb_{i:02d}.mp4")
            cf = _retro_filters() if template == "retro" else None
            _ken_burns_clip(images[i], clip_path, clip_dur, effect_idx=i, color_filters=cf)
            scene_clips.append(clip_path)
            scene_durations.append(clip_dur)
            print(f"  [{i}] {clip_dur:.1f}s")

        # Step 6: Concatenate + particles
        print("\nStep 6: Concatenating with transitions...")
        bg_video = os.path.join(tmp, "bg_video.mp4")
        _concat_with_transitions(
            scene_clips, scene_durations, bg_video,
            transition_dur=transition_dur,
            offsets=xfade_offsets if len(scene_clips) > 1 else None,
        )
        bg_particles = os.path.join(tmp, "bg_particles.mp4")
        print("  Adding particle overlay...")
        _add_particle_overlay(bg_video, bg_particles, total_duration)
        bg_video = bg_particles

        # Step 7: Text overlay (dual-color per character)
        print("\nStep 7: Compositing dialogue text...")
        # Build lines_data: [(text, speaker), ...]
        text_lines = []
        for line in lines:
            # Split long lines
            for sub in split_quote_lines(line["text"]):
                text_lines.append((sub, line["char"]))

        flat = "".join(t for t, _ in text_lines)
        total_chars = len(flat)

        # Compute appear times: distribute per-line proportionally
        appear_times = []
        char_cursor = 0
        for li, line in enumerate(lines):
            line_chars = len(line["text"])
            line_start = line_boundaries[li] * (voice_duration / max(line_boundaries[-1], 0.01))
            line_dur = line_durations[li] if li < len(line_durations) else 1.0
            for j in range(line_chars):
                t = line_start + j * line_dur / max(line_chars, 1)
                appear_times.append(t)

        # Pad if needed
        while len(appear_times) < total_chars:
            appear_times.append(appear_times[-1] if appear_times else 0.0)

        print(f"  {len(text_lines)} display lines, {total_chars} chars")
        for t, s in text_lines:
            color = "ice-blue" if s == "A" else "amber"
            print(f"  [{s}] ({color}) {t}")

        video_with_text = os.path.join(tmp, "with_text.mp4")
        _composite_dialogue_text(
            bg_video, text_lines, appear_times, video_with_text, total_duration,
            template=template,
        )

        # Step 7b: Ticker bar (retro template)
        if template == "retro":
            print("  Adding retro ticker bar...")
            ticker_img = _render_ticker_bar(text)
            ticker_png = os.path.join(tmp, "ticker_bar.png")
            ticker_img.save(ticker_png, "PNG")
            video_ticker = os.path.join(tmp, "with_ticker.mp4")
            # Overlay the static ticker bar on the video
            subprocess.run(
                ["ffmpeg", "-y", "-i", video_with_text, "-i", ticker_png,
                 "-filter_complex", "[0:v][1:v]overlay=0:0",
                 "-c:v", "libx264", "-preset", "fast", "-pix_fmt", "yuv420p",
                 "-c:a", "copy", "-loglevel", "error", video_ticker],
                check=True,
            )
            video_with_text = video_ticker

        # Step 7c: Whoosh
        if len(scene_boundaries) > 1:
            print("  Adding whoosh transitions...")
            audio_whoosh = os.path.join(tmp, "audio_whoosh.mp3")
            _mix_whoosh_at_transitions(final_audio, audio_whoosh, scene_boundaries)
            final_audio = audio_whoosh

        # Step 8: Merge
        print("\nStep 8: Merging video + audio...")
        subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", video_with_text, "-i", final_audio,
                "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                "-shortest",
                "-loglevel", "error",
                output_path,
            ],
            check=True,
        )

        size_mb = os.path.getsize(output_path) / (1024 * 1024)
        print(f"\n=== Done ===")
        print(f"  Duration: {total_duration:.1f}s (voice {voice_duration:.1f}s + silence {silence_gap:.1f}s)")
        print(f"  Format:   {fmt} ({len(lines)} lines, A + B)")
        print(f"  Backend:  Ken Burns")
        print(f"  Output:   {output_path} ({size_mb:.1f} MB)")


def main():
    parser = argparse.ArgumentParser(description="Quote-style video generator")
    parser.add_argument("--text", "-t", help="Quote text")
    parser.add_argument("--bg", help="Background image path")
    parser.add_argument("--output", "-o", help="Output video path")
    parser.add_argument("--voice", help="Fish Audio voice ID")
    parser.add_argument("--bgm-volume", type=float, default=0.10)
    parser.add_argument("--reels", action="store_true", help="Cinematic reels (narrative director)")
    parser.add_argument("--veo", action="store_true", help="Use Veo 3 AI video backend")
    parser.add_argument("--fast", action="store_true", help="Use Veo 3 fast model")
    parser.add_argument("--brand", default="dark_awakening", help="Brand profile")
    parser.add_argument("--dialogue", action="store_true", help="Dual-voice dialogue mode")
    parser.add_argument("--dynamic", default="auto", choices=["auto", "master", "devil", "narrator"], help="Dialogue dynamic")
    parser.add_argument("--template", default="captionbox", choices=["captionbox", "retro"], help="Visual template")
    parser.add_argument("--test", action="store_true")
    args = parser.parse_args()

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    test_text = "你為什麼不快樂？因為你從來沒為自己考慮過，總把別人的感受放在第一位。"

    if args.test and args.dialogue:
        output = args.output or os.path.join(OUTPUT_DIR, f"dialogue_{args.dynamic}_{args.template}.mp4")
        generate_dialogue_video(test_text, output, brand=args.brand, dynamic=args.dynamic, template=args.template)
    elif args.dialogue and args.text:
        output = args.output or os.path.join(OUTPUT_DIR, "dialogue_output.mp4")
        generate_dialogue_video(
            args.text, output,
            bgm_volume=args.bgm_volume, brand=args.brand, dynamic=args.dynamic, template=args.template,
        )
    elif args.test and args.reels:
        output = os.path.join(OUTPUT_DIR, "cinematic_test.mp4")
        generate_cinematic_video(
            test_text, output,
            use_veo=args.veo, veo_fast=args.fast, brand=args.brand,
        )
    elif args.test:
        output = os.path.join(OUTPUT_DIR, "quote_test.mp4")
        generate_quote_video(test_text, output, bg_image=args.bg)
    elif args.text and args.reels:
        output = args.output or os.path.join(OUTPUT_DIR, "cinematic_output.mp4")
        generate_cinematic_video(
            args.text, output,
            voice_id=args.voice, bgm_volume=args.bgm_volume,
            use_veo=args.veo, veo_fast=args.fast, brand=args.brand,
        )
    elif args.text:
        output = args.output or os.path.join(OUTPUT_DIR, "quote_output.mp4")
        generate_quote_video(
            args.text, output,
            bg_image=args.bg, voice_id=args.voice, bgm_volume=args.bgm_volume,
        )
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
