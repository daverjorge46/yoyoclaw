"""Session key building and normalization.

This module provides functions to build and normalize session keys for routing.
Session keys are used to identify and persist agent sessions across channels.

Key formats:
- Main session: agent:main:main
- Peer session: agent:main:channel:direct:peer_id
- Group session: agent:main:channel:group:group_id
- Thread session: agent:main:session:thread:thread_id
"""

import re
from typing import Literal

from openclaw_py.sessions.key_utils import (
    ParsedAgentSessionKey,
    parse_agent_session_key,
    is_acp_session_key,
    is_subagent_session_key,
)

# Re-export from key_utils for convenience
__all__ = [
    "ParsedAgentSessionKey",
    "parse_agent_session_key",
    "is_acp_session_key",
    "is_subagent_session_key",
    # New exports
    "DEFAULT_AGENT_ID",
    "DEFAULT_MAIN_KEY",
    "DEFAULT_ACCOUNT_ID",
    "SessionKeyShape",
    "normalize_main_key",
    "to_agent_request_session_key",
    "to_agent_store_session_key",
    "resolve_agent_id_from_session_key",
    "classify_session_key_shape",
    "normalize_agent_id",
    "sanitize_agent_id",
    "normalize_account_id",
    "build_agent_main_session_key",
    "build_agent_peer_session_key",
    "build_group_history_key",
    "resolve_thread_session_keys",
]

# Constants
DEFAULT_AGENT_ID = "main"
DEFAULT_MAIN_KEY = "main"
DEFAULT_ACCOUNT_ID = "default"

SessionKeyShape = Literal["missing", "agent", "legacy_or_alias", "malformed_agent"]

# Pre-compiled regex patterns
# Valid ID: starts and ends with alphanumeric, middle can have dash/underscore
VALID_ID_RE = re.compile(r"^[a-z0-9]([a-z0-9_-]*[a-z0-9])?$", re.IGNORECASE)
INVALID_CHARS_RE = re.compile(r"[^a-z0-9_-]+")
LEADING_DASH_RE = re.compile(r"^-+")
TRAILING_DASH_RE = re.compile(r"-+$")


def _normalize_token(value: str | None) -> str:
    """Normalize a token to lowercase."""
    return (value or "").strip().lower()


def normalize_main_key(value: str | None) -> str:
    """Normalize a main key.

    Args:
        value: Main key value

    Returns:
        Normalized main key (lowercase), or DEFAULT_MAIN_KEY if empty

    Examples:
        >>> normalize_main_key("Main")
        'main'
        >>> normalize_main_key("")
        'main'
        >>> normalize_main_key("custom")
        'custom'
    """
    trimmed = (value or "").strip()
    return trimmed.lower() if trimmed else DEFAULT_MAIN_KEY


def to_agent_request_session_key(store_key: str | None) -> str | None:
    """Convert a store session key to a request session key.

    Extracts the 'rest' portion from an agent session key.

    Args:
        store_key: Store session key (e.g., "agent:main:subagent:task")

    Returns:
        Request session key (e.g., "subagent:task"), or the original key if not parseable

    Examples:
        >>> to_agent_request_session_key("agent:main:subagent:task")
        'subagent:task'
        >>> to_agent_request_session_key("custom_key")
        'custom_key'
        >>> to_agent_request_session_key("")
        None
    """
    raw = (store_key or "").strip()
    if not raw:
        return None

    parsed = parse_agent_session_key(raw)
    return parsed.rest if parsed else raw


