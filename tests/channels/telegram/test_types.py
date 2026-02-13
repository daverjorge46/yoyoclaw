"""Tests for Telegram types."""

import pytest
from pydantic import ValidationError

from openclaw_py.channels.telegram.types import (
    TelegramBotOptions,
    TelegramMediaRef,
    TelegramMessageContext,
)


class TestTelegramBotOptions:
    """Tests for TelegramBotOptions."""

    def test_minimal_options(self):
        """Test creating bot options with minimal fields."""
        opts = TelegramBotOptions(token="123:ABC")
        assert opts.token == "123:ABC"
        assert opts.account_id == "default"

    def test_full_options(self):
        """Test creating bot options with all fields."""
        opts = TelegramBotOptions(
            token="123:ABC",
            account_id="my_bot",
            require_mention=True,
            allow_from=["@alice", 123],
            group_allow_from=["@bob"],
            media_max_mb=20,
            reply_to_mode="first",
            last_update_id=456,
        )
        assert opts.token == "123:ABC"
        assert opts.account_id == "my_bot"
        assert opts.require_mention is True
        assert opts.allow_from == ["@alice", 123]
        assert opts.last_update_id == 456


class TestTelegramMediaRef:
    """Tests for TelegramMediaRef."""

    def test_photo_ref(self):
        """Test creating photo media reference."""
        ref = TelegramMediaRef(
            file_id="AgACAgIAAxkBAAIC",
            media_type="photo",
            width=1280,
            height=720,
        )
        assert ref.file_id == "AgACAgIAAxkBAAIC"
        assert ref.media_type == "photo"
        assert ref.width == 1280

    def test_video_ref(self):
        """Test creating video media reference."""
        ref = TelegramMediaRef(
            file_id="BAACAgIAAxkBAAID",
            media_type="video",
            mime_type="video/mp4",
            duration=30,
        )
        assert ref.media_type == "video"
        assert ref.mime_type == "video/mp4"
        assert ref.duration == 30


class TestTelegramMessageContext:
    """Tests for TelegramMessageContext."""

    def test_minimal_context(self):
        """Test creating minimal message context."""
        ctx = TelegramMessageContext(
            session_key="telegram:default:dm:123",
            agent_id="default",
            account_id="default",
            sender_id=123,
            chat_id=123,
            chat_type="private",
            message_id=456,
        )
        assert ctx.session_key == "telegram:default:dm:123"
        assert ctx.sender_id == 123
        assert ctx.chat_type == "private"

    def test_full_context(self):
        """Test creating full message context."""
        ctx = TelegramMessageContext(
            session_key="telegram:default:dm:123",
            agent_id="default",
            account_id="default",
            sender_id=123,
            sender_username="alice",
            sender_first_name="Alice",
            chat_id=123,
            chat_type="private",
            message_id=456,
            text="Hello bot!",
            was_mentioned=False,
            is_allowed=True,
            allow_source="policy",
        )
        assert ctx.sender_username == "alice"
        assert ctx.text == "Hello bot!"
        assert ctx.is_allowed is True
        assert ctx.allow_source == "policy"

    def test_group_context(self):
        """Test creating group message context."""
        ctx = TelegramMessageContext(
            session_key="telegram:default:group:tg:-1001234",
            agent_id="default",
            account_id="default",
            sender_id=123,
            chat_id=-1001234,
            chat_type="supergroup",
            chat_title="Test Group",
            message_id=456,
            was_mentioned=True,
        )
        assert ctx.chat_type == "supergroup"
        assert ctx.chat_title == "Test Group"
        assert ctx.was_mentioned is True
