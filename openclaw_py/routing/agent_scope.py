"""Agent scope resolution.

This module provides functions to resolve agent IDs from configuration.
"""

from openclaw_py.config.types import OpenClawConfig
from openclaw_py.routing.session_key import (
    DEFAULT_AGENT_ID,
    normalize_agent_id,
    parse_agent_session_key,
)

__all__ = [
    "list_agent_ids",
    "resolve_default_agent_id",
    "resolve_session_agent_ids",
    "resolve_session_agent_id",
    "resolve_agent_id_from_session_key",
]

# Track if we've warned about multiple default agents
_default_agent_warned = False


def _list_agents(cfg: OpenClawConfig) -> list:
    """List all agents from config.

    Args:
        cfg: OpenClaw configuration

    Returns:
        List of agent entries
    """
    if not cfg.agents or not cfg.agents.list:
        return []

    agents = cfg.agents.list
    if not isinstance(agents, list):
        return []

    # Accept both Pydantic models and dicts
    return [entry for entry in agents if entry]


def list_agent_ids(cfg: OpenClawConfig) -> list[str]:
    """List all agent IDs from configuration.

    Args:
        cfg: OpenClaw configuration

    Returns:
        List of agent IDs (defaults to [DEFAULT_AGENT_ID] if no agents configured)

    Examples:
        >>> cfg = OpenClawConfig(agents={"list": [{"id": "main"}, {"id": "helper"}]})
        >>> list_agent_ids(cfg)
        ['main', 'helper']
    """
    agents = _list_agents(cfg)

    if not agents:
        return [DEFAULT_AGENT_ID]

    seen = set()
    ids = []

    for entry in agents:
        # Handle both Pydantic models and dicts
        if hasattr(entry, "id"):
            agent_id = normalize_agent_id(entry.id)
        elif isinstance(entry, dict):
            agent_id = normalize_agent_id(entry.get("id"))
        else:
            continue

        if agent_id in seen:
            continue
        seen.add(agent_id)
        ids.append(agent_id)

    return ids if ids else [DEFAULT_AGENT_ID]


def resolve_default_agent_id(cfg: OpenClawConfig) -> str:
    """Resolve the default agent ID from configuration.

    If multiple agents are marked as default, uses the first one and warns.

    Args:
        cfg: OpenClaw configuration

    Returns:
        Default agent ID

    Examples:
        >>> cfg = OpenClawConfig(agents={"list": [{"id": "main", "default": True}]})
        >>> resolve_default_agent_id(cfg)
        'main'
    """
    global _default_agent_warned

    agents = _list_agents(cfg)

    if not agents:
        return DEFAULT_AGENT_ID

    # Find all agents marked as default
    defaults = []
    for agent in agents:
        is_default = getattr(agent, "default", None) if hasattr(agent, "default") else agent.get("default") if isinstance(agent, dict) else None
        if is_default:
            defaults.append(agent)

    # Warn if multiple defaults (only once)
    if len(defaults) > 1 and not _default_agent_warned:
        _default_agent_warned = True
        print("Warning: Multiple agents marked default=true; using the first entry as default.")

    # Choose first default, or first agent if no defaults
    chosen = defaults[0] if defaults else agents[0]

    # Extract ID from chosen agent
    if hasattr(chosen, "id"):
        chosen_id = chosen.id
    elif isinstance(chosen, dict):
        chosen_id = chosen.get("id", "")
    else:
        chosen_id = ""

    chosen_id = chosen_id.strip() if isinstance(chosen_id, str) else ""

    return normalize_agent_id(chosen_id or DEFAULT_AGENT_ID)


def resolve_session_agent_ids(
    session_key: str | None = None,
    config: OpenClawConfig | None = None,
) -> dict[str, str]:
    """Resolve both default and session agent IDs.

    Args:
        session_key: Session key (optional)
        config: OpenClaw configuration (optional)

    Returns:
        Dictionary with 'default_agent_id' and 'session_agent_id'

    Examples:
        >>> resolve_session_agent_ids("agent:custom:main")
        {'default_agent_id': 'main', 'session_agent_id': 'custom'}
    """
    cfg = config or OpenClawConfig()
    default_agent_id = resolve_default_agent_id(cfg)

    session_key_trimmed = (session_key or "").strip()
    normalized_session_key = session_key_trimmed.lower() if session_key_trimmed else None

    parsed = parse_agent_session_key(normalized_session_key) if normalized_session_key else None
    session_agent_id = normalize_agent_id(parsed.agent_id) if parsed else default_agent_id

    return {
        "default_agent_id": default_agent_id,
        "session_agent_id": session_agent_id,
    }


def resolve_session_agent_id(
    session_key: str | None = None,
    config: OpenClawConfig | None = None,
) -> str:
    """Resolve agent ID from session key.

    Args:
        session_key: Session key (optional)
        config: OpenClaw configuration (optional)

    Returns:
        Agent ID

    Examples:
        >>> resolve_session_agent_id("agent:custom:main")
        'custom'
        >>> resolve_session_agent_id(None)
        'main'
    """
    return resolve_session_agent_ids(session_key=session_key, config=config)["session_agent_id"]


def resolve_agent_id_from_session_key(session_key: str | None) -> str:
    """Resolve agent ID from session key (convenience wrapper).

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
    from openclaw_py.routing.session_key import resolve_agent_id_from_session_key as _resolve

    return _resolve(session_key)