def to_agent_store_session_key(
    agent_id: str,
    request_key: str | None,
    main_key: str | None = None,
) -> str:
    """Convert a request session key to a store session key.

    Args:
        agent_id: Agent ID
        request_key: Request session key
        main_key: Optional main key (defaults to DEFAULT_MAIN_KEY)

    Returns:
        Store session key

    Examples:
        >>> to_agent_store_session_key("main", "subagent:task")
        'agent:main:subagent:task'
        >>> to_agent_store_session_key("main", "main")
        'agent:main:main'
        >>> to_agent_store_session_key("main", "")
        'agent:main:main'
    """
    raw = (request_key or "").strip()

    # Empty or default main key -> build main session key
    if not raw or raw == DEFAULT_MAIN_KEY:
        return build_agent_main_session_key(agent_id=agent_id, main_key=main_key)

    lowered = raw.lower()

    # Already an agent key -> return as-is
    if lowered.startswith("agent:"):
        return lowered

    # Subagent key -> prepend agent prefix
    if lowered.startswith("subagent:"):
        return f"agent:{normalize_agent_id(agent_id)}:{lowered}"

    # Other keys -> prepend agent prefix
    return f"agent:{normalize_agent_id(agent_id)}:{lowered}"


def resolve_agent_id_from_session_key(session_key: str | None) -> str:
    """Resolve agent ID from a session key.

    Args:
        session_key: Session key

    Returns:
        Agent ID (defaults to DEFAULT_AGENT_ID if not parseable)

    Examples:
        >>> resolve_agent_id_from_session_key("agent:custom:main")
        'custom'
        >>> resolve_agent_id_from_session_key("unknown")
        'main'
    """
    parsed = parse_agent_session_key(session_key)
    return normalize_agent_id(parsed.agent_id if parsed else None)


def classify_session_key_shape(session_key: str | None) -> SessionKeyShape:
    """Classify the shape of a session key.

    Args:
        session_key: Session key

    Returns:
        Session key shape classification

    Examples:
        >>> classify_session_key_shape("agent:main:main")
        'agent'
        >>> classify_session_key_shape("agent:invalid")
        'malformed_agent'
        >>> classify_session_key_shape("custom")
        'legacy_or_alias'
        >>> classify_session_key_shape("")
        'missing'
    """
    raw = (session_key or "").strip()
    if not raw:
        return "missing"

    if parse_agent_session_key(raw):
        return "agent"

    return "malformed_agent" if raw.lower().startswith("agent:") else "legacy_or_alias"


def normalize_agent_id(value: str | None) -> str:
    """Normalize an agent ID (path-safe, shell-friendly).

    Args:
        value: Agent ID value

    Returns:
        Normalized agent ID (lowercase, alphanumeric + underscore + dash)

    Examples:
        >>> normalize_agent_id("MyAgent")
        'myagent'
        >>> normalize_agent_id("agent-1")
        'agent-1'
        >>> normalize_agent_id("agent@#$123")
        'agent-123'
        >>> normalize_agent_id("")
        'main'
    """
    trimmed = (value or "").strip()
    if not trimmed:
        return DEFAULT_AGENT_ID

    # Already valid and within length limit -> lowercase and return
    if VALID_ID_RE.match(trimmed) and len(trimmed) <= 64:
        return trimmed.lower()

    # Best-effort fallback: collapse invalid characters to "-"
    normalized = trimmed.lower()
    normalized = INVALID_CHARS_RE.sub("-", normalized)
    normalized = LEADING_DASH_RE.sub("", normalized)
    normalized = TRAILING_DASH_RE.sub("", normalized)
    normalized = normalized[:64]

    return normalized or DEFAULT_AGENT_ID


def sanitize_agent_id(value: str | None) -> str:
    """Sanitize an agent ID (alias for normalize_agent_id).

    This function exists for API compatibility with TypeScript version.

    Args:
        value: Agent ID value

    Returns:
        Sanitized agent ID
    """
    return normalize_agent_id(value)


