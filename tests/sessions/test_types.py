"""Tests for session types."""

import pytest

from openclaw_py.sessions import SessionEntry, SessionOrigin, merge_session_entry


class TestSessionOrigin:
    """Tests for SessionOrigin model."""

    def test_create_origin(self):
        """Test creating a session origin."""
        origin = SessionOrigin(
            label="test",
            provider="telegram",
            chat_type="direct",
            from_="user123",
            to="bot456",
        )
        assert origin.label == "test"
        assert origin.provider == "telegram"
        assert origin.chat_type == "direct"
        assert origin.from_ == "user123"
        assert origin.to == "bot456"

    def test_origin_optional_fields(self):
        """Test that origin fields are optional."""
        origin = SessionOrigin()
        assert origin.label is None
        assert origin.provider is None
        assert origin.chat_type is None

    def test_origin_from_alias(self):
        """Test from/from_ field alias."""
        # Can use "from" in dict
        data = {"from": "user123"}
        origin = SessionOrigin(**data)
        assert origin.from_ == "user123"

        # Can use "from_" directly
        origin2 = SessionOrigin(from_="user456")
        assert origin2.from_ == "user456"


class TestSessionEntry:
    """Tests for SessionEntry model."""

    def test_create_minimal_entry(self):
        """Test creating minimal session entry."""
        entry = SessionEntry(
            session_id="123",
            updated_at=1000,
        )
        assert entry.session_id == "123"
        assert entry.updated_at == 1000
        assert entry.aborted_last_run is False
        assert entry.system_sent is False
        assert entry.compaction_count == 0

    def test_create_full_entry(self):
        """Test creating full session entry."""
        origin = SessionOrigin(label="test", provider="telegram")
        entry = SessionEntry(
            session_id="123",
            updated_at=1000,
            label="My Session",
            display_name="Test Session",
            chat_type="direct",
            channel="telegram",
            origin=origin,
            model_provider="anthropic",
            model="claude-3-opus",
            input_tokens=100,
            output_tokens=200,
            total_tokens=300,
            compaction_count=2,
        )
        assert entry.session_id == "123"
        assert entry.label == "My Session"
        assert entry.display_name == "Test Session"
        assert entry.chat_type == "direct"
        assert entry.channel == "telegram"
        assert entry.origin == origin
        assert entry.model_provider == "anthropic"
        assert entry.model == "claude-3-opus"
        assert entry.input_tokens == 100
        assert entry.output_tokens == 200
        assert entry.total_tokens == 300
        assert entry.compaction_count == 2

    def test_entry_serialization(self):
        """Test entry serialization/deserialization."""
        entry = SessionEntry(
            session_id="123",
            updated_at=1000,
            label="test",
            input_tokens=50,
        )
        data = entry.model_dump()
        assert data["session_id"] == "123"
        assert data["updated_at"] == 1000
        assert data["label"] == "test"
        assert data["input_tokens"] == 50

        # Recreate from dict
        entry2 = SessionEntry(**data)
        assert entry2.session_id == entry.session_id
        assert entry2.updated_at == entry.updated_at
        assert entry2.label == entry.label


class TestMergeSessionEntry:
    """Tests for merge_session_entry function."""

    def test_merge_creates_new_entry(self):
        """Test merging creates new entry when existing is None."""
        patch = {
            "label": "test",
            "input_tokens": 100,
        }
        merged = merge_session_entry(None, patch)

        assert merged.session_id  # Auto-generated UUID
        assert merged.updated_at > 0  # Auto-generated timestamp
        assert merged.label == "test"
        assert merged.input_tokens == 100

    def test_merge_preserves_session_id(self):
        """Test merging preserves session_id from existing entry."""
        existing = SessionEntry(session_id="123", updated_at=1000)
        patch = {"label": "test"}
        merged = merge_session_entry(existing, patch)

        assert merged.session_id == "123"
        assert merged.label == "test"

    def test_merge_updates_timestamp(self):
        """Test merging updates timestamp."""
        existing = SessionEntry(session_id="123", updated_at=1000)
        patch = {"label": "test"}
        merged = merge_session_entry(existing, patch)

        # Should be max of existing, patch, or current time
        assert merged.updated_at >= 1000

    def test_merge_combines_fields(self):
        """Test merging combines fields from existing and patch."""
        existing = SessionEntry(
            session_id="123",
            updated_at=1000,
            label="old",
            input_tokens=50,
            model="claude-2",
        )
        patch = {
            "label": "new",
            "output_tokens": 100,
        }
        merged = merge_session_entry(existing, patch)

        assert merged.session_id == "123"
        assert merged.label == "new"  # Updated
        assert merged.input_tokens == 50  # Preserved
        assert merged.output_tokens == 100  # Added
        assert merged.model == "claude-2"  # Preserved

    def test_merge_explicit_session_id_in_patch(self):
        """Test merging with explicit session_id in patch."""
        existing = SessionEntry(session_id="123", updated_at=1000)
        patch = {"session_id": "456", "label": "test"}
        merged = merge_session_entry(existing, patch)

        # Patch session_id takes precedence
        assert merged.session_id == "456"

    def test_merge_explicit_updated_at_in_patch(self):
        """Test merging with explicit updated_at in patch."""
        existing = SessionEntry(session_id="123", updated_at=1000)
        patch = {"updated_at": 5000, "label": "test"}
        merged = merge_session_entry(existing, patch)

        # Should use max timestamp
        assert merged.updated_at >= 5000
