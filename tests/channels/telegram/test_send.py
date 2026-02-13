"""Tests for Telegram message sending."""

import pytest

from openclaw_py.channels.telegram.send import (
    build_inline_keyboard,
    normalize_chat_id,
    normalize_message_id,
)


class TestNormalizeChatId:
    """Tests for normalize_chat_id."""

    def test_numeric_id(self):
        """Test numeric chat ID."""
        assert normalize_chat_id("123456") == "123456"

    def test_negative_id(self):
        """Test negative chat ID (groups)."""
        assert normalize_chat_id("-100123456") == "-100123456"

    def test_username_with_at(self):
        """Test username with @."""
        assert normalize_chat_id("@username") == "@username"

    def test_username_without_at(self):
        """Test username without @."""
        assert normalize_chat_id("username") == "@username"

    def test_tme_link_https(self):
        """Test t.me link with https."""
        assert normalize_chat_id("https://t.me/username") == "@username"

    def test_tme_link_http(self):
        """Test t.me link with http."""
        assert normalize_chat_id("http://t.me/username") == "@username"

    def test_tme_link_no_protocol(self):
        """Test t.me link without protocol."""
        assert normalize_chat_id("t.me/username") == "@username"

    def test_internal_prefix_telegram(self):
        """Test stripping telegram: prefix."""
        assert normalize_chat_id("telegram:123456") == "123456"

    def test_internal_prefix_telegram_group(self):
        """Test stripping telegram:group: prefix."""
        assert normalize_chat_id("telegram:group:-100123") == "-100123"

    def test_whitespace_trimming(self):
        """Test whitespace trimming."""
        assert normalize_chat_id("  @username  ") == "@username"

    def test_empty_raises(self):
        """Test empty string raises ValueError."""
        with pytest.raises(ValueError, match="Recipient is required"):
            normalize_chat_id("")

    def test_whitespace_only_raises(self):
        """Test whitespace-only raises ValueError."""
        with pytest.raises(ValueError, match="Recipient is required"):
            normalize_chat_id("   ")


class TestNormalizeMessageId:
    """Tests for normalize_message_id."""

    def test_integer_input(self):
        """Test integer input."""
        assert normalize_message_id(123) == 123

    def test_string_input(self):
        """Test string input."""
        assert normalize_message_id("456") == 456

    def test_string_with_whitespace(self):
        """Test string with whitespace."""
        assert normalize_message_id("  789  ") == 789

    def test_large_number(self):
        """Test large message ID."""
        assert normalize_message_id(999999999) == 999999999

    def test_empty_string_raises(self):
        """Test empty string raises ValueError."""
        with pytest.raises(ValueError, match="Message id is required"):
            normalize_message_id("")

    def test_invalid_string_raises(self):
        """Test invalid string raises ValueError."""
        with pytest.raises(ValueError, match="Message id is required"):
            normalize_message_id("not_a_number")

    def test_zero_raises(self):
        """Test zero raises ValueError."""
        with pytest.raises(ValueError, match="Message id is required"):
            normalize_message_id(0)

    def test_negative_raises(self):
        """Test negative number raises ValueError."""
        with pytest.raises(ValueError, match="Message id is required"):
            normalize_message_id(-1)


class TestBuildInlineKeyboard:
    """Tests for build_inline_keyboard."""

    def test_none_buttons(self):
        """Test with None buttons."""
        result = build_inline_keyboard(None)
        assert result is None

    def test_empty_list(self):
        """Test with empty list."""
        result = build_inline_keyboard([])
        assert result is None

    def test_single_button(self):
        """Test with single button."""
        buttons = [[{"text": "Yes", "callback_data": "yes"}]]
        result = build_inline_keyboard(buttons)
        assert result is not None
        assert len(result.inline_keyboard) == 1
        assert len(result.inline_keyboard[0]) == 1
        assert result.inline_keyboard[0][0].text == "Yes"
        assert result.inline_keyboard[0][0].callback_data == "yes"

    def test_multiple_buttons_same_row(self):
        """Test with multiple buttons in same row."""
        buttons = [
            [
                {"text": "Yes", "callback_data": "yes"},
                {"text": "No", "callback_data": "no"},
            ]
        ]
        result = build_inline_keyboard(buttons)
        assert result is not None
        assert len(result.inline_keyboard) == 1
        assert len(result.inline_keyboard[0]) == 2

    def test_multiple_rows(self):
        """Test with multiple rows."""
        buttons = [
            [{"text": "Yes", "callback_data": "yes"}],
            [{"text": "No", "callback_data": "no"}],
        ]
        result = build_inline_keyboard(buttons)
        assert result is not None
        assert len(result.inline_keyboard) == 2
        assert len(result.inline_keyboard[0]) == 1
        assert len(result.inline_keyboard[1]) == 1

    def test_filters_invalid_buttons(self):
        """Test filtering of invalid buttons."""
        buttons = [
            [
                {"text": "Valid", "callback_data": "valid"},
                {"text": "Missing callback"},  # Invalid: no callback_data
                {"callback_data": "no_text"},  # Invalid: no text
                None,  # Invalid: None
            ]
        ]
        result = build_inline_keyboard(buttons)
        assert result is not None
        assert len(result.inline_keyboard[0]) == 1
        assert result.inline_keyboard[0][0].text == "Valid"

    def test_filters_empty_rows(self):
        """Test filtering of empty rows."""
        buttons = [
            [{"text": "Valid", "callback_data": "valid"}],
            [],  # Empty row
            [{"text": "Invalid"}],  # Row with only invalid buttons
            [{"text": "Valid2", "callback_data": "valid2"}],
        ]
        result = build_inline_keyboard(buttons)
        assert result is not None
        assert len(result.inline_keyboard) == 2  # Only 2 valid rows

    def test_all_invalid_returns_none(self):
        """Test that all invalid buttons returns None."""
        buttons = [[{"text": "Missing callback"}], [{"callback_data": "no_text"}]]
        result = build_inline_keyboard(buttons)
        assert result is None
