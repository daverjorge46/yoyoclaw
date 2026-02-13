"""Tests for openclaw_py.types.base module."""

import pytest

from openclaw_py.types import (
    ChatType,
    DmPolicy,
    DmScope,
    GroupPolicy,
    LogLevel,
    MarkdownTableMode,
    ReplyMode,
    ReplyToMode,
    SessionMaintenanceMode,
    SessionResetMode,
    SessionScope,
    SessionSendPolicyAction,
    TypingMode,
    normalize_chat_type,
)


class TestNormalizeChatType:
    """Tests for normalize_chat_type function."""

    def test_direct_normalizes_correctly(self):
        """Test that 'direct' normalizes to 'direct'."""
        assert normalize_chat_type("direct") == "direct"

    def test_dm_normalizes_to_direct(self):
        """Test that 'dm' is an alias for 'direct'."""
        assert normalize_chat_type("dm") == "direct"

    def test_group_normalizes_correctly(self):
        """Test that 'group' normalizes to 'group'."""
        assert normalize_chat_type("group") == "group"

    def test_channel_normalizes_correctly(self):
        """Test that 'channel' normalizes to 'channel'."""
        assert normalize_chat_type("channel") == "channel"

    def test_case_insensitive(self):
        """Test that normalization is case-insensitive."""
        assert normalize_chat_type("DIRECT") == "direct"
        assert normalize_chat_type("DM") == "direct"
        assert normalize_chat_type("GROUP") == "group"
        assert normalize_chat_type("Channel") == "channel"

    def test_whitespace_handling(self):
        """Test that leading/trailing whitespace is stripped."""
        assert normalize_chat_type("  direct  ") == "direct"
        assert normalize_chat_type("\tdm\n") == "direct"
        assert normalize_chat_type(" group ") == "group"

    def test_none_input_returns_none(self):
        """Test that None input returns None."""
        assert normalize_chat_type(None) is None

    def test_empty_string_returns_none(self):
        """Test that empty string returns None."""
        assert normalize_chat_type("") is None
        assert normalize_chat_type("   ") is None

    def test_invalid_value_returns_none(self):
        """Test that invalid values return None."""
        assert normalize_chat_type("invalid") is None
        assert normalize_chat_type("unknown") is None
        assert normalize_chat_type("123") is None


class TestTypeDefinitions:
    """Tests for type definitions existence and basic usage."""

    def test_chat_type_values(self):
        """Test ChatType literal values."""
        valid_values: list[ChatType] = ["direct", "group", "channel"]
        assert all(v in ["direct", "group", "channel"] for v in valid_values)

    def test_reply_mode_values(self):
        """Test ReplyMode literal values."""
        valid_values: list[ReplyMode] = ["text", "command"]
        assert all(v in ["text", "command"] for v in valid_values)

    def test_typing_mode_values(self):
        """Test TypingMode literal values."""
        valid_values: list[TypingMode] = ["never", "instant", "thinking", "message"]
        assert all(v in ["never", "instant", "thinking", "message"] for v in valid_values)

    def test_session_scope_values(self):
        """Test SessionScope literal values."""
        valid_values: list[SessionScope] = ["per-sender", "global"]
        assert all(v in ["per-sender", "global"] for v in valid_values)

    def test_dm_scope_values(self):
        """Test DmScope literal values."""
        valid_values: list[DmScope] = [
            "main",
            "per-peer",
            "per-channel-peer",
            "per-account-channel-peer",
        ]
        assert all(
            v
            in ["main", "per-peer", "per-channel-peer", "per-account-channel-peer"]
            for v in valid_values
        )

    def test_reply_to_mode_values(self):
        """Test ReplyToMode literal values."""
        valid_values: list[ReplyToMode] = ["off", "first", "all"]
        assert all(v in ["off", "first", "all"] for v in valid_values)

    def test_group_policy_values(self):
        """Test GroupPolicy literal values."""
        valid_values: list[GroupPolicy] = ["open", "disabled", "allowlist"]
        assert all(v in ["open", "disabled", "allowlist"] for v in valid_values)

    def test_dm_policy_values(self):
        """Test DmPolicy literal values."""
        valid_values: list[DmPolicy] = ["pairing", "allowlist", "open", "disabled"]
        assert all(
            v in ["pairing", "allowlist", "open", "disabled"] for v in valid_values
        )

    def test_markdown_table_mode_values(self):
        """Test MarkdownTableMode literal values."""
        valid_values: list[MarkdownTableMode] = ["off", "bullets", "code"]
        assert all(v in ["off", "bullets", "code"] for v in valid_values)

    def test_session_reset_mode_values(self):
        """Test SessionResetMode literal values."""
        valid_values: list[SessionResetMode] = ["daily", "idle"]
        assert all(v in ["daily", "idle"] for v in valid_values)

    def test_session_send_policy_action_values(self):
        """Test SessionSendPolicyAction literal values."""
        valid_values: list[SessionSendPolicyAction] = ["allow", "deny"]
        assert all(v in ["allow", "deny"] for v in valid_values)

    def test_session_maintenance_mode_values(self):
        """Test SessionMaintenanceMode literal values."""
        valid_values: list[SessionMaintenanceMode] = ["enforce", "warn"]
        assert all(v in ["enforce", "warn"] for v in valid_values)

    def test_log_level_values(self):
        """Test LogLevel literal values."""
        valid_values: list[LogLevel] = [
            "silent",
            "fatal",
            "error",
            "warn",
            "info",
            "debug",
            "trace",
        ]
        assert all(
            v in ["silent", "fatal", "error", "warn", "info", "debug", "trace"]
            for v in valid_values
        )