def normalize_account_id(value: str | None) -> str:
    """Normalize an account ID.

    Args:
        value: Account ID value

    Returns:
        Normalized account ID (lowercase, alphanumeric + underscore + dash)

    Examples:
        >>> normalize_account_id("Account-1")
        'account-1'
        >>> normalize_account_id("")
        'default'
    """
    trimmed = (value or "").strip()
    if not trimmed:
        return DEFAULT_ACCOUNT_ID

    # Already valid and within length limit -> lowercase and return
    if VALID_ID_RE.match(trimmed) and len(trimmed) <= 64:
        return trimmed.lower()

    # Best-effort fallback: collapse invalid characters to "-"
    normalized = trimmed.lower()
    normalized = INVALID_CHARS_RE.sub("-", normalized)
    normalized = LEADING_DASH_RE.sub("", normalized)
    normalized = TRAILING_DASH_RE.sub("", normalized)
    normalized = normalized[:64]

    return normalized or DEFAULT_ACCOUNT_ID


def build_agent_main_session_key(
    agent_id: str,
    main_key: str | None = None,
) -> str:
    """Build a main agent session key.

    Args:
        agent_id: Agent ID
        main_key: Optional main key (defaults to DEFAULT_MAIN_KEY)

    Returns:
        Main session key (format: agent:id:main)

    Examples:
        >>> build_agent_main_session_key("main")
        'agent:main:main'
        >>> build_agent_main_session_key("custom", "special")
        'agent:custom:special'
    """
    normalized_agent_id = normalize_agent_id(agent_id)
    normalized_main_key = normalize_main_key(main_key)
    return f"agent:{normalized_agent_id}:{normalized_main_key}"


def build_agent_peer_session_key(
    agent_id: str,
    main_key: str | None,
    channel: str,
    account_id: str | None = None,
    peer_kind: str | None = None,
    peer_id: str | None = None,
    identity_links: dict[str, list[str]] | None = None,
    dm_scope: Literal["main", "per-peer", "per-channel-peer", "per-account-channel-peer"] = "main",
) -> str:
    """Build an agent peer session key.

    Args:
        agent_id: Agent ID
        main_key: Main key (optional)
        channel: Channel name
        account_id: Account ID (optional)
        peer_kind: Peer kind (e.g., "direct", "group", "channel")
        peer_id: Peer ID (optional)
        identity_links: Identity linking map (canonical -> aliases)
        dm_scope: DM session scope

    Returns:
        Peer session key

    Examples:
        >>> build_agent_peer_session_key("main", None, "telegram", peer_kind="direct", peer_id="user123")
        'agent:main:main'
        >>> build_agent_peer_session_key("main", None, "telegram", peer_kind="direct", peer_id="user123", dm_scope="per-peer")
        'agent:main:direct:user123'
        >>> build_agent_peer_session_key("main", None, "telegram", peer_kind="group", peer_id="group456")
        'agent:main:telegram:group:group456'
    """
    normalized_peer_kind = peer_kind or "direct"

    # Direct message handling
    if normalized_peer_kind == "direct":
        peer_id_str = (peer_id or "").strip()

        # Resolve linked peer ID if applicable
        linked_peer_id = None
        if dm_scope != "main":
            linked_peer_id = _resolve_linked_peer_id(
                identity_links=identity_links,
                channel=channel,
                peer_id=peer_id_str,
            )

        if linked_peer_id:
            peer_id_str = linked_peer_id

        peer_id_lower = peer_id_str.lower()

        # per-account-channel-peer scope
        if dm_scope == "per-account-channel-peer" and peer_id_lower:
            channel_lower = (channel or "").strip().lower() or "unknown"
            account_id_normalized = normalize_account_id(account_id)
            return f"agent:{normalize_agent_id(agent_id)}:{channel_lower}:{account_id_normalized}:direct:{peer_id_lower}"

        # per-channel-peer scope
        if dm_scope == "per-channel-peer" and peer_id_lower:
            channel_lower = (channel or "").strip().lower() or "unknown"
            return f"agent:{normalize_agent_id(agent_id)}:{channel_lower}:direct:{peer_id_lower}"

        # per-peer scope
        if dm_scope == "per-peer" and peer_id_lower:
            return f"agent:{normalize_agent_id(agent_id)}:direct:{peer_id_lower}"

        # main scope (default) -> fallback to main session key
        return build_agent_main_session_key(agent_id=agent_id, main_key=main_key)

    # Group/channel handling
    channel_lower = (channel or "").strip().lower() or "unknown"
    peer_id_lower = ((peer_id or "").strip() or "unknown").lower()
    return f"agent:{normalize_agent_id(agent_id)}:{channel_lower}:{normalized_peer_kind}:{peer_id_lower}"


