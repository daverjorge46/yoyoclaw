"""Session key parsing and utilities.

This module provides functions to parse and analyze session keys.
Session keys follow patterns like:
- agent:id:rest
- agent:id:subagent:...
- agent:id:acp:...
- agent:id:cron:name:run:id
"""

import re
from typing import NamedTuple


class ParsedAgentSessionKey(NamedTuple):
    """Parsed agent session key."""

    agent_id: str
    rest: str


def parse_agent_session_key(session_key: str | None) -> ParsedAgentSessionKey | None:
    """Parse an agent session key.

    Expected format: agent:id:rest

    Args:
        session_key: Session key string

    Returns:
        Parsed key or None if invalid

    Examples:
        >>> parse_agent_session_key("agent:main:subagent:task")
        ParsedAgentSessionKey(agent_id='main', rest='subagent:task')
        >>> parse_agent_session_key("invalid")
        None
    """
    if not session_key:
        return None

    raw = session_key.strip()
    if not raw:
        return None

    parts = [p for p in raw.split(":") if p]
    if len(parts) < 3:
        return None

    if parts[0] != "agent":
        return None

    agent_id = parts[1].strip()
    rest = ":".join(parts[2:])

    if not agent_id or not rest:
        return None

    return ParsedAgentSessionKey(agent_id=agent_id, rest=rest)


def is_cron_run_session_key(session_key: str | None) -> bool:
    """Check if session key is a cron run session.

    Format: agent:id:cron:name:run:id

    Args:
        session_key: Session key string

    Returns:
        True if this is a cron run session

    Examples:
        >>> is_cron_run_session_key("agent:main:cron:daily:run:123")
        True
        >>> is_cron_run_session_key("agent:main:subagent:task")
        False
    """
    parsed = parse_agent_session_key(session_key)
    if not parsed:
        return False

    # Match pattern: cron:name:run:id
    pattern = r"^cron:[^:]+:run:[^:]+$"
    return bool(re.match(pattern, parsed.rest))


def is_subagent_session_key(session_key: str | None) -> bool:
    """Check if session key is a subagent session.

    Format: subagent:... or agent:id:subagent:...

    Args:
        session_key: Session key string

    Returns:
        True if this is a subagent session

    Examples:
        >>> is_subagent_session_key("subagent:task")
        True
        >>> is_subagent_session_key("agent:main:subagent:task")
        True
        >>> is_subagent_session_key("agent:main:acp:session")
        False
    """
    if not session_key:
        return False

    raw = session_key.strip()
    if not raw:
        return False

    normalized = raw.lower()
    if normalized.startswith("subagent:"):
        return True

    parsed = parse_agent_session_key(raw)
    if parsed:
        return parsed.rest.lower().startswith("subagent:")

    return False


def is_acp_session_key(session_key: str | None) -> bool:
    """Check if session key is an ACP (Agent Communication Protocol) session.

    Format: acp:... or agent:id:acp:...

    Args:
        session_key: Session key string

    Returns:
        True if this is an ACP session

    Examples:
        >>> is_acp_session_key("acp:session")
        True
        >>> is_acp_session_key("agent:main:acp:session")
        True
        >>> is_acp_session_key("agent:main:subagent:task")
        False
    """
    if not session_key:
        return False

    raw = session_key.strip()
    if not raw:
        return False

    normalized = raw.lower()
    if normalized.startswith("acp:"):
        return True

    parsed = parse_agent_session_key(raw)
    if parsed:
        return parsed.rest.lower().startswith("acp:")

    return False


# Thread session markers (case-insensitive)
THREAD_SESSION_MARKERS = [":thread:", ":topic:"]


def resolve_thread_parent_session_key(session_key: str | None) -> str | None:
    """Resolve the parent session key from a thread session key.

    Thread sessions use markers like :thread: or :topic: to indicate nesting.
    This function extracts the parent key before the last marker.

    Args:
        session_key: Session key string

    Returns:
        Parent session key or None if not a thread session

    Examples:
        >>> resolve_thread_parent_session_key("agent:main:session:thread:123")
        'agent:main:session'
        >>> resolve_thread_parent_session_key("chat:topic:456")
        'chat'
        >>> resolve_thread_parent_session_key("simple")
        None
    """
    if not session_key:
        return None

    raw = session_key.strip()
    if not raw:
        return None

    normalized = raw.lower()

    # Find the last occurrence of any thread marker
    idx = -1
    for marker in THREAD_SESSION_MARKERS:
        candidate = normalized.rfind(marker)
        if candidate > idx:
            idx = candidate

    if idx <= 0:
        return None

    # Extract parent key (everything before the marker)
    parent = raw[:idx].strip()
    return parent if parent else None
