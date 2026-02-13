"""Agent route resolution.

This module provides the core routing logic to resolve agent routes
based on bindings (routing rules).
"""

from typing import Any, Literal, NamedTuple

from openclaw_py.config.types import OpenClawConfig
from openclaw_py.routing.agent_scope import resolve_default_agent_id
from openclaw_py.routing.bindings import list_bindings
from openclaw_py.routing.session_key import (
    DEFAULT_ACCOUNT_ID,
    DEFAULT_MAIN_KEY,
    build_agent_main_session_key,
    build_agent_peer_session_key,
    normalize_account_id,
    normalize_agent_id,
    sanitize_agent_id,
)
from openclaw_py.types.base import ChatType, normalize_chat_type


def _get_attr(obj: Any, attr: str, default: Any = None) -> Any:
    """Get attribute from Pydantic model or dict.

    Args:
        obj: Object (Pydantic model or dict)
        attr: Attribute name
        default: Default value if not found

    Returns:
        Attribute value or default
    """
    if hasattr(obj, attr):
        return getattr(obj, attr, default)
    elif isinstance(obj, dict):
        return obj.get(attr, default)
    return default

__all__ = [
    "RoutePeer",
    "ResolveAgentRouteInput",
    "ResolvedAgentRoute",
    "DEFAULT_ACCOUNT_ID",
    "resolve_agent_route",
    "build_agent_session_key",
]


class RoutePeer(NamedTuple):
    """Route peer information."""

    kind: ChatType
    id: str


MatchedBy = Literal[
    "binding.peer",
    "binding.peer.parent",
    "binding.guild",
    "binding.team",
    "binding.account",
    "binding.channel",
    "default",
]


class ResolveAgentRouteInput(NamedTuple):
    """Input for agent route resolution."""

    cfg: OpenClawConfig
    channel: str
    account_id: str | None = None
    peer: RoutePeer | None = None
    parent_peer: RoutePeer | None = None  # For thread inheritance
    guild_id: str | None = None  # Discord-specific
    team_id: str | None = None  # Slack-specific


class ResolvedAgentRoute(NamedTuple):
    """Resolved agent route."""

    agent_id: str
    channel: str
    account_id: str
    session_key: str
    main_session_key: str
    matched_by: MatchedBy


def _normalize_token(value: str | None) -> str:
    """Normalize a token to lowercase."""
    return (value or "").strip().lower()


def _normalize_id(value: str | None) -> str:
    """Normalize an ID (trim only, preserve case for IDs)."""
    return (value or "").strip()


def _normalize_account_id_for_matching(value: str | None) -> str:
    """Normalize account ID for matching (returns empty if None)."""
    trimmed = (value or "").strip()
    return trimmed if trimmed else DEFAULT_ACCOUNT_ID


def _matches_account_id(match: str | None, actual: str) -> bool:
    """Check if a binding's account ID matches the actual account ID.

    Args:
        match: Binding's account ID pattern (can be "*" for wildcard)
        actual: Actual account ID

    Returns:
        True if matches
    """
    trimmed = (match or "").strip()

    # Empty match -> matches default account only
    if not trimmed:
        return actual == DEFAULT_ACCOUNT_ID

    # Wildcard -> matches all
    if trimmed == "*":
        return True

    # Exact match
    return trimmed == actual


def _matches_channel(match: dict | None, channel: str) -> bool:
    """Check if a binding matches the channel.

    Args:
        match: Binding match criteria
        channel: Channel ID

    Returns:
        True if matches
    """
    if not match:
        return False

    key = _normalize_token(_get_attr(match,"channel"))
    if not key:
        return False

    return key == channel


def _matches_peer(match: dict | None, peer: RoutePeer) -> bool:
    """Check if a binding matches the peer.

    Args:
        match: Binding match criteria
        peer: Route peer

    Returns:
        True if matches
    """
    if not match:
        return False

    peer_match = _get_attr(match,"peer")
    if not peer_match or not isinstance(peer_match, dict):
        return False

    # Normalize "dm" to "direct" for backward compatibility
    kind = normalize_chat_type(peer__get_attr(match,"kind"))
    peer_id = _normalize_id(peer__get_attr(match,"id"))

    if not kind or not peer_id:
        return False

    return kind == peer.kind and peer_id == peer.id


