"""Tests for Telegram group migration."""

import pytest

from openclaw_py.channels.telegram.group_migration import (
    TelegramGroupMigrationResult,
    migrate_telegram_groups_in_place,
)


class TestMigrateTelegramGroupsInPlace:
    """Tests for migrate_telegram_groups_in_place."""

    def test_none_groups(self):
        """Test with None groups."""
        result = migrate_telegram_groups_in_place(None, "123", "456")
        assert result["migrated"] is False
        assert result["skipped_existing"] is False

    def test_same_chat_id(self):
        """Test with same chat IDs."""
        groups = {"123": {"name": "Test"}}
        result = migrate_telegram_groups_in_place(groups, "123", "123")
        assert result["migrated"] is False
        assert result["skipped_existing"] is False

    def test_old_chat_id_not_found(self):
        """Test when old chat ID doesn't exist."""
        groups = {"999": {"name": "Other"}}
        result = migrate_telegram_groups_in_place(groups, "123", "456")
        assert result["migrated"] is False
        assert result["skipped_existing"] is False

    def test_new_chat_id_already_exists(self):
        """Test when new chat ID already exists."""
        groups = {"123": {"name": "Old"}, "456": {"name": "New"}}
        result = migrate_telegram_groups_in_place(groups, "123", "456")
        assert result["migrated"] is False
        assert result["skipped_existing"] is True
        # Original groups should be unchanged
        assert "123" in groups
        assert "456" in groups

    def test_successful_migration(self):
        """Test successful migration."""
        groups = {"123": {"name": "Test Group", "allowed": True}}
        result = migrate_telegram_groups_in_place(groups, "123", "456")
        assert result["migrated"] is True
        assert result["skipped_existing"] is False
        # Old ID should be removed
        assert "123" not in groups
        # New ID should have the same config
        assert "456" in groups
        assert groups["456"]["name"] == "Test Group"
        assert groups["456"]["allowed"] is True

    def test_migration_preserves_data(self):
        """Test that migration preserves all data."""
        config = {"name": "Group", "topic": 5, "nested": {"key": "value"}}
        groups = {"123": config}
        result = migrate_telegram_groups_in_place(groups, "123", "456")
        assert result["migrated"] is True
        assert groups["456"] == config
        assert groups["456"]["nested"]["key"] == "value"

    def test_empty_groups_dict(self):
        """Test with empty groups dict."""
        groups = {}
        result = migrate_telegram_groups_in_place(groups, "123", "456")
        assert result["migrated"] is False
        assert len(groups) == 0
