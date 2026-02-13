"""Tests for Telegram draft chunking configuration."""

import pytest

from openclaw_py.channels.telegram.draft_chunking import (
    DEFAULT_TELEGRAM_DRAFT_STREAM_MAX,
    DEFAULT_TELEGRAM_DRAFT_STREAM_MIN,
    DraftChunkConfig,
    resolve_telegram_draft_streaming_chunking,
)


class TestResolveTelegramDraftStreamingChunking:
    """Tests for resolve_telegram_draft_streaming_chunking."""

    def test_default_config(self):
        """Test default configuration."""
        config = resolve_telegram_draft_streaming_chunking(None)
        assert isinstance(config, DraftChunkConfig)
        assert config.min_chars == DEFAULT_TELEGRAM_DRAFT_STREAM_MIN
        assert config.max_chars == DEFAULT_TELEGRAM_DRAFT_STREAM_MAX
        assert config.break_preference == "paragraph"

    def test_without_account_id(self):
        """Test without account ID."""
        config = resolve_telegram_draft_streaming_chunking(None, None)
        assert config.min_chars == DEFAULT_TELEGRAM_DRAFT_STREAM_MIN
        assert config.max_chars == DEFAULT_TELEGRAM_DRAFT_STREAM_MAX

    def test_with_account_id(self):
        """Test with account ID."""
        config = resolve_telegram_draft_streaming_chunking(None, "test_account")
        assert config.min_chars == DEFAULT_TELEGRAM_DRAFT_STREAM_MIN
        assert config.max_chars == DEFAULT_TELEGRAM_DRAFT_STREAM_MAX

    def test_min_less_than_max(self):
        """Test min_chars is always <= max_chars."""
        config = resolve_telegram_draft_streaming_chunking(None)
        assert config.min_chars <= config.max_chars

    def test_positive_values(self):
        """Test all values are positive."""
        config = resolve_telegram_draft_streaming_chunking(None)
        assert config.min_chars > 0
        assert config.max_chars > 0

    def test_break_preference_values(self):
        """Test break_preference is valid."""
        config = resolve_telegram_draft_streaming_chunking(None)
        assert config.break_preference in ("paragraph", "newline", "sentence")
