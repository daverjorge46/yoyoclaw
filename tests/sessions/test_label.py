"""Tests for session label validation."""

import pytest

from openclaw_py.sessions import SESSION_LABEL_MAX_LENGTH, parse_session_label


class TestParseSessionLabel:
    """Tests for parse_session_label function."""

    def test_valid_label(self):
        """Test parsing valid label."""
        result = parse_session_label("my-session")
        assert result.ok is True
        assert result.label == "my-session"
        assert result.error is None

    def test_label_with_spaces(self):
        """Test label with spaces."""
        result = parse_session_label("My Session Label")
        assert result.ok is True
        assert result.label == "My Session Label"

    def test_label_with_special_chars(self):
        """Test label with special characters."""
        result = parse_session_label("session_123-test.v2")
        assert result.ok is True
        assert result.label == "session_123-test.v2"

    def test_label_trimmed(self):
        """Test that label is trimmed."""
        result = parse_session_label("  trimmed  ")
        assert result.ok is True
        assert result.label == "trimmed"

    def test_empty_string(self):
        """Test empty string is rejected."""
        result = parse_session_label("")
        assert result.ok is False
        assert result.label is None
        assert "empty" in result.error.lower()

    def test_whitespace_only(self):
        """Test whitespace-only string is rejected."""
        result = parse_session_label("   ")
        assert result.ok is False
        assert "empty" in result.error.lower()

    def test_non_string_type(self):
        """Test non-string types are rejected."""
        result = parse_session_label(123)
        assert result.ok is False
        assert "must be a string" in result.error

        result = parse_session_label(None)
        assert result.ok is False
        assert "must be a string" in result.error

        result = parse_session_label(["label"])
        assert result.ok is False
        assert "must be a string" in result.error

    def test_max_length(self):
        """Test maximum length enforcement."""
        # Exactly at max length
        label_at_max = "x" * SESSION_LABEL_MAX_LENGTH
        result = parse_session_label(label_at_max)
        assert result.ok is True
        assert result.label == label_at_max

        # One over max length
        label_too_long = "x" * (SESSION_LABEL_MAX_LENGTH + 1)
        result = parse_session_label(label_too_long)
        assert result.ok is False
        assert result.label is None
        assert "too long" in result.error
        assert str(SESSION_LABEL_MAX_LENGTH) in result.error

    def test_max_length_constant(self):
        """Test that max length constant is 64."""
        assert SESSION_LABEL_MAX_LENGTH == 64

    def test_unicode_label(self):
        """Test Unicode characters in label."""
        result = parse_session_label("会话标签")
        assert result.ok is True
        assert result.label == "会话标签"

    def test_emoji_label(self):
        """Test emoji in label."""
        result = parse_session_label("🚀 rocket session")
        assert result.ok is True
        assert result.label == "🚀 rocket session"
