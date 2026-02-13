"""Message routing system.

This module provides agent routing and session key management.
"""

# Session key management
from openclaw_py.routing.session_key import (
    DEFAULT_ACCOUNT_ID,
    DEFAULT_AGENT_ID,
    DEFAULT_MAIN_KEY,
    ParsedAgentSessionKey,
    SessionKeyShape,
    build_agent_main_session_key,
    build_agent_peer_session_key,
    build_group_history_key,
    classify_session_key_shape,
    is_acp_session_key,
    is_subagent_session_key,
    normalize_account_id,
    normalize_agent_id,
    normalize_main_key,
    parse_agent_session_key,
    resolve_agent_id_from_session_key,
    resolve_thread_session_keys,
    sanitize_agent_id,
    to_agent_request_session_key,
    to_agent_store_session_key,
)

# Agent scope
from openclaw_py.routing.agent_scope import (
    list_agent_ids,
    resolve_default_agent_id,
    resolve_session_agent_id,
    resolve_session_agent_ids,
)

# Bindings
from openclaw_py.routing.bindings import (
    build_channel_account_bindings,
    list_bindings,
    list_bound_account_ids,
    resolve_default_agent_bound_account_id,
    resolve_preferred_account_id,
)

# Route resolution
from openclaw_py.routing.resolve_route import (
    ResolveAgentRouteInput,
    ResolvedAgentRoute,
    RoutePeer,
    build_agent_session_key,
    resolve_agent_route,
)

__all__ = [
    # Session key constants
    "DEFAULT_ACCOUNT_ID",
    "DEFAULT_AGENT_ID",
    "DEFAULT_MAIN_KEY",
    "SessionKeyShape",
    "ParsedAgentSessionKey",
    # Session key functions
    "parse_agent_session_key",
    "is_acp_session_key",
    "is_subagent_session_key",
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
    # Agent scope
    "list_agent_ids",
    "resolve_default_agent_id",
    "resolve_session_agent_ids",
    "resolve_session_agent_id",
    # Bindings
    "list_bindings",
    "list_bound_account_ids",
    "resolve_default_agent_bound_account_id",
    "build_channel_account_bindings",
    "resolve_preferred_account_id",
    # Route resolution
    "RoutePeer",
    "ResolveAgentRouteInput",
    "ResolvedAgentRoute",
    "build_agent_session_key",
    "resolve_agent_route",
]
