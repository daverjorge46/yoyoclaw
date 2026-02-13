"""Tests for Telegram update processing."""

import pytest

from openclaw_py.channels.telegram.updates import (
    TelegramUpdateDedupe,
    build_telegram_update_key,
    create_telegram_update_dedupe,
    extract_media_group_id,
    resolve_telegram_update_id,
    should_buffer_media_group,
)


class TestResolveTelegramUpdateId:
    """Tests for resolve_telegram_update_id."""

    def test_with_update_id(self):
        """Test extracting update_id."""
        update = {"update_id": 123, "message": {}}
        update_id = resolve_telegram_update_id(update)
        assert update_id == 123

    def test_without_update_id(self):
        """Test when update_id is missing."""
        update = {"message": {}}
        update_id = resolve_telegram_update_id(update)
        assert update_id is None


class TestBuildTelegramUpdateKey:
    """Tests for build_telegram_update_key."""

    def test_with_update_id(self):
        """Test building key from update_id."""
        update = {"update_id": 123}
        key = build_telegram_update_key(update)
        assert key == "update:123"

    def test_with_message(self):
        """Test building key from message."""
        update = {
            "message": {
                "message_id": 456,
                "chat": {"id": 789},
            }
        }
        key = build_telegram_update_key(update)
        assert "msg:789:456" in key or "update:" in key

    def test_with_callback_query(self):
        """Test building key from callback_query."""
        update = {
            "callback_query": {
                "id": "abc123",
            }
        }
        key = build_telegram_update_key(update)
        assert "callback:abc123" in key or "update:" in key


class TestTelegramUpdateDedupe:
    """Tests for TelegramUpdateDedupe."""

    def test_first_update_not_duplicate(self):
        """Test first update is not duplicate."""
        dedupe = create_telegram_update_dedupe()
        is_dup = dedupe.is_duplicate("update:123")
        assert is_dup is False

    def test_second_update_is_duplicate(self):
        """Test second identical update is duplicate."""
        dedupe = create_telegram_update_dedupe()
        dedupe.is_duplicate("update:123")
        is_dup = dedupe.is_duplicate("update:123")
        assert is_dup is True

    def test_different_updates_not_duplicate(self):
        """Test different updates are not duplicates."""
        dedupe = create_telegram_update_dedupe()
        dedupe.is_duplicate("update:123")
        is_dup = dedupe.is_duplicate("update:456")
        assert is_dup is False

    def test_clear(self):
        """Test clearing dedupe tracker."""
        dedupe = create_telegram_update_dedupe()
        dedupe.is_duplicate("update:123")
        dedupe.clear()
        is_dup = dedupe.is_duplicate("update:123")
        assert is_dup is False


class TestExtractMediaGroupId:
    """Tests for extract_media_group_id."""

    def test_with_media_group_id(self):
        """Test extracting media_group_id."""
        message = {"media_group_id": "12345"}
        group_id = extract_media_group_id(message)
        assert group_id == "12345"

    def test_without_media_group_id(self):
        """Test message without media_group_id."""
        message = {"text": "hello"}
        group_id = extract_media_group_id(message)
        assert group_id is None


class TestShouldBufferMediaGroup:
    """Tests for should_buffer_media_group."""

    def test_photo_with_group_id(self):
        """Test photo with media_group_id should be buffered."""
        message = {
            "media_group_id": "12345",
            "photo": [{"file_id": "ABC"}],
        }
        should_buffer = should_buffer_media_group(message)
        assert should_buffer is True

    def test_video_with_group_id(self):
        """Test video with media_group_id should be buffered."""
        message = {
            "media_group_id": "12345",
            "video": {"file_id": "DEF"},
        }
        should_buffer = should_buffer_media_group(message)
        assert should_buffer is True

    def test_text_with_group_id(self):
        """Test text with media_group_id should not be buffered."""
        message = {
            "media_group_id": "12345",
            "text": "hello",
        }
        should_buffer = should_buffer_media_group(message)
        assert should_buffer is False

    def test_photo_without_group_id(self):
        """Test photo without media_group_id should not be buffered."""
        message = {
            "photo": [{"file_id": "ABC"}],
        }
        should_buffer = should_buffer_media_group(message)
        assert should_buffer is False