def _matches_guild(match: dict | None, guild_id: str) -> bool:
    """Check if a binding matches the guild (Discord-specific).

    Args:
        match: Binding match criteria
        guild_id: Guild ID

    Returns:
        True if matches
    """
    if not match:
        return False

    match_id = _normalize_id(_get_attr(match,"guild_id"))
    if not match_id:
        return False

    return match_id == guild_id


def _matches_team(match: dict | None, team_id: str) -> bool:
    """Check if a binding matches the team (Slack-specific).

    Args:
        match: Binding match criteria
        team_id: Team ID

    Returns:
        True if matches
    """
    if not match:
        return False

    match_id = _normalize_id(_get_attr(match,"team_id"))
    if not match_id:
        return False

    return match_id == team_id


def _list_agents(cfg: OpenClawConfig) -> list:
    """List all agents from config."""
    if not cfg.agents or not cfg.agents.list:
        return []

    agents = cfg.agents.list
    if not isinstance(agents, list):
        return []

    return agents


def _pick_first_existing_agent_id(cfg: OpenClawConfig, agent_id: str) -> str:
    """Pick the first existing agent ID from config.

    Args:
        cfg: OpenClaw configuration
        agent_id: Requested agent ID

    Returns:
        Sanitized agent ID (falls back to default if not found)
    """
    trimmed = (agent_id or "").strip()
    if not trimmed:
        return sanitize_agent_id(resolve_default_agent_id(cfg))

    normalized = normalize_agent_id(trimmed)
    agents = _list_agents(cfg)

    if not agents:
        return sanitize_agent_id(trimmed)

    # Find matching agent
    for agent in agents:
        if not agent or not isinstance(agent, dict):
            continue

        agent_id_from_cfg = agent.get("id", "").strip() if isinstance(agent, dict) else ""
        if normalize_agent_id(agent_id_from_cfg) == normalized:
            return sanitize_agent_id(agent_id_from_cfg)

    # Not found -> fall back to default
    return sanitize_agent_id(resolve_default_agent_id(cfg))


def build_agent_session_key(
    agent_id: str,
    channel: str,
    account_id: str | None = None,
    peer: RoutePeer | None = None,
    dm_scope: Literal["main", "per-peer", "per-channel-peer", "per-account-channel-peer"] = "main",
    identity_links: dict[str, list[str]] | None = None,
) -> str:
    """Build an agent session key.

    Args:
        agent_id: Agent ID
        channel: Channel name
        account_id: Account ID (optional)
        peer: Route peer (optional)
        dm_scope: DM session scope
        identity_links: Identity linking map

    Returns:
        Session key

    Examples:
        >>> build_agent_session_key("main", "telegram")
        'agent:main:main'
        >>> build_agent_session_key("main", "telegram", peer=RoutePeer(kind="group", id="123"))
        'agent:main:telegram:group:123'
    """
    channel_normalized = _normalize_token(channel) or "unknown"

    return build_agent_peer_session_key(
        agent_id=agent_id,
        main_key=DEFAULT_MAIN_KEY,
        channel=channel_normalized,
        account_id=account_id,
        peer_kind=peer.kind if peer else "direct",
        peer_id=_normalize_id(peer.id) if peer else None,
        dm_scope=dm_scope,
        identity_links=identity_links,
    )


