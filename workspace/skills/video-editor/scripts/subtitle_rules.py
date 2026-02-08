"""Netflix-compliant subtitle segmentation engine.

Based on Netflix Timed Text Style Guide (TTSG):
- Chinese Simplified/Traditional style guides
- Subtitle Timing Guidelines
- General Requirements

Reference: https://partnerhelp.netflixstudios.com/hc/en-us/articles/215758617
"""

import re

# === Netflix Engineering Constants ===

# Duration (ms)
MIN_DURATION_MS = 833       # 5/6 second (20 frames @ 24fps)
MAX_DURATION_MS = 7000      # 7 seconds
IDEAL_MIN_MS = 1000         # practical minimum for readability
IDEAL_MAX_MS = 5000         # practical sweet spot

# Characters per line
MAX_CPL_ZH = 16             # CJK Originals
MAX_CPL_EN = 42             # Latin scripts
MAX_LINES = 2               # max lines per subtitle event

# Reading speed (Characters Per Second)
MAX_CPS_ZH = 9              # Chinese adult
MAX_CPS_EN = 20             # English adult

# Gap between subtitles
MIN_GAP_MS = 83             # 2 frames @ 24fps

# Chinese punctuation that signals a good break point (priority order)
STRONG_BREAKS = set("。！？；")       # sentence-ending: period, !, ?, semicolon
MEDIUM_BREAKS = set("，、：")         # clause-level: comma, enumeration comma, colon
WEAK_BREAKS = set("—…～）」』】》")   # dash, ellipsis, closing brackets

# Punctuation to strip from line endings (Netflix Chinese rule)
TRAILING_PUNCT = set("，、。；：")     # no commas/periods/semicolons at end of lines


def is_cjk(char: str) -> bool:
    """Check if a character is CJK."""
    cp = ord(char)
    return (
        (0x4E00 <= cp <= 0x9FFF)        # CJK Unified Ideographs
        or (0x3400 <= cp <= 0x4DBF)     # Extension A
        or (0x3000 <= cp <= 0x303F)     # CJK Symbols and Punctuation
        or (0xFF00 <= cp <= 0xFFEF)     # Fullwidth Forms
        or (0xFE30 <= cp <= 0xFE4F)     # CJK Compatibility Forms
    )


def char_count(text: str) -> int:
    """Count display characters (CJK chars count as 1, ignoring spaces)."""
    return len(text.replace(" ", ""))


def detect_language(text: str) -> str:
    """Simple language detection: 'zh' if >50% CJK chars, else 'en'."""
    if not text:
        return "en"
    cjk = sum(1 for c in text if is_cjk(c))
    return "zh" if cjk / max(len(text.replace(" ", "")), 1) > 0.3 else "en"


def get_max_cpl(lang: str) -> int:
    return MAX_CPL_ZH if lang == "zh" else MAX_CPL_EN


def get_max_cps(lang: str) -> float:
    return MAX_CPS_ZH if lang == "zh" else MAX_CPS_EN


def clean_line_ending(text: str, lang: str) -> str:
    """Netflix Chinese rule: strip trailing commas/periods from line ends."""
    if lang != "zh":
        return text
    while text and text[-1] in TRAILING_PUNCT:
        text = text[:-1]
    return text


def normalize_punctuation(text: str) -> str:
    """Normalize punctuation to Netflix standards."""
    # ASCII → fullwidth (Whisper often outputs ASCII punctuation for CJK text)
    text = text.replace(",", "，")
    text = text.replace(":", "：")
    text = text.replace(";", "；")
    text = text.replace("!", "！")
    text = text.replace("?", "？")
    # Three dots → proper ellipsis
    text = text.replace("...", "\u2026")
    # Ensure consistent spacing
    text = text.strip()
    return text


def find_best_break(text: str, max_chars: int) -> int:
    """Find the best position to break a line within max_chars.

    Priority: strong punct > medium punct > weak punct > mid-point.
    Prefers bottom-heavy (shorter top line).
    """
    if char_count(text) <= max_chars:
        return len(text)

    # Search for break points within the allowed range
    best_pos = -1
    best_priority = -1

    for i, ch in enumerate(text):
        if i == 0:
            continue
        # Count display chars up to this position
        prefix_len = char_count(text[:i + 1])
        if prefix_len > max_chars:
            break

        if ch in STRONG_BREAKS:
            priority = 3
        elif ch in MEDIUM_BREAKS:
            priority = 2
        elif ch in WEAK_BREAKS:
            priority = 1
        else:
            continue

        # Prefer later breaks (bottom-heavy) at same priority
        if priority >= best_priority:
            best_priority = priority
            best_pos = i + 1  # break after the punctuation

    if best_pos > 0:
        return best_pos

    # No punctuation found — break at max_chars boundary
    count = 0
    for i, ch in enumerate(text):
        if ch != " ":
            count += 1
        if count >= max_chars:
            return i + 1

    return len(text)


