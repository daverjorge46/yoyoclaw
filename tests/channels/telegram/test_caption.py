"""Tests for Telegram caption splitting."""

import pytest

from openclaw_py.channels.telegram.caption import (
    TELEGRAM_MAX_CAPTION_LENGTH,
    split_telegram_caption,
)


class TestSplitTelegramCaption:
    """Tests for split_telegram_caption function."""

    def test_short_caption(self):
        """Test caption within limit."""
        result = split_telegram_caption("Short caption")
        assert result["caption"] == "Short caption"
        assert result["followUpText"] is None

    def test_empty_caption(self):
        """Test empty caption."""
        result = split_telegram_caption("")
        assert result["caption"] is None
        assert result["followUpText"] is None

    def test_none_caption(self):
        """Test None caption."""
        result = split_telegram_caption(None)
        assert result["caption"] is None
        assert result["followUpText"] is None

    def test_whitespace_only(self):
        """Test whitespace-only caption."""
        result = split_telegram_caption("   ")
        assert result["caption"] is None
        assert result["followUpText"] is None

    def test_caption_at_limit(self):
        """Test caption exactly at limit."""
        text = "x" * TELEGRAM_MAX_CAPTION_LENGTH
        result = split_telegram_caption(text)
        assert result["caption"] == text
        assert result["followUpText"] is None

    def test_caption_over_limit(self):
        """Test caption over limit."""
        text = "x" * (TELEGRAM_MAX_CAPTION_LENGTH + 100)
        result = split_telegram_caption(text)
        assert result["caption"] is None
        assert result["followUpText"] == text

    def test_caption_trimming(self):
        """Test caption with leading/trailing whitespace."""
        result = split_telegram_caption("  text  ")
        assert result["caption"] == "text"
        assert result["followUpText"] is None

    def test_caption_over_limit_with_whitespace(self):
        """Test over-limit caption with whitespace."""
        text = " " + "x" * (TELEGRAM_MAX_CAPTION_LENGTH + 10) + " "
        result = split_telegram_caption(text)
        # After trimming, it's over limit
        assert result["caption"] is None
        assert result["followUpText"] == "x" * (TELEGRAM_MAX_CAPTION_LENGTH + 10)