def _resolve_linked_peer_id(
    identity_links: dict[str, list[str]] | None,
    channel: str,
    peer_id: str,
) -> str | None:
    """Resolve a linked peer ID from identity links.

    Args:
        identity_links: Identity linking map (canonical -> aliases)
        channel: Channel name
        peer_id: Peer ID

    Returns:
        Canonical peer ID or None if not found
    """
    if not identity_links:
        return None

    peer_id_trimmed = peer_id.strip()
    if not peer_id_trimmed:
        return None

    # Build candidate keys
    candidates: set[str] = set()

    raw_candidate = _normalize_token(peer_id_trimmed)
    if raw_candidate:
        candidates.add(raw_candidate)

    channel_normalized = _normalize_token(channel)
    if channel_normalized:
        scoped_candidate = _normalize_token(f"{channel_normalized}:{peer_id_trimmed}")
        if scoped_candidate:
            candidates.add(scoped_candidate)

    if not candidates:
        return None

    # Search for matching canonical ID
    for canonical, ids in identity_links.items():
        canonical_name = canonical.strip()
        if not canonical_name:
            continue

        if not isinstance(ids, list):
            continue

        for alias_id in ids:
            normalized = _normalize_token(alias_id)
            if normalized and normalized in candidates:
                return canonical_name

    return None


def build_group_history_key(
    channel: str,
    account_id: str | None,
    peer_kind: Literal["group", "channel"],
    peer_id: str,
) -> str:
    """Build a group history key.

    Args:
        channel: Channel name
        account_id: Account ID
        peer_kind: Peer kind ("group" or "channel")
        peer_id: Peer ID

    Returns:
        Group history key (format: channel:account:kind:peer_id)

    Examples:
        >>> build_group_history_key("telegram", "bot1", "group", "123456")
        'telegram:bot1:group:123456'
    """
    channel_normalized = _normalize_token(channel) or "unknown"
    account_id_normalized = normalize_account_id(account_id)
    peer_id_lower = peer_id.strip().lower() or "unknown"
    return f"{channel_normalized}:{account_id_normalized}:{peer_kind}:{peer_id_lower}"


def resolve_thread_session_keys(
    base_session_key: str,
    thread_id: str | None = None,
    parent_session_key: str | None = None,
    use_suffix: bool = True,
) -> dict[str, str | None]:
    """Resolve thread session keys.

    Args:
        base_session_key: Base session key
        thread_id: Thread ID (optional)
        parent_session_key: Parent session key (optional)
        use_suffix: Whether to use :thread: suffix

    Returns:
        Dictionary with 'session_key' and optional 'parent_session_key'

    Examples:
        >>> resolve_thread_session_keys("agent:main:main", "123")
        {'session_key': 'agent:main:main:thread:123', 'parent_session_key': None}
        >>> resolve_thread_session_keys("agent:main:main", None)
        {'session_key': 'agent:main:main', 'parent_session_key': None}
    """
    thread_id_trimmed = (thread_id or "").strip()

    if not thread_id_trimmed:
        return {"session_key": base_session_key, "parent_session_key": None}

    normalized_thread_id = thread_id_trimmed.lower()

    if use_suffix:
        session_key = f"{base_session_key}:thread:{normalized_thread_id}"
    else:
        session_key = base_session_key

    return {"session_key": session_key, "parent_session_key": parent_session_key}