def split_into_lines(text: str, lang: str) -> list[str]:
    """Split text into max 2 lines respecting char limits and break rules."""
    max_cpl = get_max_cpl(lang)
    text = normalize_punctuation(text)

    if char_count(text) <= max_cpl:
        return [clean_line_ending(text, lang)]

    # Find break point for line 1
    break_pos = find_best_break(text, max_cpl)
    line1 = text[:break_pos].strip()
    line2 = text[break_pos:].strip()

    line1 = clean_line_ending(line1, lang)
    line2 = clean_line_ending(line2, lang)

    if not line2:
        return [line1]
    return [line1, line2]


def segment_words_to_subtitles(
    words: list[dict],
    lang: str = "zh",
) -> list[dict]:
    """Regroup word-level timestamps into Netflix-compliant subtitle segments.

    Each word dict has: start (float), end (float), word (str).
    Returns subtitle segments: start, end, text (str).
    """
    if not words:
        return []

    max_cpl = get_max_cpl(lang)
    max_cps = get_max_cps(lang)
    max_chars = max_cpl * MAX_LINES  # max total chars per subtitle event

    subtitles = []
    current_words = []
    current_text = ""

    def flush():
        if not current_words:
            return
        start = current_words[0]["start"]
        end = current_words[-1]["end"]
        text = current_text.strip()
        text = normalize_punctuation(text)

        # Ensure minimum duration
        duration_ms = (end - start) * 1000
        if duration_ms < MIN_DURATION_MS and subtitles:
            # Try extending end time
            end = start + MIN_DURATION_MS / 1000

        subtitles.append({"start": start, "end": end, "text": text})

    for w in words:
        word = w["word"].strip()
        if not word:
            continue

        tentative = (current_text + word).strip()
        tentative_chars = char_count(tentative)
        tentative_duration = (w["end"] - current_words[0]["start"]) if current_words else 0

        # Check if adding this word would violate constraints
        should_break = False

        # Rule 1: Character limit exceeded
        if tentative_chars > max_chars:
            should_break = True

        # Rule 2: Duration would exceed max
        if tentative_duration > MAX_DURATION_MS / 1000:
            should_break = True

        # Rule 3: CPS would be too high
        if tentative_duration > 0:
            cps = tentative_chars / tentative_duration
            if cps > max_cps * 1.5:  # allow some slack, will be validated later
                should_break = True

        # Rule 4: Strong punctuation at end of current text = natural break
        if current_text and current_text[-1] in STRONG_BREAKS and tentative_chars > max_cpl:
            should_break = True

        # Rule 5: Medium punctuation + enough content = decent break
        if (current_text and current_text[-1] in MEDIUM_BREAKS
                and char_count(current_text) >= max_cpl * 0.6
                and tentative_chars > max_cpl):
            should_break = True

        if should_break and current_words:
            flush()
            current_words = []
            current_text = ""

        current_words.append(w)
        current_text += word

    # Flush remaining
    flush()

    # Post-process: enforce min gap between subtitles
    for i in range(1, len(subtitles)):
        gap = subtitles[i]["start"] - subtitles[i - 1]["end"]
        if gap < MIN_GAP_MS / 1000:
            subtitles[i - 1]["end"] = subtitles[i]["start"] - MIN_GAP_MS / 1000

    return subtitles


