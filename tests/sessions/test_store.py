"""Tests for session store persistence."""

import asyncio
import json
import time
from pathlib import Path

import pytest

from openclaw_py.sessions import (
    SessionEntry,
    cap_entry_count,
    clear_session_store_cache_for_test,
    load_session_store,
    prune_stale_entries,
    read_session_updated_at,
    rotate_session_file,
    save_session_store,
    update_session_store,
)


class TestLoadSessionStore:
    """Tests for load_session_store function."""

    @pytest.mark.asyncio
    async def test_load_nonexistent_file(self, tmp_path):
        """Test loading non-existent file returns empty store."""
        store_path = tmp_path / "sessions.json"
        store = await load_session_store(store_path)
        assert store == {}

    @pytest.mark.asyncio
    async def test_load_empty_file(self, tmp_path):
        """Test loading empty file returns empty store."""
        store_path = tmp_path / "sessions.json"
        store_path.write_text("")

        store = await load_session_store(store_path)
        assert store == {}

    @pytest.mark.asyncio
    async def test_load_valid_store(self, tmp_path):
        """Test loading valid session store."""
        store_path = tmp_path / "sessions.json"

        # Create a valid store file
        data = {
            "session1": {
                "session_id": "123",
                "updated_at": 1000,
                "label": "Test Session",
            }
        }
        store_path.write_text(json.dumps(data))

        store = await load_session_store(store_path)
        assert len(store) == 1
        assert "session1" in store

        entry = store["session1"]
        assert isinstance(entry, SessionEntry)
        assert entry.session_id == "123"
        assert entry.updated_at == 1000
        assert entry.label == "Test Session"

    @pytest.mark.asyncio
    async def test_load_invalid_json(self, tmp_path):
        """Test loading invalid JSON returns empty store."""
        store_path = tmp_path / "sessions.json"
        store_path.write_text("{invalid json")

        store = await load_session_store(store_path)
        assert store == {}

    @pytest.mark.asyncio
    async def test_load_skips_invalid_entries(self, tmp_path):
        """Test loading skips invalid entries."""
        store_path = tmp_path / "sessions.json"

        data = {
            "valid": {
                "session_id": "123",
                "updated_at": 1000,
            },
            "invalid": {
                # Missing required fields
                "label": "Bad Entry",
            },
        }
        store_path.write_text(json.dumps(data))

        store = await load_session_store(store_path)
        assert len(store) == 1
        assert "valid" in store
        assert "invalid" not in store

    @pytest.mark.asyncio
    async def test_load_with_cache(self, tmp_path):
        """Test caching behavior."""
        clear_session_store_cache_for_test()
        store_path = tmp_path / "sessions.json"

        # Create initial store
        data = {"s1": {"session_id": "123", "updated_at": 1000}}
        store_path.write_text(json.dumps(data))

        # First load (cache miss)
        store1 = await load_session_store(store_path)
        assert len(store1) == 1

        # Modify file
        data["s2"] = {"session_id": "456", "updated_at": 2000}
        store_path.write_text(json.dumps(data))

        # Second load (cache hit - should still be old data)
        store2 = await load_session_store(store_path)
        # Cache should detect mtime change and reload
        assert len(store2) == 2  # Should have both entries

    @pytest.mark.asyncio
    async def test_load_skip_cache(self, tmp_path):
        """Test skip_cache parameter."""
        clear_session_store_cache_for_test()
        store_path = tmp_path / "sessions.json"

        # Create initial store
        data = {"s1": {"session_id": "123", "updated_at": 1000}}
        store_path.write_text(json.dumps(data))

        # Load with cache
        store1 = await load_session_store(store_path)
        assert len(store1) == 1

        # Modify file
        data["s2"] = {"session_id": "456", "updated_at": 2000}
        store_path.write_text(json.dumps(data))

        # Load with skip_cache=True
        store2 = await load_session_store(store_path, skip_cache=True)
        assert len(store2) == 2


