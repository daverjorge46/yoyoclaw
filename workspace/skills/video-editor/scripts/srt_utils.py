"""SRT subtitle format utilities with Netflix-compliant formatting."""

from subtitle_rules import detect_language, format_lines, normalize_punctuation


def format_srt_timestamp(seconds: float) -> str:
    """Convert seconds to SRT timestamp format HH:MM:SS,mmm."""
    if seconds < 0:
        seconds = 0
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds % 1) * 1000))
    if millis >= 1000:
        millis = 999
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def segments_to_srt(segments: list[dict], lang: str | None = None) -> str:
    """Convert subtitle segments to SRT format string.

    Applies Netflix line-breaking rules: max 16 chars/line for Chinese,
    max 2 lines per event, proper punctuation handling.
    """
    blocks = []
    idx = 1
    for seg in segments:
        start = format_srt_timestamp(seg["start"])
        end = format_srt_timestamp(seg["end"])
        text = normalize_punctuation(seg["text"].strip())
        if not text:
            continue

        seg_lang = lang or detect_language(text)
        formatted = format_lines(text, seg_lang)

        blocks.append(f"{idx}\n{start} --> {end}\n{formatted}\n")
        idx += 1

    return "\n".join(blocks)


def write_srt(segments: list[dict], output_path: str, lang: str | None = None) -> str:
    """Write segments to an SRT file. Returns the output path."""
    srt_content = segments_to_srt(segments, lang=lang)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(srt_content)
    return output_path


if __name__ == "__main__":
    # Quick self-test with Netflix formatting
    test_segments = [
        {"start": 0.0, "end": 2.5, "text": "你好，這是一個自動字幕測試"},
        {"start": 2.5, "end": 5.0, "text": "AI可以把語音轉換成文字然後生成字幕檔案"},
        {"start": 5.0, "end": 8.2, "text": "這個功能非常實用。"},
    ]
    print(segments_to_srt(test_segments))
