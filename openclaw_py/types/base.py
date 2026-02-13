"""Core base types for OpenClaw.

This module defines fundamental enums and types used throughout the codebase.
All types use Literal for better IDE support and validation.
"""

from typing import Literal

# Chat and messaging types
ChatType = Literal["direct", "group", "channel"]
ReplyMode = Literal["text", "command"]
TypingMode = Literal["never", "instant", "thinking", "message"]

# Session scoping
SessionScope = Literal["per-sender", "global"]
DmScope = Literal["main", "per-peer", "per-channel-peer", "per-account-channel-peer"]

# Reply and policy settings
ReplyToMode = Literal["off", "first", "all"]
GroupPolicy = Literal["open", "disabled", "allowlist"]
DmPolicy = Literal["pairing", "allowlist", "open", "disabled"]

# Rendering and formatting
MarkdownTableMode = Literal["off", "bullets", "code"]

# Session management
SessionResetMode = Literal["daily", "idle"]
SessionSendPolicyAction = Literal["allow", "deny"]
SessionMaintenanceMode = Literal["enforce", "warn"]

# Logging
LogLevel = Literal["silent", "fatal", "error", "warn", "info", "debug", "trace"]


def normalize_chat_type(raw: str | None) -> ChatType | None:
    """Normalize chat type string to canonical ChatType.

    Args:
        raw: Raw chat type string (e.g., "direct", "dm", "group", "channel")

    Returns:
        Normalized ChatType or None if invalid

    Examples:
        >>> normalize_chat_type("direct")
        "direct"
        >>> normalize_chat_type("dm")
        "direct"
        >>> normalize_chat_type("GROUP")
        "group"
        >>> normalize_chat_type("invalid")
        None
    """
    if not raw:
        return None

    value = raw.strip().lower()
    if not value:
        return None

    # "dm" is an alias for "direct"
    if value in ("direct", "dm"):
        return "direct"

    if value == "group":
        return "group"

    if value == "channel":
        return "channel"

    return None