class TestSaveSessionStore:
    """Tests for save_session_store function."""

    @pytest.mark.asyncio
    async def test_save_empty_store(self, tmp_path):
        """Test saving empty store."""
        store_path = tmp_path / "sessions.json"
        store: dict[str, SessionEntry] = {}

        await save_session_store(store_path, store)

        assert store_path.exists()
        content = json.loads(store_path.read_text())
        assert content == {}

    @pytest.mark.asyncio
    async def test_save_with_entries(self, tmp_path):
        """Test saving store with entries."""
        store_path = tmp_path / "sessions.json"
        store = {
            "s1": SessionEntry(session_id="123", updated_at=1000, label="Test"),
        }

        await save_session_store(store_path, store, skip_maintenance=True)

        assert store_path.exists()
        content = json.loads(store_path.read_text())
        assert "s1" in content
        assert content["s1"]["session_id"] == "123"
        assert content["s1"]["label"] == "Test"

    @pytest.mark.asyncio
    async def test_save_creates_directory(self, tmp_path):
        """Test saving creates parent directories."""
        store_path = tmp_path / "nested" / "dir" / "sessions.json"
        store = {
            "s1": SessionEntry(session_id="123", updated_at=1000),
        }

        await save_session_store(store_path, store, skip_maintenance=True)

        assert store_path.exists()

    @pytest.mark.asyncio
    async def test_save_invalidates_cache(self, tmp_path):
        """Test saving invalidates cache."""
        clear_session_store_cache_for_test()
        store_path = tmp_path / "sessions.json"

        # Load to populate cache
        now_ms = int(time.time() * 1000)
        store1 = {
            "s1": SessionEntry(session_id="123", updated_at=now_ms),
        }
        await save_session_store(store_path, store1, skip_maintenance=True)

        # Modify and save again
        store2 = {
            "s1": SessionEntry(session_id="123", updated_at=now_ms + 1000),
            "s2": SessionEntry(session_id="456", updated_at=now_ms + 2000),
        }
        await save_session_store(store_path, store2, skip_maintenance=True)

        # Load should get new data
        loaded = await load_session_store(store_path)
        assert len(loaded) == 2


class TestUpdateSessionStore:
    """Tests for update_session_store function."""

    @pytest.mark.asyncio
    async def test_update_adds_entry(self, tmp_path):
        """Test update can add entries."""
        store_path = tmp_path / "sessions.json"

        def mutator(store):
            entry = SessionEntry(session_id="123", updated_at=1000)
            store["s1"] = entry
            return entry

        result = await update_session_store(store_path, mutator)
        assert result.session_id == "123"

        # Verify persisted
        loaded = await load_session_store(store_path, skip_cache=True)
        assert "s1" in loaded

    @pytest.mark.asyncio
    async def test_update_modifies_entry(self, tmp_path):
        """Test update can modify entries."""
        store_path = tmp_path / "sessions.json"

        # Create initial store
        initial = {
            "s1": SessionEntry(session_id="123", updated_at=1000, label="Old"),
        }
        await save_session_store(store_path, initial)

        # Update it
        def mutator(store):
            store["s1"].label = "New"
            return store["s1"]

        await update_session_store(store_path, mutator)

        # Verify change persisted
        loaded = await load_session_store(store_path, skip_cache=True)
        assert loaded["s1"].label == "New"

    @pytest.mark.asyncio
    async def test_update_atomic(self, tmp_path):
        """Test update is atomic (uses lock)."""
        store_path = tmp_path / "sessions.json"

        counter = {"value": 0}

        async def slow_mutator(store):
            await asyncio.sleep(0.01)
            counter["value"] += 1
            store[f"s{counter['value']}"] = SessionEntry(
                session_id=str(counter["value"]),
                updated_at=counter["value"],
            )

        # Run multiple updates concurrently
        await asyncio.gather(*[
            update_session_store(store_path, slow_mutator)
            for _ in range(5)
        ])

        # All updates should have persisted
        loaded = await load_session_store(store_path, skip_cache=True)
        assert len(loaded) == 5


class TestReadSessionUpdatedAt:
    """Tests for read_session_updated_at function."""

    @pytest.mark.asyncio
    async def test_read_existing_session(self, tmp_path):
        """Test reading updated_at for existing session."""
        store_path = tmp_path / "sessions.json"
        store = {
            "s1": SessionEntry(session_id="123", updated_at=5000),
        }
        await save_session_store(store_path, store)

        updated_at = await read_session_updated_at(store_path, "s1")
        assert updated_at == 5000

    @pytest.mark.asyncio
    async def test_read_nonexistent_session(self, tmp_path):
        """Test reading updated_at for non-existent session."""
        store_path = tmp_path / "sessions.json"
        store = {
            "s1": SessionEntry(session_id="123", updated_at=5000),
        }
        await save_session_store(store_path, store)

        updated_at = await read_session_updated_at(store_path, "nonexistent")
        assert updated_at is None

    @pytest.mark.asyncio
    async def test_read_from_nonexistent_file(self, tmp_path):
        """Test reading from non-existent file."""
        store_path = tmp_path / "nonexistent.json"
        updated_at = await read_session_updated_at(store_path, "s1")
        assert updated_at is None


