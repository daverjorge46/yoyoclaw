"""Telegram caption splitting logic.

Telegram media captions have a maximum length of 1024 characters.
This module provides utilities to split captions that exceed this limit.
"""

TELEGRAM_MAX_CAPTION_LENGTH = 1024


def split_telegram_caption(text: str | None) -> dict[str, str | None]:
    """Split caption text if it exceeds Telegram's limit.

    If the text is longer than 1024 characters, it returns None for caption
    and the full text as followUpText. Otherwise, it returns the text as caption.

    Args:
        text: Caption text to split

    Returns:
        Dict with keys:
        - caption: Text to use as media caption (max 1024 chars), or None
        - followUpText: Text to send as follow-up message, or None

    Examples:
        >>> split_telegram_caption("Short text")
        {'caption': 'Short text', 'followUpText': None}
        >>> split_telegram_caption("x" * 2000)
        {'caption': None, 'followUpText': 'xxx...'}
        >>> split_telegram_caption(None)
        {'caption': None, 'followUpText': None}
        >>> split_telegram_caption("  ")
        {'caption': None, 'followUpText': None}
    """
    trimmed = text.strip() if text else ""

    if not trimmed:
        return {"caption": None, "followUpText": None}

    if len(trimmed) > TELEGRAM_MAX_CAPTION_LENGTH:
        return {"caption": None, "followUpText": trimmed}

    return {"caption": trimmed, "followUpText": None}
