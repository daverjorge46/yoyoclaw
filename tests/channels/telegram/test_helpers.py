"""Tests for Telegram helper functions."""

import pytest

from openclaw_py.channels.telegram.helpers import (
    build_telegram_group_peer_id,
    build_telegram_parent_peer,
    get_telegram_sequential_key,
    normalize_telegram_chat_type,
    resolve_telegram_forum_thread_id,
)


class TestBuildTelegramGroupPeerId:
    """Tests for build_telegram_group_peer_id."""

    def test_without_thread_id(self):
        """Test building peer ID without thread ID."""
        peer_id = build_telegram_group_peer_id(-1001234567890)
        assert peer_id == "tg:-1001234567890"

    def test_with_thread_id(self):
        """Test building peer ID with thread ID."""
        peer_id = build_telegram_group_peer_id(-1001234567890, 42)
        assert peer_id == "tg:-1001234567890:42"

    def test_zero_thread_id(self):
        """Test building peer ID with thread ID 0."""
        peer_id = build_telegram_group_peer_id(-1001234567890, 0)
        assert peer_id == "tg:-1001234567890:0"


class TestBuildTelegramParentPeer:
    """Tests for build_telegram_parent_peer."""

    def test_build_parent_peer(self):
        """Test building parent peer ID."""
        peer_id = build_telegram_parent_peer(-1001234567890)
        assert peer_id == "tg:-1001234567890"


class TestResolveTelegramForumThreadId:
    """Tests for resolve_telegram_forum_thread_id."""

    def test_with_thread_id(self):
        """Test extracting thread ID from message."""
        message = {"message_thread_id": 42}
        thread_id = resolve_telegram_forum_thread_id(message)
        assert thread_id == 42

    def test_without_thread_id(self):
        """Test message without thread ID."""
        message = {"chat": {"id": 123}}
        thread_id = resolve_telegram_forum_thread_id(message)
        assert thread_id is None

    def test_is_topic_message_without_id(self):
        """Test is_topic_message flag without thread ID."""
        message = {"is_topic_message": True}
        thread_id = resolve_telegram_forum_thread_id(message)
        assert thread_id is None


class TestNormalizeTelegramChatType:
    """Tests for normalize_telegram_chat_type."""

    def test_private_chat(self):
        """Test normalizing private chat type."""
        chat_type = normalize_telegram_chat_type("private")
        assert chat_type == "direct"

    def test_group_chat(self):
        """Test normalizing group chat type."""
        chat_type = normalize_telegram_chat_type("group")
        assert chat_type == "group"

    def test_supergroup_chat(self):
        """Test normalizing supergroup chat type."""
        chat_type = normalize_telegram_chat_type("supergroup")
        assert chat_type == "group"

    def test_channel(self):
        """Test normalizing channel type."""
        chat_type = normalize_telegram_chat_type("channel")
        assert chat_type == "channel"

    def test_none_input(self):
        """Test None input."""
        chat_type = normalize_telegram_chat_type(None)
        assert chat_type is None

    def test_case_insensitive(self):
        """Test case insensitive normalization."""
        chat_type = normalize_telegram_chat_type("PRIVATE")
        assert chat_type == "direct"


class TestGetTelegramSequentialKey:
    """Tests for get_telegram_sequential_key."""

    def test_basic_dm(self):
        """Test basic DM sequential key."""
        key = get_telegram_sequential_key(chat_id=123)
        assert key == "telegram:123"

    def test_control_command(self):
        """Test control command sequential key."""
        key = get_telegram_sequential_key(chat_id=123, is_control_command=True)
        assert key == "telegram:123:control"

    def test_group_message(self):
        """Test group message sequential key."""
        key = get_telegram_sequential_key(chat_id=-1001234, is_group=True)
        assert key == "telegram:-1001234:group"

    def test_no_chat_id(self):
        """Test sequential key without chat ID."""
        key = get_telegram_sequential_key()
        assert key == "telegram:unknown"
