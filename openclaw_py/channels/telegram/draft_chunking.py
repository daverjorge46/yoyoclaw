"""Telegram draft streaming chunking configuration.

This module resolves chunk size limits for draft streaming based on
configuration and channel constraints.
"""

from typing import Literal, NamedTuple

from openclaw_py.config import OpenClawConfig
from openclaw_py.logging import log_debug

DEFAULT_TELEGRAM_DRAFT_STREAM_MIN = 200
DEFAULT_TELEGRAM_DRAFT_STREAM_MAX = 800
DEFAULT_TEXT_CHUNK_LIMIT = 4096

BreakPreference = Literal["paragraph", "newline", "sentence"]


class DraftChunkConfig(NamedTuple):
    """Draft chunking configuration."""

    min_chars: int
    max_chars: int
    break_preference: BreakPreference


def resolve_telegram_draft_streaming_chunking(
    config: OpenClawConfig | None,
    account_id: str | None = None,
) -> DraftChunkConfig:
    """Resolve draft streaming chunking configuration.

    Args:
        config: OpenClaw configuration
        account_id: Telegram account ID (optional)

    Returns:
        DraftChunkConfig with min/max chars and break preference

    Examples:
        >>> config = resolve_telegram_draft_streaming_chunking(None)
        >>> config.min_chars
        200
        >>> config.max_chars
        800
        >>> config.break_preference
        'paragraph'
    """
    # Default text limit for Telegram
    text_limit = DEFAULT_TEXT_CHUNK_LIMIT

    # Try to get channel-specific limit from config
    if config and hasattr(config, "channels"):
        channels = config.channels
        if channels and isinstance(channels, dict):
            telegram_config = channels.get("telegram")
            if telegram_config:
                # Check if there's a textChunkLimit in telegram config
                if hasattr(telegram_config, "text_chunk_limit"):
                    text_limit = telegram_config.text_chunk_limit or text_limit

    # Normalize account ID
    normalized_account_id = (account_id or "default").strip().lower()

    # Get draft chunk config from account or global telegram config
    draft_config = None
    if config and hasattr(config, "channels"):
        channels = config.channels
        if channels and isinstance(channels, dict):
            telegram_config = channels.get("telegram")
            if telegram_config:
                # Try account-specific config
                if hasattr(telegram_config, "accounts"):
                    accounts = telegram_config.accounts
                    if accounts and normalized_account_id in accounts:
                        account_config = accounts[normalized_account_id]
                        if hasattr(account_config, "draft_chunk"):
                            draft_config = account_config.draft_chunk

                # Fallback to global telegram config
                if not draft_config and hasattr(telegram_config, "draft_chunk"):
                    draft_config = telegram_config.draft_chunk

    # Extract max_chars and min_chars
    max_requested = DEFAULT_TELEGRAM_DRAFT_STREAM_MAX
    min_requested = DEFAULT_TELEGRAM_DRAFT_STREAM_MIN
    break_preference: BreakPreference = "paragraph"

    if draft_config:
        if hasattr(draft_config, "max_chars") and draft_config.max_chars:
            max_requested = max(1, int(draft_config.max_chars))

        if hasattr(draft_config, "min_chars") and draft_config.min_chars:
            min_requested = max(1, int(draft_config.min_chars))

        if hasattr(draft_config, "break_preference"):
            pref = draft_config.break_preference
            if pref in ("newline", "sentence", "paragraph"):
                break_preference = pref

    # Apply limits
    max_chars = max(1, min(max_requested, text_limit))
    min_chars = min(min_requested, max_chars)

    log_debug(
        f"Telegram draft chunking: min={min_chars}, max={max_chars}, "
        f"break={break_preference}, account={account_id}"
    )

    return DraftChunkConfig(
        min_chars=min_chars,
        max_chars=max_chars,
        break_preference=break_preference,
    )
