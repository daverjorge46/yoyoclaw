"""Tests for in-memory session store."""

import asyncio

import pytest

from openclaw_py.sessions import InMemorySessionStore


class TestInMemorySessionStore:
    """Tests for InMemorySessionStore class."""

    @pytest.mark.asyncio
    async def test_create_session(self):
        """Test creating a session."""
        store = InMemorySessionStore()
        session = await store.create_session("agent:main:test", "/home/user")

        assert session.session_id
        assert session.session_key == "agent:main:test"
        assert session.cwd == "/home/user"
        assert session.created_at > 0
        assert session.active_run_id is None
        assert session.abort_event is None

    @pytest.mark.asyncio
    async def test_create_session_with_id(self):
        """Test creating session with explicit ID."""
        store = InMemorySessionStore()
        session = await store.create_session(
            "agent:main:test",
            "/home/user",
            session_id="custom-123",
        )

        assert session.session_id == "custom-123"

    @pytest.mark.asyncio
    async def test_get_session(self):
        """Test getting session by ID."""
        store = InMemorySessionStore()
        created = await store.create_session("agent:main:test", "/home/user")

        retrieved = await store.get_session(created.session_id)
        assert retrieved is not None
        assert retrieved.session_id == created.session_id
        assert retrieved.session_key == created.session_key

    @pytest.mark.asyncio
    async def test_get_nonexistent_session(self):
        """Test getting non-existent session."""
        store = InMemorySessionStore()
        session = await store.get_session("nonexistent")
        assert session is None

    @pytest.mark.asyncio
    async def test_set_active_run(self):
        """Test setting active run."""
        store = InMemorySessionStore()
        session = await store.create_session("agent:main:test", "/home/user")

        abort_event = asyncio.Event()
        await store.set_active_run(session.session_id, "run-123", abort_event)

        # Retrieve updated session
        updated = await store.get_session(session.session_id)
        assert updated is not None
        assert updated.active_run_id == "run-123"
        assert updated.abort_event is abort_event

    @pytest.mark.asyncio
    async def test_get_session_by_run_id(self):
        """Test getting session by run ID."""
        store = InMemorySessionStore()
        session = await store.create_session("agent:main:test", "/home/user")

        abort_event = asyncio.Event()
        await store.set_active_run(session.session_id, "run-123", abort_event)

        # Retrieve by run ID
        retrieved = await store.get_session_by_run_id("run-123")
        assert retrieved is not None
        assert retrieved.session_id == session.session_id
        assert retrieved.active_run_id == "run-123"

    @pytest.mark.asyncio
    async def test_get_session_by_nonexistent_run_id(self):
        """Test getting session by non-existent run ID."""
        store = InMemorySessionStore()
        session = await store.get_session_by_run_id("nonexistent")
        assert session is None

    @pytest.mark.asyncio
    async def test_clear_active_run(self):
        """Test clearing active run."""
        store = InMemorySessionStore()
        session = await store.create_session("agent:main:test", "/home/user")

        abort_event = asyncio.Event()
        await store.set_active_run(session.session_id, "run-123", abort_event)

        # Clear the run
        await store.clear_active_run(session.session_id)

        # Verify run is cleared
        updated = await store.get_session(session.session_id)
        assert updated is not None
        assert updated.active_run_id is None
        assert updated.abort_event is None

        # Verify run ID mapping is removed
        by_run = await store.get_session_by_run_id("run-123")
        assert by_run is None

    @pytest.mark.asyncio
    async def test_cancel_active_run(self):
        """Test cancelling active run."""
        store = InMemorySessionStore()
        session = await store.create_session("agent:main:test", "/home/user")

        abort_event = asyncio.Event()
        await store.set_active_run(session.session_id, "run-123", abort_event)

        # Cancel the run
        cancelled = await store.cancel_active_run(session.session_id)
        assert cancelled is True

        # Verify abort event was set
        assert abort_event.is_set()

        # Verify run is cleared
        updated = await store.get_session(session.session_id)
        assert updated is not None
        assert updated.active_run_id is None
        assert updated.abort_event is None

    @pytest.mark.asyncio
    async def test_cancel_nonexistent_session(self):
        """Test cancelling run for non-existent session."""
        store = InMemorySessionStore()
        cancelled = await store.cancel_active_run("nonexistent")
        assert cancelled is False

    @pytest.mark.asyncio
    async def test_cancel_session_without_active_run(self):
        """Test cancelling session without active run."""
        store = InMemorySessionStore()
        session = await store.create_session("agent:main:test", "/home/user")

        cancelled = await store.cancel_active_run(session.session_id)
        assert cancelled is False

    @pytest.mark.asyncio
    async def test_clear_all_sessions(self):
        """Test clearing all sessions."""
        store = InMemorySessionStore()

        # Create multiple sessions with active runs
        session1 = await store.create_session("agent:main:s1", "/home/user")
        session2 = await store.create_session("agent:main:s2", "/home/user")

        event1 = asyncio.Event()
        event2 = asyncio.Event()
        await store.set_active_run(session1.session_id, "run-1", event1)
        await store.set_active_run(session2.session_id, "run-2", event2)

        # Clear all
        await store.clear_all_sessions_for_test()

        # Verify all events were set
        assert event1.is_set()
        assert event2.is_set()

        # Verify sessions are cleared
        assert await store.get_session(session1.session_id) is None
        assert await store.get_session(session2.session_id) is None
        assert await store.get_session_by_run_id("run-1") is None
        assert await store.get_session_by_run_id("run-2") is None

    @pytest.mark.asyncio
    async def test_concurrent_access(self):
        """Test concurrent access to session store."""
        store = InMemorySessionStore()

        # Create multiple sessions concurrently
        async def create_session_task(i):
            return await store.create_session(f"agent:main:s{i}", f"/home/user{i}")

        sessions = await asyncio.gather(*[create_session_task(i) for i in range(10)])

        # Verify all sessions were created
        assert len(sessions) == 10
        assert len(set(s.session_id for s in sessions)) == 10  # All unique IDs

        # Retrieve all sessions
        for session in sessions:
            retrieved = await store.get_session(session.session_id)
            assert retrieved is not None
            assert retrieved.session_id == session.session_id