def resolve_agent_route(input: ResolveAgentRouteInput) -> ResolvedAgentRoute:
    """Resolve agent route based on bindings.

    This is the core routing function that determines which agent handles
    a message based on channel, account, peer, and other criteria.

    Matching priority (highest to lowest):
    1. binding.peer - Direct peer match
    2. binding.peer.parent - Parent peer match (for threads)
    3. binding.guild - Discord guild match
    4. binding.team - Slack team match
    5. binding.account - Account-specific match
    6. binding.channel - Channel wildcard match ("*")
    7. default - No binding match, use default agent

    Args:
        input: Route resolution input

    Returns:
        Resolved agent route

    Examples:
        >>> cfg = OpenClawConfig()
        >>> input = ResolveAgentRouteInput(cfg=cfg, channel="telegram")
        >>> route = resolve_agent_route(input)
        >>> route.agent_id
        'main'
        >>> route.matched_by
        'default'
    """
    # Normalize inputs
    channel = _normalize_token(input.channel)
    account_id = _normalize_account_id_for_matching(input.account_id)
    peer = (
        RoutePeer(kind=input.peer.kind, id=_normalize_id(input.peer.id)) if input.peer else None
    )
    guild_id = _normalize_id(input.guild_id) if input.guild_id else ""
    team_id = _normalize_id(input.team_id) if input.team_id else ""

    # Get DM scope and identity links from config
    dm_scope = input.cfg.session.dm_scope if input.cfg.session else "main"
    identity_links = input.cfg.session.identity_links if input.cfg.session else None

    # Filter bindings by channel and account
    bindings = [
        binding
        for binding in list_bindings(input.cfg)
        if binding
        and _matches_channel(_get_attr(binding,"match"), channel)
        and _matches_account_id(
            _get_attr(_get_attr(binding,"match"), "account_id"),
            account_id,
        )
    ]

    def choose(agent_id: str, matched_by: MatchedBy) -> ResolvedAgentRoute:
        """Helper to build ResolvedAgentRoute."""
        resolved_agent_id = _pick_first_existing_agent_id(input.cfg, agent_id)
        session_key = build_agent_session_key(
            agent_id=resolved_agent_id,
            channel=channel,
            account_id=account_id,
            peer=peer,
            dm_scope=dm_scope,
            identity_links=identity_links,
        ).lower()
        main_session_key = build_agent_main_session_key(
            agent_id=resolved_agent_id,
            main_key=DEFAULT_MAIN_KEY,
        ).lower()

        return ResolvedAgentRoute(
            agent_id=resolved_agent_id,
            channel=channel,
            account_id=account_id,
            session_key=session_key,
            main_session_key=main_session_key,
            matched_by=matched_by,
        )

    # 1. Try peer match
    if peer:
        for binding in bindings:
            if _matches_peer(_get_attr(binding,"match"), peer):
                return choose(_get_attr(binding,"agent_id", ""), "binding.peer")

    # 2. Try parent peer match (for threads)
    parent_peer = (
        RoutePeer(kind=input.parent_peer.kind, id=_normalize_id(input.parent_peer.id))
        if input.parent_peer
        else None
    )
    if parent_peer and parent_peer.id:
        for binding in bindings:
            if _matches_peer(_get_attr(binding,"match"), parent_peer):
                return choose(_get_attr(binding,"agent_id", ""), "binding.peer.parent")

    # 3. Try guild match (Discord)
    if guild_id:
        for binding in bindings:
            if _matches_guild(_get_attr(binding,"match"), guild_id):
                return choose(_get_attr(binding,"agent_id", ""), "binding.guild")

    # 4. Try team match (Slack)
    if team_id:
        for binding in bindings:
            if _matches_team(_get_attr(binding,"match"), team_id):
                return choose(_get_attr(binding,"agent_id", ""), "binding.team")

    # 5. Try account match (non-wildcard, no specific peer/guild/team)
    for binding in bindings:
        match = _get_attr(binding,"match")
        if not match:
            continue

        account_id_match = _get_attr(match,"account_id", "").strip()
        if account_id_match == "*":
            continue

        if _get_attr(match,"peer") or _get_attr(match,"guild_id") or _get_attr(match,"team_id"):
            continue

        return choose(_get_attr(binding,"agent_id", ""), "binding.account")

    # 6. Try channel wildcard match (account_id="*", no specific peer/guild/team)
    for binding in bindings:
        match = _get_attr(binding,"match")
        if not match:
            continue

        account_id_match = _get_attr(match,"account_id", "").strip()
        if account_id_match != "*":
            continue

        if _get_attr(match,"peer") or _get_attr(match,"guild_id") or _get_attr(match,"team_id"):
            continue

        return choose(_get_attr(binding,"agent_id", ""), "binding.channel")

    # 7. Default fallback
    return choose(resolve_default_agent_id(input.cfg), "default")