class TestPruneStaleEntries:
    """Tests for prune_stale_entries function."""

    def test_prune_stale_entries(self):
        """Test pruning stale entries."""
        now_ms = int(time.time() * 1000)
        max_age_ms = 1000

        store = {
            "old": SessionEntry(session_id="1", updated_at=now_ms - 2000),
            "recent": SessionEntry(session_id="2", updated_at=now_ms - 500),
        }

        pruned = prune_stale_entries(store, max_age_ms, log=False)
        assert pruned == 1
        assert "old" not in store
        assert "recent" in store

    def test_prune_no_stale_entries(self):
        """Test pruning when no entries are stale."""
        now_ms = int(time.time() * 1000)

        store = {
            "s1": SessionEntry(session_id="1", updated_at=now_ms - 100),
            "s2": SessionEntry(session_id="2", updated_at=now_ms - 200),
        }

        pruned = prune_stale_entries(store, max_age_ms=1000, log=False)
        assert pruned == 0
        assert len(store) == 2


class TestCapEntryCount:
    """Tests for cap_entry_count function."""

    def test_cap_excess_entries(self):
        """Test capping excess entries."""
        # Create 10 entries, cap at 5
        store = {
            f"s{i}": SessionEntry(session_id=str(i), updated_at=i * 1000)
            for i in range(10)
        }

        removed = cap_entry_count(store, max_entries=5, log=False)
        assert removed == 5
        assert len(store) == 5

        # Should keep most recent 5 (5-9)
        for i in range(5, 10):
            assert f"s{i}" in store

    def test_cap_no_excess(self):
        """Test capping when no excess entries."""
        store = {
            f"s{i}": SessionEntry(session_id=str(i), updated_at=i * 1000)
            for i in range(5)
        }

        removed = cap_entry_count(store, max_entries=10, log=False)
        assert removed == 0
        assert len(store) == 5


class TestRotateSessionFile:
    """Tests for rotate_session_file function."""

    @pytest.mark.asyncio
    async def test_rotate_large_file(self, tmp_path):
        """Test rotating file that exceeds size threshold."""
        store_path = tmp_path / "sessions.json"

        # Create a large file (>1KB)
        large_store = {
            f"s{i}": SessionEntry(
                session_id=str(i),
                updated_at=i,
                label="x" * 100,  # Make entries larger
            )
            for i in range(100)
        }
        await save_session_store(store_path, large_store, skip_maintenance=True)

        # Rotate with low threshold
        rotated = await rotate_session_file(store_path, max_bytes=1024)
        assert rotated is True

        # Original file should be gone, backup should exist
        assert not store_path.exists() or store_path.stat().st_size == 0
        backups = list(tmp_path.glob(f"{store_path.name}.bak.*"))
        assert len(backups) >= 1

    @pytest.mark.asyncio
    async def test_no_rotate_small_file(self, tmp_path):
        """Test no rotation for small file."""
        store_path = tmp_path / "sessions.json"

        # Create a small file
        store = {
            "s1": SessionEntry(session_id="1", updated_at=1000),
        }
        await save_session_store(store_path, store, skip_maintenance=True)

        # Try to rotate with high threshold
        rotated = await rotate_session_file(store_path, max_bytes=1024 * 1024)
        assert rotated is False

        # File should still exist
        assert store_path.exists()

    @pytest.mark.asyncio
    async def test_rotate_nonexistent_file(self, tmp_path):
        """Test rotating non-existent file."""
        store_path = tmp_path / "nonexistent.json"
        rotated = await rotate_session_file(store_path)
        assert rotated is False


class TestConcurrentAccess:
    """Tests for concurrent access to session store."""

    @pytest.mark.asyncio
    async def test_concurrent_updates(self, tmp_path):
        """Test concurrent updates don't cause data loss."""
        store_path = tmp_path / "sessions.json"

        async def add_session(i):
            def mutator(store):
                store[f"s{i}"] = SessionEntry(
                    session_id=str(i),
                    updated_at=i * 1000,
                )
            await update_session_store(store_path, mutator)

        # Run 20 concurrent updates
        await asyncio.gather(*[add_session(i) for i in range(20)])

        # All sessions should be present
        loaded = await load_session_store(store_path, skip_cache=True)
        assert len(loaded) == 20
        for i in range(20):
            assert f"s{i}" in loaded
