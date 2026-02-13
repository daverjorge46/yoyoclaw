"""In-memory session store.

This module provides an in-memory session store for ACP and subagent sessions.
"""

import asyncio
import time
import uuid
from typing import NamedTuple


class AcpSession(NamedTuple):
    """ACP session data."""

    session_id: str
    session_key: str
    cwd: str
    created_at: int  # Timestamp in milliseconds
    active_run_id: str | None
    abort_event: asyncio.Event | None


class InMemorySessionStore:
    """In-memory session store for ACP/subagent sessions.

    This store manages sessions with active run tracking and cancellation support.
    """

    def __init__(self):
        """Initialize the session store."""
        self._sessions: dict[str, AcpSession] = {}
        self._run_id_to_session_id: dict[str, str] = {}
        self._lock = asyncio.Lock()

    async def create_session(
        self,
        session_key: str,
        cwd: str,
        session_id: str | None = None,
    ) -> AcpSession:
        """Create a new session.

        Args:
            session_key: Session key
            cwd: Current working directory
            session_id: Optional session ID (generated if not provided)

        Returns:
            Created session

        Examples:
            >>> store = InMemorySessionStore()
            >>> session = await store.create_session("agent:main:test", "/home/user")
            >>> session.session_key
            'agent:main:test'
        """
        async with self._lock:
            sid = session_id or str(uuid.uuid4())
            session = AcpSession(
                session_id=sid,
                session_key=session_key,
                cwd=cwd,
                created_at=int(time.time() * 1000),
                active_run_id=None,
                abort_event=None,
            )
            self._sessions[sid] = session
            return session

    async def get_session(self, session_id: str) -> AcpSession | None:
        """Get session by ID.

        Args:
            session_id: Session ID

        Returns:
            Session or None if not found
        """
        async with self._lock:
            return self._sessions.get(session_id)

    async def get_session_by_run_id(self, run_id: str) -> AcpSession | None:
        """Get session by run ID.

        Args:
            run_id: Run ID

        Returns:
            Session or None if not found
        """
        async with self._lock:
            session_id = self._run_id_to_session_id.get(run_id)
            if session_id:
                return self._sessions.get(session_id)
            return None

    async def set_active_run(
        self,
        session_id: str,
        run_id: str,
        abort_event: asyncio.Event,
    ) -> None:
        """Set active run for a session.

        Args:
            session_id: Session ID
            run_id: Run ID
            abort_event: Event to signal abortion
        """
        async with self._lock:
            session = self._sessions.get(session_id)
            if not session:
                return

            # Update session with new run info
            updated = session._replace(
                active_run_id=run_id,
                abort_event=abort_event,
            )
            self._sessions[session_id] = updated
            self._run_id_to_session_id[run_id] = session_id

    async def clear_active_run(self, session_id: str) -> None:
        """Clear active run for a session.

        Args:
            session_id: Session ID
        """
        async with self._lock:
            session = self._sessions.get(session_id)
            if not session:
                return

            if session.active_run_id:
                self._run_id_to_session_id.pop(session.active_run_id, None)

            updated = session._replace(
                active_run_id=None,
                abort_event=None,
            )
            self._sessions[session_id] = updated

    async def cancel_active_run(self, session_id: str) -> bool:
        """Cancel active run for a session.

        Args:
            session_id: Session ID

        Returns:
            True if run was cancelled
        """
        async with self._lock:
            session = self._sessions.get(session_id)
            if not session or not session.abort_event:
                return False

            # Signal abortion
            session.abort_event.set()

            # Clear run tracking
            if session.active_run_id:
                self._run_id_to_session_id.pop(session.active_run_id, None)

            updated = session._replace(
                active_run_id=None,
                abort_event=None,
            )
            self._sessions[session_id] = updated

            return True

    async def clear_all_sessions_for_test(self) -> None:
        """Clear all sessions (for testing).

        This signals abortion for all active runs before clearing.
        """
        async with self._lock:
            # Abort all active runs
            for session in self._sessions.values():
                if session.abort_event:
                    session.abort_event.set()

            self._sessions.clear()
            self._run_id_to_session_id.clear()


# Default global instance
default_acp_session_store = InMemorySessionStore()
