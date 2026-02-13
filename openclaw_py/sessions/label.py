"""Session label validation.

This module provides validation for session labels.
"""

from typing import Any, NamedTuple


SESSION_LABEL_MAX_LENGTH = 64


class ParsedSessionLabel(NamedTuple):
    """Result of parsing a session label."""

    ok: bool
    label: str | None = None
    error: str | None = None


def parse_session_label(raw: Any) -> ParsedSessionLabel:
    """Parse and validate a session label.

    Args:
        raw: Raw label value (should be a string)

    Returns:
        ParsedSessionLabel with validation result

    Examples:
        >>> result = parse_session_label("my-session")
        >>> result.ok
        True
        >>> result.label
        'my-session'

        >>> result = parse_session_label("")
        >>> result.ok
        False
        >>> result.error
        'invalid label: empty'

        >>> result = parse_session_label("x" * 100)
        >>> result.ok
        False
        >>> "too long" in result.error
        True
    """
    if not isinstance(raw, str):
        return ParsedSessionLabel(
            ok=False,
            error="invalid label: must be a string",
        )

    trimmed = raw.strip()

    if not trimmed:
        return ParsedSessionLabel(
            ok=False,
            error="invalid label: empty",
        )

    if len(trimmed) > SESSION_LABEL_MAX_LENGTH:
        return ParsedSessionLabel(
            ok=False,
            error=f"invalid label: too long (max {SESSION_LABEL_MAX_LENGTH})",
        )

    return ParsedSessionLabel(
        ok=True,
        label=trimmed,
    )