def segment_text_by_time(
    text: str,
    start: float,
    end: float,
    lang: str = "zh",
) -> list[dict]:
    """Fallback: split a single long segment by punctuation when no word timestamps.

    Distributes time proportionally based on character count.
    """
    text = normalize_punctuation(text.strip())
    if not text:
        return []

    max_cpl = get_max_cpl(lang)
    max_chars = max_cpl * MAX_LINES
    duration = end - start

    # Split at strong punctuation first
    chunks = []
    current = ""
    for ch in text:
        current += ch
        if ch in STRONG_BREAKS and char_count(current) >= 4:
            chunks.append(current.strip())
            current = ""
    if current.strip():
        chunks.append(current.strip())

    # Further split chunks that exceed single-line limit at medium punctuation
    # This ensures each subtitle event stays ≤ max_cpl per line
    final_chunks = []
    for chunk in chunks:
        if char_count(chunk) <= max_cpl:
            final_chunks.append(chunk)
        else:
            # Split at medium punctuation
            sub = ""
            for ch in chunk:
                sub += ch
                if ch in MEDIUM_BREAKS and char_count(sub) >= max_cpl * 0.5:
                    final_chunks.append(sub.strip())
                    sub = ""
            if sub.strip():
                final_chunks.append(sub.strip())

    # Further split if still too long (force break at char limit)
    result_chunks = []
    for chunk in final_chunks:
        while char_count(chunk) > max_chars:
            pos = find_best_break(chunk, max_cpl)
            result_chunks.append(chunk[:pos].strip())
            chunk = chunk[pos:].strip()
        if chunk:
            result_chunks.append(chunk)

    if not result_chunks:
        return [{"start": start, "end": end, "text": text}]

    # Distribute time proportionally
    total_chars = sum(char_count(c) for c in result_chunks)
    subtitles = []
    cursor = start

    for i, chunk in enumerate(result_chunks):
        chars = char_count(chunk)
        seg_duration = (chars / max(total_chars, 1)) * duration
        # Enforce min/max duration
        seg_duration = max(seg_duration, MIN_DURATION_MS / 1000)
        seg_end = min(cursor + seg_duration, end)

        if i == len(result_chunks) - 1:
            seg_end = end  # last segment takes remaining time

        chunk = clean_line_ending(chunk, lang)
        subtitles.append({"start": round(cursor, 3), "end": round(seg_end, 3), "text": chunk})
        cursor = seg_end + MIN_GAP_MS / 1000

    return subtitles


def format_lines(text: str, lang: str) -> str:
    """Format text into properly broken lines for SRT output."""
    lines = split_into_lines(text, lang)
    return "\n".join(lines)


def validate_subtitle(sub: dict, lang: str) -> list[str]:
    """Validate a subtitle segment against Netflix rules. Returns list of warnings."""
    warnings = []
    duration_ms = (sub["end"] - sub["start"]) * 1000
    text = sub["text"]
    chars = char_count(text)
    max_cpl = get_max_cpl(lang)
    max_cps = get_max_cps(lang)

    if duration_ms < MIN_DURATION_MS:
        warnings.append(f"Duration {duration_ms:.0f}ms < min {MIN_DURATION_MS}ms")
    if duration_ms > MAX_DURATION_MS:
        warnings.append(f"Duration {duration_ms:.0f}ms > max {MAX_DURATION_MS}ms")

    lines = text.split("\n")
    if len(lines) > MAX_LINES:
        warnings.append(f"{len(lines)} lines > max {MAX_LINES}")
    for i, line in enumerate(lines):
        if char_count(line) > max_cpl:
            warnings.append(f"Line {i+1}: {char_count(line)} chars > max {max_cpl}")

    if duration_ms > 0:
        cps = chars / (duration_ms / 1000)
        if cps > max_cps:
            warnings.append(f"CPS {cps:.1f} > max {max_cps}")

    return warnings


if __name__ == "__main__":
    # Self-test
    print("=== Subtitle Rules Self-Test ===\n")

    # Test: split long Chinese text
    test = "你好，这是一个自动字幕测试，AI可以把语音转换成文字，然后生成字幕档案，这个功能非常实用。"
    print(f"Input ({char_count(test)} chars): {test}")

    subs = segment_text_by_time(test, 0.0, 9.6, lang="zh")
    print(f"\nSegmented into {len(subs)} subtitles:")
    for i, s in enumerate(subs, 1):
        dur = (s['end'] - s['start']) * 1000
        lines = format_lines(s['text'], 'zh')
        cps = char_count(s['text']) / max((s['end'] - s['start']), 0.1)
        warns = validate_subtitle(s, 'zh')
        status = "PASS" if not warns else f"WARN: {'; '.join(warns)}"
        print(f"\n  [{i}] {s['start']:.3f} --> {s['end']:.3f} ({dur:.0f}ms, {cps:.1f} CPS) [{status}]")
        for line in lines.split("\n"):
            print(f"      {line}")
