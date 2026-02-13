"""Agent binding management.

This module provides functions to manage agent bindings (routing rules).
"""

from typing import Any

from openclaw_py.config.types import AgentBinding, OpenClawConfig
from openclaw_py.routing.agent_scope import resolve_default_agent_id
from openclaw_py.routing.session_key import normalize_account_id, normalize_agent_id


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
    "list_bindings",
    "list_bound_account_ids",
    "resolve_default_agent_bound_account_id",
    "build_channel_account_bindings",
    "resolve_preferred_account_id",
]


def _normalize_binding_channel_id(raw: str | None) -> str | None:
    """Normalize a channel ID for binding matching.

    Args:
        raw: Raw channel ID

    Returns:
        Normalized channel ID or None
    """
    # For now, simple normalization (can be extended with channel registry)
    normalized = (raw or "").strip().lower()
    return normalized or None


def list_bindings(cfg: OpenClawConfig) -> list[AgentBinding]:
    """List all agent bindings from configuration.

    Args:
        cfg: OpenClaw configuration

    Returns:
        List of agent bindings

    Examples:
        >>> cfg = OpenClawConfig(bindings=[{"agent_id": "main", "match": {"channel": "telegram"}}])
        >>> len(list_bindings(cfg))
        1
    """
    if not cfg.bindings or not isinstance(cfg.bindings, list):
        return []

    return [binding for binding in cfg.bindings if binding]


def list_bound_account_ids(cfg: OpenClawConfig, channel_id: str) -> list[str]:
    """List all account IDs bound to a specific channel.

    Args:
        cfg: OpenClaw configuration
        channel_id: Channel ID

    Returns:
        Sorted list of account IDs

    Examples:
        >>> cfg = OpenClawConfig(bindings=[
        ...     {"agent_id": "main", "match": {"channel": "telegram", "account_id": "bot1"}},
        ...     {"agent_id": "main", "match": {"channel": "telegram", "account_id": "bot2"}},
        ... ])
        >>> list_bound_account_ids(cfg, "telegram")
        ['bot1', 'bot2']
    """
    normalized_channel = _normalize_binding_channel_id(channel_id)
    if not normalized_channel:
        return []

    ids = set()

    for binding in list_bindings(cfg):
        match = _get_attr(binding,"match")
        if not match:
            continue

        # Check channel match
        channel = _normalize_binding_channel_id(_get_attr(match,"channel"))
        if not channel or channel != normalized_channel:
            continue

        # Extract account ID
        account_id = _get_attr(match,"account_id")
        if not isinstance(account_id, str):
            continue

        account_id_trimmed = account_id.strip()
        if not account_id_trimmed or account_id_trimmed == "*":
            continue

        ids.add(normalize_account_id(account_id_trimmed))

    return sorted(ids)


def resolve_default_agent_bound_account_id(
    cfg: OpenClawConfig,
    channel_id: str,
) -> str | None:
    """Resolve the account ID bound to the default agent for a channel.

    Args:
        cfg: OpenClaw configuration
        channel_id: Channel ID

    Returns:
        Account ID or None if not found

    Examples:
        >>> cfg = OpenClawConfig(
        ...     agents={"list": [{"id": "main", "default": True}]},
        ...     bindings=[{"agent_id": "main", "match": {"channel": "telegram", "account_id": "bot1"}}]
        ... )
        >>> resolve_default_agent_bound_account_id(cfg, "telegram")
        'bot1'
    """
    normalized_channel = _normalize_binding_channel_id(channel_id)
    if not normalized_channel:
        return None

    default_agent_id = normalize_agent_id(resolve_default_agent_id(cfg))

    for binding in list_bindings(cfg):
        # Check agent ID match
        if normalize_agent_id(_get_attr(binding,"agent_id")) != default_agent_id:
            continue

        match = _get_attr(binding,"match")
        if not match:
            continue

        # Check channel match
        channel = _normalize_binding_channel_id(_get_attr(match,"channel"))
        if not channel or channel != normalized_channel:
            continue

        # Extract account ID
        account_id = _get_attr(match,"account_id")
        if not isinstance(account_id, str):
            continue

        account_id_trimmed = account_id.strip()
        if not account_id_trimmed or account_id_trimmed == "*":
            continue

        return normalize_account_id(account_id_trimmed)

    return None


def build_channel_account_bindings(cfg: OpenClawConfig) -> dict[str, dict[str, list[str]]]:
    """Build a map of channel -> agent -> account IDs.

    Args:
        cfg: OpenClaw configuration

    Returns:
        Nested dictionary: {channel_id: {agent_id: [account_ids]}}

    Examples:
        >>> cfg = OpenClawConfig(bindings=[
        ...     {"agent_id": "main", "match": {"channel": "telegram", "account_id": "bot1"}},
        ...     {"agent_id": "helper", "match": {"channel": "telegram", "account_id": "bot2"}},
        ... ])
        >>> build_channel_account_bindings(cfg)
        {'telegram': {'main': ['bot1'], 'helper': ['bot2']}}
    """
    result: dict[str, dict[str, list[str]]] = {}

    for binding in list_bindings(cfg):
        match = _get_attr(binding,"match")
        if not match:
            continue

        # Extract channel ID
        channel_id = _normalize_binding_channel_id(_get_attr(match,"channel"))
        if not channel_id:
            continue

        # Extract account ID
        account_id = _get_attr(match,"account_id")
        if not isinstance(account_id, str):
            continue

        account_id_trimmed = account_id.strip()
        if not account_id_trimmed or account_id_trimmed == "*":
            continue

        # Extract agent ID
        agent_id = normalize_agent_id(_get_attr(binding,"agent_id"))

        # Build nested structure
        by_agent = result.setdefault(channel_id, {})
        account_list = by_agent.setdefault(agent_id, [])

        normalized_account_id = normalize_account_id(account_id_trimmed)
        if normalized_account_id not in account_list:
            account_list.append(normalized_account_id)

    return result


def resolve_preferred_account_id(
    account_ids: list[str],
    default_account_id: str,
    bound_accounts: list[str],
) -> str:
    """Resolve the preferred account ID from available options.

    Prefers bound accounts over the default.

    Args:
        account_ids: Available account IDs
        default_account_id: Default account ID
        bound_accounts: Bound account IDs

    Returns:
        Preferred account ID

    Examples:
        >>> resolve_preferred_account_id(["bot1", "bot2"], "default", ["bot1"])
        'bot1'
        >>> resolve_preferred_account_id(["bot1", "bot2"], "default", [])
        'default'
    """
    if bound_accounts:
        return bound_accounts[0]
    return default_account_id
